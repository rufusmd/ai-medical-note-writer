// src/app/api/generate-note-enhanced/route.ts - CREATE THIS NEW FILE

import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection } from 'firebase/firestore';
import { db, COLLECTIONS, createAuditLog } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            transcript,
            patientId,
            patientName,
            templateId,
            templateContent,
            encounterType = 'follow-up',
            specialty,
            userId
        } = body;

        // Validate required fields
        if (!transcript || !patientId || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: transcript, patientId, userId' },
                { status: 400 }
            );
        }

        // For now, create a mock note since we don't have AI providers set up yet
        const startTime = Date.now();

        // Mock note generation - replace this with your actual AI provider calls
        const mockNote = `CLINICAL NOTE

Patient: ${patientName || 'Unknown Patient'}
Date: ${new Date().toLocaleDateString()}
Provider: AI Assistant
Template: ${templateId || 'General'}

CHIEF COMPLAINT:
Based on transcript provided.

ASSESSMENT:
This is a mock note generated for testing the feedback system. 

PLAN:
1. Continue monitoring
2. Follow up as needed
3. Patient education provided

Generated from transcript: "${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}"

---
Note: This is a test note for the AI learning system implementation.`;

        const provider = 'gemini'; // Mock provider
        const processingTime = Date.now() - startTime;

        // Save note to database with enhanced fields
        const noteData = {
            patientId,
            patientName: patientName || 'Test Patient',
            templateUsed: templateId || 'general',
            generatedContent: mockNote,
            aiProvider: provider,
            processingTime,
            qualityScore: 8, // Mock quality score
            epicElements: { smartPhrases: [], smartLists: [], wildcards: [] },
            createdBy: userId,
            createdAt: new Date(),
            exported: false,

            // 🆕 NEW: Enhanced fields for feedback system
            feedbackCollected: false,
            personalizedPromptUsed: false, // Will be true when we implement personalization
        };

        const noteDoc = await addDoc(collection(db, COLLECTIONS.NOTES), noteData);

        // Create audit log
        await createAuditLog('note_generated_enhanced', {
            noteId: noteDoc.id,
            patientId,
            provider,
            processingTime,
        }, userId);

        // Return enhanced response
        return NextResponse.json({
            success: true,
            noteId: noteDoc.id,
            content: mockNote,
            provider,
            qualityScore: 8,
            processingTime,
            epicElements: { smartPhrases: [], smartLists: [], wildcards: [] },

            // 🆕 NEW: Learning metadata
            learningMetadata: {
                promptStrategy: 'baseline', // Will be 'personalized' or 'experimental' later
                personalizedPromptUsed: false,
                confidenceScore: 1.0,
                showFeedbackPrompt: true, // Always show feedback for now
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

// Health check endpoint
export async function GET() {
    return NextResponse.json({
        success: true,
        status: 'healthy',
        features: {
            feedbackCollection: true,
            enhancedLogging: true,
            mockNoteGeneration: true, // Indicates this is using mock data
        },
        timestamp: new Date().toISOString(),
    });
}