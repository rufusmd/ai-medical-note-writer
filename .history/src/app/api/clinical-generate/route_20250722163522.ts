// src/app/api/clinical-generate/route.ts - Context-Aware Clinical Note Generation

import { NextRequest, NextResponse } from 'next/server';
import {
    createProviderManager,
    DEFAULT_PROVIDER_CONFIG
} from '@/lib/ai-providers/provider-manager';
import {
    NoteGenerationRequest,
    PatientContext,
    NoteGenerationPreferences
} from '@/lib/ai-providers/types';
import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import { ClinicalPromptGenerator } from '@/lib/ai-providers/clinical-prompts';

function getProviderManager() {
    const config = {
        ...DEFAULT_PROVIDER_CONFIG,
        primaryProvider: (process.env.NEXT_PUBLIC_AI_PROVIDER as 'gemini' | 'claude') || 'gemini',
        enableFallback: process.env.NEXT_PUBLIC_ENABLE_PROVIDER_FALLBACK === 'true',
        qualityThreshold: parseInt(process.env.AI_QUALITY_THRESHOLD || '6'),
        timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000'),
    };

    const apiKeys = {
        gemini: process.env.GOOGLE_GEMINI_API_KEY,
        claude: process.env.ANTHROPIC_API_KEY,
    };

    return createProviderManager(config, apiKeys);
}

