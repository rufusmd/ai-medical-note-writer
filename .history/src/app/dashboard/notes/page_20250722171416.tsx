// COMPLETE FILE: src/app/dashboard/notes/page.tsx - Enhanced with Patient CRUD Integration

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import PatientSelector from '@/components/medical/PatientSelector';
import { Patient, PatientContext } from '@/types/patient';

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

    // State for note generation
    const [transcript, setTranscript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedNote, setGeneratedNote] = useState<GeneratedNote | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Enhanced state with patient integration
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'hmhi-downtown',
        visitType: 'transfer-of-care',
        emr: 'epic',
        generationSettings: {
            updateHPI: true,
            generateAssessment: false,
            addIntervalUpdate: true,
            updatePlan: true,
            modifyPsychExam: true,
            includeEpicSyntax: true,
            comprehensiveIntake: false,
            referencePreviousVisits: true,
        }
    });

    // Enhanced note generation with patient context
    const handleGenerateNote = async () => {
        if (!transcript.trim()) {
            setError('Please enter a transcript');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const requestBody = {
                transcript: { content: transcript },
                clinicalContext,
                patientContext: patientContext || undefined,
                preferences: {
                    includeSmartPhrases: clinicalContext.generationSettings.includeEpicSyntax,
                    includeDotPhrases: true,
                    preserveEpicSyntax: clinicalContext.generationSettings.includeEpicSyntax,
                    detailLevel: 'standard' as const
                }
            };

            console.log('🏥 Enhanced Note Generation Request:', {
                hasPatientContext: !!patientContext,
                patientName: patientContext?.name,
                clinicalContext: clinicalContext.visitType,
                emr: clinicalContext.emr
            });

            const response = await fetch('/api/clinical-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': 'current-user-id', // Replace with actual auth
                },
                body: JSON.stringify(requestBody)
            });

            const data: GenerationResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate note');
            }

            if (data.success && data.note) {
                setGeneratedNote(data.note);

                // Update patient note statistics if patient is selected
                if (selectedPatient && data.note.qualityScore) {
                    try {
                        await fetch(`/api/patients/${selectedPatient.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'user-id': 'current-user-id', // Replace with actual auth
                            },
                            body: JSON.stringify({
                                action: 'update-note-stats',
                                qualityScore: data.note.qualityScore
                            })
                        });

                        // Also add to treatment history
                        await fetch(`/api/patients/${selectedPatient.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'user-id': 'current-user-id',
                            },
                            body: JSON.stringify({
                                action: 'add-treatment-history',
                                treatmentEntry: {
                                    visitType: clinicalContext.visitType,
                                    provider: 'Current Provider',
                                    summary: `${clinicalContext.visitType.replace('-', ' ')} visit - AI note generated with quality score ${data.note.qualityScore}`,
                                    medications: patientContext?.currentMedications || []
                                }
                            })
                        });
                    } catch (updateError) {
                        console.warn('Failed to update patient statistics:', updateError);
                        // Don't fail the whole operation for this
                    }
                }
            } else {
                setError(data.message || 'Unknown error occurred');
            }

        } catch (err) {
            console.error('Note generation error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    const getTranscriptPlaceholder = () => {
        const visitType = clinicalContext.visitType;
        const patientName = selectedPatient?.name || 'the patient';

        switch (visitType) {
            case 'transfer-of-care':
                return `Enter the transfer of care visit transcript for ${patientName}...

Example:
${patientName} is a ${patientContext?.age || 'XX'}-year-old ${patientContext?.gender || 'patient'} with ${patientContext?.primaryDiagnosis || 'psychiatric condition'} returning for transfer of care. Last seen 3 months ago. ${patientContext?.currentMedications?.length ? `Currently on ${patientContext.currentMedications.join(', ')}.` : ''} Reports improvement in mood and sleep. Wants to continue current treatment plan.`;

            case 'psychiatric-intake':
                return `Enter the psychiatric intake transcript for ${patientName}...

Example:
${patientName} is a ${patientContext?.age || 'XX'}-year-old ${patientContext?.gender || 'patient'} presenting for initial psychiatric evaluation. Chief complaint: feeling overwhelmed at work, crying spells daily. No prior psychiatric treatment. ${patientContext?.allergies?.length ? `Allergies: ${patientContext.allergies.join(', ')}.` : 'No known allergies.'} Looking for help managing symptoms.`;

            case 'follow-up':
                return `Enter the follow-up visit transcript for ${patientName}...

Example:
${patientName} returns for 3-month follow-up. ${patientContext?.currentMedications?.length ? `On ${patientContext.currentMedications.join(' and ')}.` : ''} Reports significant improvement in mood and anxiety. Sleep better, energy improved. Minor side effects initially but resolved. Therapy is helpful. Wants to continue current treatment plan.`;

            default:
                return `Enter the patient encounter transcript for ${patientName}...`;
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
                            <h1 className="text-2xl font-bold text-gray-900">Enhanced Clinical Note Generation</h1>
                            <p className="mt-2 text-gray-600">
                                Context-aware AI note generation with patient integration
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

                {/* Patient Selection */}
                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Step 1: Select Patient (Optional but Recommended)
                    </h3>
                    <PatientSelector
                        selectedPatient={selectedPatient}
                        onPatientSelect={setSelectedPatient}
                        onPatientContextChange={setPatientContext}
                        placeholder="Search for an existing patient or leave blank for new patient..."
                        className="mb-4"
                    />
                    <p className="text-sm text-gray-600">
                        Selecting a patient provides AI context including diagnosis, medications, allergies, and visit history for more accurate note generation.
                    </p>
                </div>

                {/* Clinical Context Configuration */}
                <ClinicalContextSelector
                    context={clinicalContext}
                    onContextChange={setClinicalContext}
                />

                {/* Transcript Input */}
                <div className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            Step 2: Enter Visit Transcript
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedPatient
                                ? `Generate ${clinicalContext.visitType.replace('-', ' ')} note for ${selectedPatient.name}`
                                : `Generate ${clinicalContext.visitType.replace('-', ' ')} note`
                            }
                        </p>
                    </div>

                    <div className="p-6">
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder={getTranscriptPlaceholder()}
                            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            disabled={isGenerating}
                        />

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center space-x-2 text-red-800">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">Error: {error}</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleGenerateNote}
                                disabled={isGenerating || !transcript.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Generating Note...</span>
                                    </>
                                ) : (
                                    <span>Generate Clinical Note</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Generated Note Display */}
                {generatedNote && (
                    <div className="bg-white shadow rounded-lg border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Generated Note</h3>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                        <span>Provider: {generatedNote.aiProvider.toUpperCase()}</span>
                                        <span>Quality Score: {generatedNote.qualityScore}/10</span>
                                        <span>Generated: {new Date(generatedNote.metadata.generatedAt).toLocaleString()}</span>
                                        {selectedPatient && (
                                            <span>Patient: {selectedPatient.name}</span>
                                        )}
                                    </div>
                                </div>
                                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                                    Save Note
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                                    {generatedNote.content}
                                </pre>
                            </div>

                            {generatedNote.metadata.smartPhrasesDetected.length > 0 && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-2">Epic Syntax Detected</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedNote.metadata.smartPhrasesDetected.map((phrase, index) => (
                                            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                                {phrase}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex space-x-4">
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                                    Copy to Clipboard
                                </button>
                                <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                                    Export to Epic
                                </button>
                                <button
                                    onClick={() => {
                                        setGeneratedNote(null);
                                        setTranscript('');
                                        setError(null);
                                    }}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                                >
                                    Generate Another
                                </button>
                            </div>
                        </div>
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
            </div>
        </div>
    );
}