// src/components/medical/EditableNoteEditor.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
    PencilIcon,
    DocumentDuplicateIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Types for delta tracking
interface EditDelta {
    id: string;
    timestamp: number;
    type: 'insert' | 'delete' | 'replace';
    position: number;
    oldContent: string;
    newContent: string;
    length: number;
    clinicalContext?: any;
    userId: string;
}

interface EditableNoteEditorProps {
    initialContent: string;
    noteId: string;
    patientId: string;
    clinicalContext: any;
    onSave: (content: string, deltas: EditDelta[]) => Promise<void>;
    onDeltaCapture?: (delta: EditDelta) => void;
    isLoading?: boolean;
    className?: string;
}

// Epic SmartPhrase detection extension
const EpicSyntaxHighlight = Highlight.extend({
    addOptions() {
        return {
            ...this.parent?.(),
            multicolor: true,
        };
    },
}).configure({
    multicolor: true,
});

// Medical spell-check words (expandable)
const medicalTerms = [
    'psychiatric', 'psychopharmacology', 'bipolar', 'schizophrenia',
    'antidepressant', 'anxiolytic', 'antipsychotic', 'benzodiazepine',
    'sertraline', 'fluoxetine', 'quetiapine', 'aripiprazole',
    'PHQ-9', 'GAD-7', 'MSE', 'HPI', 'ROS', 'PMHX'
];

export default function EditableNoteEditor({
    initialContent,
    noteId,
    patientId,
    clinicalContext,
    onSave,
    onDeltaCapture,
    isLoading = false,
    className = ''
}: EditableNoteEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [originalContent, setOriginalContent] = useState(initialContent);
    const [editDeltas, setEditDeltas] = useState<EditDelta[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

    // TipTap editor configuration
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Placeholder.configure({
                placeholder: 'Generated note will appear here. Click to edit and improve...',
            }),
            CharacterCount.configure({
                limit: 15000, // Handle large medical notes
            }),
            EpicSyntaxHighlight,
            TextStyle,
            Color.configure({ types: [TextStyle.name] }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[400px] max-w-none',
            },
        },
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            handleContentChange(newContent);
        },
    });

    // Character-level delta tracking
    const calculateDelta = useCallback((oldText: string, newText: string): EditDelta | null => {
        if (oldText === newText) return null;

        // Find the first difference
        let start = 0;
        while (start < Math.min(oldText.length, newText.length) &&
            oldText[start] === newText[start]) {
            start++;
        }

        // Find the last difference
        let oldEnd = oldText.length;
        let newEnd = newText.length;
        while (oldEnd > start && newEnd > start &&
            oldText[oldEnd - 1] === newText[newEnd - 1]) {
            oldEnd--;
            newEnd--;
        }

        const oldContent = oldText.slice(start, oldEnd);
        const newContent = newText.slice(start, newEnd);

        let type: 'insert' | 'delete' | 'replace';
        if (oldContent === '') type = 'insert';
        else if (newContent === '') type = 'delete';
        else type = 'replace';

        const delta: EditDelta = {
            id: `delta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            position: start,
            oldContent,
            newContent,
            length: Math.max(oldContent.length, newContent.length),
            clinicalContext,
            userId: 'current_user', // Replace with actual user ID
        };

        return delta;
    }, [clinicalContext]);

    // Handle content changes with delta tracking
    const handleContentChange = useCallback((newContent: string) => {
        const delta = calculateDelta(content, newContent);

        if (delta) {
            setEditDeltas(prev => [...prev, delta]);
            onDeltaCapture?.(delta);
            setHasUnsavedChanges(true);
        }

        setContent(newContent);
    }, [content, calculateDelta, onDeltaCapture]);

    // Auto-highlight Epic SmartPhrases
    useEffect(() => {
        if (editor && content) {
            // Highlight @SMARTPHRASE@ patterns
            const smartPhraseRegex = /@[A-Z0-9_]+@/g;
            let match;
            while ((match = smartPhraseRegex.exec(content)) !== null) {
                // Add highlighting for Epic syntax
                // This is a simplified version - could be enhanced
            }
        }
    }, [editor, content]);

    // Copy functionality
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success('Note copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy note');
        }
    };

    // Save functionality
    const handleSave = async () => {
        if (!hasUnsavedChanges || isSaving) return;

        setIsSaving(true);
        try {
            await onSave(content, editDeltas);
            setOriginalContent(content);
            setEditDeltas([]);
            setHasUnsavedChanges(false);
            setLastSaveTime(new Date());
            toast.success('Note saved successfully');
        } catch (error) {
            toast.error('Failed to save note');
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save functionality
    useEffect(() => {
        if (hasUnsavedChanges) {
            const autoSaveTimer = setTimeout(() => {
                handleSave();
            }, 30000); // Auto-save after 30 seconds of inactivity

            return () => clearTimeout(autoSaveTimer);
        }
    }, [hasUnsavedChanges, content]);

    // Update editor content when initialContent changes
    useEffect(() => {
        if (editor && initialContent !== content) {
            editor.commands.setContent(initialContent);
            setContent(initialContent);
            setOriginalContent(initialContent);
            setEditDeltas([]);
            setHasUnsavedChanges(false);
        }
    }, [initialContent, editor]);

    if (!editor) {
        return (
            <div className="animate-pulse">
                <div className="h-96 bg-gray-100 rounded-lg"></div>
            </div>
        );
    }

    const characterCount = editor.storage.characterCount.characters();
    const wordCount = editor.storage.characterCount.words();

    return (
        <div className={`w-full ${className}`}>
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-t-lg">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <PencilIcon className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">
                            Editable Note
                        </span>
                    </div>

                    {hasUnsavedChanges && (
                        <div className="flex items-center space-x-2 text-amber-600">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span className="text-sm">Unsaved changes</span>
                        </div>
                    )}

                    {editDeltas.length > 0 && (
                        <div className="flex items-center space-x-2 text-indigo-600">
                            <SparklesIcon className="h-4 w-4" />
                            <span className="text-sm">{editDeltas.length} edits tracked</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    {/* Stats */}
                    <div className="text-sm text-gray-500">
                        {wordCount} words · {characterCount} characters
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleCopy}
                        className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        <span>Copy</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${hasUnsavedChanges && !isSaving
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <CheckIcon className="h-4 w-4" />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="relative border border-t-0 border-gray-200 rounded-b-lg">
                {isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                <EditorContent
                    editor={editor}
                    className="min-h-[400px] p-6 prose prose-sm max-w-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
                />
            </div>

            {/* Last Save Info */}
            {lastSaveTime && (
                <div className="mt-2 text-xs text-gray-500 text-right">
                    Last saved: {lastSaveTime.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}