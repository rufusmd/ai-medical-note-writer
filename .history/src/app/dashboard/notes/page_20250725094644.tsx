'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { notesService } from '@/lib/firebase/notes';
import { patientsService } from '@/lib/firebase/patients';
import { EnhancedNote } from '@/types/notes';
import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import ClinicalContextSelector from '@/components/clinical/ClinicalContextSelector';
import EditableNoteView from '@/components/notes/EditableNoteView';
import {
    FileText,
    Brain,
    Stethoscope,
    Activity,
    Plus,
    Sparkles,
    CheckCircle2,
    Clock,
    User,
    Hospital,
    Search,
    AlertTriangle,
    Eye,
    FileUp,
    ArrowRight,
    Users
} from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    createdBy: string;
    createdAt: any;
    lastModified: any;
    lastEncounter?: any;
}

interface TransferOfCareData {
    patientId: string;
    previousNote: string;
    parsedNote: {
        format: 'SOAP' | 'NARRATIVE';
        emrType: 'epic' | 'credible';
        sections: Array<{
            type: string;
            content: string;
            wordCount: number;
            hasEpicSyntax: boolean;
        }>;
        confidence: number;
    };
    uploadedAt: any;
    uploadedBy: string;
}

export default function NotesPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();

    // URL parameters
    const urlPatientId = searchParams.get('patient');
    const urlContext = searchParams.get('context');

    // Note management state
    const [notes, setNotes] = useState<EnhancedNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingNote, setGeneratingNote] = useState(false);
    const [selectedNote, setSelectedNote] = useState<EnhancedNote | null>(null);

    // Form state
    const [transcript, setTranscript] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientSelector, setShowPatientSelector] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');

    // Transfer of care state
    const [transferOfCareData, setTransferOfCareData] = useState<TransferOfCareData | null>(null);
    const [showTransferNote, setShowTransferNote] = useState(false);

    // Clinical context with smart defaults
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'HMHI Downtown',
        visitType: (urlContext === 'transfer-of-care' ? 'transfer-of-care' : 'follow-up') as ClinicalContext['visitType'],
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

    // Load data on mount
    useEffect(() => {
        if (user) {
            loadNotes();
            loadPatients();
        }
    }, [user]);

    // Load specific patient and transfer data from URL
    useEffect(() => {
        if (urlPatientId && patients.length > 0) {
            const patient = patients.find(p => p.id === urlPatientId);
            if (patient) {
                setSelectedPatient(patient);
                if (urlContext === 'transfer-of-care') {
                    loadTransferOfCareData(urlPatientId);
                }
            }
        }
    }, [urlPatientId, patients, urlContext]);

    const loadNotes = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const userNotes = await notesService.getUserNotes(user.uid);
            setNotes(userNotes);
        } catch (error) {
            console.error('Error loading notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPatients = async () => {
        if (!user) return;

        try {
            const userPatients = await patientsService.getUserPatients(user.uid);
            setPatients(userPatients);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const loadTransferOfCareData = async (patientId: string) => {
        try {
            const response = await fetch(`/api/transfer-of-care?patientId=${patientId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.transferData) {
                    setTransferOfCareData(data.transferData);
                }
            }
        } catch (error) {
            console.error('Error loading transfer of care data:', error);
        }
    };

    const generateNote = async () => {
        if (!transcript.trim() || !selectedPatient) {
            alert('Please select a patient and enter a transcript');
            return;
        }

        setGeneratingNote(true);
        try {
            const requestBody = {
                transcript: { content: transcript },
                patientId: selectedPatient.id,
                clinicalContext,
                userId: user?.uid,
                // Include transfer of care data if available and relevant
                ...(clinicalContext.visitType === 'transfer-of-care' && transferOfCareData && {
                    transferOfCareData: {
                        previousNote: transferOfCareData.previousNote,
                        parsedNote: transferOfCareData.parsedNote
                    }
                })
            };

            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Failed to generate note');
            }

            const data = await response.json();

            if (data.success && data.note) {
                setNotes(prev => [data.note, ...prev]);
                setSelectedNote(data.note);
                setTranscript('');
            }
        } catch (error) {
            console.error('Error generating note:', error);
            alert('Error generating note. Please try again.');
        } finally {
            setGeneratingNote(false);
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        (patient.mrn && patient.mrn.toLowerCase().includes(patientSearchTerm.toLowerCase()))
    );

    const isTransferOfCare = clinicalContext.visitType === 'transfer-of-care';

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading clinical notes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <FileText className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                AI Clinical Notes
                            </h1>
                            <p className="text-gray-600 font-medium">
                                Generate professional {clinicalContext.emr === 'epic' ? 'Epic' : 'Credible'} clinical documentation
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Note Generation Form */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Clinical Context Configuration */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Sparkles className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Clinical Context & Settings</h2>
                                </div>
                                <p className="text-indigo-100 mt-2">
                                    Configure clinical settings and visit type
                                </p>
                            </div>
                            <div className="p-6">
                                <ClinicalContextSelector
                                    context={clinicalContext}
                                    onContextChange={(newContext) => {
                                        setClinicalContext(newContext);
                                        // Load transfer of care data when switching to transfer of care
                                        if (newContext.visitType === 'transfer-of-care' && selectedPatient) {
                                            loadTransferOfCareData(selectedPatient.id);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Patient Selection */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Users className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Patient Selection</h2>
                                </div>
                                <p className="text-green-100 mt-2">
                                    Select the patient for this clinical encounter
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                {selectedPatient ? (
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg">
                                                    <User className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-green-900">{selectedPatient.name}</p>
                                                    {selectedPatient.mrn && (
                                                        <p className="text-sm text-green-700">MRN: {selectedPatient.mrn}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowPatientSelector(!showPatientSelector)}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowPatientSelector(true)}
                                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800"
                                    >
                                        <User className="h-5 w-5" />
                                        Select Patient
                                    </button>
                                )}

                                {/* Patient Selector */}
                                {showPatientSelector && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search patients..."
                                                value={patientSearchTerm}
                                                onChange={(e) => setPatientSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {filteredPatients.map((patient) => (
                                                <div
                                                    key={patient.id}
                                                    onClick={() => {
                                                        setSelectedPatient(patient);
                                                        setShowPatientSelector(false);
                                                        setPatientSearchTerm('');
                                                        // Load transfer data if needed
                                                        if (isTransferOfCare) {
                                                            loadTransferOfCareData(patient.id);
                                                        }
                                                    }}
                                                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 bg-white hover:shadow-md cursor-pointer transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg">
                                                            <User className="h-4 w-4 text-gray-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{patient.name}</p>
                                                            {patient.mrn && (
                                                                <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transfer of Care Note Display */}
                        {isTransferOfCare && transferOfCareData && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6">
                                    <div className="flex items-center justify-between text-white">
                                        <div className="flex items-center gap-3">
                                            <FileUp className="h-6 w-6" />
                                            <div>
                                                <h2 className="text-xl font-semibold">Previous Resident's Note</h2>
                                                <p className="text-orange-100 mt-1">
                                                    Parsed from uploaded transfer of care document
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowTransferNote(!showTransferNote)}
                                            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            {showTransferNote ? 'Hide' : 'View'}
                                        </button>
                                    </div>
                                </div>

                                {showTransferNote && (
                                    <div className="p-6 space-y-4">
                                        {/* Parse Summary */}
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-blue-600 font-medium">Format</p>
                                                <p className="text-blue-900 font-bold">{transferOfCareData.parsedNote.format}</p>
                                            </div>
                                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-purple-600 font-medium">EMR</p>
                                                <p className="text-purple-900 font-bold capitalize">{transferOfCareData.parsedNote.emrType}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-green-600 font-medium">Confidence</p>
                                                <p className="text-green-900 font-bold">
                                                    {Math.round(transferOfCareData.parsedNote.confidence * 100)}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Parsed Sections */}
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-gray-900 mb-3">Parsed Sections</h3>
                                            {transferOfCareData.parsedNote.sections.map((section, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-semibold text-gray-900">{section.type}</span>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span>{section.wordCount} words</span>
                                                            {section.hasEpicSyntax && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                                    Epic Syntax
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 font-mono max-h-32 overflow-y-auto">
                                                        {section.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Transfer of Care Alert */}
                        {isTransferOfCare && !transferOfCareData && selectedPatient && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-orange-900 mb-2">No Transfer of Care Note Found</h3>
                                        <p className="text-orange-800 mb-4">
                                            No previous resident's note has been uploaded for {selectedPatient.name}.
                                            To enable transfer of care functionality, please upload the previous note first.
                                        </p>
                                        <a
                                            href={`/dashboard/transfer-care?patient=${selectedPatient.id}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                        >
                                            <FileUp className="h-4 w-4" />
                                            Upload Previous Note
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transcript Input */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Stethoscope className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">
                                        {isTransferOfCare ? 'New Clinical Encounter' : 'Clinical Visit Transcript'}
                                    </h2>
                                </div>
                                <p className="text-teal-100 mt-2">
                                    {isTransferOfCare
                                        ? 'Enter the new clinical encounter details for the transfer of care update'
                                        : 'Enter the clinical visit transcript here'
                                    }
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-teal-600" />
                                        {isTransferOfCare ? 'New Encounter Transcript' : 'Clinical Visit Transcript'}
                                    </label>
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder={isTransferOfCare
                                            ? "Enter the new clinical encounter details, changes in condition, new assessments, medication adjustments, etc..."
                                            : "Enter the clinical visit transcript here..."
                                        }
                                        rows={8}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 resize-none"
                                    />
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={generateNote}
                                    disabled={generatingNote || !transcript.trim() || !selectedPatient || (isTransferOfCare && !transferOfCareData)}
                                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                                >
                                    {generatingNote ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Generating {isTransferOfCare ? 'Updated' : 'Clinical'} Note...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="h-5 w-5" />
                                            Generate {isTransferOfCare ? 'Updated Transfer' : 'Clinical'} Note
                                        </>
                                    )}
                                </button>

                                {/* Disabled state explanation */}
                                {(isTransferOfCare && selectedPatient && !transferOfCareData) && (
                                    <p className="text-sm text-orange-600 text-center">
                                        Upload a previous note to enable transfer of care generation
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Generated Notes Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Activity className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Recent Notes</h2>
                                </div>
                                <p className="text-gray-300 mt-2">
                                    Your recently generated clinical notes
                                </p>
                            </div>

                            <div className="p-6">
                                {notes.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p>No notes generated yet</p>
                                        <p className="text-sm">Your generated notes will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {notes.slice(0, 10).map((note) => (
                                            <div
                                                key={note.id}
                                                onClick={() => setSelectedNote(note)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedNote?.id === note.id
                                                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                        : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg flex-shrink-0 ${note.metadata?.visitType === 'transfer-of-care'
                                                            ? 'bg-orange-100' : 'bg-blue-100'
                                                        }`}>
                                                        {note.metadata?.visitType === 'transfer-of-care' ? (
                                                            <FileUp className={`h-4 w-4 ${note.metadata?.visitType === 'transfer-of-care'
                                                                    ? 'text-orange-600' : 'text-blue-600'
                                                                }`} />
                                                        ) : (
                                                            <FileText className="h-4 w-4 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-900 text-sm">
                                                                {note.metadata?.patientName || 'Unknown Patient'}
                                                            </span>
                                                            {note.metadata?.visitType === 'transfer-of-care' && (
                                                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                                                    Transfer
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 mb-2">
                                                            {note.metadata?.clinic} • {note.metadata?.visitType}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                {note.generatedAt && new Date(note.generatedAt.toDate()).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Note Display */}
                        {selectedNote && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
                                    <div className="flex items-center gap-3 text-white">
                                        <CheckCircle2 className="h-6 w-6" />
                                        <h2 className="text-xl font-semibold">Generated Note</h2>
                                    </div>
                                    <p className="text-emerald-100 mt-2">
                                        Ready for review and editing
                                    </p>
                                </div>

                                <div className="p-6">
                                    <EditableNoteView
                                        note={selectedNote}
                                        onSave={(updatedNote) => {
                                            setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                                            setSelectedNote(updatedNote);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}