// src/app/dashboard/notes/page.tsx - Updated with Real Firebase Patient Data
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import NoteFeedbackForm from '@/components/feedback/NoteFeedbackForm';
import PatientCreationForm from '@/components/medical/PatientCreationForm';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
    CloudArrowDownIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

// Patient interface that matches Firebase
interface Patient {
    id: string;
    userId: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    primaryDiagnosis?: string;
    allergies?: string[];
    currentMedications?: string[];
    phoneNumber?: string;
    emergencyContact?: {
        name: string;
        relationship: string;
        phoneNumber: string;
    };
    primaryClinic: 'hmhi-downtown' | 'dbh' | 'other';
    preferredEMR: 'epic' | 'credible' | 'other';
    status: 'active' | 'inactive' | 'transferred';
    isActive: boolean;
    noteCount: number;
    createdAt: any;
    updatedAt: any;
    lastModified: any;
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
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [showAddPatientModal, setShowAddPatientModal] = useState(false);

    // Patient data from Firebase
    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientsError, setPatientsError] = useState<string | null>(null);

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

    // Load patients from Firebase
    useEffect(() => {
        if (!user?.uid) {
            setPatientsLoading(false);
            return;
        }

        console.log('🔄 Loading patients for user:', user.uid);

        // Create real-time query for user's patients
        const patientsQuery = query(
            collection(db, 'patients'),
            where('userId', '==', user.uid),
            where('isActive', '==', true),
            orderBy('lastModified', 'desc')
        );

        const unsubscribe = onSnapshot(
            patientsQuery,
            (snapshot) => {
                const patientData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Patient[];

                console.log('✅ Loaded patients:', patientData.length);
                setPatients(patientData);
                setPatientsLoading(false);
                setPatientsError(null);
            },
            (error) => {
                console.error('❌ Error loading patients:', error);
                setPatientsError('Failed to load patients');
                setPatientsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Auto-select patient based on URL parameter
    useEffect(() => {
        if (preselectedPatientId && patients.length > 0) {
            const patient = patients.find(p => p.id === preselectedPatientId);
            if (patient) {
                setSelectedPatient(patient);
                // Auto-configure clinical context based on patient's clinic
                setClinicalContext(prev => ({
                    ...prev,
                    clinic: patient.primaryClinic === 'dbh' ? 'dbh' : 'hmhi-downtown',
                    emr: patient.preferredEMR === 'credible' ? 'credible' : 'epic'
                }));
            }
        }
    }, [preselectedPatientId, patients]);

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

        if (!selectedPatient) {
            toast.error('Please select a patient');
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
                    patientId: selectedPatient.id,
                    patientName: selectedPatient.name,
                    templateId: clinicalContext.visitType,
                    clinicalContext,
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

    // Copy note to clipboard
    const handleCopyNote = async () => {
        if (!generatedNote?.content) return;

        try {
            await navigator.clipboard.writeText(generatedNote.content);
            toast.success('Note copied to clipboard!', {
                description: 'The clinical note has been copied and is ready to paste.'
            });
        } catch (error) {
            console.error('Failed to copy note:', error);
            toast.error('Failed to copy note', {
                description: 'Please try selecting and copying the text manually.'
            });
        }
    };

    const handleFeedbackSubmitted = () => {
        setShowFeedbackForm(false);
        toast.success('Feedback submitted!', {
            description: 'Thank you! Your feedback helps improve AI note generation.'
        });
    };

    const handlePatientCreated = (newPatient: Patient) => {
        // Patient will be automatically added via Firebase real-time listener
        setShowAddPatientModal(false);
        setSelectedPatient(newPatient);

        // Auto-configure clinical context based on new patient's clinic
        setClinicalContext(prev => ({
            ...prev,
            clinic: newPatient.primaryClinic === 'dbh' ? 'dbh' : 'hmhi-downtown',
            emr: newPatient.preferredEMR === 'credible' ? 'credible' : 'epic'
        }));

        toast.success('Patient created successfully!', {
            description: `${newPatient.name} has been added to your patient list.`
        });
    };

    // Helper function to format last visit date
    const formatLastVisit = (date?: any) => {
        if (!date) return 'No visits';

        try {
            const visitDate = date.toDate ? date.toDate() : new Date(date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - visitDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return `${Math.floor(diffDays / 30)} months ago`;
        } catch {
            return 'Unknown';
        }
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
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowPatientSearch(!showPatientSearch)}
                                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                                    >
                                                        <UserIcon className="w-5 h-5" />
                                                        Select Patient
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAddPatientModal(true)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                                        title="Add New Patient"
                                                    >
                                                        <PlusIcon className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {showPatientSearch && (
                                                    <div className="space-y-3 border-t pt-4">
                                                        <h4 className="font-medium text-gray-900 mb-3">Your Patients</h4>

                                                        {patientsLoading ? (
                                                            <div className="text-center py-4">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                                                                <p className="text-sm text-gray-500 mt-2">Loading patients...</p>
                                                            </div>
                                                        ) : patientsError ? (
                                                            <div className="text-center py-4">
                                                                <p className="text-red-600 text-sm">{patientsError}</p>
                                                            </div>
                                                        ) : patients.length === 0 ? (
                                                            <div className="text-center py-4">
                                                                <p className="text-gray-500 text-sm mb-2">No patients found</p>
                                                                <button
                                                                    onClick={() => setShowAddPatientModal(true)}
                                                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                                >
                                                                    Add your first patient
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                                {patients.map((patient) => (
                                                                    <button
                                                                        key={patient.id}
                                                                        onClick={() => {
                                                                            setSelectedPatient(patient);
                                                                            setShowPatientSearch(false);
                                                                        }}
                                                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
                                                                    >
                                                                        <div className="font-medium text-gray-900">{patient.name}</div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {patient.mrn && `MRN: ${patient.mrn} • `}
                                                                            {patient.primaryClinic === 'hmhi-downtown' ? 'HMHI Downtown' :
                                                                                patient.primaryClinic === 'dbh' ? 'Davis Behavioral Health' :
                                                                                    'Other Clinic'}
                                                                        </div>
                                                                        {patient.primaryDiagnosis && (
                                                                            <div className="text-xs text-gray-400 mt-1">{patient.primaryDiagnosis}</div>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-green-900">{selectedPatient.name}</span>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPatient.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {selectedPatient.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-green-700 space-y-1">
                                                        {selectedPatient.mrn && <div>MRN: {selectedPatient.mrn}</div>}
                                                        {selectedPatient.dob && <div>DOB: {selectedPatient.dob}</div>}
                                                        <div>
                                                            Clinic: {selectedPatient.primaryClinic === 'hmhi-downtown' ? 'HMHI Downtown' :
                                                                selectedPatient.primaryClinic === 'dbh' ? 'Davis Behavioral Health' :
                                                                    'Other Clinic'}
                                                        </div>
                                                        {selectedPatient.primaryDiagnosis && (
                                                            <div>Diagnosis: {selectedPatient.primaryDiagnosis}</div>
                                                        )}
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
                                                    <button
                                                        onClick={handleCopyNote}
                                                        className="text-indigo-100 hover:text-white transition-colors p-1 rounded"
                                                        title="Copy note to clipboard"
                                                    >
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

                    {/* Add Patient Modal */}
                    {showAddPatientModal && (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                            <div className="relative top-8 mx-auto p-8 pb-12 border w-11/12 max-w-6xl shadow-2xl rounded-2xl bg-white min-h-[600px] mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">Add New Patient</h3>
                                    <button
                                        onClick={() => setShowAddPatientModal(false)}
                                        className="text-gray-400 hover:text-gray-600 p-2"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                                <PatientCreationForm
                                    onPatientCreated={handlePatientCreated}
                                    onCancel={() => setShowAddPatientModal(false)}
                                />
                            </div>
                        </div>
                    )}
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