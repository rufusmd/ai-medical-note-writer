// src/app/api/generate-note/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateNote } from '@/lib/ai-providers/provider-manager';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { transcript, template, patientInfo, preferredProvider } = body;

        if (!transcript || !template) {
            return NextResponse.json(
                { error: 'Transcript and template are required' },
                { status: 400 }
            );
        }

        const result = await generateNote({
            transcript,
            template,
            patientInfo,
            preferredProvider
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Note generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate note' },
            { status: 500 }
        );
    }
}