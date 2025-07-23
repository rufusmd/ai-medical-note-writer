// src/components/notes/EditableNoteView.tsx
// 🎨 ENHANCED VERSION: Beautiful TipTap editor with medical styling

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CharacterCount from '@tiptap/extension-character-count';
import {
    Bold,
    Italic,
    Highlighter,
    Undo,
    Redo,
    Save,
    Clock,
    FileText,
    Activity,
    CheckCircle2,
    AlertCircle,
    Target
} from 'lucide-react';
import { debounce } from 'lodash';

interface EditableNoteViewProps {
    noteId: string;
    initialContent: string;
    metadata: {
        patientId: string;
        clinicalContext: any;
        generatedAt: Date;
        aiProvider: string;
        visitType?: string;
        clinic?: string;
        emr?: string;
    };
    onSave?: (content: string, changes: any) => Promise<void>;
    onAutoSave?: (content: string) => Promise<void>;
    readOnly?: boolean;
}

export default function EditableNoteView({
    noteId,
    initialContent,
    metadata,
    onSave,
    onAutoSave,
    readOnly = false
}: EditableNoteViewProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
    const [showEditHistory, setShowEditHistory] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                multicolor: true,
                HTMLAttributes: {
                    class: 'medical-highlight'
                }
            }),
            Color.configure({ types: [TextStyle.name] }),
            TextStyle,
            CharacterCount.configure({
                limit: 10000,
            }),
        ],
        content: formatContentWithSOAP(initialContent),
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            setHasUnsavedChanges(true);
            debouncedAutoSave(editor.getHTML());
        },
    });

    // Format content with SOAP structure
    function formatContentWithSOAP(content: string): string {
        if (!content) return '';

        // If content already has SOAP structure, return as-is
        if (content.includes('<h3>SUBJECTIVE:</h3>') || content.includes('SUBJECTIVE:')) {
            return content;
        }

        // Parse and structure the content into SOAP format
        const lines = content.split('\n').filter(line => line.trim());

        return `
            <div class="soap-note">
                <h3 class="soap-section">SUBJECTIVE:</h3>
                <div class="soap-content">
                    ${lines.slice(0, Math.ceil(lines.length * 0.4)).join('<br>')}
                </div>
                
                <h3 class="soap-section">OBJECTIVE:</h3>
                <div class="soap-content">
                    ${lines.slice(Math.ceil(lines.length * 0.4), Math.ceil(lines.length * 0.6)).join('<br>')}
                </div>
                
                <h3 class="soap-section">ASSESSMENT:</h3>
                <div class="soap-content">
                    ${lines.slice(Math.ceil(lines.length * 0.6), Math.ceil(lines.length * 0.8)).join('<br>')}
                </div>
                
                <h3 class="soap-section">PLAN:</h3>
                <div class="soap-content">
                    ${lines.slice(Math.ceil(lines.length * 0.8)).join('<br>')}
                </div>
            </div>
        `;
    }

    // Debounced auto-save function
    const debouncedAutoSave = useCallback(
        debounce(async (content: string) => {
            if (!onAutoSave) return;

            setIsAutoSaving(true);
            try {
                await onAutoSave(content);
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsAutoSaving(false);
            }
        }, 2000),
        [onAutoSave]
    );

    // Manual save function
    const handleSave = async () => {
        if (!editor || !onSave) return;

        setIsSaving(true);
        try {
            const content = editor.getHTML();
            await onSave(content, { /* changes tracking would go here */ });
            setHasUnsavedChanges(false);
            setLastSaveTime(new Date());
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    if (!editor) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading editor...</span>
            </div>
        );
    }

    const characterCount = editor.storage.characterCount.characters();
    const wordCount = editor.storage.characterCount.words();

    return (
        <div className="w-full">
            {/* Editor Toolbar */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-4 rounded-t-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" />
                            <span className="font-semibold text-gray-800">Clinical Note Editor</span>
                        </div>

                        {/* Context Pills */}
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${metadata.emr === 'epic'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                {metadata.emr?.toUpperCase() || 'EMR'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                {metadata.visitType || 'Visit'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                {metadata.aiProvider}
                            </span>
                        </div>
                    </div>

                    {/* Save Status */}
                    <div className="flex items-center gap-3">
                        {isAutoSaving && (
                            <div className="flex items-center gap-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Auto-saving...</span>
                            </div>
                        )}

                        {lastSaveTime && (
                            <div className="flex items-center gap-2 text-gray-500">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm">
                                    Saved {lastSaveTime.toLocaleTimeString()}
                                </span>
                            </div>
                        )}

                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">Unsaved changes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Formatting Toolbar */}
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'
                                    }`}
                                title="Bold (Ctrl+B)"
                            >
                                <Bold className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'
                                    }`}
                                title="Italic (Ctrl+I)"
                            >
                                <Italic className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                                className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-600' : 'text-gray-600'
                                    }`}
                                title="Highlight"
                            >
                                <Highlighter className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                                className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                                className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Note
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Editor Content */}
            <div className="bg-white border border-gray-200 rounded-b-lg">
                <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none p-6 min-h-[500px] focus:outline-none"
                />
            </div>

            {/* Footer Stats */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span>{characterCount} characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span>{wordCount} words</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                                Generated {new Date(metadata.generatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500">
                        Press Ctrl+S to save manually
                    </div>
                </div>
            </div>

            {/* Custom Styles for SOAP formatting */}
            <style jsx global>{`
                .ProseMirror {
                    outline: none;
                    line-height: 1.8;
                }

                .soap-note h3.soap-section {
                    color: #1f2937;
                    font-weight: 700;
                    font-size: 1.1rem;
                    margin: 1.5rem 0 0.5rem 0;
                    padding: 0.5rem 0;
                    border-bottom: 2px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .soap-note h3.soap-section:first-child {
                    margin-top: 0;
                }

                .soap-content {
                    margin-bottom: 1rem;
                    padding-left: 1rem;
                    color: #374151;
                    line-height: 1.7;
                }

                .medical-highlight {
                    background-color: #fef08a;
                    padding: 0.1rem 0.2rem;
                    border-radius: 0.25rem;
                }

                /* Epic SmartPhrase styling */
                .ProseMirror code {
                    background-color: #eff6ff;
                    color: #1d4ed8;
                    padding: 0.1rem 0.3rem;
                    border-radius: 0.25rem;
                    font-weight: 600;
                    border: 1px solid #dbeafe;
                }
            `}</style>
        </div>
    );
}