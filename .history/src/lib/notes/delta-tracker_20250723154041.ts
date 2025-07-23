// src/lib/notes/delta-tracker.ts
// ✨ NEW FILE: Core delta tracking logic

import { diffWords, Change } from 'diff';
import CryptoJS from 'crypto-js';

export interface DeltaChange {
    id: string;
    timestamp: Date;
    type: 'addition' | 'deletion' | 'modification';
    content: string;
    position: number;
    context: {
        before: string;  // 50 characters before change
        after: string;   // 50 characters after change
    };
    section?: string;  // Medical note section (HPI, Assessment, Plan, etc.)
    metadata: {
        wordCount: number;
        characterCount: number;
        timeFromStart: number; // ms since editing started
        keystrokes?: number;
    };
}

export interface EditSession {
    id: string;
    noteId: string;
    startTime: Date;
    endTime?: Date;
    totalChanges: number;
    changes: DeltaChange[];
    clinicalContext: any;
}

export class DeltaTracker {
    private noteId: string;
    private initialContent: string;
    private currentContent: string;
    private changes: DeltaChange[] = [];
    private sessionStartTime: Date;
    private lastChangeTime: Date;
    private onDeltaDetected: (delta: DeltaChange) => void;
    private keystrokeCount = 0;

    // Medical note sections regex patterns
    private sectionPatterns = {
        'Chief Complaint': /(?:chief complaint|cc):\s*/i,
        'HPI': /(?:history of present illness|hpi):\s*/i,
        'Assessment': /(?:assessment|impression):\s*/i,
        'Plan': /(?:plan|treatment plan):\s*/i,
        'Review of Systems': /(?:review of systems|ros):\s*/i,
        'Physical Exam': /(?:physical exam|pe|examination):\s*/i,
        'Social History': /(?:social history|sh):\s*/i,
        'Medications': /(?:medications|meds|current medications):\s*/i
    };

    constructor(options: {
        editor: any;
        noteId: string;
        initialContent: string;
        onDeltaDetected: (delta: DeltaChange) => void;
    }) {
        this.noteId = options.noteId;
        this.initialContent = options.initialContent;
        this.currentContent = options.initialContent;
        this.onDeltaDetected = options.onDeltaDetected;
        this.sessionStartTime = new Date();
        this.lastChangeTime = new Date();

        // Set up event listeners
        this.setupEventListeners(options.editor);
    }

    private setupEventListeners(editor: any) {
        // Track content changes
        if (editor && editor.on) {
            editor.on('update', ({ transaction }: any) => {
                const newContent = editor.getHTML();
                this.handleContentChange(newContent);
            });
        }

        // Track keystrokes for metadata
        if (editor && editor.view && editor.view.dom) {
            editor.view.dom.addEventListener('keydown', () => {
                this.keystrokeCount++;
            });
        }
    }

    private handleContentChange(newContent: string) {
        if (newContent === this.currentContent) return;

        const now = new Date();
        const timeFromStart = now.getTime() - this.sessionStartTime.getTime();

        // Generate diff between current and new content
        const changes = this.generateDiff(this.currentContent, newContent);

        // Process each change
        changes.forEach(change => {
            const deltaChange: DeltaChange = {
                id: this.generateChangeId(),
                timestamp: now,
                type: this.getChangeType(change),
                content: change.value,
                position: this.getChangePosition(change),
                context: this.getChangeContext(change, newContent),
                section: this.detectSection(change, newContent),
                metadata: {
                    wordCount: this.countWords(change.value),
                    characterCount: change.value.length,
                    timeFromStart,
                    keystrokes: this.keystrokeCount
                }
            };

            this.changes.push(deltaChange);
            this.onDeltaDetected(deltaChange);
        });

        this.currentContent = newContent;
        this.lastChangeTime = now;
    }

    private generateDiff(oldContent: string, newContent: string): Change[] {
        // Use word-level diff for better granularity
        return diffWords(oldContent, newContent);
    }

    private getChangeType(change: Change): 'addition' | 'deletion' | 'modification' {
        if (change.added) return 'addition';
        if (change.removed) return 'deletion';
        return 'modification';
    }

    private getChangePosition(change: Change): number {
        // Calculate position in the document
        // This is simplified - in production, you'd want more precise positioning
        return 0; // TODO: Implement proper position calculation
    }

    private getChangeContext(change: Change, fullContent: string): { before: string; after: string } {
        // Extract 50 characters before and after the change
        const position = fullContent.indexOf(change.value);
        const before = fullContent.substring(Math.max(0, position - 50), position);
        const after = fullContent.substring(position + change.value.length, position + change.value.length + 50);

        return { before, after };
    }

    private detectSection(change: Change, fullContent: string): string | undefined {
        // Detect which medical note section this change belongs to
        const position = fullContent.indexOf(change.value);
        const textBeforeChange = fullContent.substring(0, position);

        let currentSection: string | undefined;
        let lastSectionPosition = -1;

        // Find the most recent section header before this change
        for (const [sectionName, pattern] of Object.entries(this.sectionPatterns)) {
            const match = textBeforeChange.match(pattern);
            if (match && match.index !== undefined && match.index > lastSectionPosition) {
                lastSectionPosition = match.index;
                currentSection = sectionName;
            }
        }

        return currentSection;
    }

    private countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    private generateChangeId(): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2);
        return CryptoJS.SHA256(timestamp + random).toString().substring(0, 16);
    }

    // Public methods

    public getChanges(): DeltaChange[] {
        return [...this.changes]; // Return copy
    }

    public getEditSession(): EditSession {
        return {
            id: this.generateChangeId(),
            noteId: this.noteId,
            startTime: this.sessionStartTime,
            endTime: this.lastChangeTime,
            totalChanges: this.changes.length,
            changes: this.getChanges(),
            clinicalContext: {} // TODO: Add clinical context from props
        };
    }

    public resetBaseline(newContent: string) {
        // Reset tracking to new baseline after save
        this.initialContent = newContent;
        this.currentContent = newContent;
        this.changes = [];
        this.keystrokeCount = 0;
        this.sessionStartTime = new Date();
    }

    public getAnalytics() {
        const totalTime = this.lastChangeTime.getTime() - this.sessionStartTime.getTime();
        const totalAdditions = this.changes.filter(c => c.type === 'addition').length;
        const totalDeletions = this.changes.filter(c => c.type === 'deletion').length;
        const totalModifications = this.changes.filter(c => c.type === 'modification').length;

        // Group changes by section
        const changesBySection: Record<string, number> = {};
        this.changes.forEach(change => {
            const section = change.section || 'Unknown';
            changesBySection[section] = (changesBySection[section] || 0) + 1;
        });

        return {
            totalTime,
            totalChanges: this.changes.length,
            totalAdditions,
            totalDeletions,
            totalModifications,
            keystrokesPerMinute: (this.keystrokeCount / (totalTime / 60000)),
            changesBySection,
            averageWordsPerChange: this.changes.reduce((sum, c) => sum + c.metadata.wordCount, 0) / this.changes.length || 0
        };
    }

    public destroy() {
        // Clean up event listeners and references
        this.changes = [];
        this.onDeltaDetected = () => { };
    }
}

// ================================================================
// src/lib/notes/note-storage.ts
// ✨ NEW FILE: Enhanced note storage with edit history and versioning

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