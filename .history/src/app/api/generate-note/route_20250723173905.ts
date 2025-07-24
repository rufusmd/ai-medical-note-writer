// src/app/api/generate-note/route.ts
// 🏥 ENHANCED VERSION: Improved SOAP structure formatting and validation

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/ai-providers/gemini-client';
import { ClaudeClient } from '@/lib/ai-providers/claude-client';
import { ClinicalPromptGenerator } from '@/lib/ai-providers/clinical-prompts';
import { notesService } from '@/lib/firebase/notes';
import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            transcript,
            patientContext,
            template,
            clinicalContext,
            patientId,
            userId,
            preferredProvider = 'gemini'
        } = body;

        // Validation
        if (!transcript?.content) {
            return NextResponse.json(
                { success: false, error: 'Transcript content is required' },
                { status: 400 }
            );
        }

        if (!clinicalContext) {
            return NextResponse.json(
                { success: false, error: 'Clinical context is required' },
                { status: 400 }
            );
        }

        if (!patientId || !userId) {
            return NextResponse.json(
                { success: false, error: 'Patient ID and User ID are required' },
                { status: 400 }
            );
        }

        console.log(`🏥 Generating note for ${clinicalContext.clinic} (${clinicalContext.emr}) - ${clinicalContext.visitType}`);

        // Initialize AI clients with API keys
        const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
        const claudeApiKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiApiKey) {
            console.error('❌ GOOGLE_GEMINI_API_KEY is missing from environment variables');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Gemini API key not configured. Please check environment variables.'
                },
                { status: 500 }
            );
        }

        const geminiClient = new GeminiClient(geminiApiKey);
        const claudeClient = claudeApiKey ? new ClaudeClient(claudeApiKey) : null;

        // Determine AI provider to use
        let aiProvider = preferredProvider;
        let response;

        try {
            // Try primary provider (Gemini)
            if (aiProvider === 'gemini' && geminiClient) {
                console.log('🔄 Using Gemini AI...');
                response = await geminiClient.generateNote({
                    transcript,
                    patientContext,
                    template,
                    clinicalContext
                });
            } else if (claudeClient) {
                console.log('🔄 Using Claude AI...');
                response = await claudeClient.generateNote({
                    transcript,
                    patientContext,
                    template,
                    clinicalContext
                });
                aiProvider = 'claude';
            } else {
                throw new Error('No AI providers available');
            }
        } catch (primaryError) {
            console.error(`❌ Primary provider (${aiProvider}) failed:`, primaryError);

            // Fallback to secondary provider
            try {
                const fallbackProvider = aiProvider === 'gemini' ? 'claude' : 'gemini';
                console.log(`🔄 Falling back to ${fallbackProvider}...`);

                if (fallbackProvider === 'claude' && claudeClient) {
                    response = await claudeClient.generateNote({
                        transcript,
                        patientContext,
                        template,
                        clinicalContext
                    });
                } else if (fallbackProvider === 'gemini' && geminiClient) {
                    response = await geminiClient.generateNote({
                        transcript,
                        patientContext,
                        template,
                        clinicalContext
                    });
                } else {
                    throw new Error(`Fallback provider ${fallbackProvider} not available`);
                }
                aiProvider = fallbackProvider;
            } catch (fallbackError) {
                console.error(`❌ Fallback provider failed:`, fallbackError);
                return NextResponse.json(
                    {
                        success: false,
                        error: 'All AI providers failed to generate note',
                        details: {
                            primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error',
                            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
                        }
                    },
                    { status: 500 }
                );
            }
        }

        // Extract note content from response
        let noteContent;
        if (response && typeof response === 'object') {
            if (response.success && response.note) {
                noteContent = response.note.content || response.note;
            } else {
                noteContent = response.content || response.text || response.note || response;
            }
        } else {
            noteContent = response;
        }

        // Validate content was generated
        if (!noteContent || typeof noteContent !== 'string') {
            console.error('💥 AI provider returned invalid content:', typeof noteContent);
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI provider generated invalid content',
                    details: { responseType: typeof noteContent, provider: aiProvider }
                },
                { status: 500 }
            );
        }

        console.log(`✅ Generated ${noteContent.length} characters with ${aiProvider}`);

        // Enhanced validation for EMR-specific formatting
        const validation = ClinicalPromptGenerator.validateNoteFormatting(noteContent, clinicalContext as ClinicalContext);

        // CRITICAL: If Davis Behavioral Health note contains ANY Epic syntax, regenerate
        if (!validation.isValid && clinicalContext.clinic === 'Davis Behavioral Health') {
            const hasEpicSyntax = validation.errors.some(error =>
                error.includes('SmartPhrases') ||
                error.includes('DotPhrases') ||
                error.includes('SmartLists') ||
                error.includes('wildcards') ||
                error.includes('Asterisk placeholders') ||
                error.includes('placeholder syntax')
            );

            if (hasEpicSyntax) {
                console.warn('⚠️ Davis Behavioral Health note contains Epic syntax, regenerating with stronger prompt...');

                // Create an ultra-strong plain text prompt
                const ultraPlainTextPrompt = `URGENT: Generate a psychiatric SOAP note for Davis Behavioral Health (Credible EMR).

CLINICAL INFORMATION:
${transcript.content}

🚨 CRITICAL REQUIREMENTS - READ CAREFULLY 🚨
- This is for CREDIBLE EMR (NOT Epic)
- Output MUST be 100% plain text
- ABSOLUTELY NO asterisks (*) anywhere in the note
- ABSOLUTELY NO @ symbols anywhere  
- ABSOLUTELY NO curly braces { }
- ABSOLUTELY NO Epic syntax of any kind
- Write complete clinical descriptions, not placeholders

EXAMPLE OF WHAT TO WRITE:
Mental Status Exam:
- Appearance: Well-groomed, appears stated age, appropriately dressed
- Behavior: Cooperative throughout interview, good eye contact maintained
- Speech: Normal rate, rhythm, and volume
- Mood: "Anxious" per patient report
- Affect: Anxious, congruent with stated mood

Assessment:
ADHD Combined Type - Patient reports longstanding attention and hyperactivity symptoms consistent with ADHD presentation
Generalized Anxiety Disorder - Significant anxiety symptoms with worry and physiological manifestations

DO NOT write incomplete sections. Complete every section with actual clinical content.
This note will be entered into a simple text-based EMR system.`;

                try {
                    const retryResponse = await (aiProvider === 'gemini' && geminiClient ?
                        geminiClient :
                        claudeClient
                    )?.generateNote({
                        transcript: { content: ultraPlainTextPrompt },
                        patientContext,
                        template
                    });

                    if (retryResponse) {
                        // Extract content using same logic as above
                        let retryContent;
                        if (retryResponse.success && retryResponse.note) {
                            retryContent = retryResponse.note.content || retryResponse.note;
                        } else {
                            retryContent = retryResponse?.content || retryResponse?.text || retryResponse;
                        }

                        if (retryContent && typeof retryContent === 'string') {
                            noteContent = retryContent;
                            console.log('✅ Regeneration successful - ultra plain text format');

                            // Validate the regenerated content
                            const retryValidation = ClinicalPromptGenerator.validateNoteFormatting(retryContent, clinicalContext as ClinicalContext);
                            if (!retryValidation.isValid && retryValidation.errors.some(error =>
                                error.includes('SmartPhrases') ||
                                error.includes('wildcards') ||
                                error.includes('Asterisk') ||
                                error.includes('placeholder')
                            )) {
                                console.warn('🧹 Regeneration still contains Epic syntax, applying emergency cleanup...');
                                // Import and use the validation utility for emergency cleaning
                                const { NoteValidationUtility } = await import('@/lib/ai-providers/validation-utility');
                                noteContent = NoteValidationUtility.cleanEpicSyntax(retryContent);
                                console.log('🧹 Emergency cleanup applied');
                            }
                        }
                    }
                } catch (retryError) {
                    console.error('❌ Regeneration failed, applying emergency cleanup:', retryError);
                    // Apply emergency cleanup to original note
                    const { NoteValidationUtility } = await import('@/lib/ai-providers/validation-utility');
                    noteContent = NoteValidationUtility.cleanEpicSyntax(noteContent);
                    console.log('🧹 Emergency cleanup applied to original note');
                }
            }
        }

        // Final validation - make sure we have valid content
        if (!noteContent || typeof noteContent !== 'string') {
            console.error('💥 Final validation failed - no valid content generated');
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI provider generated invalid or empty content',
                    details: {
                        provider: aiProvider,
                        responseType: typeof noteContent,
                        validationErrors: validation.errors
                    }
                },
                { status: 500 }
            );
        }

        // Structure the note with enhanced SOAP format
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
            validation: validation.isValid,
            validationDetails: validation
        };

        // Save note to Firebase
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

        // Log success
        console.log(`🎉 Note saved successfully: ${savedNote.id}`);

        // Final validation check
        const finalValidation = ClinicalPromptGenerator.validateNoteFormatting(structuredContent, clinicalContext as ClinicalContext);

        return NextResponse.json({
            success: true,
            note: savedNote,
            metadata: {
                aiProvider,
                generatedAt: new Date().toISOString(),
                clinicalContext,
                validation: finalValidation
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
 * Enhanced SOAP structure formatting - COMPLETELY REWRITTEN
 */
function ensureSOAPStructure(content: string, context: ClinicalContext): string {
    // Add safety check
    if (!content || typeof content !== 'string') {
        console.error('⚠️ ensureSOAPStructure received invalid content:', typeof content);
        return createEmptySOAPTemplate();
    }

    // If content already has SOAP headers, enhance the formatting
    if (content.includes('SUBJECTIVE:') && content.includes('OBJECTIVE:') &&
        content.includes('ASSESSMENT:') && content.includes('PLAN:')) {
        return enhanceExistingSOAPStructure(content);
    }

    // If no SOAP structure, create intelligent distribution
    return createSOAPFromContent(content, context);
}

/**
 * Create empty SOAP template for error cases
 */
function createEmptySOAPTemplate(): string {
    return `SUBJECTIVE:
[Note generation failed - please try again]

OBJECTIVE:
Mental Status Exam:
- Appearance: [To be documented]
- Behavior: [To be documented] 
- Speech: [To be documented]
- Mood/Affect: [To be documented]
- Thought Process: [To be documented]
- Thought Content: [To be documented]
- Cognition: [To be documented]
- Insight/Judgment: [To be documented]

ASSESSMENT:
[Clinical impression and diagnostic assessment to be documented]

PLAN:
Medications:
- [Medication recommendations to be documented]

Therapy:
- [Therapy recommendations to be documented]

Follow-up:
- [Follow-up planning to be documented]`;
}

/**
 * Enhance existing SOAP structure with better formatting
 */
function enhanceExistingSOAPStructure(content: string): string {
    // Split by SOAP sections
    const sections = content.split(/(?=SUBJECTIVE:|OBJECTIVE:|ASSESSMENT:|PLAN:)/);

    let enhancedContent = '';

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;

        if (trimmedSection.startsWith('SUBJECTIVE:')) {
            enhancedContent += enhanceSubjectiveSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('OBJECTIVE:')) {
            enhancedContent += enhanceObjectiveSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('ASSESSMENT:')) {
            enhancedContent += enhanceAssessmentSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('PLAN:')) {
            enhancedContent += enhancePlanSection(trimmedSection) + '\n\n';
        } else {
            enhancedContent += trimmedSection + '\n\n';
        }
    }

    return enhancedContent.trim();
}

/**
 * Create SOAP structure from unstructured content
 */
function createSOAPFromContent(content: string, context: ClinicalContext): string {
    // Clean and prepare content
    const lines = content.split('\n').filter(line => line.trim()).map(line => line.trim());

    if (lines.length === 0) {
        return createEmptySOAPTemplate();
    }

    // Intelligent content distribution based on keywords and context
    const subjective = extractSubjectiveContent(lines);
    const objective = extractObjectiveContent(lines);
    const assessment = extractAssessmentContent(lines);
    const plan = extractPlanContent(lines);

    return `SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}

ASSESSMENT:
${assessment}

PLAN:
${plan}`;
}

/**
 * Extract subjective content using intelligent parsing
 */
function extractSubjectiveContent(lines: string[]): string {
    const subjectiveKeywords = [
        'chief complaint', 'presents with', 'reports', 'states', 'describes',
        'history of present illness', 'current symptoms', 'patient reports',
        'feeling', 'experiencing', 'complains of'
    ];

    const subjectiveLines = lines.filter(line =>
        subjectiveKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (subjectiveLines.length === 0) {
        // Take first third of content if no keywords match
        const firstThird = lines.slice(0, Math.ceil(lines.length / 3));
        return `Chief Complaint: [As documented in transcript]

History of Present Illness:
${firstThird.join('\n')}`;
    }

    return `Chief Complaint: ${subjectiveLines[0]}

History of Present Illness:
${subjectiveLines.slice(1).join('\n\n')}`;
}

/**
 * Extract objective content focusing on mental status exam
 */
function extractObjectiveContent(lines: string[]): string {
    const objectiveKeywords = [
        'mental status', 'appearance', 'behavior', 'speech', 'mood', 'affect',
        'thought process', 'thought content', 'perception', 'cognition',
        'insight', 'judgment', 'observed', 'exhibited'
    ];

    const objectiveLines = lines.filter(line =>
        objectiveKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (objectiveLines.length === 0) {
        return `Mental Status Exam:
- Appearance: [To be documented based on clinical observation]
- Behavior: [To be documented based on clinical observation]
- Speech: [To be documented based on clinical observation]
- Mood/Affect: [To be documented based on clinical observation]
- Thought Process: [To be documented based on clinical observation]
- Thought Content: [To be documented based on clinical observation]
- Cognition: [To be documented based on clinical observation]
- Insight/Judgment: [To be documented based on clinical observation]`;
    }

    return `Mental Status Exam:
${objectiveLines.map(line => `- ${line}`).join('\n')}`;
}

/**
 * Extract assessment content focusing on diagnoses
 */
function extractAssessmentContent(lines: string[]): string {
    const assessmentKeywords = [
        'diagnosis', 'diagnoses', 'impression', 'assessment', 'disorder',
        'condition', 'criteria', 'meets criteria', 'rule out', 'differential'
    ];

    const assessmentLines = lines.filter(line =>
        assessmentKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (assessmentLines.length === 0) {
        return `Primary Diagnoses:
- [Clinical impression to be documented]

Risk Assessment:
- [Safety assessment to be completed]`;
    }

    return `Primary Diagnoses:
${assessmentLines.map(line => `- ${line}`).join('\n')}

Risk Assessment:
- [Safety assessment completed during visit]`;
}

/**
 * Extract plan content focusing on treatment recommendations
 */
function extractPlanContent(lines: string[]): string {
    const planKeywords = [
        'plan', 'treatment', 'medication', 'therapy', 'follow-up', 'referral',
        'recommend', 'continue', 'start', 'adjust', 'monitor', 'schedule'
    ];

    const planLines = lines.filter(line =>
        planKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (planLines.length === 0) {
        return `Medications:
- [Medication recommendations to be documented]

Therapy:
- [Therapeutic interventions to be documented]

Follow-up:
- [Follow-up planning to be documented]`;
    }

    // Organize plan content by categories
    const medicationLines = planLines.filter(line =>
        line.toLowerCase().includes('medication') ||
        line.toLowerCase().includes('prescription') ||
        line.toLowerCase().includes('drug')
    );

    const therapyLines = planLines.filter(line =>
        line.toLowerCase().includes('therapy') ||
        line.toLowerCase().includes('counseling') ||
        line.toLowerCase().includes('intervention')
    );

    const followUpLines = planLines.filter(line =>
        line.toLowerCase().includes('follow') ||
        line.toLowerCase().includes('appointment') ||
        line.toLowerCase().includes('schedule')
    );

    let planContent = '';

    if (medicationLines.length > 0) {
        planContent += `Medications:\n${medicationLines.map(line => `- ${line}`).join('\n')}\n\n`;
    } else {
        planContent += `Medications:\n- [Medication recommendations to be documented]\n\n`;
    }

    if (therapyLines.length > 0) {
        planContent += `Therapy:\n${therapyLines.map(line => `- ${line}`).join('\n')}\n\n`;
    } else {
        planContent += `Therapy:\n- [Therapeutic interventions to be documented]\n\n`;
    }

    if (followUpLines.length > 0) {
        planContent += `Follow-up:\n${followUpLines.map(line => `- ${line}`).join('\n')}`;
    } else {
        planContent += `Follow-up:\n- [Follow-up planning to be documented]`;
    }

    return planContent;
}

/**
 * Enhance subjective section formatting
 */
function enhanceSubjectiveSection(section: string): string {
    const content = section.replace('SUBJECTIVE:', '').trim();

    if (!content.includes('Chief Complaint:') && !content.includes('History of Present Illness:')) {
        return `SUBJECTIVE:
Chief Complaint: [As documented in transcript]

History of Present Illness:
${content}`;
    }

    return section;
}

/**
 * Enhance objective section formatting
 */
function enhanceObjectiveSection(section: string): string {
    const content = section.replace('OBJECTIVE:', '').trim();

    if (!content.includes('Mental Status Exam:')) {
        return `OBJECTIVE:
Mental Status Exam:
${content}`;
    }

    return section;
}

/**
 * Enhance assessment section formatting
 */
function enhanceAssessmentSection(section: string): string {
    const content = section.replace('ASSESSMENT:', '').trim();

    if (!content.includes('Primary Diagnoses:')) {
        return `ASSESSMENT:
Primary Diagnoses:
${content}`;
    }

    return section;
}

/**
 * Enhance plan section formatting
 */
function enhancePlanSection(section: string): string {
    const content = section.replace('PLAN:', '').trim();

    if (!content.includes('Medications:') && !content.includes('Therapy:') && !content.includes('Follow-up:')) {
        return `PLAN:
${content}`;
    }

    return section;
}

export async function GET() {
    return NextResponse.json({
        message: 'AI Medical Note Writer - Generate Note API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        availableProviders: ['gemini', 'claude']
    });
}