// Enhanced note generation that uses clinical context
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Parse request body
        const body = await request.json();

        console.log('🏥 Clinical Generate Request:', {
            hasTranscript: !!body.transcript,
            clinicalContext: body.clinicalContext,
            visitType: body.clinicalContext?.visitType,
            clinic: body.clinicalContext?.clinic
        });

        if (!body.transcript?.content) {
            return NextResponse.json(
                { error: 'Invalid Request', message: 'Transcript content is required' },
                { status: 400 }
            );
        }

        const {
            transcript,
            clinicalContext,
            templateId,
            patientContext,
            preferences = {
                includeSmartPhrases: true,
                includeDotPhrases: true,
                preserveEpicSyntax: true,
                detailLevel: 'standard'
            }
        }: {
            transcript: any;
            clinicalContext: ClinicalContext;
            templateId?: string;
            patientContext?: PatientContext;
            preferences?: NoteGenerationPreferences;
        } = body;

        // Generate clinical context-aware prompts
        const systemPrompt = ClinicalPromptGenerator.generateSystemPrompt(clinicalContext);
        const userPrompt = ClinicalPromptGenerator.generateNotePrompt(
            clinicalContext,
            transcript.content,
            patientContext
        );

        console.log('📝 Clinical Prompt Generated:', {
            systemPromptLength: systemPrompt.length,
            userPromptLength: userPrompt.length,
            visitType: clinicalContext.visitType,
            hasPreviousNote: !!clinicalContext.previousNote
        });

        // Prepare the note generation request with clinical context
        const noteRequest: NoteGenerationRequest = {
            transcript: {
                id: transcript.id || `clinical_transcript_${Date.now()}`,
                content: transcript.content,
                timestamp: new Date(transcript.timestamp || Date.now()),
                patientId: transcript.patientId || 'clinical_patient',
                encounterType: clinicalContext.visitType as any,
                duration: transcript.duration,
                metadata: {
                    ...transcript.metadata,
                    clinicalContext: clinicalContext,
                    systemPrompt: systemPrompt,
                    userPrompt: userPrompt
                }
            },
            template: undefined, // Clinical context handles template logic
            patientContext,
            preferences: {
                ...preferences,
                includeSmartPhrases: clinicalContext.generationSettings.includeEpicSyntax,
                includeDotPhrases: clinicalContext.generationSettings.includeEpicSyntax,
                preserveEpicSyntax: clinicalContext.generationSettings.includeEpicSyntax,
                detailLevel: clinicalContext.generationSettings.comprehensiveIntake ? 'detailed' : 'standard'
            }
        };

        console.log('🤖 Calling Clinical AI Provider Manager...');

        // Generate the note using the provider manager with clinical prompts
        const manager = getProviderManager();

        // Override the provider's prompt generation with our clinical prompts
        const result = await manager.generateNoteWithCustomPrompts(
            noteRequest,
            systemPrompt,
            userPrompt
        );

        console.log('✅ Clinical AI Provider Response:', {
            success: result.success,
            hasNote: !!result.note,
            provider: result.note?.aiProvider,
            qualityScore: result.note?.metadata.qualityScore,
            fallbackUsed: result.fallbackUsed,
            visitType: clinicalContext.visitType
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Clinical Generation Failed',
                    message: result.error?.message || `Failed to generate ${clinicalContext.visitType} note`,
                    details: result.error?.details,
                    performance: result.performance,
                    clinicalContext: {
                        visitType: clinicalContext.visitType,
                        clinic: clinicalContext.clinic,
                        emr: clinicalContext.emr
                    }
                },
                { status: 500 }
            );
        }

        const generatedNote = result.note!;

        // Enhance note metadata with clinical context
        generatedNote.metadata = {
            ...generatedNote.metadata,
            clinicalContext: clinicalContext,
            visitType: clinicalContext.visitType,
            clinic: clinicalContext.clinic,
            emr: clinicalContext.emr,
            generationSettings: clinicalContext.generationSettings
        };

        // Prepare response with clinical context
        const response = {
            success: true,
            note: {
                id: generatedNote.id,
                content: generatedNote.content,
                aiProvider: generatedNote.aiProvider,
                qualityScore: generatedNote.qualityScore,
                epicSyntaxValidation: generatedNote.epicSyntaxValidation,
                metadata: generatedNote.metadata
            },
            fallbackUsed: result.fallbackUsed,
            performance: {
                totalDuration: Date.now() - startTime,
                aiProviderDuration: result.performance.providerDuration,
                processingSteps: [
                    `Clinical context: ${clinicalContext.clinic} ${clinicalContext.visitType}`,
                    `EMR format: ${clinicalContext.emr.toUpperCase()}`,
                    `Epic syntax: ${clinicalContext.generationSettings.includeEpicSyntax ? 'enabled' : 'disabled'}`,
                    ...result.performance.processingSteps
                ]
            },
            timestamp: new Date().toISOString(),
            clinicalMode: true,
            clinicalContext: {
                visitType: clinicalContext.visitType,
                clinic: clinicalContext.clinic,
                emr: clinicalContext.emr,
                generationSettings: clinicalContext.generationSettings
            }
        };

        console.log('🎉 Clinical Generation Successful!', {
            noteLength: generatedNote.content.length,
            provider: generatedNote.aiProvider,
            qualityScore: generatedNote.qualityScore,
            visitType: clinicalContext.visitType,
            processingTime: Date.now() - startTime
        });

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Clinical Generation Error:', error);

        const totalDuration = Date.now() - startTime;

        return NextResponse.json(
            {
                error: 'Clinical Generation Error',
                message: 'An error occurred during clinical note generation',
                details: {
                    errorMessage: error.message,
                    totalDuration,
                    timestamp: new Date().toISOString(),
                    clinicalMode: true
                }
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Clinical Generate API - Context-Aware Note Generation',
        description: 'Generates clinical notes with context awareness for different visit types and EMR systems',
        supportedVisitTypes: [
            'transfer-of-care',
            'psychiatric-intake',
            'follow-up'
        ],
        supportedClinics: [
            'hmhi-downtown',
            'dbh'
        ],
        supportedEMRs: [
            'epic',
            'credible'
        ],
        features: [
            'Context-aware prompt generation',
            'EMR-specific formatting',
            'Visit type optimization',
            'Previous note integration',
            'Epic SmartPhrase preservation'
        ]
    });
}