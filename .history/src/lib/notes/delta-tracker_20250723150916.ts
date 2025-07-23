// src/lib/notes/delta-tracker.ts
// ✨ NEW: Core delta tracking logic

import { diff, Change } from 'diff';
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
        editor.on('update', ({ transaction }: any) => {
            const newContent = editor.getHTML();
            this.handleContentChange(newContent);
        });

        // Track keystrokes for metadata
        editor.view.dom.addEventListener('keydown', () => {
            this.keystrokeCount++;
        });
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
        return diff.diffWords(oldContent, newContent);
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

// src/components/notes/DeltaTracker.tsx
// ✨ NEW COMPONENT: React wrapper for delta tracking

import React, { useEffect, useRef } from 'react';
import { DeltaTracker as DeltaTrackerCore, DeltaChange } from '../../lib/notes/delta-tracker';

interface DeltaTrackerProps {
    editor: any;
    noteId: string;
    initialContent: string;
    onDeltaDetected: (delta: DeltaChange) => void;
    children?: React.ReactNode;
}

export function DeltaTracker({
    editor,
    noteId,
    initialContent,
    onDeltaDetected,
    children
}: DeltaTrackerProps) {
    const trackerRef = useRef<DeltaTrackerCore | null>(null);

    useEffect(() => {
        if (editor && !trackerRef.current) {
            trackerRef.current = new DeltaTrackerCore({
                editor,
                noteId,
                initialContent,
                onDeltaDetected
            });
        }

        return () => {
            if (trackerRef.current) {
                trackerRef.current.destroy();
                trackerRef.current = null;
            }
        };
    }, [editor, noteId, initialContent, onDeltaDetected]);

    // Expose tracker methods to parent components via ref
    React.useImperativeHandle(trackerRef, () => ({
        getChanges: () => trackerRef.current?.getChanges() || [],
        getEditSession: () => trackerRef.current?.getEditSession(),
        resetBaseline: (content: string) => trackerRef.current?.resetBaseline(content),
        getAnalytics: () => trackerRef.current?.getAnalytics()
    }));

    return <>{ children } </>;
}