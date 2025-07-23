// src/app/dashboard/notes/page.tsx - GORGEOUS FEATURE-RICH VERSION
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

    // Mock patient data (replace with real database calls)
    const [mockPatients] = useState<EnhancedPatient[]>([
        {
            id: '1',
            name: 'Sarah Johnson',
            mrn: 'MRN-001234',
            dob: '1985-03-15',
            clinic: 'hmhi-downtown',
            status: 'active',
            lastVisitDate: new Date('2024-01-15'),
            noteCount: 12,
            averageNoteQuality: 8.5,
            diagnosis: ['Major Depressive Disorder', 'Generalized Anxiety Disorder'],
            currentMedications: ['Sertraline 100mg', 'Lorazepam 0.5mg PRN']
        },
        {
            id: '2',
            name: 'Michael Chen',
            mrn: 'MRN-001235',
            dob: '1992-08-22',
            clinic: 'dbh',
            status: 'active',
            lastVisitDate: new Date('2024-01-10'),
            noteCount: 8,
            averageNoteQuality: 7.8,
            diagnosis: ['Bipolar I Disorder'],
            currentMedications: ['Lithium 600mg', 'Quetiapine 100mg']
        },
        {
            id: '3',
            name: 'Emma Rodriguez',
            mrn: 'MRN-001236',
            dob: '1978-12-05',
            clinic: 'hmhi-downtown',
            status: 'active',
            lastVisitDate: new Date('2024-01-08'),
            noteCount: 15,
            averageNoteQuality: 9.2,
            diagnosis: ['PTSD', 'Major Depressive Disorder'],
            currentMedications: ['Prazosin 2mg', 'Duloxetine 60mg']
        }
    ]);

    const [patientSearchTerm, setPatientSearchTerm] = useState('');

    // Filter patients based on search and clinical context
    const filteredPatients = mockPatients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
            patient.mrn?.toLowerCase().includes(patientSearchTerm.toLowerCase());
        const matchesClinic = patient.clinic === clinicalContext.clinic || patient.clinic === 'other';
        return matchesSearch && matchesClinic;
    });

    // Load preselected patient if available
    useEffect(() => {
        if (preselectedPatientId) {
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

    const handleCreateAnother = () => {
        setGeneratedNote(null);
        setTranscript('');
        setError(null);
        setShowFeedbackForm(false);
        toast.info('Ready for new note', {
            description: 'Enter a new transcript to generate another note'
        });
    };

    const formatLastVisit = (date?: Date) => {
        if (!date) return 'No visits';
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return `${Math.ceil(diffDays / 30)} months ago`;
    };

    // Patient Card Component
    const PatientCard = ({ patient }: { patient: EnhancedPatient }) => (
        <div
            className={`bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 p-4 hover:shadow-lg ${selectedPatient?.id === patient.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
            onClick={() => setSelectedPatient(patient)}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${patient.clinic === 'hmhi-downtown' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                        <UserIcon className={`w-5 h-5 ${patient.clinic === 'hmhi-downtown' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${patient.status === 'active' ? 'bg-green-100 text-green-800' :
                        patient.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                    }`}>
                    {patient.status}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Last visit:</span>
                    <span className="font-medium">{formatLastVisit(patient.lastVisitDate)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Notes:</span>
                    <span className="font-medium">{patient.noteCount} notes</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Quality:</span>
                    <span className="font-medium flex items-center">
                        {patient.averageNoteQuality?.toFixed(1)}/10
                        <ChartBarIcon className="w-3 h-3 ml-1 text-green-500" />
                    </span>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Current Diagnoses:</p>
                <div className="flex flex-wrap gap-1">
                    {patient.diagnosis?.slice(0, 2).map((dx, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {dx.length > 20 ? `${dx.substring(0, 20)}...` : dx}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    // Render create mode with gorgeous UI
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

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left Column - Configuration */}
                        <div className="xl:col-span-1 space-y-6">
                            {/* Clinical Context Configuration */}
                            <ClinicalContextSelector
                                context={clinicalContext}
                                onContextChange={setClinicalContext}
                            />

                            {/* Patient Selection */}
                            <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <UserIcon className="h-6 w-6 mr-3" />
                                        Patient Selection
                                    </h3>
                                </div>

                                <div className="p-6">
                                    {!selectedPatient ? (
                                        <div>
                                            <div className="mb-4">
                                                <input
                                                    type="text"
                                                    placeholder="Search patients by name or MRN..."
                                                    value={patientSearchTerm}
                                                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                />
                                            </div>

                                            <div className="max-h-96 overflow-y-auto space-y-3">
                                                {filteredPatients.map((patient) => (
                                                    <PatientCard key={patient.id} patient={patient} />
                                                ))}
                                            </div>

                                            <button className="w-full mt-4 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                                                <PlusIcon className="w-5 h-5 mr-2" />
                                                Add New Patient
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <PatientCard patient={selectedPatient} />
                                            <button
                                                onClick={() => setSelectedPatient(null)}
                                                className="w-full mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                                            >
                                                Change Patient
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Note Generation */}
                        <div className="xl:col-span-2 space-y-6">
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
                                    <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                                        <span>{transcript.length} characters</span>
                                        <span>Estimated reading time: {Math.ceil(transcript.split(' ').length / 200)} min</span>
                                    </div>
                                </div>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                    <div className="flex items-center">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mr-3" />
                                        <div>
                                            <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
                                            <p className="text-sm text-red-700 mt-1">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerateNote}
                                disabled={isGenerating || !transcript.trim()}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-3"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                                        Generating Clinical Note...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-6 h-6" />
                                        Generate Clinical Note
                                    </>
                                )}
                            </button>

                            {/* Generated Note Display */}
                            {generatedNote && (
                                <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-semibold flex items-center">
                                                <DocumentTextIcon className="h-6 w-6 mr-3" />
                                                Generated Clinical Note
                                            </h2>
                                            <div className="flex items-center space-x-4 text-emerald-100">
                                                <span className="px-3 py-1 bg-emerald-700 rounded-full text-sm font-medium">
                                                    {generatedNote.provider}
                                                </span>
                                                <span className="px-3 py-1 bg-emerald-700 rounded-full text-sm font-medium">
                                                    Quality: {generatedNote.qualityScore}/10
                                                </span>
                                                <span className="text-sm">
                                                    {generatedNote.processingTime}ms
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {/* Note Content */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                                                {generatedNote.content}
                                            </pre>
                                        </div>

                                        {/* Learning Metadata */}
                                        {generatedNote.learningMetadata && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                                                <div className="flex items-center gap-3 text-blue-800 mb-2">
                                                    <SparklesIcon className="w-6 h-6" />
                                                    <span className="font-semibold">AI Learning System Active</span>
                                                    <span className="text-xs bg-blue-200 px-3 py-1 rounded-full">
                                                        {Math.round((generatedNote.learningMetadata.confidenceScore || 1) * 100)}% Confidence
                                                    </span>
                                                </div>
                                                <p className="text-sm text-blue-700">
                                                    Your feedback helps improve future note generation for {clinicalContext.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'} workflows
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={handleCreateAnother}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                                            >
                                                <ArrowPathIcon className="w-5 h-5" />
                                                Generate Another
                                            </button>
                                            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                                                <DocumentDuplicateIcon className="w-5 h-5" />
                                                Copy Note
                                            </button>
                                            <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                                                <CloudArrowDownIcon className="w-5 h-5" />
                                                Export to {clinicalContext.emr === 'epic' ? 'Epic' : 'Credible'}
                                            </button>
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
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
                        >
                            <SparklesIcon className="w-6 h-6" />
                            Generate Your First Note
                        </button>
                    </div>

                    <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                        <div className="flex items-center justify-center space-x-8 text-sm">
                            <div className="flex items-center text-blue-600">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                <span>AI learning system active</span>
                            </div>
                            <div className="flex items-center text-green-600">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                <span>HIPAA compliant</span>
                            </div>
                            <div className="flex items-center text-purple-600">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                <span>Epic & Credible integration</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}