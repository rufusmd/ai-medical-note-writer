// src/app/api/generate-note-enhanced/route.ts - Enhanced API with learning integration

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/config';
import EnhancedProviderManager from '@/lib/ai-providers/enhanced-provider-manager';
import { createAuditLog } from '@/lib/firebase/config';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase/config';
import { NoteGenerationRequest } from '@/lib/ai-providers/types';

const enhancedProviderManager = new EnhancedProviderManager();

// ====== POST: Enhanced Note Generation ======
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const {
            transcript,
            patientId,
            patientName,
            templateId,
            templateContent,
            encounterType = 'follow-up',
            specialty,
            options = {}
        } = body;

        // Validate required fields
        if (!transcript || !patientId) {
            return NextResponse.json(
                { error: 'Missing required fields: transcript and patientId' },
                { status: 400 }
            );
        }

        // Get user ID from authorization header or session
        const authHeader = request.headers.get('authorization');
        const userId = extractUserIdFromAuth(authHeader); // You'll need to implement this

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - User ID required' },
                { status: 401 }
            );
        }

        // Create note generation request
        const generationRequest: NoteGenerationRequest = {
            transcript,
            patientId,
            patientName,
            templateContent: templateContent || '',
            templateType: templateId || 'general',
            encounterType,
            specialty,
            userId,
            preserveEpicSyntax: true,
            qualityCheck: true,
        };

        // Generate note with learning capabilities
        const startTime = Date.now();
        const response = await enhancedProviderManager.generateNoteWithLearning(
            generationRequest,
            userId,
            options
        );

        const processingTime = Date.now() - startTime;

        // Save note to database
        const noteData = {
            patientId,
            patientName,
            templateUsed: templateId || 'general',
            generatedContent: response.content,
            aiProvider: response.provider,
            processingTime,
            qualityScore: response.qualityScore,
            epicElements: response.epicElements,
            createdBy: userId,
            createdAt: new Date(),
            exported: false,

            // Enhanced fields for feedback system
            feedbackCollected: false,
            promptVariant: response.metadata?.experimentVariant,
            personalizedPromptUsed: response.metadata?.personalizedPromptUsed || false,
        };

        const noteDoc = await addDoc(collection(db, COLLECTIONS.NOTES), noteData);

        // Create audit log
        await createAuditLog('note_generated_enhanced', {
            noteId: noteDoc.id,
            patientId,
            provider: response.provider,
            promptStrategy: response.metadata?.promptStrategy,
            personalizedPromptUsed: response.metadata?.personalizedPromptUsed,
            processingTime,
        }, userId);

        // Return enhanced response
        return NextResponse.json({
            success: true,
            noteId: noteDoc.id,
            content: response.content,
            provider: response.provider,
            qualityScore: response.qualityScore,
            processingTime,
            epicElements: response.epicElements,

            // Enhanced metadata for frontend
            learningMetadata: {
                promptStrategy: response.metadata?.promptStrategy,
                personalizedPromptUsed: response.metadata?.personalizedPromptUsed,
                confidenceScore: response.metadata?.confidenceScore,
                experimentVariant: response.metadata?.experimentVariant,
                showFeedbackPrompt: true, // Always show feedback for learning
            },
        });

    } catch (error) {
        console.error('Enhanced note generation error:', error);

        return NextResponse.json(
            {
                error: 'Note generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// ====== GET: Health Check & Analytics ======
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        switch (action) {
            case 'insights':
                const insights = await enhancedProviderManager.getPersonalizationInsights(userId);
                return NextResponse.json({ success: true, insights });

            case 'health':
                return NextResponse.json({
                    success: true,
                    status: 'healthy',
                    features: {
                        personalizedPrompts: true,
                        experimentalTesting: true,
                        feedbackLearning: true,
                        providerFallback: true,
                    },
                    timestamp: new Date().toISOString(),
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Enhanced API GET error:', error);
        return NextResponse.json(
            { error: 'Request failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// ====== PUT: Update Note with Feedback ======
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { noteId, feedbackData, userId } = body;

        if (!noteId || !feedbackData || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: noteId, feedbackData, userId' },
                { status: 400 }
            );
        }

        // Update note with feedback
        await updateDoc(doc(db, COLLECTIONS.NOTES, noteId), {
            feedbackCollected: true,
            feedbackRating: feedbackData.rating,
            updatedAt: new Date(),
        });

        // If this was an experimental note, update experiment results
        if (feedbackData.experimentVariant) {
            // Update experiment with actual feedback
            // This would integrate with the experiment tracking system
        }

        // Create audit log
        await createAuditLog('note_feedback_collected', {
            noteId,
            rating: feedbackData.rating,
            hasIssues: feedbackData.qualityIssues?.length > 0,
        }, userId);

        return NextResponse.json({
            success: true,
            message: 'Feedback recorded successfully',
        });

    } catch (error) {
        console.error('Feedback update error:', error);
        return NextResponse.json(
            { error: 'Failed to update feedback' },
            { status: 500 }
        );
    }
}

// ====== UTILITY FUNCTIONS ======

function extractUserIdFromAuth(authHeader: string | null): string | null {
    if (!authHeader) return null;

    // Extract user ID from Bearer token or session
    // This is a simplified example - implement proper auth validation
    if (authHeader.startsWith('Bearer ')) {
        try {
            // In a real implementation, you'd validate the JWT token
            // and extract the user ID from it
            const token = authHeader.substring(7);

            // For development, you might extract from a simple token
            // In production, use proper JWT validation
            if (token.startsWith('user_')) {
                return token; // Return the user ID directly for now
            }

            return null;
        } catch (error) {
            console.error('Auth token validation error:', error);
            return null;
        }
    }

    return null;
}

// ====== TYPE DEFINITIONS ======

interface EnhancedGenerationOptions {
    forcePersonalized?: boolean;
    forceBaseline?: boolean;
    experimentId?: string;
    collectFeedback?: boolean;
}

interface EnhancedGenerationResponse {
    success: boolean;
    noteId: string;
    content: string;
    provider: string;
    qualityScore?: number;
    processingTime: number;
    epicElements: any;
    learningMetadata: {
        promptStrategy: string;
        personalizedPromptUsed: boolean;
        confidenceScore?: number;
        experimentVariant?: string;
        showFeedbackPrompt: boolean;
    };
}

// ====== ROUTE CONFIGURATION ======

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for AI generation