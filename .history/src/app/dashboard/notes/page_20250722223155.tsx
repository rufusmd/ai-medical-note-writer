// src/app/dashboard/notes/page.tsx - REPLACE YOUR EXISTING FILE

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // ✅ Your existing auth
import { toast } from 'sonner'; // 🆕 NEW: Toast notifications
import NoteFeedbackForm from '@/components/feedback/NoteFeedbackForm'; // 🆕 NEW: Feedback form

// Your existing imports (keep these)
// ... any other imports you have

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth(); // ✅ Your existing auth hook

    // 🆕 NEW: Enhanced state for feedback system
    const [generatedNote, setGeneratedNote] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Your existing state variables
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    // Check if we're in create mode
    const isCreateMode = searchParams?.get('action') === 'create';

    // 🆕 ENHANCED: Note generation function with feedback integration
    const handleGenerateNote = async (noteData?: any) => {
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

        try {
            // 🆕 NEW: Use enhanced API route instead of basic one
            const response = await fetch('/api/generate-note-enhanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.uid}`, // 🆕 NEW: Pass user ID for learning
                },
                body: JSON.stringify({
                    transcript,
                    patientId: selectedPatient?.id || 'temp-patient-id',
                    patientName: selectedPatient?.name || 'Test Patient',
                    templateId: selectedTemplate?.id || 'general',
                    templateContent: selectedTemplate?.content || '',
                    encounterType: 'follow-up',
                    specialty: 'general',
                    userId: user.uid, // 🆕 NEW: Ensure user ID is included
                    ...noteData, // Any additional data passed in
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate note');
            }

            const result = await response.json();

            setGeneratedNote(result);

            // 🆕 NEW: Show feedback form if learning metadata indicates it
            if (result.learningMetadata?.showFeedbackPrompt) {
                setShowFeedbackForm(true);
            }

            toast.success('Note generated successfully!');

        } catch (error) {
            console.error('Error generating note:', error);
            setError(error instanceof Error ? error.message : 'Failed to generate note');
            toast.error('Failed to generate note');
        } finally {
            setIsGenerating(false);
        }
    };

    // 🆕 NEW: Handle feedback submission
    const handleFeedbackSubmitted = () => {
        setShowFeedbackForm(false);
        toast.success('Thank you! Your feedback helps improve AI note generation.');

        // Optional: Show learning progress or insights
        // You could add a brief insight about how the AI is learning
    };

    // 🆕 NEW: Handle creating another note
    const handleCreateAnother = () => {
        setGeneratedNote(null);
        setTranscript('');
        setError(null);
        setShowFeedbackForm(false);
    };

    // Render create mode (note generation interface)
    if (isCreateMode) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Generate Clinical Note</h1>
                        <p className="text-gray-600 mt-1">AI-powered clinical documentation with learning</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/notes')}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        ← Back to Notes
                    </button>
                </div>

                {/* Note Generation Form */}
                <div className="bg-white rounded-lg border p-6 space-y-6">
                    <div>
                        <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
                            Clinical Transcript
                        </label>
                        <textarea
                            id="transcript"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder="Enter your clinical transcript here..."
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Patient Selection (simplified) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Patient (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="Patient name or ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onChange={(e) => setSelectedPatient({ name: e.target.value, id: e.target.value })}
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={() => handleGenerateNote()}
                        disabled={isGenerating || !transcript.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium"
                    >
                        {isGenerating ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                Generating Note...
                            </div>
                        ) : (
                            'Generate Note'
                        )}
                    </button>
                </div>

                {/* Generated Note Display */}
                {generatedNote && (
                    <div className="bg-white rounded-lg border p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Generated Note</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Provider: {generatedNote.provider}</span>
                                {generatedNote.qualityScore && (
                                    <span>• Quality: {generatedNote.qualityScore}/10</span>
                                )}
                            </div>
                        </div>

                        {/* Note Content */}
                        <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap font-sans text-sm">
                                {generatedNote.content}
                            </pre>
                        </div>

                        {/* 🆕 NEW: Learning Metadata Display */}
                        {generatedNote.learningMetadata && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-sm text-blue-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <strong>AI Strategy:</strong> {generatedNote.learningMetadata.promptStrategy}
                                            {generatedNote.learningMetadata.personalizedPromptUsed && (
                                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                    Personalized
                                                </span>
                                            )}
                                        </div>
                                        {generatedNote.learningMetadata.confidenceScore && (
                                            <div className="text-sm">
                                                <strong>Confidence:</strong> {(generatedNote.learningMetadata.confidenceScore * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => navigator.clipboard.writeText(generatedNote.content)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                            >
                                Copy to Clipboard
                            </button>
                            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                                Export to Epic
                            </button>
                            <button
                                onClick={handleCreateAnother}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                            >
                                Generate Another
                            </button>
                        </div>
                    </div>
                )}

                {/* 🆕 NEW: Feedback Form */}
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
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clinical Notes</h1>
                    <p className="text-gray-600 mt-1">Manage and generate clinical documentation</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/notes?action=create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                    Generate New Note
                </button>
            </div>

            {/* Notes list would go here */}
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">Note history and management interface would go here...</p>
                <p className="text-sm text-blue-600 mt-2">
                    🎯 AI learning system is active! Generate notes and provide feedback to improve AI quality.
                </p>
            </div>
        </div>
    );
}