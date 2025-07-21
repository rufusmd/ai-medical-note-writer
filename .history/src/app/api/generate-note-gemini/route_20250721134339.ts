// src/app/api/generate-note-gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateNoteWithGemini } from '@/lib/ai-providers/gemini/client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transcript, template, patientInfo } = body;

        if (!transcript || !template) {
            return NextResponse.json(
                { error: 'Transcript and template are required' },
                { status: 400 }
            );
        }

        const note = await generateNoteWithGemini({
            transcript,
            template,
            patientInfo
        });

        return NextResponse.json({ note, provider: 'gemini' });
    } catch (error) {
        console.error('Gemini note generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate note with Gemini' },
            { status: 500 }
        );
    }
}