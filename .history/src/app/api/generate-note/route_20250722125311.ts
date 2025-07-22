// src/app/api/generate-note/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
    ProviderManager,
    createProviderManager,
    DEFAULT_PROVIDER_CONFIG
} from '@/lib/ai-providers/provider-manager';
import {
    NoteGenerationRequest,
    PatientTranscript,
    NoteTemplate,
    AIProviderError
} from '@/lib/ai-providers/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize the provider manager (singleton pattern)
let providerManager: ProviderManager | null = null;

function getProviderManager(): ProviderManager {
    if (!providerManager) {
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

        providerManager = createProviderManager(config, apiKeys);
    }

    return providerManager;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = validateRequestBody(body);

        if (!validationResult.isValid) {
            return NextResponse.json(
                {
                    error: 'Invalid Request',
                    message: 'Request validation failed',
                    details: validationResult.errors
                },
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

        // Get template if provided
        let template: NoteTemplate | undefined;
        if (templateId) {
            try {
                // In a real implementation, fetch from Firestore
                // For now, we'll skip template fetching and let the AI work with the transcript alone
                console.log(`Template ${templateId} requested - would fetch from Firestore in full implementation`);
            } catch (error) {
                console.error('Failed to fetch template:', error);
                // Continue without template rather than fail
            }
        }

        // Prepare the note generation request
        const noteRequest: NoteGenerationRequest = {
            transcript: {
                id: transcript.id || `transcript_${Date.now()}`,
                content: transcript.content,
                timestamp: new Date(transcript.timestamp || Date.now()),
                patientId: transcript.patientId,
                encounterType: transcript.encounterType || 'office-visit',
                duration: transcript.duration,
                metadata: transcript.metadata
            },
            template,
            patientContext,
            preferences
        };

        // Generate the note using the provider manager
        const manager = getProviderManager();
        const result = await manager.generateNote(noteRequest);

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

        // Save the generated note to Firestore
        try {
            const noteDoc = {
                ...generatedNote,
                userId: session.user?.id || session.user?.email,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const noteRef = await addDoc(collection(db, 'notes'), noteDoc);
            generatedNote.id = noteRef.id;

            // Update the document with the actual ID
            await updateDoc(noteRef, { id: noteRef.id });

            // Log the successful generation
            await logNoteGeneration({
                noteId: generatedNote.id,
                userId: session.user?.id || session.user?.email || 'unknown',
                patientId: transcript.patientId,
                provider: generatedNote.aiProvider,
                qualityScore: generatedNote.metadata.qualityScore,
                processingDuration: result.performance.totalDuration,
                fallbackUsed: result.fallbackUsed || false,
            });

        } catch (firebaseError) {
            console.error('Failed to save note to Firestore:', firebaseError);
            // Return the generated note even if saving failed
            // In production, you might want to implement retry logic
        }

        // Prepare response
        const response = {
            success: true,
            note: generatedNote,
            fallbackUsed: result.fallbackUsed,
            performance: {
                totalDuration: Date.now() - startTime,
                providerDuration: result.performance.providerDuration,
                processingSteps: result.performance.processingSteps.length,
            },
            metadata: {
                timestamp: new Date().toISOString(),
                provider: generatedNote.aiProvider,
                qualityScore: generatedNote.metadata.qualityScore,
                epicSyntaxPreserved: generatedNote.metadata.epicSyntaxPreserved,
            }
        };

        return NextResponse.json(response, { status: 200 });

    } catch (error: any) {
        console.error('Note generation API error:', error);

        const totalDuration = Date.now() - startTime;

        // Handle different types of errors
        if (error instanceof AIProviderError) {
            return NextResponse.json(
                {
                    error: 'AI Provider Error',
                    message: error.message,
                    provider: error.provider,
                    code: error.code,
                    performance: { totalDuration }
                },
                { status: 503 } // Service unavailable
            );
        }

        // Generic error response
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred while generating the note',
                performance: { totalDuration }
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Health check endpoint
        const manager = getProviderManager();
        const healthStatus = await manager.healthCheck();
        const usageStats = manager.getUsageStats();

        return NextResponse.json({
            status: 'operational',
            providers: healthStatus,
            usage: usageStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Health check failed',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    }
}

// Request validation function
function validateRequestBody(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!body.transcript) {
        errors.push('transcript is required');
    } else {
        if (!body.transcript.content || typeof body.transcript.content !== 'string') {
            errors.push('transcript.content is required and must be a string');
        }
        if (!body.transcript.patientId || typeof body.transcript.patientId !== 'string') {
            errors.push('transcript.patientId is required and must be a string');
        }
    }

    // Validate optional fields
    if (body.templateId && typeof body.templateId !== 'string') {
        errors.push('templateId must be a string');
    }

    if (body.patientContext && typeof body.patientContext !== 'object') {
        errors.push('patientContext must be an object');
    }

    if (body.preferences) {
        if (typeof body.preferences !== 'object') {
            errors.push('preferences must be an object');
        } else {
            // Validate preferences structure
            const validDetailLevels = ['concise', 'standard', 'detailed'];
            if (body.preferences.detailLevel && !validDetailLevels.includes(body.preferences.detailLevel)) {
                errors.push('preferences.detailLevel must be one of: concise, standard, detailed');
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Logging function for analytics
async function logNoteGeneration(logData: {
    noteId: string;
    userId: string;
    patientId: string;
    provider: 'gemini' | 'claude';
    qualityScore: number;
    processingDuration: number;
    fallbackUsed: boolean;
}) {
    try {
        await addDoc(collection(db, 'note_generation_logs'), {
            ...logData,
            timestamp: new Date(),
            month: new Date().toISOString().substring(0, 7), // For monthly aggregations
        });
    } catch (error) {
        console.error('Failed to log note generation:', error);
        // Don't fail the request if logging fails
    }
}