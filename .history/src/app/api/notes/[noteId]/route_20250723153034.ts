// src/app/api/notes/[noteId]/route.ts
// ✨ NEW API ROUTE: Handle individual note operations

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedNoteStorage } from '@/lib/notes/note-storage';
import { EditSession } from '@/lib/notes/delta-tracker';

export async function GET(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    try {
        const noteId = params.noteId;

        const note = await EnhancedNoteStorage.getNoteWithHistory(noteId);

        if (!note) {
            return NextResponse.json(
                { error: 'Note not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ note });

    } catch (error) {
        console.error('Error fetching note:', error);
        return NextResponse.json(
            { error: 'Failed to fetch note' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    try {
        const noteId = params.noteId;
        const body = await request.json();

        const { content, editSession, userId } = body;

        if (!content || !editSession || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: content, editSession, userId' },
                { status: 400 }
            );
        }

        await EnhancedNoteStorage.saveNoteWithHistory(
            noteId,
            content,
            editSession,
            userId
        );

        return NextResponse.json({
            success: true,
            message: 'Note saved with edit history'
        });

    } catch (error) {
        console.error('Error saving note:', error);
        return NextResponse.json(
            { error: 'Failed to save note' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    try {
        const noteId = params.noteId;

        // TODO: Implement soft delete with audit trail
        return NextResponse.json(
            { error: 'Note deletion not yet implemented' },
            { status: 501 }
        );

    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}

// ================================================================
// src/app/api/notes/[noteId]/auto-save/route.ts
// ✨ NEW API ROUTE: Auto-save functionality

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