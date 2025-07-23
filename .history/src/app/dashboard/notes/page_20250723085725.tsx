// src/app/dashboard/notes/page.tsx - COMPLETE FILE WITH STACKED LAYOUT
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import NoteFeedbackForm from '@/components/feedback/NoteFeedbackForm';
import {
    UserIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    SparklesIcon,
    ClockIcon,
    ArrowPathIcon,
    PlusIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    DocumentDuplicateIcon,
    CloudArrowDownIcon
} from '@heroicons/react/24/outline';

// Enhanced Patient interface
interface EnhancedPatient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    clinic: 'hmhi-downtown' | 'dbh' | 'other';
    status: 'active' | 'inactive' | 'transferred';
    lastVisitDate?: Date;
    noteCount?: number;
    averageNoteQuality?: number;
    diagnosis?: string[];
    currentMedications?: string[];
}

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Check if we're in create mode
    const isCreateMode = searchParams?.get('action') === 'create';
    const preselectedPatientId = searchParams?.get('patient');

    // Note generation state
    const [generatedNote, setGeneratedNote] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<EnhancedPatient | null>(null);
    const [showPatientSearch, setShowPatientSearch] = useState(false);

    // Clinical context with intelligent defaults
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'hmhi-downtown',
        visitType: 'follow-up',
        emr: 'epic',
        generationSettings: {
            updateHPI: true,
            generateAssessment: true,
            addIntervalUpdate: true,
            updatePlan: true,
            modifyPsychExam: true,
            includeEpicSyntax: true,
            comprehensiveIntake: false,
            referencePreviousVisits: true
        }
    });

    // Mock patients data
    const mockPatients: EnhancedPatient[] = [
        {
            id: 'pat-001',
            name: 'Sarah Johnson',
            mrn: 'MRN-123456',
            dob: '1985-03-15',
            clinic: 'hmhi-downtown',
            status: 'active',
            lastVisitDate: new Date('2024-01-15'),
            noteCount: 8,
            averageNoteQuality: 8.5,
            diagnosis: ['Major Depressive Disorder', 'Generalized Anxiety Disorder'],
            currentMedications: ['Sertraline 100mg', 'Lorazepam 0.5mg PRN']
        },
        {
            id: 'pat-002',
            name: 'Michael Chen',
            mrn: 'MRN-789012',
            dob: '1992-07-22',
            clinic: 'dbh',
            status: 'active',
            lastVisitDate: new Date('2024-01-10'),
            noteCount: 12,
            averageNoteQuality: 9.2,
            diagnosis: ['Bipolar I Disorder', 'ADHD'],
            currentMedications: ['Lithium 900mg', 'Adderall XR 20mg']
        },
        {
            id: 'pat-003',
            name: 'Emily Rodriguez',
            mrn: 'MRN-345678',
            dob: '1978-11-08',
            clinic: 'hmhi-downtown',
            status: 'active',
            lastVisitDate: new Date('2024-01-12'),
            noteCount: 15,
            averageNoteQuality: 8.8,
            diagnosis: ['PTSD', 'Substance Use Disorder in Remission'],
            currentMedications: ['Prazosin 2mg', 'Zoloft 150mg']
        }
    ];

    // Auto-select patient based on URL parameter
    useEffect(() => {
        if (preselectedPatientId && mockPatients.length > 0) {
            const patient = mockPatients.find(p => p.id === preselectedPatientId);
            if (patient) {
                setSelectedPatient(patient);
                // Auto-configure clinical context based on patient's clinic
                setClinicalContext(prev => ({
                    ...prev,
                    clinic: patient.clinic === 'dbh' ? 'dbh' : 'hmhi-downtown',
                    emr: patient.clinic === 'dbh' ? 'credible' : 'epic'
                }));
            }
        }
    }, [preselectedPatientId, mockPatients]);

    // Enhanced note generation with clinical context
    const handleGenerateNote = async () => {
        if (!user) {
            toast.error('Please log in to generate notes');
            return;
        }

        if (!transcript.trim()) {
            toast.error('Please enter a clinical transcript');
            return;
        }

        setIsGenerating(true);
        setError(null);

        const loadingToast = toast.loading('Generating clinical note...', {
            description: `Using ${clinicalContext.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'} workflow`
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
                    patientName: selectedPatient?.name || 'Unnamed Patient',
                    templateId: clinicalContext.visitType,
                    clinicalContext, // Include the full clinical context
                    encounterType: clinicalContext.visitType,
                    specialty: 'psychiatry',
                    userId: user.uid,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setGeneratedNote(result);

            if (result.learningMetadata?.showFeedbackPrompt) {
                setShowFeedbackForm(true);
            }

            toast.success('Clinical note generated successfully!', {
                description: `${clinicalContext.clinic === 'hmhi-downtown' ? 'Epic' : 'Credible'} format • ${result.processingTime}ms`,
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

    const handleFeedbackSubmitted = () => {
        setShowFeedbackForm(false);
        toast.success('Feedback submitted!', {
            description: 'Thank you! Your feedback helps improve AI note generation.'
        });
    };

    // Helper function to format last visit date
    const formatLastVisit = (date?: Date) => {
        if (!date) return 'No visits';
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    // Render create mode with gorgeous stacked layout
    if (isCreateMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Generate Clinical Note
                            </h1>
                            <p className="text-gray-600 mt-2 text-lg">
                                AI-powered psychiatric documentation with clinical workflow integration
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/notes')}
                            className="bg-white text-gray-600 hover:text-gray-900 px-6 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-all shadow-sm hover:shadow"
                        >
                            ← Back to Notes
                        </button>
                    </div>

                    {/* STACKED LAYOUT - Clinical Context Configuration at top */}
                    <div className="space-y-8">
                        {/* Clinical Context Configuration - Full Width */}
                        <ClinicalContextSelector
                            context={clinicalContext}
                            onContextChange={setClinicalContext}
                        />

                        {/* Patient Selection and Transcript - Side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Patient Selection */}
                            <div className="lg:col-span-1">
                                <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
                                        <h3 className="text-lg font-semibold flex items-center">
                                            <UserIcon className="h-6 w-6 mr-3" />
                                            Patient Selection
                                        </h3>
                                    </div>

                                    <div className="p-6">
                                        {!selectedPatient ? (
                                            <div className="space-y-4">
                                                <button
                                                    onClick={() => setShowPatientSearch(!showPatientSearch)}
                                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                                >
                                                    <UserIcon className="w-5 h-5" />
                                                    Select Patient
                                                </button>

                                                {showPatientSearch && (
                                                    <div className="space-y-3 border-t pt-4">
                                                        <h4 className="font-medium text-gray-900 mb-3">Available Patients</h4>
                                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                                            {mockPatients.map((patient) => (
                                                                <button
                                                                    key={patient.id}
                                                                    onClick={() => {
                                                                        setSelectedPatient(patient);
                                                                        setShowPatientSearch(false);
                                                                    }}
                                                                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
                                                                >
                                                                    <div className="font-medium text-gray-900">{patient.name}</div>
                                                                    <div className="text-sm text-gray-500">MRN: {patient.mrn}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-green-900">{selectedPatient.name}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPatient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {selectedPatient.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-green-700 space-y-1">
                                                        <div>MRN: {selectedPatient.mrn}</div>
                                                        <div>DOB: {selectedPatient.dob}</div>
                                                        <div>Clinic: {selectedPatient.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedPatient(null)}
                                                        className="w-full mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                                                    >
                                                        Change Patient
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Transcript Input and Note Generation */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Transcript Input */}
                                <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
                                        <h3 className="text-lg font-semibold flex items-center">
                                            <DocumentTextIcon className="h-6 w-6 mr-3" />
                                            Clinical Transcript
                                        </h3>
                                    </div>

                                    <div className="p-6">
                                        <textarea
                                            value={transcript}
                                            onChange={(e) => setTranscript(e.target.value)}
                                            placeholder="Enter your clinical transcript here..."
                                            rows={12}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm leading-relaxed"
                                        />

                                        <div className="mt-6 flex items-center justify-between">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <ClockIcon className="h-4 w-4 mr-1" />
                                                {transcript.length} characters
                                            </div>
                                            <button
                                                onClick={handleGenerateNote}
                                                disabled={isGenerating || !transcript.trim() || !selectedPatient}
                                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <SparklesIcon className="w-5 h-5" />
                                                        Generate Note
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                        <div className="flex items-center mb-2">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                                            <h4 className="font-semibold text-red-900">Generation Error</h4>
                                        </div>
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* Generated Note Display */}
                                {generatedNote && (
                                    <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold flex items-center">
                                                    <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
                                                    Generated Clinical Note
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-indigo-100 text-sm">
                                                        {generatedNote.provider} • {generatedNote.processingTime}ms
                                                    </span>
                                                    <button className="text-indigo-100 hover:text-white transition-colors">
                                                        <DocumentDuplicateIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                                                {generatedNote.content}
                                            </div>

                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                        <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                                                        Quality Score: {generatedNote.qualityMetrics?.overallScore || 'N/A'}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <ChartBarIcon className="h-4 w-4 mr-1 text-blue-500" />
                                                        Completeness: {generatedNote.qualityMetrics?.completeness || 'N/A'}%
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                                        <CloudArrowDownIcon className="h-4 w-4" />
                                                        Export
                                                    </button>
                                                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                                        <CheckCircleIcon className="h-4 w-4" />
                                                        Save Note
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Form */}
                                {showFeedbackForm && generatedNote && user && (
                                    <NoteFeedbackForm
                                        noteId={generatedNote.noteId}
                                        noteContent={generatedNote.content}
                                        aiProvider={generatedNote.provider}
                                        patientId={selectedPatient?.id || 'temp-patient-id'}
                                        templateUsed={clinicalContext.visitType}
                                        userId={user.uid}
                                        onFeedbackSubmitted={handleFeedbackSubmitted}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default notes list view (also gorgeous)
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Clinical Notes
                        </h1>
                        <p className="text-gray-600 mt-2 text-lg">Manage and generate clinical documentation</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/notes?action=create')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Generate New Note
                    </button>
                </div>

                {/* Enhanced Notes list placeholder */}
                <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                    <div className="text-center py-16">
                        <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Get started by generating your first clinical note using our advanced AI system with clinical workflow integration.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/notes?action=create')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Generate Your First Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}