// src/lib/firebase/notes.ts
// Simple notes service wrapper for compatibility

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { EnhancedNote } from '@/types/notes';

export const notesService = {
    /**
     * Get all notes for a user
     */
    async getUserNotes(userId: string): Promise<EnhancedNote[]> {
        try {
            const notesRef = collection(db, 'notes');
            const q = query(
                notesRef,
                where('createdBy', '==', userId),
                orderBy('lastModified', 'desc'),
                limit(50)
            );

            const querySnapshot = await getDocs(q);

            const notes: EnhancedNote[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data.content || '',
                    originalContent: data.originalContent || data.content || '',
                    metadata: {
                        ...data.metadata,
                        generatedAt: data.metadata?.generatedAt instanceof Timestamp
                            ? data.metadata.generatedAt.toDate()
                            : new Date(data.metadata?.generatedAt || Date.now())
                    },
                    versions: data.versions || [],
                    lastModified: data.lastModified instanceof Timestamp
                        ? data.lastModified.toDate()
                        : new Date(data.lastModified || Date.now()),
                    isEdited: data.isEdited || false,
                    editAnalytics: data.editAnalytics || {
                        totalEdits: 0,
                        totalEditTime: 0,
                        sectionsEdited: [],
                        editHistory: []
                    },
                    createdBy: data.createdBy || userId
                };
            });

            return notes;
        } catch (error) {
            console.error('Error getting user notes:', error);
            throw error;
        }
    },

    /**
     * Create a new note
     */
    async createNote(noteData: {
        content: string;
        originalContent: string;
        metadata: any;
        userId: string;
        isEdited: boolean;
        editAnalytics: any;
        versions: any[];
    }): Promise<EnhancedNote> {
        try {
            const notesRef = collection(db, 'notes');

            const docData = {
                content: noteData.content,
                originalContent: noteData.originalContent,
                metadata: {
                    ...noteData.metadata,
                    generatedAt: serverTimestamp()
                },
                versions: noteData.versions,
                lastModified: serverTimestamp(),
                isEdited: noteData.isEdited,
                editAnalytics: noteData.editAnalytics,
                createdBy: noteData.userId,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(notesRef, docData);

            // Return the created note
            const createdNote: EnhancedNote = {
                id: docRef.id,
                content: noteData.content,
                originalContent: noteData.originalContent,
                metadata: {
                    ...noteData.metadata,
                    generatedAt: new Date()
                },
                versions: noteData.versions,
                lastModified: new Date(),
                isEdited: noteData.isEdited,
                editAnalytics: noteData.editAnalytics,
                createdBy: noteData.userId
            };

            return createdNote;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    /**
     * Update an existing note
     */
    async updateNote(noteId: string, updates: Partial<EnhancedNote>): Promise<void> {
        try {
            const noteRef = doc(db, 'notes', noteId);

            const updateData: any = {
                ...updates,
                lastModified: serverTimestamp()
            };

            // Handle nested timestamp fields
            if (updates.metadata?.generatedAt) {
                updateData.metadata = {
                    ...updates.metadata,
                    generatedAt: serverTimestamp()
                };
            }

            await updateDoc(noteRef, updateData);
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    /**
     * Auto-save a note (lightweight update)
     */
    async autoSaveNote(noteId: string, content: string): Promise<void> {
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
};