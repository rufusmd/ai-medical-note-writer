// src/lib/notes/note-storage.ts
// ✨ CLEAN VERSION: Enhanced note storage with edit history and versioning

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
    originalContent: string;  // Original AI-generated content
    metadata: {
        patientId: string;
        clinicalContext: any;
        generatedAt: Date;
        aiProvider: string;
        template?: string;
    };
    versions: NoteVersion[];
    lastModified: Date;
    isEdited: boolean;        // Track if note has been edited
    editAnalytics: {          // Aggregate edit analytics
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
                originalContent: noteData.content, // Store original for comparison
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