// src/app/dashboard/notes/page.tsx
// 🔄 MODIFIED: Replace static note display with EditableNoteView

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditableNoteView } from '@/components/notes/EditableNoteView';
import { EnhancedNote } from '@/lib/notes/note-storage';
import { DeltaChange, EditSession } from '@/lib/notes/delta-tracker';

interface NotesPageState {
    currentNote: EnhancedNote | null;
    isGenerating: boolean;
    generationError: string | null;
    generatedNote: any | null;
    processingSteps: string[];
    // ... existing state properties
}

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams?.get('action');
    const noteId = searchParams?.get('noteId');

    const [state, setState] = useState<NotesPageState>({
        currentNote: null,
        isGenerating: false,
        generationError: null,
        generatedNote: null,
        processingSteps: []
    });

    // Load existing note if noteId is provided
    useEffect(() => {
        if (noteId && action === 'edit') {
            loadNoteForEditing(noteId);
        }
    }, [noteId, action]);

    const loadNoteForEditing = async (id: string) => {
        try {
            const response = await fetch(`/api/notes/${id}`);
            const data = await response.json();

            if (response.ok) {
                setState(prev => ({ ...prev, currentNote: data.note }));
            } else {
                setState(prev => ({
                    ...prev,
                    generationError: 'Failed to load note for editing'
                }));
            }
        } catch (error) {
            console.error('Error loading note:', error);
            setState(prev => ({
                ...prev,
                generationError: 'Failed to load note'
            }));
        }
    };

    const handleSaveNote = async (content: string, changes: DeltaChange[]) => {
        if (!state.currentNote) return;

        try {
            const editSession: EditSession = {
                id: `session_${Date.now()}`,
                noteId: state.currentNote.id,
                startTime: new Date(Date.now() - 300000), // 5 minutes ago (placeholder)
                endTime: new Date(),
                totalChanges: changes.length,
                changes,
                clinicalContext: state.currentNote.metadata.clinicalContext
            };

            const response = await fetch(`/api/notes/${state.currentNote.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content,
                    editSession,
                    userId: 'current-user-id' // TODO: Get from auth context
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save note');
            }

            // Show success message
            console.log('Note saved successfully with edit history');

        } catch (error) {
            console.error('Error saving note:', error);
            throw error; // Re-throw to let EditableNoteView handle error display
        }
    };

    const handleAutoSave = async (content: string) => {
        if (!state.currentNote) return;

        try {
            await fetch(`/api/notes/${state.currentNote.id}/auto-save`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't show error to user for auto-save failures
        }
    };

    // Handle new note generation (existing logic)
    const handleNoteGeneration = async (formData: any) => {
        setState(prev => ({
            ...prev,
            isGenerating: true,
            generationError: null,
            processingSteps: ['Initializing AI providers...']
        }));

        try {
            // ... existing note generation logic ...

            // After successful generation, convert to enhanced note format
            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Note generation failed');
            }

            const result = await response.json();

            // Create new note in database with enhanced format
            const noteResponse = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: result.note.content,
                    metadata: {
                        patientId: formData.patientId,
                        clinicalContext: formData.clinicalContext,
                        aiProvider: result.provider,
                        template: formData.template
                    },
                    userId: 'current-user-id' // TODO: Get from auth
                })
            });

            const newNote = await noteResponse.json();

            setState(prev => ({
                ...prev,
                isGenerating: false,
                currentNote: newNote.note,
                generatedNote: result
            }));

            // Update URL to edit mode
            router.push(`/dashboard/notes?action=edit&noteId=${newNote.note.id}`);

        } catch (error) {
            setState(prev => ({
                ...prev,
                isGenerating: false,
                generationError: error instanceof Error ? error.message : 'Generation failed'
            }));
        }
    };

    // Render logic based on current state
    if (action === 'create') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Existing note generation form UI */}
                <NoteGenerationForm onSubmit={handleNoteGeneration} />

                {state.isGenerating && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            <span className="ml-2 text-gray-600">AI is generating your clinical note...</span>
                        </div>

                        {state.processingSteps.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Steps:</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {state.processingSteps.map((step, index) => (
                                        <li key={index} className="flex items-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {state.generationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                                <div className="mt-2 text-sm text-red-700">{state.generationError}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (action === 'edit' && state.currentNote) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with note info */}
                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {state.currentNote.isEdited ? 'Editing Clinical Note' : 'New Clinical Note'}
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Patient: {state.currentNote.metadata.patientId} |
                                Generated: {new Date(state.currentNote.metadata.generatedAt).toLocaleDateString()} |
                                Provider: {state.currentNote.metadata.aiProvider}
                            </p>
                            {state.currentNote.isEdited && (
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {state.currentNote.editAnalytics.totalChanges} edits in {state.currentNote.editAnalytics.totalEditSessions} sessions
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => router.push('/dashboard/notes')}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Back to Notes
                            </button>

                            <button
                                onClick={() => router.push('/dashboard/notes?action=create')}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                Generate New Note
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✨ NEW: Editable Note Interface */}
                <EditableNoteView
                    noteId={state.currentNote.id}
                    initialContent={state.currentNote.content}
                    metadata={state.currentNote.metadata}
                    onSave={handleSaveNote}
                    onAutoSave={handleAutoSave}
                />

                {/* Edit Analytics Summary */}
                {state.currentNote.isEdited && (
                    <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {state.currentNote.editAnalytics.totalChanges}
                                </div>
                                <div className="text-sm text-gray-500">Total Changes</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {state.currentNote.editAnalytics.totalEditSessions}
                                </div>
                                <div className="text-sm text-gray-500">Edit Sessions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(state.currentNote.editAnalytics.averageEditTime / 1000)}s
                                </div>
                                <div className="text-sm text-gray-500">Avg Edit Time</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">
                                    {state.currentNote.editAnalytics.mostEditedSection}
                                </div>
                                <div className="text-sm text-gray-500">Most Edited Section</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default notes list view
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Clinical Notes Management</h3>
                    <p className="mt-1 text-sm text-gray-500">Generate and manage your clinical documentation with AI-powered editing</p>
                    <div className="mt-6 flex justify-center space-x-4">
                        <button
                            onClick={() => router.push('/dashboard/notes?action=create')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Generate New Note
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/notes/history')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            View Note History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Placeholder component for the note generation form (existing logic)
function NoteGenerationForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    // ... existing form implementation from current notes page ...
    return (
        <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Generate Clinical Note</h2>
            {/* ... existing form fields ... */}
        </div>
    );
}