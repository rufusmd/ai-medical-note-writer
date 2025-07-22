// src/app/api/test-generate/route.ts - Development Testing API (No Auth Required)

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

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Parse request body
        const body = await request.json();

        console.log('🧪 Test Generate Request:', {
            hasTranscript: !!body.transcript,
            transcriptContent: body.transcript?.content?.slice(0, 50) + '...',
            preferences: body.preferences
        });

        if (!body.transcript?.content) {
            return NextResponse.json(
                { error: 'Invalid Request', message: 'Transcript content is required' },
                { status: 400 }
            );
        }

        const {
            transcript,
            templateId,
            patientContext,
            preferences = {
                includeSmartPhrases: true,
                includeDotPhrases: true,
                preserveEpicSyntax: true,
                detailLevel: 'standard'
            }
        } = body;

        // Prepare the note generation request
        const noteRequest: NoteGenerationRequest = {
            transcript: {
                id: transcript.id || `test_transcript_${Date.now()}`,
                content: transcript.content,
                timestamp: new Date(transcript.timestamp || Date.now()),
                patientId: transcript.patientId || 'test_patient',
                encounterType: transcript.encounterType || 'office-visit',
                duration: transcript.duration,
                metadata: transcript.metadata
            },
            template: undefined, // Skip template for now
            patientContext,
            preferences
        };

        console.log('🤖 Calling AI Provider Manager...');

        // Generate the note using the provider manager
        const manager = getProviderManager();
        const result = await manager.generateNote(noteRequest);

        console.log('✅ AI Provider Response:', {
            success: result.success,
            hasNote: !!result.note,
            provider: result.note?.aiProvider,
            qualityScore: result.note?.metadata.qualityScore,
            fallbackUsed: result.fallbackUsed
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Generation Failed',
                    message: result.error?.message || 'Failed to generate clinical note',
                    details: result.error?.details,
                    performance: result.performance
                },
                { status: 500 }
            );
        }

        const generatedNote = result.note!;

        // Prepare response (skip Firebase save for test)
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
                processingSteps: result.performance.processingSteps
            },
            timestamp: new Date().toISOString(),
            testMode: true
        };

        console.log('🎉 Test Generation Successful!', {
            noteLength: generatedNote.content.length,
            provider: generatedNote.aiProvider,
            processingTime: Date.now() - startTime
        });

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Test Generation Error:', error);

        const totalDuration = Date.now() - startTime;

        return NextResponse.json(
            {
                error: 'Test Generation Error',
                message: 'An error occurred during test note generation',
                details: {
                    errorMessage: error.message,
                    totalDuration,
                    timestamp: new Date().toISOString(),
                    testMode: true
                }
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Test Generate API - Development Only',
        usage: 'POST with transcript data to test note generation without authentication',
        warning: 'This endpoint bypasses authentication and should only be used in development'
    });
}