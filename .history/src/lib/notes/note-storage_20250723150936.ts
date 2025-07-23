// src/lib/notes/note-storage.ts
// ✨ ENHANCED: Note storage with edit history and versioning

import {
    doc,
    collection,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { DeltaChange, EditSession } from './delta-tracker';

export interface NoteVersion {
    id: string;
    content: string;
    timestamp: Date;
    changes: DeltaChange[];
    userId: string;
    analytics: {
        totalChanges: number;
        editTime: number;
        keystrokesPerMinute: number;
        changesBySection: Record<string, number>;
    };
}

export interface EnhancedNote {
    id: string;
    content: string;
    originalContent: string;  // ✨ NEW: Original AI-generated content
    metadata: {
        patientId: string;
        clinicalContext: any;
        generatedAt: Date;
        aiProvider: string;
        template?: string;
    };
    versions: NoteVersion[];
    lastModified: Date;
    isEdited: boolean;        // ✨ NEW: Track if note has been edited
    editAnalytics: {          // ✨ NEW: Aggregate edit analytics
        totalEditSessions: number;
        totalChanges: number;
        averageEditTime: number;
        mostEditedSection: string;
    };
}

export class EnhancedNoteStorage {

    /**
     * Save a note with full edit history tracking
     */
    static async saveNoteWithHistory(
        noteId: string,
        content: string,
        editSession: EditSession,
        userId: string
    ): Promise<void> {
        try {
            const noteRef = doc(db, 'notes', noteId);
            const noteDoc = await getDoc(noteRef);

            if (!noteDoc.exists()) {
                throw new Error('Note not found');
            }

            const existingNote = noteDoc.data();

            // Create new version entry
            const versionData = {
                content,
                timestamp: serverTimestamp(),
                changes: editSession.changes,
                userId,
                analytics: {
                    totalChanges: editSession.totalChanges,
                    editTime: editSession.endTime
                        ? editSession.endTime.getTime() - editSession.startTime.getTime()
                        : 0,
                    keystrokesPerMinute: 0, // Calculate from session data
                    changesBySection: this.aggregateChangesBySection(editSession.changes)
                }
            };

            // Add to versions subcollection
            const versionsRef = collection(noteRef, 'editHistory');
            await addDoc(versionsRef, versionData);

            // Update main note document
            const updatedAnalytics = await this.calculateUpdatedAnalytics(noteId, editSession);

            await updateDoc(noteRef, {
                content,
                lastModified: serverTimestamp(),
                isEdited: true,
                editAnalytics: updatedAnalytics
            });

            console.log('Note saved with edit history:', noteId);

        } catch (error) {
            console.error('Error saving note with history:', error);
            throw error;
        }
    }

    /**
     * Get note with full edit history
     */
    static async getNoteWithHistory(noteId: string): Promise<EnhancedNote | null> {
        try {
            const noteRef = doc(db, 'notes', noteId);
            const noteDoc = await getDoc(noteRef);

            if (!noteDoc.exists()) {
                return null;
            }

            const noteData = noteDoc.data();

            // Get edit history
            const versionsRef = collection(noteRef, 'editHistory');
            const versionsQuery = query(versionsRef, orderBy('timestamp', 'desc'), limit(50));
            const versionsSnapshot = await getDocs(versionsQuery);

            const versions: NoteVersion[] = versionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: (doc.data().timestamp as Timestamp).toDate()
            })) as NoteVersion[];

            return {
                id: noteDoc.id,
                content: noteData.content,
                originalContent: noteData.originalContent || noteData.content,
                metadata: {
                    ...noteData.metadata,
                    generatedAt: (noteData.metadata.generatedAt as Timestamp).toDate()
                },
                versions,
                lastModified: (noteData.lastModified as Timestamp).toDate(),
                isEdited: noteData.isEdited || false,
                editAnalytics: noteData.editAnalytics || {
                    totalEditSessions: 0,
                    totalChanges: 0,
                    averageEditTime: 0,
                    mostEditedSection: 'Unknown'
                }
            };

        } catch (error) {
            console.error('Error getting note with history:', error);
            throw error;
        }
    }

    /**
     * Auto-save functionality
     */
    static async autoSaveNote(noteId: string, content: string): Promise<void> {
        try {
            const noteRef = doc(db, 'notes', noteId);

            await updateDoc(noteRef, {
                content,
                lastModified: serverTimestamp()
            });

        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't throw error for auto-save failures
        }
    }

    /**
     * Create initial note (called when note is first generated)
     */
    static async createNote(noteData: {
        content: string;
        metadata: any;
        userId: string;
    }): Promise<string> {
        try {
            const notesRef = collection(db, 'notes');

            const docRef = await addDoc(notesRef, {
                content: noteData.content,
                originalContent: noteData.content, // ✨ Store original for comparison
                metadata: {
                    ...noteData.metadata,
                    generatedAt: serverTimestamp()
                },
                lastModified: serverTimestamp(),
                createdBy: noteData.userId,
                isEdited: false,
                editAnalytics: {
                    totalEditSessions: 0,
                    totalChanges: 0,
                    averageEditTime: 0,
                    mostEditedSection: 'Unknown'
                }
            });

            return docRef.id;

        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    }

    // Private helper methods

    private static aggregateChangesBySection(changes: DeltaChange[]): Record<string, number> {
        const sectionCounts: Record<string, number> = {};

        changes.forEach(change => {
            const section = change.section || 'Unknown';
            sectionCounts[section] = (sectionCounts[section] || 0) + 1;
        });

        return sectionCounts;
    }

    private static async calculateUpdatedAnalytics(
        noteId: string,
        newSession: EditSession
    ): Promise<any> {
        try {
            const noteRef = doc(db, 'notes', noteId);
            const noteDoc = await getDoc(noteRef);

            if (!noteDoc.exists()) {
                throw new Error('Note not found');
            }

            const existingAnalytics = noteDoc.data().editAnalytics || {
                totalEditSessions: 0,
                totalChanges: 0,
                averageEditTime: 0,
                mostEditedSection: 'Unknown'
            };

            const sessionTime = newSession.endTime
                ? newSession.endTime.getTime() - newSession.startTime.getTime()
                : 0;

            const newTotalSessions = existingAnalytics.totalEditSessions + 1;
            const newTotalChanges = existingAnalytics.totalChanges + newSession.totalChanges;
            const newAverageEditTime = (
                (existingAnalytics.averageEditTime * existingAnalytics.totalEditSessions) + sessionTime
            ) / newTotalSessions;

            // Calculate most edited section
            const sessionChanges = this.aggregateChangesBySection(newSession.changes);
            const mostEditedSection = Object.entries(sessionChanges)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

            return {
                totalEditSessions: newTotalSessions,
                totalChanges: newTotalChanges,
                averageEditTime: newAverageEditTime,
                mostEditedSection
            };

        } catch (error) {
            console.error('Error calculating analytics:', error);
            return {
                totalEditSessions: 1,
                totalChanges: newSession.totalChanges,
                averageEditTime: 0,
                mostEditedSection: 'Unknown'
            };
        }
    }
}

// src/app/api/notes/[noteId]/route.ts
// ✨ NEW API ROUTE: Handle note saving with edit history

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

// src/app/api/notes/[noteId]/auto-save/route.ts
// ✨ NEW API ROUTE: Auto-save functionality

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
            message: 'Auto-saved successfully'
        });

    } catch (error) {
        console.error('Auto-save error:', error);
        return NextResponse.json(
            { error: 'Auto-save failed' },
            { status: 500 }
        );
    }
}