// src/app/dashboard/notes/page.tsx
// 🔄 COMPLETE UPDATED FILE: Enhanced with EditableNoteView while preserving all existing functionality

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditableNoteView } from '@/components/notes/EditableNoteView';
import { EnhancedNote } from '@/lib/notes/note-storage';
import { DeltaChange, EditSession } from '@/lib/notes/delta-tracker';

interface ClinicalContext {
    clinic: string;
    emr: string;
    visitType: string;
    settings: {
        includeAssessment: boolean;
        includePlan: boolean;
        includeHPI: boolean;
        includeROS: boolean;
        includePE: boolean;
        includeMedications: boolean;
        includeAllergies: boolean;
        includeSocialHistory: boolean;
    };
}

interface GeneratedNote {
    content: string;
    metadata: {
        provider: string;
        generationTime: number;
        qualityScore: number;
        smartPhrasesDetected: string[];
        dotPhrasesDetected: string[];
        epicSyntaxValid: boolean;
    };
}

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams?.get('action');
    const noteId = searchParams?.get('noteId');

    // Enhanced state for editing functionality
    const [currentNote, setCurrentNote] = useState<EnhancedNote | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(null);
    const [processingSteps, setProcessingSteps] = useState<string[]>([]);

    // Form state for note generation
    const [transcript, setTranscript] = useState('');
    const [patientId, setPatientId] = useState('');
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'HMHI Downtown',
        emr: 'Epic',
        visitType: 'follow-up',
        settings: {
            includeAssessment: true,
            includePlan: true,
            includeHPI: true,
            includeROS: false,
            includePE: false,
            includeMedications: true,
            includeAllergies: false,
            includeSocialHistory: false,
        }
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
                setCurrentNote(data.note);
                // Clear any generation state since we're editing existing note
                setGeneratedNote(null);
                setGenerationError(null);
            } else {
                setGenerationError('Failed to load note for editing');
            }
        } catch (error) {
            console.error('Error loading note:', error);
            setGenerationError('Failed to load note');
        }
    };

    const handleSaveNote = async (content: string, changes: DeltaChange[]) => {
        if (!currentNote) return;

        try {
            const editSession: EditSession = {
                id: `session_${Date.now()}`,
                noteId: currentNote.id,
                startTime: new Date(Date.now() - 300000), // 5 minutes ago (placeholder)
                endTime: new Date(),
                totalChanges: changes.length,
                changes,
                clinicalContext: currentNote.metadata.clinicalContext
            };

            const response = await fetch(`/api/notes/${currentNote.id}`, {
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

            // Refresh note data to get updated analytics
            await loadNoteForEditing(currentNote.id);

        } catch (error) {
            console.error('Error saving note:', error);
            throw error; // Re-throw to let EditableNoteView handle error display
        }
    };

    const handleAutoSave = async (content: string) => {
        if (!currentNote) return;

        try {
            await fetch(`/api/notes/${currentNote.id}/auto-save`, {
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

    const handleNoteGeneration = async () => {
        if (!transcript.trim() || !patientId.trim()) {
            setGenerationError('Please provide both transcript and patient ID');
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        setGeneratedNote(null);
        setProcessingSteps(['Initializing AI providers...']);

        try {
            const requestBody = {
                transcript: {
                    id: `transcript_${Date.now()}`,
                    content: transcript,
                    patientId: patientId,
                    timestamp: new Date().toISOString(),
                    encounterType: clinicalContext.visitType,
                },
                clinicalContext,
                patientId,
                preferences: {
                    primaryProvider: 'gemini',
                    enableFallback: true,
                    qualityThreshold: 7,
                }
            };

            setProcessingSteps(prev => [...prev, 'Sending request to AI provider...']);

            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate note');
            }

            const result = await response.json();

            setProcessingSteps(prev => [...prev, 'Note generated successfully!']);
            setGeneratedNote(result.note);

            // Create new note in database with enhanced format
            setProcessingSteps(prev => [...prev, 'Saving note to database...']);

            const createResponse = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: result.note.content,
                    metadata: {
                        patientId: patientId,
                        clinicalContext: clinicalContext,
                        aiProvider: result.note.metadata.provider,
                        template: 'default',
                        generatedAt: new Date().toISOString()
                    },
                    userId: 'current-user-id' // TODO: Get from auth
                })
            });

            if (createResponse.ok) {
                const newNoteData = await createResponse.json();
                setCurrentNote(newNoteData.note);

                // Update URL to edit mode
                router.push(`/dashboard/notes?action=edit&noteId=${newNoteData.note.id}`);

                setProcessingSteps(prev => [...prev, 'Ready for editing!']);
            }

        } catch (error) {
            console.error('Note generation error:', error);
            setGenerationError(error instanceof Error ? error.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const resetForm = () => {
        setTranscript('');
        setPatientId('');
        setGeneratedNote(null);
        setGenerationError(null);
        setProcessingSteps([]);
        setCurrentNote(null);
        router.push('/dashboard/notes?action=create');
    };

    // Render editing interface for existing notes
    if (action === 'edit' && currentNote) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with note info */}
                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {currentNote.isEdited ? 'Editing Clinical Note' : 'New Clinical Note'}
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Patient: {currentNote.metadata.patientId} |
                                Generated: {new Date(currentNote.metadata.generatedAt).toLocaleDateString()} |
                                Provider: {currentNote.metadata.aiProvider}
                            </p>
                            {currentNote.isEdited && (
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {currentNote.editAnalytics.totalChanges} edits in {currentNote.editAnalytics.totalEditSessions} sessions
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
                                onClick={resetForm}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                Generate New Note
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✨ NEW: Editable Note Interface */}
                <EditableNoteView
                    noteId={currentNote.id}
                    initialContent={currentNote.content}
                    metadata={currentNote.metadata}
                    onSave={handleSaveNote}
                    onAutoSave={handleAutoSave}
                />

                {/* Edit Analytics Summary */}
                {currentNote.isEdited && (
                    <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Analytics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {currentNote.editAnalytics.totalChanges}
                                </div>
                                <div className="text-sm text-gray-500">Total Changes</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {currentNote.editAnalytics.totalEditSessions}
                                </div>
                                <div className="text-sm text-gray-500">Edit Sessions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(currentNote.editAnalytics.averageEditTime / 1000)}s
                                </div>
                                <div className="text-sm text-gray-500">Avg Edit Time</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">
                                    {currentNote.editAnalytics.mostEditedSection}
                                </div>
                                <div className="text-sm text-gray-500">Most Edited Section</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render note generation interface
    if (action === 'create') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                    <h1 className="text-2xl font-bold text-gray-900">Generate Clinical Note</h1>
                    <p className="mt-2 text-gray-600">
                        Create {clinicalContext.emr === 'Epic' ? 'Epic-ready' : 'Credible-ready'} clinical documentation
                    </p>
                </div>

                {/* Note Generation Form */}
                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <div className="space-y-6">
                        {/* Clinical Context Configuration */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Clinical Context Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Clinic Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Clinic
                                    </label>
                                    <select
                                        value={clinicalContext.clinic}
                                        onChange={(e) => setClinicalContext(prev => ({ ...prev, clinic: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="HMHI Downtown">HMHI Downtown</option>
                                        <option value="Davis Behavioral Health">Davis Behavioral Health</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* EMR Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        EMR System
                                    </label>
                                    <select
                                        value={clinicalContext.emr}
                                        onChange={(e) => setClinicalContext(prev => ({ ...prev, emr: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Epic">Epic</option>
                                        <option value="Credible">Credible</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Visit Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Visit Type
                                    </label>
                                    <select
                                        value={clinicalContext.visitType}
                                        onChange={(e) => setClinicalContext(prev => ({ ...prev, visitType: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="follow-up">Follow-up</option>
                                        <option value="intake">Psychiatric Intake</option>
                                        <option value="transfer-of-care">Transfer of Care</option>
                                        <option value="emergency">Emergency</option>
                                    </select>
                                </div>
                            </div>

                            {/* Generation Settings */}
                            <div className="mt-6">
                                <h4 className="text-md font-medium text-gray-900 mb-3">Generation Settings</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(clinicalContext.settings).map(([key, value]) => (
                                        <label key={key} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={(e) => setClinicalContext(prev => ({
                                                    ...prev,
                                                    settings: {
                                                        ...prev.settings,
                                                        [key]: e.target.checked
                                                    }
                                                }))}
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('include', '')}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Patient ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Patient ID
                            </label>
                            <input
                                type="text"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                placeholder="Enter patient identifier"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Transcript Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Transcript
                            </label>
                            <textarea
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                placeholder="Paste or type the session transcript here..."
                                rows={10}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                {transcript.length} characters • {transcript.trim().split(/\s+/).filter(word => word.length > 0).length} words
                            </p>
                        </div>

                        {/* Generate Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleNoteGeneration}
                                disabled={isGenerating || !transcript.trim() || !patientId.trim()}
                                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {isGenerating ? 'Generating...' : 'Generate Clinical Note'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Processing Steps */}
                {isGenerating && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            <span className="ml-2 text-gray-600">AI is generating your {clinicalContext.visitType.replace('-', ' ')} note...</span>
                        </div>

                        {processingSteps.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Steps:</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    {processingSteps.map((step, index) => (
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

                {/* Generation Error */}
                {generationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                                <div className="mt-2 text-sm text-red-700">{generationError}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ✨ ENHANCED: Generated Note Display (now shows brief preview before transitioning to edit mode) */}
                {generatedNote && !currentNote && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-green-800 font-medium">Note Generated Successfully!</span>
                                </div>
                                <div className="text-sm text-green-700">
                                    {generatedNote.metadata.provider} • {generatedNote.metadata.generationTime}ms • Quality: {generatedNote.metadata.qualityScore}/10
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Generated Note Preview</h3>
                                <p className="text-sm text-gray-500">Transitioning to edit mode...</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                    {generatedNote.content}
                                </pre>
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