// src/components/medical/EditableNoteEditor.tsx - Rich Text Editor with Delta Tracking

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import {
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    DocumentTextIcon,
    LightBulbIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { editTrackingService } from '@/lib/firebase/editTracking';
import { EditDelta, EditModeState, LearningInsight } from '@/types/editTracking';

interface EditableNoteEditorProps {
    initialContent: string;
    sessionId: string;
    isEpicMode: boolean;
    onSave: (content: string) => void;
    onCancel: () => void;
    onLearningInsights?: (insights: LearningInsight[]) => void;
}

export default function EditableNoteEditor({
    initialContent,
    sessionId,
    isEpicMode,
    onSave,
    onCancel,
    onLearningInsights
}: EditableNoteEditorProps) {

    // Editor state
    const [content, setContent] = useState(initialContent);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    // Edit tracking state
    const [editCount, setEditCount] = useState(0);
    const [sessionStartTime] = useState(Date.now());
    const lastContentRef = useRef(initialContent);
    const typingTimerRef = useRef<NodeJS.Timeout>();
    const pauseStartRef = useRef<number>(Date.now());
    const pauseDurations = useRef<number[]>([]);
    const keystrokeCount = useRef<number>(0);
    const backspaceCount = useRef<number>(0);

    // Medical spell check dictionary (simplified)
    const medicalTerms = new Set([
        'psychiatric', 'depression', 'anxiety', 'bipolar', 'schizophrenia',
        'antidepressant', 'anxiolytic', 'mood', 'affect', 'psychosis',
        'delusion', 'hallucination', 'suicidal', 'homicidal', 'ideation'
    ]);

    // Initialize TipTap editor with medical features
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false
                }
            }),
            Placeholder.configure({
                placeholder: 'Edit your clinical note here...'
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true
            })
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6 bg-white rounded-lg border border-gray-200',
                spellcheck: 'true'
            },
            handleKeyDown: (view, event) => {
                keystrokeCount.current++;

                // Track backspace for frustration analysis
                if (event.key === 'Backspace' || event.key === 'Delete') {
                    backspaceCount.current++;
                }

                // Track pause durations for behavior analysis
                if (typingTimerRef.current) {
                    const pauseDuration = Date.now() - pauseStartRef.current;
                    if (pauseDuration > 1000) { // More than 1 second pause
                        pauseDurations.current.push(pauseDuration);
                    }
                }

                // Reset typing timer
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                    pauseStartRef.current = Date.now();
                }, 1000);

                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            handleContentChange(newContent);
        }
    });

    // Handle content changes and track deltas
    const handleContentChange = useCallback(async (newContent: string) => {
        if (newContent === lastContentRef.current) return;

        try {
            // Calculate edit delta
            const delta = calculateEditDelta(lastContentRef.current, newContent);

            if (delta) {
                // Add delta to Firebase
                await editTrackingService.addEditDelta(sessionId, {
                    timestamp: Date.now(),
                    operation: delta.operation,
                    position: delta.position,
                    length: delta.length,
                    content: delta.content,
                    previousContent: delta.previousContent,
                    sectionType: detectSectionType(delta.position, newContent),
                    charPosition: delta.position,
                    lineNumber: calculateLineNumber(newContent, delta.position),
                    userAgent: navigator.userAgent,
                    sessionDuration: Date.now() - sessionStartTime
                });

                setEditCount(prev => prev + 1);
            }

            setContent(newContent);
            setHasUnsavedChanges(true);
            lastContentRef.current = newContent;

            // Auto-save after 3 seconds of inactivity
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
                autoSave(newContent);
            }, 3000);

        } catch (error) {
            console.error('Error tracking edit delta:', error);
        }
    }, [sessionId, sessionStartTime]);

    // Auto-save functionality
    const autoSave = useCallback(async (content: string) => {
        if (!hasUnsavedChanges) return;

        setIsAutoSaving(true);
        try {
            // Here you could save to localStorage or make an API call
            // For now, we'll just update the last saved timestamp
            setLastSavedAt(new Date());
            setHasUnsavedChanges(false);
            console.log('Auto-saved content');
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            setIsAutoSaving(false);
        }
    }, [hasUnsavedChanges]);

    // Save and complete edit session
    const handleSave = async () => {
        if (!editor) return;

        const finalContent = editor.getHTML();

        try {
            // Complete the edit session with behavior metrics
            const behaviorMetrics = {
                pauseDurations: pauseDurations.current,
                averageTypingSpeed: calculateTypingSpeed(),
                backspaceFrequency: backspaceCount.current / keystrokeCount.current
            };

            const analysisResult = await editTrackingService.completeEditSession(
                sessionId,
                finalContent,
                behaviorMetrics
            );

            // Trigger learning insights if analysis found patterns
            if (analysisResult && onLearningInsights) {
                const insights: LearningInsight[] = analysisResult.patterns.map(pattern => ({
                    type: 'pattern_detected',
                    title: getPatternTitle(pattern.patternType),
                    description: pattern.description,
                    confidence: pattern.confidence,
                    actionable: true,
                    action: {
                        label: 'View Details',
                        type: 'view_details'
                    }
                }));

                onLearningInsights(insights);
            }

            onSave(finalContent);
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    // Calculate typing speed in WPM
    const calculateTypingSpeed = (): number => {
        const sessionDurationMinutes = (Date.now() - sessionStartTime) / 60000;
        const wordCount = content.split(/\s+/).length;
        return sessionDurationMinutes > 0 ? Math.round(wordCount / sessionDurationMinutes) : 0;
    };

    // Epic SmartPhrase highlighting
    const highlightEpicSyntax = useCallback(() => {
        if (!editor || !isEpicMode) return;

        const content = editor.getHTML();

        // Highlight @SMARTPHRASE@ syntax
        const smartPhraseRegex = /@[A-Z0-9_]+@/g;
        let highlightedContent = content;

        const smartPhrases = content.match(smartPhraseRegex);
        if (smartPhrases) {
            smartPhrases.forEach(phrase => {
                highlightedContent = highlightedContent.replace(
                    phrase,
                    `<mark class="bg-blue-100 text-blue-800 px-1 rounded">${phrase}</mark>`
                );
            });
        }

        // Note: In a real implementation, you'd want to use TipTap's mark system
        // for proper highlighting that doesn't interfere with editing
    }, [editor, isEpicMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }
        };
    }, []);

    // Highlight Epic syntax on content change
    useEffect(() => {
        if (isEpicMode) {
            highlightEpicSyntax();
        }
    }, [content, isEpicMode, highlightEpicSyntax]);

    if (!editor) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-gray-500">Loading editor...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <PencilIcon className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Edit Mode</span>
                    </div>

                    {/* Edit Statistics */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{editCount} edits</span>
                        <span>{Math.round((Date.now() - sessionStartTime) / 1000)}s</span>
                        {keystrokeCount.current > 0 && (
                            <span>{calculateTypingSpeed()} WPM</span>
                        )}
                    </div>

                    {/* Auto-save status */}
                    {isAutoSaving && (
                        <div className="flex items-center space-x-1 text-blue-600">
                            <ClockIcon className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Saving...</span>
                        </div>
                    )}

                    {lastSavedAt && !hasUnsavedChanges && (
                        <div className="flex items-center space-x-1 text-green-600">
                            <CheckIcon className="h-4 w-4" />
                            <span className="text-xs">
                                Saved {lastSavedAt.toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Editor Controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => editor.commands.undo()}
                        disabled={!editor.can().undo()}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Undo"
                    >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => editor.commands.redo()}
                        disabled={!editor.can().redo()}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Redo"
                    >
                        <ArrowUturnRightIcon className="h-4 w-4" />
                    </button>

                    {isEpicMode && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <DocumentTextIcon className="h-3 w-3" />
                            <span>Epic Mode</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Content */}
            <div className="relative">
                <EditorContent editor={editor} />

                {/* Unsaved changes indicator */}
                {hasUnsavedChanges && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full"></div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <LightBulbIcon className="h-4 w-4" />
                    <span>AI is learning from your edits to improve future notes</span>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <XMarkIcon className="h-4 w-4 inline mr-1" />
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges && editCount === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        <CheckIcon className="h-4 w-4 inline mr-1" />
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==================== HELPER FUNCTIONS ====================

// Calculate edit delta between two content versions
function calculateEditDelta(oldContent: string, newContent: string): Omit<EditDelta, 'id' | 'sessionId' | 'timestamp' | 'userAgent' | 'sessionDuration' | 'sectionType' | 'charPosition' | 'lineNumber'> | null {
    if (oldContent === newContent) return null;

    // Simple diff algorithm - in production, you'd use a more sophisticated algorithm
    const oldLength = oldContent.length;
    const newLength = newContent.length;

    // Find first difference
    let position = 0;
    while (position < Math.min(oldLength, newLength) && oldContent[position] === newContent[position]) {
        position++;
    }

    if (position === oldLength && position === newLength) return null;

    // Determine operation type
    if (newLength > oldLength) {
        // Insert operation
        const insertedContent = newContent.slice(position, position + (newLength - oldLength));
        return {
            operation: 'insert',
            position,
            content: insertedContent,
            length: insertedContent.length
        };
    } else if (newLength < oldLength) {
        // Delete operation
        const deletedContent = oldContent.slice(position, position + (oldLength - newLength));
        return {
            operation: 'delete',
            position,
            previousContent: deletedContent,
            length: deletedContent.length
        };
    } else {
        // Replace operation
        let endPosition = Math.min(oldLength, newLength) - 1;
        while (endPosition > position && oldContent[endPosition] === newContent[endPosition]) {
            endPosition--;
        }

        const replacedContent = oldContent.slice(position, endPosition + 1);
        const newContentSlice = newContent.slice(position, endPosition + 1);

        return {
            operation: 'replace',
            position,
            previousContent: replacedContent,
            content: newContentSlice,
            length: replacedContent.length
        };
    }
}

// Detect which section of the note is being edited
function detectSectionType(position: number, content: string): 'hpi' | 'assessment' | 'plan' | 'psychexam' | 'header' | 'other' {
    const beforePosition = content.slice(0, position).toLowerCase();

    if (beforePosition.includes('history of present illness') || beforePosition.includes('hpi')) {
        return 'hpi';
    } else if (beforePosition.includes('assessment') || beforePosition.includes('impression')) {
        return 'assessment';
    } else if (beforePosition.includes('plan') || beforePosition.includes('treatment')) {
        return 'plan';
    } else if (beforePosition.includes('mental status') || beforePosition.includes('psychiatric exam')) {
        return 'psychexam';
    } else if (position < content.length * 0.1) { // First 10% likely header
        return 'header';
    }

    return 'other';
}

// Calculate line number from character position
function calculateLineNumber(content: string, position: number): number {
    return (content.slice(0, position).match(/\n/g) || []).length + 1;
}

// Get human-readable pattern title
function getPatternTitle(patternType: string): string {
    const titles: Record<string, string> = {
        'frequent_deletion': 'Frequent Content Deletion',
        'consistent_addition': 'Consistent Content Addition',
        'section_reorganization': 'Section Reorganization',
        'terminology_preference': 'Terminology Preference',
        'style_adjustment': 'Style Adjustment'
    };
    return titles[patternType] || 'Pattern Detected';
}