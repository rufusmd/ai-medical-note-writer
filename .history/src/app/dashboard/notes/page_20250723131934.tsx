// src/app/dashboard/notes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    SparklesIcon,
    DocumentTextIcon,
    ClockIcon,
    ChartBarIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Import existing components (assuming they exist from Phase 3)
import ClinicalContextSelector from '@/components/clinical/ClinicalContextSelector';
import PatientSelector from '@/components/medical/PatientSelector';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Import new Phase 4 components
import EditableNoteEditor from '@/components/medical/EditableNoteEditor';

// Import services and types
import { editTrackingService } from '@/lib/firebase/editTracking';
import {
    ClinicalContext,
    EditDelta,
    NoteEditSession,
    EditAnalysisResult
} from '@/types/editTracking';

// Existing types (from Phase 3)
interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    demographics?: any;
    medicalHistory?: any;
    medications?: any[];
    allergies?: any[];
}

interface GeneratedNote {
    id: string;
    content: string;
    aiProvider: 'gemini' | 'claude';
    promptVersion: string;
    generationTime: number;
    qualityScore?: number;
    createdAt: Date;
}

export default function NotesPage() {
    // State management
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext | null>(null);
    const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(null);
    const [currentEditSession, setCurrentEditSession] = useState<string | null>(null);

    // UI states
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [editStartTime, setEditStartTime] = useState<number | null>(null);

    // Learning and analytics states
    const [editAnalytics, setEditAnalytics] = useState<EditAnalysisResult | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Generate note using existing API
    const generateNote = useCallback(async () => {
        if (!selectedPatient || !clinicalContext) {
            toast.error('Please select a patient and configure clinical context');
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            // Call existing note generation API
            const response = await fetch('/api/generate-note-enhanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patient: selectedPatient,
                    clinicalContext: clinicalContext,
                    encounterData: {
                        // Include any additional encounter-specific data
                        chiefComplaint: '', // Could be from form input
                        historyOfPresentIllness: '',
                        currentMedications: selectedPatient.medications || [],
                        allergies: selectedPatient.allergies || []
                    }
                }),
            });

            clearInterval(progressInterval);
            setGenerationProgress(100);

            if (!response.ok) {
                throw new Error(`Generation failed: ${response.status}`);
            }

            const data = await response.json();

            const newNote: GeneratedNote = {
                id: `note_${Date.now()}`,
                content: data.note,
                aiProvider: data.provider || 'gemini',
                promptVersion: data.promptVersion || 'v1.0',
                generationTime: data.generationTime || 0,
                qualityScore: data.qualityScore,
                createdAt: new Date()
            };

            setGeneratedNote(newNote);

            // Start edit session tracking
            const sessionId = await editTrackingService.createEditSession(
                newNote.id,
                selectedPatient.id,
                'current_user', // Replace with actual user ID
                clinicalContext,
                newNote.content,
                newNote.aiProvider,
                newNote.promptVersion,
                newNote.generationTime
            );

            setCurrentEditSession(sessionId);
            setEditStartTime(Date.now());

            toast.success('Note generated successfully!');
        } catch (error) {
            console.error('Note generation error:', error);
            toast.error('Failed to generate note. Please try again.');
        } finally {
            setIsGenerating(false);
            setGenerationProgress(0);
        }
    }, [selectedPatient, clinicalContext]);

    // Handle delta tracking
    const handleDeltaCapture = useCallback(async (delta: EditDelta) => {
        if (currentEditSession) {
            try {
                await editTrackingService.addEditDelta(currentEditSession, delta);
            } catch (error) {
                console.error('Failed to track edit:', error);
                // Don't show error to user for tracking failures
            }
        }
    }, [currentEditSession]);

    // Handle note saving with learning
    const handleNoteSave = useCallback(async (content: string, deltas: EditDelta[]) => {
        if (!currentEditSession || !editStartTime) {
            throw new Error('No active edit session');
        }

        setIsSaving(true);

        try {
            const totalEditTime = Date.now() - editStartTime;

            // Complete edit session and get analysis
            const analysisResult = await editTrackingService.completeEditSession(
                currentEditSession,
                content,
                totalEditTime
            );

            setEditAnalytics(analysisResult);

            // Update the note content
            if (generatedNote) {
                setGeneratedNote({
                    ...generatedNote,
                    content: content
                });
            }

            // Show learning insights if significant patterns found
            if (analysisResult.confidenceScore > 0.6) {
                toast.success(
                    `Note saved! AI learned ${analysisResult.patterns.length} patterns from your edits.`,
                    { duration: 5000 }
                );
                setShowAnalytics(true);
            } else {
                toast.success('Note saved successfully!');
            }

            // Reset edit session
            setCurrentEditSession(null);
            setEditStartTime(null);

        } catch (error) {
            console.error('Save error:', error);
            throw error; // Re-throw to let EditableNoteEditor handle UI feedback
        } finally {
            setIsSaving(false);
        }
    }, [currentEditSession, editStartTime, generatedNote]);

    // Reset function
    const handleReset = () => {
        setGeneratedNote(null);
        setCurrentEditSession(null);
        setEditStartTime(null);
        setEditAnalytics(null);
        setShowAnalytics(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                AI Medical Note Writer
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Phase 4: Intelligent note generation with learning capabilities
                            </p>
                        </div>

                        {editAnalytics && (
                            <button
                                onClick={() => setShowAnalytics(!showAnalytics)}
                                className="flex items-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                            >
                                <ChartBarIcon className="h-5 w-5" />
                                <span>View Learning Analytics</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Learning Analytics Panel */}
                {showAnalytics && editAnalytics && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Learning Insights from Your Edits
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Detected Patterns</h4>
                                {editAnalytics.patterns.length > 0 ? (
                                    <ul className="space-y-2">
                                        {editAnalytics.patterns.map((pattern, index) => (
                                            <li key={index} className="text-sm">
                                                <span className="font-medium">{pattern.description}</span>
                                                <span className="text-gray-500 ml-2">
                                                    (Confidence: {(pattern.confidence * 100).toFixed(0)}%)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-sm">No significant patterns detected</p>
                                )}
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">AI Improvements</h4>
                                {editAnalytics.promptSuggestions.length > 0 ? (
                                    <ul className="space-y-1">
                                        {editAnalytics.promptSuggestions.map((suggestion, index) => (
                                            <li key={index} className="text-sm text-gray-600">
                                                • {suggestion}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-sm">No specific improvements identified</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Overall Satisfaction Score:</strong> {editAnalytics.inferredFeedback.overallSatisfaction}/10
                                {editAnalytics.confidenceScore > 0.7 && (
                                    <span className="ml-2">• High confidence in learning accuracy</span>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Configuration Panel */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Patient Selection */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Select Patient
                            </h2>
                            <PatientSelector
                                selectedPatient={selectedPatient}
                                onPatientSelect={setSelectedPatient}
                            />
                        </div>

                        {/* Clinical Context Configuration */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Clinical Context
                            </h2>
                            <ClinicalContextSelector
                                onContextChange={setClinicalContext}
                                selectedContext={clinicalContext}
                            />
                        </div>

                        {/* Generation Controls */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex space-x-3">
                                <button
                                    onClick={generateNote}
                                    disabled={!selectedPatient || !clinicalContext || isGenerating}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${selectedPatient && clinicalContext && !isGenerating
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-5 w-5" />
                                            <span>Generate Note</span>
                                        </>
                                    )}
                                </button>

                                {generatedNote && (
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            {/* Generation Progress */}
                            {isGenerating && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span>Generating note...</span>
                                        <span>{generationProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${generationProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Current Session Info */}
                        {currentEditSession && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                    <ClockIcon className="h-5 w-5 text-amber-600" />
                                    <span className="text-sm font-medium text-amber-800">
                                        Edit Session Active
                                    </span>
                                </div>
                                <p className="text-sm text-amber-700 mt-1">
                                    Your edits are being tracked to improve AI performance
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Note Editor Panel */}
                    <div className="lg:col-span-8">
                        {generatedNote ? (
                            <EditableNoteEditor
                                initialContent={generatedNote.content}
                                noteId={generatedNote.id}
                                patientId={selectedPatient?.id || ''}
                                clinicalContext={clinicalContext || {} as ClinicalContext}
                                onSave={handleNoteSave}
                                onDeltaCapture={handleDeltaCapture}
                                isLoading={isSaving}
                                className="w-full"
                            />
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Ready to Generate Your Note
                                </h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Select a patient and configure the clinical context, then click "Generate Note"
                                    to create an AI-powered medical note with intelligent learning capabilities.
                                </p>

                                {(!selectedPatient || !clinicalContext) && (
                                    <div className="mt-6 space-y-2">
                                        {!selectedPatient && (
                                            <div className="flex items-center justify-center space-x-2 text-amber-600">
                                                <ExclamationTriangleIcon className="h-4 w-4" />
                                                <span className="text-sm">Please select a patient</span>
                                            </div>
                                        )}
                                        {!clinicalContext && (
                                            <div className="flex items-center justify-center space-x-2 text-amber-600">
                                                <ExclamationTriangleIcon className="h-4 w-4" />
                                                <span className="text-sm">Please configure clinical context</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}