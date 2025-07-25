// src/components/notes/EditableNoteView.tsx
// ✏️ Editable Note View with Delta Tracking

'use client';

import { useState, useEffect, useRef } from 'react';
import { EnhancedNote, EditEvent } from '@/types/notes';
import { notesService } from '@/lib/firebase/notes';
import {
    Save,
    Copy,
    Download,
    Edit3,
    Eye,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
    Clock
} from 'lucide-react';

interface EditableNoteViewProps {
    note: EnhancedNote;
    onSave: (updatedNote: EnhancedNote) => void;
    readOnly?: boolean;
    showMetadata?: boolean;
}

export default function EditableNoteView({
    note,
    onSave,
    readOnly = false,
    showMetadata = true
}: EditableNoteViewProps) {
    const [content, setContent] = useState(note.content);
    const [isEditing, setIsEditing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editStartTime, setEditStartTime] = useState<Date | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Track word count
    useEffect(() => {
        const words = content.trim().split(/\s+/).filter(word => word.length > 0);
        setWordCount(words.length);
    }, [content]);

    // Track unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(content !== note.content);
    }, [content, note.content]);

    // Handle content changes
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);

        // Start tracking edit time if this is the first change
        if (!editStartTime && !isEditing) {
            setEditStartTime(new Date());
            setIsEditing(true);
        }
    };

    // Save changes
    const handleSave = async () => {
        if (!hasUnsavedChanges || saving) return;

        try {
            setSaving(true);

            // Calculate edit analytics
            const editEndTime = new Date();
            const editDuration = editStartTime ? editEndTime.getTime() - editStartTime.getTime() : 0;

            // Analyze changes
            const originalLength = note.content.length;
            const newLength = content.length;
            const changeType = newLength > originalLength ? 'addition' :
                newLength < originalLength ? 'deletion' : 'modification';

            const editEvent: EditEvent = {
                timestamp: editEndTime,
                changeType,
                charactersAdded: Math.max(0, newLength - originalLength),
                charactersRemoved: Math.max(0, originalLength - newLength),
                timeSpent: editDuration
            };

            // Update note with new content and analytics
            const updatedNote: EnhancedNote = {
                ...note,
                content: content,
                isEdited: true,
                lastModified: editEndTime as any,
                editAnalytics: {
                    ...note.editAnalytics,
                    totalEdits: note.editAnalytics.totalEdits + 1,
                    totalEditTime: note.editAnalytics.totalEditTime + editDuration,
                    editHistory: [...note.editAnalytics.editHistory, editEvent]
                },
                versions: [
                    ...note.versions,
                    {
                        version: note.versions.length + 1,
                        content: content,
                        timestamp: editEndTime,
                        changesSummary: `${changeType.charAt(0).toUpperCase() + changeType.slice(1)} of ${Math.abs(newLength - originalLength)} characters`
                    }
                ]
            };

            // Save to Firebase
            await notesService.updateNote(note.id, {
                content,
                isEdited: true,
                editAnalytics: updatedNote.editAnalytics,
                versions: updatedNote.versions
            });

            // Update parent component
            onSave(updatedNote);

            // Reset edit state
            setIsEditing(false);
            setEditStartTime(null);
            setHasUnsavedChanges(false);

            console.log('✅ Note saved successfully');

        } catch (error) {
            console.error('❌ Error saving note:', error);
            alert('Error saving note. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Copy to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            // You might want to show a toast notification here
            console.log('✅ Note copied to clipboard');
        } catch (error) {
            console.error('❌ Error copying to clipboard:', error);
        }
    };

    // Download as text file
    const handleDownload = () => {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clinical-note-${note.metadata.patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('✅ Note downloaded');
        } catch (error) {
            console.error('❌ Error downloading note:', error);
        }
    };

    // Revert to original
    const handleRevert = () => {
        if (window.confirm('Are you sure you want to revert all changes? This cannot be undone.')) {
            setContent(note.content);
            setIsEditing(false);
            setEditStartTime(null);
            setHasUnsavedChanges(false);
        }
    };

    // Format content for display (detect SOAP sections)
    const formatContentForDisplay = (text: string) => {
        if (readOnly) {
            // Add some basic formatting for readonly view
            return text
                .replace(/^(SUBJECTIVE:|OBJECTIVE:|ASSESSMENT:|PLAN:)/gm, '<strong>$1</strong>')
                .replace(/\n/g, '<br />');
        }
        return text;
    };

    return (
        <div className="space-y-4">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {note.metadata.noteType || 'Clinical Note'}
                    </h3>
                    {hasUnsavedChanges && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            <Clock className="h-3 w-3" />
                            Unsaved changes
                        </span>
                    )}
                    {note.isEdited && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <Edit3 className="h-3 w-3" />
                            Edited
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!readOnly && hasUnsavedChanges && (
                        <>
                            <button
                                onClick={handleRevert}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-1"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Revert
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            >
                                {saving ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                    <Save className="h-3 w-3" />
                                )}
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleCopy}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-1"
                    >
                        <Copy className="h-3 w-3" />
                        Copy
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-1"
                    >
                        <Download className="h-3 w-3" />
                        Download
                    </button>
                </div>
            </div>

            {/* Note Content */}
            <div className="bg-white rounded-xl border border-gray-200">
                {readOnly ? (
                    <div
                        className="p-6 prose max-w-none font-mono text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatContentForDisplay(content) }}
                    />
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        className="w-full h-96 p-6 border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
                        placeholder="Clinical note content will appear here..."
                        spellCheck={false}
                    />
                )}
            </div>

            {/* Footer with Stats */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                    <span>{wordCount} words</span>
                    <span>{content.length} characters</span>
                    {isEditing && editStartTime && (
                        <span className="text-orange-600">
                            Editing for {Math.floor((Date.now() - editStartTime.getTime()) / 1000)}s
                        </span>
                    )}
                </div>

                {showMetadata && (
                    <div className="flex items-center gap-4">
                        <span>
                            Generated with {note.metadata.aiProvider === 'gemini' ? 'Gemini' : 'Claude'}
                        </span>
                        {note.metadata.qualityScore && (
                            <span className="flex items-center gap-1">
                                {note.metadata.qualityScore >= 8 ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : note.metadata.qualityScore >= 6 ? (
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                )}
                                Quality: {note.metadata.qualityScore}/10
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Edit History (for edited notes) */}
            {note.isEdited && note.editAnalytics.editHistory.length > 0 && showMetadata && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Edit History</h4>
                    <div className="space-y-2">
                        {note.editAnalytics.editHistory.slice(-3).map((edit, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${edit.changeType === 'addition' ? 'bg-green-500' :
                                            edit.changeType === 'deletion' ? 'bg-red-500' : 'bg-blue-500'
                                        }`} />
                                    <span className="capitalize">{edit.changeType}</span>
                                    <span className="text-gray-600">
                                        {edit.charactersAdded > 0 && `+${edit.charactersAdded}`}
                                        {edit.charactersRemoved > 0 && ` -${edit.charactersRemoved}`}
                                        {edit.charactersAdded === 0 && edit.charactersRemoved === 0 && 'Modified'}
                                    </span>
                                </div>
                                <span className="text-gray-500">
                                    {new Date(edit.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                        {note.editAnalytics.editHistory.length > 3 && (
                            <div className="text-xs text-gray-500 text-center pt-2">
                                and {note.editAnalytics.editHistory.length - 3} more edits
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}