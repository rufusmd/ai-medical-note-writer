// src/app/api/notes/route.ts
// ✨ NEW API ROUTE: Handle note creation and listing

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedNoteStorage } from '@/lib/notes/note-storage';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    startAfter,
    DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET: List notes with filtering and pagination
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const patientId = searchParams.get('patientId');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const lastNoteId = searchParams.get('lastNoteId');
        const orderField = searchParams.get('orderBy') || 'lastModified';
        const orderDirection = searchParams.get('orderDirection') || 'desc';

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Build query
        const notesRef = collection(db, 'notes');
        let notesQuery = query(
            notesRef,
            where('createdBy', '==', userId),
            orderBy(orderField, orderDirection as 'asc' | 'desc'),
            limit(pageSize)
        );

        // Add patient filter if specified
        if (patientId) {
            notesQuery = query(
                notesRef,
                where('createdBy', '==', userId),
                where('metadata.patientId', '==', patientId),
                orderBy(orderField, orderDirection as 'asc' | 'desc'),
                limit(pageSize)
            );
        }

        // Add pagination if lastNoteId provided
        if (lastNoteId) {
            // Get the last document for pagination
            const lastDocRef = await getDocs(query(
                notesRef,
                where('id', '==', lastNoteId),
                limit(1)
            ));

            if (!lastDocRef.empty) {
                const lastDoc = lastDocRef.docs[0];
                notesQuery = query(
                    notesQuery,
                    startAfter(lastDoc)
                );
            }
        }

        const querySnapshot = await getDocs(notesQuery);

        const notes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            metadata: {
                ...doc.data().metadata,
                generatedAt: doc.data().metadata.generatedAt?.toDate()
            },
            lastModified: doc.data().lastModified?.toDate()
        }));

        // Get total count for pagination info
        const totalCountQuery = query(
            notesRef,
            where('createdBy', '==', userId)
        );
        const totalSnapshot = await getDocs(totalCountQuery);
        const totalCount = totalSnapshot.size;

        return NextResponse.json({
            notes,
            pagination: {
                totalCount,
                pageSize,
                hasMore: notes.length === pageSize,
                lastNoteId: notes.length > 0 ? notes[notes.length - 1].id : null
            }
        });

    } catch (error) {
        console.error('Error listing notes:', error);
        return NextResponse.json(
            { error: 'Failed to list notes' },
            { status: 500 }
        );
    }
}

// POST: Create new note
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { content, metadata, userId } = body;

        // Validation
        if (!content || !metadata || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: content, metadata, userId' },
                { status: 400 }
            );
        }

        if (!metadata.patientId) {
            return NextResponse.json(
                { error: 'metadata.patientId is required' },
                { status: 400 }
            );
        }

        // Create note using enhanced storage
        const noteId = await EnhancedNoteStorage.createNote({
            content,
            metadata: {
                ...metadata,
                generatedAt: new Date(metadata.generatedAt || Date.now())
            },
            userId
        });

        // Fetch the created note to return full data
        const createdNote = await EnhancedNoteStorage.getNoteWithHistory(noteId);

        if (!createdNote) {
            throw new Error('Failed to retrieve created note');
        }

        return NextResponse.json({
            success: true,
            note: createdNote
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating note:', error);
        return NextResponse.json(
            { error: 'Failed to create note' },
            { status: 500 }
        );
    }
}

// PUT: Update note metadata (not content - content updates go through /notes/[noteId]/route.ts)
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { noteId, metadata, userId } = body;

        if (!noteId || !metadata || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: noteId, metadata, userId' },
                { status: 400 }
            );
        }

        // TODO: Implement metadata update functionality
        // This would be for updating things like patient assignment, clinical context, etc.
        // For now, return not implemented
        return NextResponse.json(
            { error: 'Metadata updates not yet implemented' },
            { status: 501 }
        );

    } catch (error) {
        console.error('Error updating note metadata:', error);
        return NextResponse.json(
            { error: 'Failed to update note metadata' },
            { status: 500 }
        );
    }
}

// DELETE: Delete note (soft delete with audit trail)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const noteId = searchParams.get('noteId');
        const userId = searchParams.get('userId');

        if (!noteId || !userId) {
            return NextResponse.json(
                { error: 'noteId and userId are required' },
                { status: 400 }
            );
        }

        // TODO: Implement soft delete functionality
        // This should mark the note as deleted rather than actually deleting it
        // for HIPAA compliance and audit trails
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