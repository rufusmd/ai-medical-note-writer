// src/app/dashboard/notes/page.tsx - Safe Emergency Version
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
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
    XMarkIcon,
    PencilIcon
} from '@heroicons/react/24/outline';

// Patient interface that matches your existing Firebase structure
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
    const [error, setError] = useState<string | null>(null);

    // Simple edit mode state
    const [isEditMode, setIsEditMode] = useState(false);

    // Form state
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'hmhi-downtown',
        visitType: 'psychiatric-intake', // Fixed to match your existing types
        emr: 'epic',
        generationSettings: {
            updateHPI: true,
            generateAssessment: true,
            addIntervalUpdate: false,
            updatePlan: true,
            modifyPsychExam: false,
            includeEpicSyntax: true,
            comprehensiveIntake: false,
            referencePreviousVisits: false
        }
    });

    // Patient management state
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [showPatientForm, setShowPatientForm] = useState(false);

    // Load patients from Firebase
    useEffect(() => {
        if (!user?.uid) return;

        console.log('🔍 Setting up patients listener for user:', user.uid);

        const patientsQuery = query(
            collection(db, 'patients'),
            where('userId', '==', user.uid),
            where('isActive', '==', true),
            orderBy('lastModified', 'desc')
        );

        const unsubscribe = onSnapshot(
            patientsQuery,
            (snapshot) => {
                console.log('📊 Patients snapshot received, docs:', snapshot.docs.length);

                const patientsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Patient));

                console.log('👥 Processed patients:', patientsData.length);
                setPatients(patientsData);
                setLoadingPatients(false);

                // Auto-select preselected patient
                if (preselectedPatientId && patientsData.length > 0) {
                    const preselected = patientsData.find(p => p.id === preselectedPatientId);
                    if (preselected) {
                        setSelectedPatient(preselected);
                        console.log('✅ Auto-selected patient:', preselected.name);
                    }
                }
            },
            (error) => {
                console.error('❌ Error loading patients:', error);
                setLoadingPatients(false);
                toast.error('Failed to load patients');
            }
        );

        return () => unsubscribe();
    }, [user?.uid, preselectedPatientId]);

    // Handle note generation - using your existing API route
    const generateNote = async () => {
        if (!transcript.trim()) {
            toast.error('Please enter a transcript');
            return;
        }

        if (!selectedPatient) {
            toast.error('Please select a patient');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            console.log('🚀 Starting note generation...');

            const requestBody = {
                transcript: transcript.trim(),
                patientId: selectedPatient.id,
                patientName: selectedPatient.name,
                templateId: 'default',
                clinicalContext,
                encounterType: clinicalContext.visitType,
                specialty: 'psychiatry',
                userId: user?.uid
            };

            console.log('📝 Request body:', requestBody);

            // Use your existing API route
            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ API Error:', errorData);
                throw new Error(`Failed to generate note: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Generated note data:', data);

            setGeneratedNote(data);

            // Success notification
            toast.success('Note generated successfully!');

        } catch (error) {
            console.error('❌ Note generation error:', error);
            setError(error instanceof Error ? error.message : 'Failed to generate note');
            toast.error('Failed to generate note. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Simple edit mode toggle
    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        if (!isEditMode) {
            toast.success('Edit mode enabled - Simple editing available');
        }
    };

    // Handle patient creation
    const handlePatientCreated = (newPatient: Patient) => {
        console.log('✅ New patient created:', newPatient);
        setSelectedPatient(newPatient);
        setShowPatientForm(false);
        toast.success(`Patient ${newPatient.name} created successfully!`);
    };

    // Copy note to clipboard
    const copyToClipboard = async () => {
        if (!generatedNote?.content) return;

        try {
            await navigator.clipboard.writeText(generatedNote.content);
            toast.success('Note copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast.error('Failed to copy note');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 flex items-center">
                        <span className="text-6xl mr-6">📝</span>
                        Clinical Note Generation
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                        Generate professional clinical notes using AI with Epic SmartPhrase support.
                        <span className="text-purple-600 font-medium ml-2">
                            Advanced features coming soon.
                        </span>
                    </p>
                </div>

                {isCreateMode ? (
                    /* Patient Creation Form */
                    <div className="bg-white rounded-3xl shadow-2xl p-12">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4">👤</div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create New Patient</h2>
                            <p className="text-gray-600">Add a new patient to your practice</p>
                        </div>

                        <PatientCreationForm
                            onPatientCreated={(patient) => {
                                handlePatientCreated(patient);
                                router.push('/dashboard/notes');
                            }}
                            onCancel={() => router.push('/dashboard/notes')}
                        />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Clinical Context Configuration */}
                        <div className="bg-white rounded-3xl shadow-2xl p-12">
                            <ClinicalContextSelector
                                context={clinicalContext}
                                onContextChange={setClinicalContext}
                            />
                        </div>

                        {/* Patient Selection & Note Generation */}
                        <div className="bg-white rounded-3xl shadow-2xl p-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                                <span className="text-4xl mr-4">🎯</span>
                                Patient & Transcript
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Patient Selection */}
                                <div>
                                    <label className="block text-lg font-semibold text-gray-700 mb-4">
                                        Select Patient
                                    </label>

                                    {loadingPatients ? (
                                        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-2xl">
                                            <div className="flex items-center space-x-2 text-gray-600">
                                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                                <span>Loading patients...</span>
                                            </div>
                                        </div>
                                    ) : patients.length > 0 ? (
                                        <div className="space-y-3">
                                            {patients.map((patient) => (
                                                <div
                                                    key={patient.id}
                                                    onClick={() => setSelectedPatient(patient)}
                                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedPatient?.id === patient.id
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-4">
                                                            <UserIcon className="h-8 w-8 text-purple-600" />
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 text-lg">
                                                                    {patient.name}
                                                                </h3>
                                                                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                                                    {patient.mrn && <span>MRN: {patient.mrn}</span>}
                                                                    {patient.dob && <span>DOB: {patient.dob}</span>}
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${patient.primaryClinic === 'hmhi-downtown'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-green-100 text-green-800'
                                                                        }`}>
                                                                        {patient.primaryClinic === 'hmhi-downtown' ? 'HMHI' : 'DBH'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {selectedPatient?.id === patient.id && (
                                                            <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => setShowPatientForm(true)}
                                                className="w-full p-6 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                                            >
                                                <PlusIcon className="h-6 w-6" />
                                                <span className="font-medium">Add New Patient</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                                            <p className="text-gray-600 mb-6">Create your first patient to get started</p>
                                            <button
                                                onClick={() => setShowPatientForm(true)}
                                                className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 mx-auto"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                                <span>Create Patient</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Transcript Input */}
                                <div>
                                    <label className="block text-lg font-semibold text-gray-700 mb-4">
                                        Clinical Transcript
                                    </label>
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder="Enter the clinical encounter transcript here..."
                                        className="w-full h-80 p-6 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base leading-relaxed resize-none"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700">
                                    <ExclamationTriangleIcon className="h-5 w-5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Generate Button */}
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={generateNote}
                                    disabled={isGenerating || !transcript.trim() || !selectedPatient}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-4 rounded-2xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-3 shadow-lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <ArrowPathIcon className="h-6 w-6 animate-spin" />
                                            <span>Generating Note...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-6 w-6" />
                                            <span>Generate Clinical Note</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Generated Note Display */}
                        {generatedNote && (
                            <div className="bg-white rounded-3xl shadow-2xl p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                                        <span className="text-4xl mr-4">📄</span>
                                        Generated Clinical Note
                                    </h2>

                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={toggleEditMode}
                                            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${isEditMode
                                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                }`}
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                            <span>{isEditMode ? 'View Mode' : 'Edit Mode'}</span>
                                        </button>

                                        <button
                                            onClick={copyToClipboard}
                                            className="bg-green-100 text-green-700 px-6 py-3 rounded-xl hover:bg-green-200 transition-colors duration-200 flex items-center space-x-2 font-medium"
                                        >
                                            <DocumentDuplicateIcon className="h-5 w-5" />
                                            <span>Copy Note</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Note Content */}
                                {isEditMode ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50 rounded-lg">
                                            <div className="flex items-center space-x-2 text-blue-800">
                                                <PencilIcon className="h-5 w-5" />
                                                <span className="font-medium">Simple Edit Mode</span>
                                            </div>
                                            <p className="text-blue-700 mt-1">Make your changes here. Advanced AI learning features coming soon!</p>
                                        </div>

                                        <textarea
                                            value={generatedNote.content}
                                            onChange={(e) => setGeneratedNote((prev: any) => ({ ...prev, content: e.target.value }))}
                                            className="w-full h-96 p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base leading-relaxed resize-none font-mono"
                                        />

                                        <div className="flex justify-end space-x-3">
                                            <button
                                                onClick={() => setIsEditMode(false)}
                                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditMode(false);
                                                    toast.success('Note updated successfully!');
                                                }}
                                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                                        <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base font-mono">
                                            {generatedNote.content}
                                        </pre>
                                    </div>
                                )}

                                {/* Generation Metadata */}
                                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
                                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                                        <ChartBarIcon className="h-5 w-5 mr-2" />
                                        Generation Details
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Provider:</span>
                                            <span className="ml-2 font-medium text-gray-900 capitalize">
                                                {generatedNote.provider || 'Gemini'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Processing Time:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {((generatedNote.processingTime || generatedNote.generationTime || 0) / 1000).toFixed(1)}s
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Quality Score:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {generatedNote.qualityMetrics?.overallScore || generatedNote.qualityScore || 'N/A'}
                                                {typeof (generatedNote.qualityMetrics?.overallScore || generatedNote.qualityScore) === 'number' ? '/10' : ''}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Status:</span>
                                            <span className="ml-2 font-medium text-green-600">
                                                Generated
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Patient Creation Modal */}
                {showPatientForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Create New Patient</h2>
                                <button
                                    onClick={() => setShowPatientForm(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <PatientCreationForm
                                onPatientCreated={handlePatientCreated}
                                onCancel={() => setShowPatientForm(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}