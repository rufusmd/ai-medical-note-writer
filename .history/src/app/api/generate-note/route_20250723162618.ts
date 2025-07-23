// src/app/api/generate-note/route.ts
// 🏥 ENHANCED VERSION: Proper clinical context differentiation in API

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/ai-providers/gemini-client';
import { ClaudeClient } from '@/lib/ai-providers/claude-client';
import { ClinicalPromptGenerator, validateNoteFormatting } from '@/lib/ai-providers/clinical-prompts';
import { notesService } from '@/lib/firebase/notes';
import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            transcript,
            patientId,
            clinicalContext,
            userId,
            template,
            patientContext
        } = body;

        // Validate required fields
        if (!transcript?.content || !patientId || !clinicalContext || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: transcript, patientId, clinicalContext, userId'
                },
                { status: 400 }
            );
        }

        console.log('🏥 Generating note with clinical context:', {
            clinic: clinicalContext.clinic,
            emr: clinicalContext.emr,
            visitType: clinicalContext.visitType,
            includeEpicSyntax: clinicalContext.generationSettings?.includeEpicSyntax
        });

        // Initialize AI providers
        const geminiClient = new GeminiClient();
        const claudeClient = new ClaudeClient();

        // Generate context-aware prompt using enhanced system
        const fullPrompt = ClinicalPromptGenerator.generateNotePrompt(
            clinicalContext as ClinicalContext,
            transcript.content,
            patientContext
        );

        console.log('🔤 Generated prompt preview:', fullPrompt.substring(0, 200) + '...');

        // Try Gemini first, then Claude as fallback
        let noteContent = '';
        let aiProvider = '';
        let error = null;

        try {
            console.log('🤖 Attempting Gemini generation...');
            const geminiResponse = await geminiClient.generateNote({
                transcript: { content: fullPrompt },
                patientContext,
                template
            });

            noteContent = geminiResponse.content;
            aiProvider = 'gemini';
            console.log('✅ Gemini generation successful');
        } catch (geminiError) {
            console.log('❌ Gemini failed, trying Claude...', geminiError);

            try {
                const claudeResponse = await claudeClient.generateNote({
                    transcript: { content: fullPrompt },
                    patientContext,
                    template
                });

                noteContent = claudeResponse.content;
                aiProvider = 'claude';
                console.log('✅ Claude generation successful');
            } catch (claudeError) {
                console.error('❌ Both AI providers failed:', { geminiError, claudeError });
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Both AI providers failed to generate note',
                        details: {
                            gemini: geminiError.message,
                            claude: claudeError.message
                        }
                    },
                    { status: 500 }
                );
            }
        }

        // Validate note formatting for clinical context
        const validation = validateNoteFormatting(noteContent, clinicalContext as ClinicalContext);

        if (!validation.isValid) {
            console.warn('⚠️ Note validation warnings:', validation.errors);
            // For Davis Behavioral Health, regenerate if Epic syntax detected
            if (clinicalContext.clinic === 'Davis Behavioral Health' &&
                validation.errors.some(error => error.includes('Epic SmartPhrases'))) {

                console.log('🔄 Regenerating note for Davis Behavioral Health (removing Epic syntax)...');

                // Create a more explicit prompt for plain text
                const plainTextPrompt = `${fullPrompt}

CRITICAL OVERRIDE: This is for Davis Behavioral Health using Credible EMR.
You MUST output PLAIN TEXT ONLY. Do NOT include:
- @SMARTPHRASE@ syntax
- .dotphrase syntax  
- {SmartList:123} syntax
- Any Epic EMR formatting

Generate a clean, professional psychiatric SOAP note in plain text format.`;

                try {
                    const retryResponse = await (aiProvider === 'gemini' ? geminiClient : claudeClient).generateNote({
                        transcript: { content: plainTextPrompt },
                        patientContext,
                        template
                    });
                    noteContent = retryResponse.content;
                    console.log('✅ Regeneration successful - plain text format');
                } catch (retryError) {
                    console.error('❌ Regeneration failed:', retryError);
                    // Continue with original note but log the issue
                }
            }
        }

        // Structure the note with SOAP format if not already structured
        const structuredContent = ensureSOAPStructure(noteContent, clinicalContext as ClinicalContext);

        // Create note metadata
        const noteMetadata = {
            patientId,
            aiProvider,
            generatedAt: new Date(),
            visitType: clinicalContext.visitType,
            clinic: clinicalContext.clinic,
            emr: clinicalContext.emr,
            clinicalContext,
            validation: {
                isValid: validation.isValid,
                errors: validation.errors,
                warnings: validation.warnings
            }
        };

        // Save to Firebase
        const savedNote = await notesService.createNote({
            content: structuredContent,
            originalContent: noteContent,
            metadata: noteMetadata,
            userId,
            isEdited: false,
            editAnalytics: {
                totalEdits: 0,
                totalEditTime: 0,
                sectionsEdited: [],
                editHistory: []
            },
            versions: [{
                version: 1,
                content: structuredContent,
                timestamp: new Date(),
                changesSummary: 'Initial AI generation'
            }]
        });

        console.log('💾 Note saved successfully:', savedNote.id);

        // Log clinical context adherence
        console.log('🎯 Clinical Context Adherence Check:', {
            clinic: clinicalContext.clinic,
            expectedFormat: clinicalContext.clinic === 'Davis Behavioral Health' ? 'Plain Text' : 'Epic SmartPhrases',
            hasEpicSyntax: noteContent.includes('@') || noteContent.includes('.'),
            isCompliant: clinicalContext.clinic === 'Davis Behavioral Health' ?
                !(noteContent.includes('@') || noteContent.includes('.')) : true
        });

        return NextResponse.json({
            success: true,
            note: savedNote,
            metadata: {
                aiProvider,
                generatedAt: new Date().toISOString(),
                clinicalContext,
                validation
            }
        });

    } catch (error) {
        console.error('💥 Error in generate-note API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate note',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * Ensure note has proper SOAP structure
 */
function ensureSOAPStructure(content: string, context: ClinicalContext): string {
    // If content already has SOAP headers, return as-is
    if (content.includes('SUBJECTIVE:') && content.includes('OBJECTIVE:') &&
        content.includes('ASSESSMENT:') && content.includes('PLAN:')) {
        return content;
    }

    // Split content into paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());

    if (paragraphs.length < 4) {
        // If too few paragraphs, return original content with basic SOAP structure
        return `SUBJECTIVE:
${content}

OBJECTIVE:
[Mental status examination and objective findings to be documented]

ASSESSMENT:
[Clinical impression and diagnostic assessment to be documented]

PLAN:
[Treatment plan and recommendations to be documented]`;
    }

    // Distribute content across SOAP sections
    const quarterLength = Math.ceil(paragraphs.length / 4);

    const subjective = paragraphs.slice(0, quarterLength).join('\n');
    const objective = paragraphs.slice(quarterLength, quarterLength * 2).join('\n');
    const assessment = paragraphs.slice(quarterLength * 2, quarterLength * 3).join('\n');
    const plan = paragraphs.slice(quarterLength * 3).join('\n');

    return `SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}

ASSESSMENT:
${assessment}

PLAN:
${plan}`;
}

export async function GET() {
    return NextResponse.json({
        message: 'AI Medical Note Writer - Generate Note API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        availableProviders: ['gemini', 'claude']
    });
}