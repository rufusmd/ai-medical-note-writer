// src/lib/firebase/notes.ts
// 📝 Notes Management Service with Firebase Integration

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    DocumentSnapshot
} from 'firebase/firestore';
import { db, firebaseUtils } from '@/lib/firebase/config';
import { EnhancedNote, NoteSearchFilters, EditAnalytics, NoteVersion } from '@/types/notes';

export interface CreateNoteData {
    content: string;
    originalContent?: string;
    metadata: any;
    userId: string;
    isEdited: boolean;
    editAnalytics: EditAnalytics;
    versions: NoteVersion[];
    tags?: string[];
    status?: 'draft' | 'final' | 'archived';
}

export interface UpdateNoteData {
    content?: string;
    isEdited?: boolean;
    editAnalytics?: EditAnalytics;
    versions?: NoteVersion[];
    tags?: string[];
    status?: 'draft' | 'final' | 'archived';
    lastModified?: Date;
}

class NotesService {
    private readonly collectionName = 'notes';

    private validateFirebaseInit(): void {
        if (!firebaseUtils.isInitialized()) {
            throw new Error('Firebase not initialized. Please check your configuration.');
        }
    }

    /**
     * Create a new clinical note
     */
    async createNote(noteData: CreateNoteData): Promise<EnhancedNote> {
        this.validateFirebaseInit();

        try {
            console.log('📝 Creating new clinical note');

            const notesRef = collection(db, this.collectionName);
            const now = new Date();

            const docData = {
                ...noteData,
                createdAt: Timestamp.fromDate(now),
                generatedAt: Timestamp.fromDate(noteData.metadata.generatedAt || now),
                lastModified: Timestamp.fromDate(now),
                status: noteData.status || 'draft'
            };

            const docRef = await addDoc(notesRef, docData);

            const createdNote: EnhancedNote = {
                id: docRef.id,
                ...noteData,
                createdAt: Timestamp.fromDate(now),
                generatedAt: Timestamp.fromDate(noteData.metadata.generatedAt || now),
                lastModified: Timestamp.fromDate(now),
                status: noteData.status || 'draft'
            };

            console.log('✅ Clinical note created successfully:', docRef.id);
            return createdNote;

        } catch (error) {
            console.error('❌ Error creating note:', error);
            throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a note by ID
     */
    async getNote(noteId: string): Promise<EnhancedNote | null> {
        try {
            const noteRef = doc(db, this.collectionName, noteId);
            const noteSnap = await getDoc(noteRef);

            if (!noteSnap.exists()) {
                return null;
            }

            const data = noteSnap.data();
            return {
                id: noteSnap.id,
                content: data.content,
                originalContent: data.originalContent,
                metadata: data.metadata,
                userId: data.userId,
                isEdited: data.isEdited || false,
                editAnalytics: data.editAnalytics || {
                    totalEdits: 0,
                    totalEditTime: 0,
                    sectionsEdited: [],
                    editHistory: []
                },
                versions: data.versions || [],
                tags: data.tags || [],
                createdAt: data.createdAt,
                generatedAt: data.generatedAt,
                lastModified: data.lastModified,
                status: data.status || 'draft'
            };

        } catch (error) {
            console.error('❌ Error fetching note:', error);
            throw new Error(`Failed to fetch note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all notes for a specific user
     */
    async getUserNotes(userId: string, filters: NoteSearchFilters = {}): Promise<EnhancedNote[]> {
        try {
            console.log('📋 Fetching notes for user:', userId);

            const notesRef = collection(db, this.collectionName);
            let notesQuery = query(
                notesRef,
                where('userId', '==', userId),
                orderBy('generatedAt', 'desc')
            );

            // Apply filters
            if (filters.patientId) {
                notesQuery = query(
                    notesRef,
                    where('userId', '==', userId),
                    where('metadata.patientId', '==', filters.patientId),
                    orderBy('generatedAt', 'desc')
                );
            }

            if (filters.visitType) {
                notesQuery = query(
                    notesRef,
                    where('userId', '==', userId),
                    where('metadata.visitType', '==', filters.visitType),
                    orderBy('generatedAt', 'desc')
                );
            }

            if (filters.aiProvider) {
                notesQuery = query(
                    notesRef,
                    where('userId', '==', userId),
                    where('metadata.aiProvider', '==', filters.aiProvider),
                    orderBy('generatedAt', 'desc')
                );
            }

            if (filters.status) {
                notesQuery = query(
                    notesRef,
                    where('userId', '==', userId),
                    where('status', '==', filters.status),
                    orderBy('generatedAt', 'desc')
                );
            }

            // Apply limit if specified
            const queryLimit = Math.min(filters.searchTerm ? 100 : 50, 100); // Fetch more for search, limit for performance
            notesQuery = query(notesQuery, limit(queryLimit));

            const querySnapshot = await getDocs(notesQuery);
            const notes: EnhancedNote[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                notes.push({
                    id: doc.id,
                    content: data.content,
                    originalContent: data.originalContent,
                    metadata: data.metadata,
                    userId: data.userId,
                    isEdited: data.isEdited || false,
                    editAnalytics: data.editAnalytics || {
                        totalEdits: 0,
                        totalEditTime: 0,
                        sectionsEdited: [],
                        editHistory: []
                    },
                    versions: data.versions || [],
                    tags: data.tags || [],
                    createdAt: data.createdAt,
                    generatedAt: data.generatedAt,
                    lastModified: data.lastModified,
                    status: data.status || 'draft'
                });
            });

            // Apply client-side filters
            let filteredNotes = notes;

            // Search term filter
            if (filters.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                filteredNotes = notes.filter(note =>
                    note.content.toLowerCase().includes(searchLower) ||
                    note.metadata.patientName?.toLowerCase().includes(searchLower) ||
                    note.metadata.clinic?.toLowerCase().includes(searchLower)
                );
            }

            // Date range filter
            if (filters.dateRange) {
                filteredNotes = filteredNotes.filter(note => {
                    const noteDate = note.generatedAt instanceof Timestamp ? note.generatedAt.toDate() : note.generatedAt;
                    return noteDate >= filters.dateRange!.start && noteDate <= filters.dateRange!.end;
                });
            }

            // Transfer of care filter
            if (filters.hasTransferData !== undefined) {
                filteredNotes = filteredNotes.filter(note =>
                    !!note.metadata.isTransferOfCare === filters.hasTransferData
                );
            }

            // Quality score filter
            if (filters.qualityScore) {
                filteredNotes = filteredNotes.filter(note => {
                    const score = note.metadata.qualityScore || 0;
                    return score >= filters.qualityScore!.min && score <= filters.qualityScore!.max;
                });
            }

            // Tags filter
            if (filters.tags && filters.tags.length > 0) {
                filteredNotes = filteredNotes.filter(note =>
                    filters.tags!.some(tag => note.tags?.includes(tag))
                );
            }

            console.log(`✅ Found ${filteredNotes.length} notes`);
            return filteredNotes;

        } catch (error) {
            console.error('❌ Error fetching user notes:', error);
            throw new Error(`Failed to fetch notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a note
     */
    async updateNote(noteId: string, updateData: UpdateNoteData): Promise<EnhancedNote> {
        try {
            console.log('📝 Updating note:', noteId);

            const noteRef = doc(db, this.collectionName, noteId);

            // Convert Date to Timestamp for Firestore
            const firestoreUpdateData = {
                ...updateData,
                lastModified: Timestamp.fromDate(updateData.lastModified || new Date())
            };

            await updateDoc(noteRef, firestoreUpdateData);

            // Fetch and return updated note
            const updatedNote = await this.getNote(noteId);
            if (!updatedNote) {
                throw new Error('Note not found after update');
            }

            console.log('✅ Note updated successfully');
            return updatedNote;

        } catch (error) {
            console.error('❌ Error updating note:', error);
            throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string): Promise<void> {
        try {
            console.log('🗑️ Deleting note:', noteId);

            const noteRef = doc(db, this.collectionName, noteId);
            await deleteDoc(noteRef);

            console.log('✅ Note deleted successfully');

        } catch (error) {
            console.error('❌ Error deleting note:', error);
            throw new Error(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get notes for a specific patient
     */
    async getPatientNotes(patientId: string, limitCount: number = 10): Promise<EnhancedNote[]> {
        try {
            console.log('👤 Fetching notes for patient:', patientId);

            const notesRef = collection(db, this.collectionName);
            const patientQuery = query(
                notesRef,
                where('metadata.patientId', '==', patientId),
                orderBy('generatedAt', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(patientQuery);
            const notes: EnhancedNote[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                notes.push({
                    id: doc.id,
                    content: data.content,
                    originalContent: data.originalContent,
                    metadata: data.metadata,
                    userId: data.userId,
                    isEdited: data.isEdited || false,
                    editAnalytics: data.editAnalytics || {
                        totalEdits: 0,
                        totalEditTime: 0,
                        sectionsEdited: [],
                        editHistory: []
                    },
                    versions: data.versions || [],
                    tags: data.tags || [],
                    createdAt: data.createdAt,
                    generatedAt: data.generatedAt,
                    lastModified: data.lastModified,
                    status: data.status || 'draft'
                });
            });

            console.log(`✅ Found ${notes.length} notes for patient`);
            return notes;

        } catch (error) {
            console.error('❌ Error fetching patient notes:', error);
            throw new Error(`Failed to fetch patient notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Search notes with advanced filters
     */
    async searchNotes(userId: string, searchTerm: string, filters: NoteSearchFilters = {}): Promise<EnhancedNote[]> {
        try {
            console.log('🔍 Searching notes for:', searchTerm);

            // Use getUserNotes with search term filter
            const searchFilters: NoteSearchFilters = {
                ...filters,
                searchTerm
            };

            return await this.getUserNotes(userId, searchFilters);

        } catch (error) {
            console.error('❌ Error searching notes:', error);
            throw new Error(`Failed to search notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get user note statistics
     */
    async getUserNoteStats(userId: string): Promise<{
        totalNotes: number;
        notesByProvider: { gemini: number; claude: number };
        notesByVisitType: Record<string, number>;
        transferOfCareNotes: number;
        editedNotes: number;
        averageQualityScore: number;
    }> {
        try {
            console.log('📊 Getting note statistics for user:', userId);

            const allNotes = await this.getUserNotes(userId);

            const stats = {
                totalNotes: allNotes.length,
                notesByProvider: {
                    gemini: allNotes.filter(n => n.metadata.aiProvider === 'gemini').length,
                    claude: allNotes.filter(n => n.metadata.aiProvider === 'claude').length
                },
                notesByVisitType: allNotes.reduce((acc, note) => {
                    const visitType = note.metadata.visitType || 'unknown';
                    acc[visitType] = (acc[visitType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                transferOfCareNotes: allNotes.filter(n => n.metadata.isTransferOfCare).length,
                editedNotes: allNotes.filter(n => n.isEdited).length,
                averageQualityScore: allNotes.reduce((sum, note) => {
                    return sum + (note.metadata.qualityScore || 0);
                }, 0) / Math.max(allNotes.length, 1)
            };

            console.log('✅ Note statistics calculated:', stats);
            return stats;

        } catch (error) {
            console.error('❌ Error getting note statistics:', error);
            throw new Error(`Failed to get note statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Batch operations for multiple notes
     */
    async batchUpdateNotes(updates: Array<{ noteId: string; updateData: UpdateNoteData }>): Promise<void> {
        try {
            console.log('🔄 Performing batch update on', updates.length, 'notes');

            // For simplicity, perform sequential updates
            // In production, you might want to use Firestore batch operations
            const updatePromises = updates.map(({ noteId, updateData }) =>
                this.updateNote(noteId, updateData)
            );

            await Promise.all(updatePromises);
            console.log('✅ Batch update completed');

        } catch (error) {
            console.error('❌ Error in batch update:', error);
            throw new Error(`Failed to batch update notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get recent notes with pagination
     */
    async getRecentNotes(userId: string, limitCount: number = 20, lastDoc?: DocumentSnapshot): Promise<{
        notes: EnhancedNote[];
        lastDoc?: DocumentSnapshot;
        hasMore: boolean;
    }> {
        try {
            const notesRef = collection(db, this.collectionName);
            let notesQuery = query(
                notesRef,
                where('userId', '==', userId),
                orderBy('generatedAt', 'desc'),
                limit(limitCount + 1) // Fetch one extra to check if there are more
            );

            if (lastDoc) {
                notesQuery = query(notesQuery, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(notesQuery);
            const notes: EnhancedNote[] = [];
            let newLastDoc: DocumentSnapshot | undefined;

            querySnapshot.forEach((doc, index) => {
                if (index < limitCount) {
                    const data = doc.data();
                    notes.push({
                        id: doc.id,
                        content: data.content,
                        originalContent: data.originalContent,
                        metadata: data.metadata,
                        userId: data.userId,
                        isEdited: data.isEdited || false,
                        editAnalytics: data.editAnalytics || {
                            totalEdits: 0,
                            totalEditTime: 0,
                            sectionsEdited: [],
                            editHistory: []
                        },
                        versions: data.versions || [],
                        tags: data.tags || [],
                        createdAt: data.createdAt,
                        generatedAt: data.generatedAt,
                        lastModified: data.lastModified,
                        status: data.status || 'draft'
                    });
                    newLastDoc = doc;
                }
            });

            const hasMore = querySnapshot.docs.length > limitCount;

            return {
                notes,
                lastDoc: newLastDoc,
                hasMore
            };

        } catch (error) {
            console.error('❌ Error fetching recent notes:', error);
            throw new Error(`Failed to fetch recent notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const notesService = new NotesService();