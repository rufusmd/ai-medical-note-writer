// src/app/dashboard/notes/page.tsx - WITH TOAST NOTIFICATIONS
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import NoteFeedbackForm from '@/components/feedback/NoteFeedbackForm';

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // State for note generation and feedback
    const [generatedNote, setGeneratedNote] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    // Check if we're in create mode
    const isCreateMode = searchParams?.get('action') === 'create';

    // Enhanced note generation function
    const handleGenerateNote = async () => {
        if (!user) {
            toast.error('Please log in to generate notes');
            return;
        }

        if (!transcript.trim()) {
            toast.error('Please enter a transcript');
            return;
        }

        setIsGenerating(true);
        setError(null);

        // Show loading toast
        const loadingToast = toast.loading('Generating clinical note...', {
            description: 'AI is analyzing your transcript'
        });

        try {
            const response = await fetch('/api/generate-note-enhanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript,
                    patientId: selectedPatient?.id || 'temp-patient-id',
                    patientName: selectedPatient?.name || 'Test Patient',
                    templateId: selectedTemplate?.id || 'general',
                    templateContent: selectedTemplate?.content || '',
                    encounterType: 'follow-up',
                    specialty: 'general',
                    userId: user.uid,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setGeneratedNote(result);

            // Show feedback form if learning metadata indicates it
            if (result.learningMetadata?.showFeedbackPrompt) {
                setShowFeedbackForm(true);
            }

            // Success toast
            toast.success('Note generated successfully!', {
                description: `Generated with ${result.provider} in ${result.processingTime}ms`,
                id: loadingToast
            });

        } catch (error) {
            console.error('Error generating note:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate note';
            setError(errorMessage);

            toast.error('Failed to generate note', {
                description: errorMessage,
                id: loadingToast
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle feedback submission
    const handleFeedbackSubmitted = () => {
        setShowFeedbackForm(false);
        toast.success('Feedback submitted!', {
            description: 'Thank you! Your feedback helps improve AI note generation.'
        });
    };

    // Handle creating another note
    const handleCreateAnother = () => {
        setGeneratedNote(null);
        setTranscript('');
        setError(null);
        setShowFeedbackForm(false);
        toast.info('Ready for new note', {
            description: 'Enter a new transcript to generate another note'
        });
    };

    // Render create mode (note generation interface)
    if (isCreateMode) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Generate Clinical Note</h1>
                        <p className="text-gray-600 mt-1">AI-powered clinical documentation with learning</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/notes')}
                        className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
                    >
                        ← Back to Notes
                    </button>
                </div>

                {/* Note Generation Form */}
                <div className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
                    <div>
                        <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
                            Clinical Transcript *
                        </label>
                        <textarea
                            id="transcript"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder="Enter your clinical transcript here..."
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {transcript.length} characters
                        </p>
                    </div>

                    {/* Enhanced Patient Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Patient (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Enter patient name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                onChange={(e) => setSelectedPatient({ name: e.target.value, id: 'temp-id' })}
                            />
                        </div>

                        {/* Enhanced Template Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Template
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                onChange={(e) => setSelectedTemplate({ id: e.target.value, content: '' })}
                            >
                                <option value="general">📄 General Note</option>
                                <option value="progress">📈 Progress Note</option>
                                <option value="consultation">👨‍⚕️ Consultation Note</option>
                                <option value="procedure">🔧 Procedure Note</option>
                                <option value="discharge">🏠 Discharge Summary</option>
                            </select>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateNote}
                        disabled={isGenerating || !transcript.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Generating Note...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Generate Clinical Note
                            </>
                        )}
                    </button>
                </div>

                {/* Generated Note Display */}
                {generatedNote && (
                    <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Generated Clinical Note</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {generatedNote.provider}
                                </span>
                                {generatedNote.qualityScore && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        Quality: {generatedNote.qualityScore}/10
                                    </span>
                                )}
                                <span className="text-xs text-gray-500">
                                    {generatedNote.processingTime}ms
                                </span>
                            </div>
                        </div>

                        {/* Note Content */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                                {generatedNote.content}
                            </pre>
                        </div>

                        {/* Learning Metadata Display */}
                        {generatedNote.learningMetadata && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-blue-800">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="font-medium">AI Learning System Active</span>
                                    <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                                        {Math.round((generatedNote.learningMetadata.confidenceScore || 1) * 100)}% Confidence
                                    </span>
                                </div>
                                <p className="text-sm text-blue-700 mt-1">
                                    Your feedback helps improve future note generation
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={handleCreateAnother}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Generate Another
                            </button>
                            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy Note
                            </button>
                            <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export to Epic
                            </button>
                        </div>
                    </div>
                )}

                {/* Feedback Form */}
                {showFeedbackForm && generatedNote && user && (
                    <div className="mt-6">
                        <NoteFeedbackForm
                            noteId={generatedNote.noteId}
                            noteContent={generatedNote.content}
                            aiProvider={generatedNote.provider}
                            patientId={selectedPatient?.id || 'temp-patient-id'}
                            templateUsed={selectedTemplate?.id || 'general'}
                            userId={user.uid}
                            onFeedbackSubmitted={handleFeedbackSubmitted}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Default notes list view
    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clinical Notes</h1>
                    <p className="text-gray-600 mt-1">Manage and generate clinical documentation</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/notes?action=create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generate New Note
                </button>
            </div>

            {/* Enhanced Notes list placeholder */}
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by generating your first clinical note.</p>
                    <div className="mt-6">
                        <button
                            onClick={() => router.push('/dashboard/notes?action=create')}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Generate Note
                        </button>
                    </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">
                        🎯 <strong>AI learning system is active!</strong> Generate notes and provide feedback to improve AI quality.
                    </p>
                </div>
            </div>
        </div>
    );
}