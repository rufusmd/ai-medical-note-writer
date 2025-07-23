// src/app/dashboard/notes/page.tsx - Enhanced with Phase 4A Features
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClinicalContextSelector, { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import NoteFeedbackForm from '@/components/feedback/NoteFeedbackForm';
import PatientCreationForm from '@/components/medical/PatientCreationForm';
import EditableNoteEditor from '@/components/medical/EditableNoteEditor'; // NEW - Phase 4A
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { editTrackingService } from '@/lib/firebase/editTracking'; // NEW - Phase 4A
import { EditDelta, EditAnalysisResult, LearningInsight } from '@/types/editTracking'; // NEW - Phase 4A
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
    XMarkIcon,
    // NEW - Phase 4A icons
    PencilIcon,
    LightBulbIcon
} from '@heroicons/react/24/outline';

// Patient interface that matches Firebase - PRESERVED EXACTLY
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

    // Check if we're in create mode - PRESERVED
    const isCreateMode = searchParams?.get('action') === 'create';
    const preselectedPatientId = searchParams?.get('patient');

    // Note generation state - PRESERVED
    const [generatedNote, setGeneratedNote] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // NEW - Phase 4A edit tracking state
    const [currentEditSession, setCurrentEditSession] = useState<string | null>(null);
    const [editStartTime, setEditStartTime] = useState<number | null>(null);
    const [editAnalytics, setEditAnalytics] = useState<EditAnalysisResult | null>(null);
    const [showLearningInsights, setShowLearningInsights] = useState(false);
    const [isUsingEditableInterface, setIsUsingEditableInterface] = useState(false);

    // Form state - PRESERVED EXACTLY
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'hmhi-downtown',
        visitType: 'initial',
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

    // Patient management state - PRESERVED EXACTLY
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [showPatientForm, setShowPatientForm] = useState(false);

    // NEW - Phase 4A learning insights state
    const [learningInsights, setLearningInsights] = useState<LearningInsight[]>([]);

    // Load patients from Firebase - PRESERVED EXACTLY
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

    // Handle note generation - PRESERVED WITH OPTIMIZATION ENHANCEMENT
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
                userId: user?.uid,
                // NEW - Phase 4A optimization flags
                useOptimizedPrompt: true,
                testGroup: 'variant_a' // Could be randomized for A/B testing
            };

            console.log('📝 Request body:', requestBody);

            const response = await fetch('/api/generate-note-enhanced', {
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
            setShowFeedbackForm(false);

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

    // NEW - Phase 4A: Toggle edit mode
    const toggleEditMode = async () => {
        if (!generatedNote || !selectedPatient || !user?.uid) return;

        if (!isUsingEditableInterface) {
            // Enter edit mode - start tracking session
            try {
                const sessionId = await editTrackingService.createEditSession(
                    user.uid,
                    selectedPatient.id,
                    generatedNote.noteId || 'temp_note_id',
                    generatedNote.content,
                    {
                        clinic: clinicalContext.clinic,
                        visitType: clinicalContext.visitType,
                        emr: clinicalContext.emr,
                        specialty: 'psychiatry',
                        generationSettings: {
                            updateHPI: clinicalContext.generationSettings.updateHPI || false,
                            generateAssessment: clinicalContext.generationSettings.generateAssessment || false,
                            addIntervalUpdate: clinicalContext.generationSettings.addIntervalUpdate || false,
                            updatePlan: clinicalContext.generationSettings.updatePlan || false,
                            modifyPsychExam: clinicalContext.generationSettings.modifyPsychExam || false,
                            includeEpicSyntax: clinicalContext.generationSettings.includeEpicSyntax || false,
                            comprehensiveIntake: clinicalContext.generationSettings.comprehensiveIntake || false,
                            referencePreviousVisits: clinicalContext.generationSettings.referencePreviousVisits || false
                        },
                        aiProvider: generatedNote.provider || 'gemini',
                        promptVersion: generatedNote.promptVersion || 'v1.0',
                        originalQualityScore: generatedNote.qualityMetrics?.overallScore
                    }
                );

                setCurrentEditSession(sessionId);
                setEditStartTime(Date.now());
                setIsUsingEditableInterface(true);
                toast.success('Edit mode enabled - AI is learning from your changes');

            } catch (error) {
                console.error('Error starting edit session:', error);
                toast.error('Failed to start edit session');
            }
        } else {
            // Exit edit mode
            setIsUsingEditableInterface(false);
            setCurrentEditSession(null);
            setEditStartTime(null);
        }
    };

    // NEW - Phase 4A: Handle edit completion and learning insights
    const handleEditSave = (finalContent: string) => {
        setGeneratedNote(prev => ({ ...prev, content: finalContent }));
        setIsUsingEditableInterface(false);
        setCurrentEditSession(null);
        toast.success('Note saved with learning insights captured');
    };

    // NEW - Phase 4A: Handle learning insights
    const handleLearningInsights = (insights: LearningInsight[]) => {
        setLearningInsights(insights);
        if (insights.length > 0) {
            setShowLearningInsights(true);
            toast.success(`${insights.length} learning insights generated!`);
        }
    };

    // Handle patient creation - PRESERVED EXACTLY
    const handlePatientCreated = (newPatient: Patient) => {
        console.log('✅ New patient created:', newPatient);
        setSelectedPatient(newPatient);
        setShowPatientForm(false);
        toast.success(`Patient ${newPatient.name} created successfully!`);
    };

    // Copy note to clipboard - PRESERVED EXACTLY
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
                {/* Header - PRESERVED EXACTLY */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 flex items-center">
                        <span className="text-6xl mr-6">📝</span>
                        Clinical Note Generation
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed max-w-3xl">
                        Generate professional clinical notes using AI with Epic SmartPhrase support.
                        {/* NEW - Phase 4A tagline */}
                        <span className="text-purple-600 font-medium ml-2">
                            AI learns from your edits to improve future notes.
                        </span>
                    </p>
                </div>

                {isCreateMode ? (
                    /* Patient Creation Form - PRESERVED EXACTLY */
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
                        />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Clinical Context Configuration - PRESERVED EXACTLY */}
                        <div className="bg-white rounded-3xl shadow-2xl p-12">
                            <ClinicalContextSelector
                                context={clinicalContext}
                                onChange={setClinicalContext}
                            />
                        </div>

                        {/* Patient Selection & Note Generation - PRESERVED WITH MINOR ADDITIONS */}
                        <div className="bg-white rounded-3xl shadow-2xl p-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                                <span className="text-4xl mr-4">🎯</span>
                                Patient & Transcript
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Patient Selection - PRESERVED EXACTLY */}
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

                                {/* Transcript Input - PRESERVED EXACTLY */}
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

                            {/* Generate Button - PRESERVED EXACTLY */}
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

                        {/* Generated Note Display - ENHANCED WITH PHASE 4A FEATURES */}
                        {generatedNote && (
                            <div className="bg-white rounded-3xl shadow-2xl p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                                        <span className="text-4xl mr-4">📄</span>
                                        Generated Clinical Note
                                    </h2>

                                    {/* NEW - Phase 4A Edit Mode Toggle */}
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={toggleEditMode}
                                            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${isUsingEditableInterface
                                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                }`}
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                            <span>{isUsingEditableInterface ? 'Exit Edit Mode' : 'Edit Note'}</span>
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

                                {/* Note Content - ENHANCED FOR EDITING */}
                                {isUsingEditableInterface && currentEditSession ? (
                                    /* NEW - Phase 4A Editable Interface */
                                    <EditableNoteEditor
                                        initialContent={generatedNote.content}
                                        sessionId={currentEditSession}
                                        isEpicMode={clinicalContext.emr === 'epic'}
                                        onSave={handleEditSave}
                                        onCancel={() => setIsUsingEditableInterface(false)}
                                        onLearningInsights={handleLearningInsights}
                                    />
                                ) : (
                                    /* Original Static Display - PRESERVED */
                                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                                        <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base font-mono">
                                            {generatedNote.content}
                                        </pre>
                                    </div>
                                )}

                                {/* Generation Metadata - PRESERVED WITH ENHANCEMENTS */}
                                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
                                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                                        <ChartBarIcon className="h-5 w-5 mr-2" />
                                        Generation Details
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Provider:</span>
                                            <span className="ml-2 font-medium text-gray-900 capitalize">
                                                {generatedNote.provider}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Processing Time:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {(generatedNote.processingTime / 1000).toFixed(1)}s
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Quality Score:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {generatedNote.qualityMetrics?.overallScore || 'N/A'}/10
                                            </span>
                                        </div>
                                        {/* NEW - Phase 4A optimization indicator */}
                                        <div>
                                            <span className="text-gray-600">Optimized:</span>
                                            <span className={`ml-2 font-medium ${generatedNote.optimizationUsed ? 'text-green-600' : 'text-gray-500'
                                                }`}>
                                                {generatedNote.optimizationUsed ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Form - PRESERVED */}
                                {showFeedbackForm && (
                                    <div className="mt-8">
                                        <NoteFeedbackForm
                                            noteId={generatedNote.noteId || 'temp'}
                                            noteContent={generatedNote.content}
                                            onFeedbackSubmit={(feedback) => {
                                                console.log('Feedback submitted:', feedback);
                                                setShowFeedbackForm(false);
                                                toast.success('Thank you for your feedback!');
                                            }}
                                        />
                                    </div>
                                )}

                                {!showFeedbackForm && (
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={() => setShowFeedbackForm(true)}
                                            className="text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-2"
                                        >
                                            <span>Provide feedback on this note</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NEW - Phase 4A Learning Insights Panel */}
                        {showLearningInsights && learningInsights.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl shadow-2xl p-12">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                                        <LightBulbIcon className="h-8 w-8 mr-4 text-yellow-500" />
                                        Learning Insights
                                    </h2>
                                    <button
                                        onClick={() => setShowLearningInsights(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {learningInsights.map((insight, index) => (
                                        <div
                                            key={index}
                                            className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-2">
                                                        {insight.title}
                                                    </h3>
                                                    <p className="text-gray-700 mb-3 leading-relaxed">
                                                        {insight.description}
                                                    </p>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-sm text-gray-600">Confidence:</span>
                                                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                                                                <div
                                                                    className="h-2 bg-green-500 rounded-full"
                                                                    style={{ width: `${insight.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                {Math.round(insight.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {insight.actionable && insight.action && (
                                                    <button className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
                                                        {insight.action.label}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-6 bg-blue-100 rounded-2xl">
                                    <div className="flex items-center space-x-2 text-blue-800">
                                        <LightBulbIcon className="h-5 w-5" />
                                        <span className="font-medium">How AI Learning Works</span>
                                    </div>
                                    <p className="text-blue-700 mt-2 leading-relaxed">
                                        These insights are generated by analyzing your editing patterns. The AI identifies
                                        common changes you make and uses this to improve future note generation. Your
                                        feedback helps create more personalized and accurate clinical documentation.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Patient Creation Modal - PRESERVED */}
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

                            <PatientCreationForm onPatientCreated={handlePatientCreated} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}