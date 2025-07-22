// src/app/dashboard/notes/page.tsx - Enhanced with Clinical Context System
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';

interface GeneratedNote {
    id: string;
    content: string;
    aiProvider: 'gemini' | 'claude';
    qualityScore: number;
    metadata: {
        generatedAt: Date;
        processingDuration: number;
        smartPhrasesDetected: string[];
        dotPhrasesDetected: string[];
    };
}

interface GenerationResponse {
    success: boolean;
    note?: GeneratedNote;
    fallbackUsed?: boolean;
    performance?: {
        totalDuration: number;
        aiProviderDuration: number;
        processingSteps: string[];
    };
    error?: string;
    message?: string;
}

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get('action');

    // Form state
    const [transcript, setTranscript] = useState('');
    const [patientId, setPatientId] = useState('');

    // Clinical Context state
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'hmhi-downtown',
        visitType: 'psychiatric-intake',
        emr: 'epic',
        generationSettings: {
            updateHPI: true,
            generateAssessment: true,
            addIntervalUpdate: false,
            updatePlan: true,
            modifyPsychExam: true,
            includeEpicSyntax: true,
            comprehensiveIntake: true,
            referencePreviousVisits: false,
        }
    });

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [processingSteps, setProcessingSteps] = useState<string[]>([]);

    const handleGenerate = async () => {
        if (!transcript.trim()) {
            setGenerationError('Please enter a patient transcript');
            return;
        }

        // Validate required fields based on visit type
        if (clinicalContext.visitType === 'transfer-of-care' && !clinicalContext.previousNote?.trim()) {
            setGenerationError('Please provide the previous note for transfer of care visits');
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        setGeneratedNote(null);
        setProcessingSteps([`Starting ${clinicalContext.visitType} note generation for ${clinicalContext.clinic}...`]);

        try {
            const response = await fetch('/api/clinical-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript: {
                        id: `transcript_${Date.now()}`,
                        content: transcript,
                        patientId: patientId || `patient_${Date.now()}`,
                        encounterType: clinicalContext.visitType,
                        timestamp: new Date().toISOString(),
                    },
                    clinicalContext: clinicalContext,
                    preferences: {
                        includeSmartPhrases: clinicalContext.generationSettings.includeEpicSyntax,
                        includeDotPhrases: clinicalContext.generationSettings.includeEpicSyntax,
                        preserveEpicSyntax: clinicalContext.generationSettings.includeEpicSyntax,
                        detailLevel: clinicalContext.generationSettings.comprehensiveIntake ? 'detailed' : 'standard'
                    }
                })
            });

            const result: GenerationResponse = await response.json();

            if (result.success && result.note) {
                setGeneratedNote(result.note);
                setProcessingSteps(result.performance?.processingSteps || ['Generation completed']);
            } else {
                setGenerationError(result.error || result.message || 'Failed to generate note');
                setProcessingSteps(result.performance?.processingSteps || ['Generation failed']);
            }

        } catch (error: any) {
            console.error('Note generation error:', error);
            setGenerationError(`Generation failed: ${error.message}`);
            setProcessingSteps(['Network error occurred']);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setTranscript('');
        setPatientId('');
        setGeneratedNote(null);
        setGenerationError(null);
        setProcessingSteps([]);
        // Reset clinical context to defaults
        setClinicalContext({
            ...clinicalContext,
            previousNote: '',
            patientHistory: undefined
        });
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Note copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const getContextualPlaceholder = () => {
        switch (clinicalContext.visitType) {
            case 'transfer-of-care':
                return `Enter the patient encounter transcript from today's visit...

Example:
Patient returns for follow-up. Reports feeling much better since starting sertraline 50mg daily. Sleep has improved, mood is more stable. Denies side effects. Still some anxiety before work meetings but manageable. Wants to continue current medication.`;

            case 'psychiatric-intake':
                return `Enter the complete psychiatric intake transcript...

Example:
25-year-old female presents with 6-month history of depressed mood, decreased energy, poor sleep, and anxiety. Reports feeling overwhelmed at work, crying spells daily. No prior psychiatric treatment. Family history of depression in mother. Denies suicidal ideation. Looking for help managing symptoms.`;

            case 'follow-up':
                return `Enter the follow-up visit transcript...

Example:
Patient returns for 3-month follow-up. On sertraline 100mg daily and therapy. Reports significant improvement in mood and anxiety. Sleep better, energy improved. Minor side effects - mild nausea initially but resolved. Therapy is helpful. Wants to continue current treatment plan.`;

            default:
                return 'Enter the patient encounter transcript here...';
        }
    };

    // Show note generation interface if action=create
    if (action === 'create') {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Clinical Note Generation</h1>
                            <p className="mt-2 text-gray-600">
                                Context-aware AI note generation for your specific clinical workflow
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Clinical Context Configuration */}
                <ClinicalContextSelector
                    context={clinicalContext}
                    onContextChange={setClinicalContext}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Form */}
                    <div className="bg-white shadow rounded-lg border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Visit Transcript</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Enter the {clinicalContext.visitType.replace('-', ' ')} transcript for AI processing
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Patient ID */}
                            <div>
                                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
                                    Patient ID
                                </label>
                                <input
                                    type="text"
                                    id="patientId"
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    placeholder="e.g., patient_123"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Transcript Input */}
                            <div>
                                <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
                                    Visit Transcript *
                                </label>
                                <textarea
                                    id="transcript"
                                    rows={12}
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder={getContextualPlaceholder()}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    {transcript.length} characters • {clinicalContext.clinic === 'hmhi-downtown' ? 'Epic EMR' : 'Credible EMR'} format
                                </p>
                            </div>

                            {/* Context Summary */}
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-sm">
                                    <span className="font-medium text-blue-900">AI Configuration: </span>
                                    <span className="text-blue-700">
                                        {clinicalContext.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'} •
                                        {' '}{clinicalContext.visitType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} •
                                        {' '}{clinicalContext.generationSettings.includeEpicSyntax ? 'Epic SmartPhrases' : 'Plain Text'}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !transcript.trim()}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Generate Clinical Note
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleClear}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="bg-white shadow rounded-lg border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Generated Clinical Note</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {clinicalContext.clinic === 'hmhi-downtown' ? 'Epic-ready' : 'Credible-ready'} clinical documentation
                            </p>
                        </div>

                        <div className="p-6">
                            {!generatedNote && !generationError && !isGenerating && (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Ready for clinical note generation</h3>
                                    <p className="mt-1 text-sm text-gray-500">Configure your clinical context and enter transcript to begin</p>
                                </div>
                            )}

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

                            {generationError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                {generationError}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {generatedNote && (
                                <div className="space-y-4">
                                    {/* Note Header */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm font-medium text-green-800">
                                                    {clinicalContext.visitType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Note Generated
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-sm text-green-700">
                                                <span>Provider: {generatedNote.aiProvider}</span>
                                                <span>•</span>
                                                <span>Quality: {generatedNote.qualityScore}/10</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Generated Note Content */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                {clinicalContext.emr.toUpperCase()} Clinical Note
                                            </h4>
                                            <button
                                                onClick={() => copyToClipboard(generatedNote.content)}
                                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy to {clinicalContext.emr.toUpperCase()}
                                            </button>
                                        </div>
                                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono max-h-96 overflow-y-auto">
                                            {generatedNote.content}
                                        </pre>
                                    </div>

                                    {/* Epic Syntax Detection (only for HMHI) */}
                                    {clinicalContext.generationSettings.includeEpicSyntax && (generatedNote.metadata.smartPhrasesDetected.length > 0 || generatedNote.metadata.dotPhrasesDetected.length > 0) && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">Epic Syntax Elements Detected</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                {generatedNote.metadata.smartPhrasesDetected.length > 0 && (
                                                    <div>
                                                        <span className="font-medium text-blue-800">SmartPhrases:</span>
                                                        <ul className="mt-1 text-blue-700">
                                                            {generatedNote.metadata.smartPhrasesDetected.map((phrase, index) => (
                                                                <li key={index} className="font-mono">{phrase}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {generatedNote.metadata.dotPhrasesDetected.length > 0 && (
                                                    <div>
                                                        <span className="font-medium text-blue-800">DotPhrases:</span>
                                                        <ul className="mt-1 text-blue-700">
                                                            {generatedNote.metadata.dotPhrasesDetected.map((phrase, index) => (
                                                                <li key={index} className="font-mono">{phrase}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
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

    // Show notes list/default view
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Clinical Notes Management</h3>
                    <p className="mt-1 text-sm text-gray-500">Generate and manage your clinical documentation</p>
                    <div className="mt-6">
                        <button
                            onClick={() => router.push('/dashboard/notes?action=create')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Generate Clinical Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}