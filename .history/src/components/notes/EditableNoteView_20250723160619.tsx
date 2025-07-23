// src/components/notes/EditableNoteView.tsx
// ✨ NEW COMPONENT: Rich text editor replacing static note display

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CharacterCount from '@tiptap/extension-character-count';
import { useDeltaTracker } from '../../hooks/useDeltaTracker';
import { DeltaChange } from '../../lib/notes/delta-tracker';
import { SaveButton } from './SaveButton';
import { EditHistory } from './EditHistory';
import { debounce } from 'lodash';

interface EditableNoteViewProps {
    noteId: string;
    initialContent: string;
    metadata: {
        patientId: string;
        clinicalContext: any;
        generatedAt: Date;
        aiProvider: string;
    };
    onSave?: (content: string, changes: any) => void;
    onAutoSave?: (content: string) => void;
    readOnly?: boolean;
}

export function EditableNoteView({
    noteId,
    initialContent,
    metadata,
    onSave,
    onAutoSave,
    readOnly = false
}: EditableNoteViewProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showEditHistory, setShowEditHistory] = useState(false);
    const [editHistory, setEditHistory] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false); // ✨ Track client-side mounting

    // ✨ Ensure client-side only rendering
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Auto-save functionality (defined before useEditor)
    const debouncedAutoSave = useCallback(
        debounce((content: string) => {
            if (onAutoSave && hasUnsavedChanges) {
                onAutoSave(content);
                console.log('Auto-saved at:', new Date().toISOString());
            }
        }, 2000), // Auto-save after 2 seconds of inactivity
        [onAutoSave, hasUnsavedChanges]
    );

    const handleContentChange = (content: string) => {
        setHasUnsavedChanges(true);
        debouncedAutoSave(content);
    };

    // TipTap editor configuration with SSR fix
    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                HTMLAttributes: {
                    class: 'highlight-edit',
                },
            }),
            Color,
            TextStyle,
            CharacterCount.configure({
                limit: 50000, // 50k character limit for clinical notes
            }),
        ],
        content: initialContent,
        editable: !readOnly,
        immediatelyRender: false, // ✨ FIX: Prevents SSR hydration issues
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            handleContentChange(content);
        },
    });

    // ✨ Use delta tracker hook AFTER editor is initialized
    const deltaTracker = useDeltaTracker({
        editor,
        noteId,
        initialContent,
        onDeltaDetected: (delta) => {
            setHasUnsavedChanges(true);
            console.log('Delta detected:', delta);
        },
        enabled: isMounted && !!editor
    });

    // Initialize delta tracker
    useEffect(() => {
        if (editor && !deltaTrackerRef.current && isMounted) {
            deltaTrackerRef.current = new DeltaTrackerCore({
                editor,
                noteId,
                initialContent,
                onDeltaDetected: (delta) => {
                    setHasUnsavedChanges(true);
                    // Track the change for learning
                    console.log('Delta detected:', delta);
                }
            });
        }

        return () => {
            if (deltaTrackerRef.current) {
                deltaTrackerRef.current.destroy();
            }
        };
    }, [editor, noteId, initialContent, isMounted]);

    // Handle save functionality
    const handleSave = async () => {
        if (!editor || !onSave) return;

        setIsSaving(true);
        try {
            const content = editor.getHTML();
            const changes = deltaTracker.getChanges();

            await onSave(content, changes);
            setHasUnsavedChanges(false);

            // Reset delta tracker for new baseline
            deltaTracker.resetBaseline(content);

        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard shortcuts
    const handleKeyDown = (event: React.KeyboardEvent) => {
        // Ctrl+S / Cmd+S to save
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            handleSave();
        }
    };

    if (!isMounted || !editor) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <span className="ml-2 text-gray-600">Loading editor...</span>
            </div>
        );
    }

    const characterCount = editor.storage.characterCount.characters();
    const wordCount = editor.storage.characterCount.words();

    return (
        <div className="space-y-4">
            {/* Editor Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Clinical Note {readOnly ? '(Read Only)' : ''}
                        </h3>
                        {hasUnsavedChanges && !readOnly && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Unsaved changes
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {!readOnly && (
                            <>
                                <button
                                    onClick={() => setShowEditHistory(!showEditHistory)}
                                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    {showEditHistory ? 'Hide' : 'Show'} History
                                </button>

                                <SaveButton
                                    onSave={handleSave}
                                    isSaving={isSaving}
                                    hasUnsavedChanges={hasUnsavedChanges}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-2 text-sm text-gray-500 flex space-x-4">
                    <span>{wordCount} words</span>
                    <span>{characterCount} characters</span>
                    <span>Generated by {metadata.aiProvider}</span>
                    <span>Patient: {metadata.patientId}</span>
                </div>
            </div>

            {/* Main Editor Container */}
            <div className="flex space-x-4">
                {/* Editor */}
                <div className="flex-1">
                    <div
                        className="bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                        onKeyDown={handleKeyDown}
                    >
                        {/* Editor Toolbar */}
                        {!readOnly && (
                            <div className="border-b border-gray-200 p-3">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => editor.chain().focus().toggleBold().run()}
                                        className={`px-2 py-1 rounded text-sm ${editor.isActive('bold')
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Bold
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleItalic().run()}
                                        className={`px-2 py-1 rounded text-sm ${editor.isActive('italic')
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Italic
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                                        className={`px-2 py-1 rounded text-sm ${editor.isActive('highlight')
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        Highlight
                                    </button>

                                    <div className="w-px h-6 bg-gray-300 mx-2"></div>

                                    <button
                                        onClick={() => editor.chain().focus().undo().run()}
                                        disabled={!editor.can().undo()}
                                        className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Undo
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().redo().run()}
                                        disabled={!editor.can().redo()}
                                        className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Redo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Editor Content */}
                        <div className="p-4">
                            <EditorContent
                                editor={editor}
                                className="prose prose-sm max-w-none min-h-[400px] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Edit History Sidebar */}
                {showEditHistory && (
                    <div className="w-80">
                        <EditHistory
                            noteId={noteId}
                            editHistory={editHistory}
                            onRevertToVersion={(version) => {
                                editor.commands.setContent(version.content);
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Medical Note Sections Hint */}
            {!readOnly && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                        <strong>Tip:</strong> This note follows Epic formatting. Edit sections as needed, and changes will be tracked automatically for learning.
                    </p>
                </div>
            )}
        </div>
    );
}