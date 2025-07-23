// src/app/api/notes/[noteId]/auto-save/route.ts
// ✨ API ROUTE: Auto-save functionality

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedNoteStorage } from '@/lib/notes/note-storage';

export async function PUT(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    try {
        const noteId = params.noteId;
        const body = await request.json();

        const { content } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        await EnhancedNoteStorage.autoSaveNote(noteId, content);

        return NextResponse.json({
            success: true,
            message: 'Auto-saved successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Auto-save error:', error);
        return NextResponse.json(
            { error: 'Auto-save failed' },
            { status: 500 }
        );
    }
}