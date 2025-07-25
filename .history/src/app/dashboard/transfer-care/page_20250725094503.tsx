'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
    FileUp,
    Brain,
    Zap,
    ArrowLeft,
    User,
    Plus,
    Search,
    CheckCircle2,
    AlertTriangle,
    Users,
    FileText,
    ArrowRight,
    Stethoscope
} from 'lucide-react';
import { patientsService } from '@/lib/firebase/patients';

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

interface ParsedNote {
    format: 'SOAP' | 'NARRATIVE';
    emrType: 'epic' | 'credible';
    sections: Array<{
        type: string;
        content: string;
        wordCount: number;
        hasEpicSyntax: boolean;
    }>;
    confidence: number;
}

interface TransferOfCareData {
    patientId: string;
    previousNote: string;
    parsedNote: ParsedNote;
    uploadedAt: Date;
    uploadedBy: string;
}

export default function TransferCarePage() {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [noteContent, setNoteContent] = useState('');
    const [parseResult, setParseResult] = useState<ParsedNote | null>(null);

    // Patient management state
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showCreatePatient, setShowCreatePatient] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // New patient form
    const [newPatient, setNewPatient] = useState({
        name: '',
        mrn: '',
        dob: ''
    });

    // Load patients on component mount
    useEffect(() => {
        if (user) {
            loadPatients();
        }
    }, [user]);

    const loadPatients = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const userPatients = await patientsService.getUserPatients(user.uid);
            setPatients(userPatients);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const createPatient = async () => {
        if (!user || !newPatient.name.trim()) return;

        try {
            setLoading(true);
            const patientData = {
                name: newPatient.name.trim(),
                mrn: newPatient.mrn.trim() || undefined,
                dob: newPatient.dob || undefined,
                createdBy: user.uid,
                createdAt: new Date(),
                lastModified: new Date()
            };

            const createdPatient = await patientsService.createPatient(patientData);
            setPatients(prev => [createdPatient, ...prev]);
            setSelectedPatient(createdPatient);
            setNewPatient({ name: '', mrn: '', dob: '' });
            setShowCreatePatient(false);
        } catch (error) {
            console.error('Error creating patient:', error);
            alert('Error creating patient. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Enhanced note parser
    const parseNote = (content: string): ParsedNote => {
        const sections = [];
        const soapHeaders = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];

        soapHeaders.forEach((header, index) => {
            const startIndex = content.toUpperCase().indexOf(header);
            if (startIndex !== -1) {
                const nextHeader = soapHeaders[index + 1];
                const endIndex = nextHeader ?
                    content.toUpperCase().indexOf(nextHeader, startIndex + 1) :
                    content.length;

                const sectionContent = content.substring(
                    startIndex + header.length,
                    endIndex > 0 ? endIndex : content.length
                ).trim();

                sections.push({
                    type: header.replace(':', ''),
                    content: sectionContent,
                    wordCount: sectionContent.split(/\s+/).length,
                    hasEpicSyntax: /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(sectionContent)
                });
            }
        });

        return {
            format: sections.length >= 3 ? 'SOAP' : 'NARRATIVE',
            emrType: /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(content) ? 'epic' : 'credible',
            sections: sections,
            confidence: sections.length >= 3 ? 0.9 : 0.6
        };
    };

    const handleAnalyze = async () => {
        if (!noteContent.trim() || !selectedPatient) {
            alert('Please select a patient and enter note content');
            return;
        }

        try {
            setLoading(true);
            const result = parseNote(noteContent);
            setParseResult(result);

            // Save transfer of care data to Firebase
            const transferData: TransferOfCareData = {
                patientId: selectedPatient.id,
                previousNote: noteContent,
                parsedNote: result,
                uploadedAt: new Date(),
                uploadedBy: user?.uid || ''
            };

            // Store in a transfer-of-care subcollection under the patient
            await fetch('/api/transfer-of-care', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferData)
            });

            setStep(2);
        } catch (error) {
            console.error('Error analyzing note:', error);
            alert('Error analyzing note. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setNoteContent(content);
            };
            reader.readAsText(file);
        } else {
            alert('Please select a .txt file');
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.mrn && patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const navigateToNoteGenerator = () => {
        // Navigate to note generator with transfer of care context
        window.location.href = `/dashboard/notes?patient=${selectedPatient?.id}&context=transfer-of-care`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header with breadcrumb */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-4">
                                <li>
                                    <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="ml-4 text-sm font-medium text-gray-900">Transfer of Care</span>
                                    </div>
                                </li>
                            </ol>
                        </nav>
                        <div className="mt-4 flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Transfer of Care Processor
                                </h1>
                                <p className="text-gray-600 font-medium">
                                    Upload and parse previous resident notes for intelligent handoff
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 1: Patient Selection and Note Upload */}
                {step === 1 && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Patient Selection Section */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Users className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Step 1: Select Patient</h2>
                                </div>
                                <p className="text-indigo-100 mt-2">
                                    Choose the patient for whom you're processing the transfer note
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Search and Create */}
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search patients by name or MRN..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowCreatePatient(!showCreatePatient)}
                                        className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Patient
                                    </button>
                                </div>

                                {/* Create New Patient Form */}
                                {showCreatePatient && (
                                    <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Patient</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Patient Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newPatient.name}
                                                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    MRN (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newPatient.mrn}
                                                    onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="12345678"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    DOB (Optional)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={newPatient.dob}
                                                    onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button
                                                onClick={createPatient}
                                                disabled={!newPatient.name.trim() || loading}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Create Patient
                                            </button>
                                            <button
                                                onClick={() => setShowCreatePatient(false)}
                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Patient List */}
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {loading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                            <p className="text-gray-600">Loading patients...</p>
                                        </div>
                                    ) : filteredPatients.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                            <p>No patients found. Create a new patient to get started.</p>
                                        </div>
                                    ) : (
                                        filteredPatients.map((patient) => (
                                            <div
                                                key={patient.id}
                                                onClick={() => setSelectedPatient(patient)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === patient.id
                                                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${selectedPatient?.id === patient.id ? 'bg-indigo-100' : 'bg-gray-100'
                                                            }`}>
                                                            <User className={`h-4 w-4 ${selectedPatient?.id === patient.id ? 'text-indigo-600' : 'text-gray-600'
                                                                }`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{patient.name}</p>
                                                            {patient.mrn && (
                                                                <p className="text-sm text-gray-600">MRN: {patient.mrn}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selectedPatient?.id === patient.id && (
                                                        <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Note Upload Section */}
                        {selectedPatient && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                                    <div className="flex items-center gap-3 text-white">
                                        <FileText className="h-6 w-6" />
                                        <h2 className="text-xl font-semibold">Step 2: Upload Previous Note</h2>
                                    </div>
                                    <p className="text-purple-100 mt-2">
                                        Upload or paste the previous resident's note for {selectedPatient.name}
                                    </p>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* File Upload */}
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                        <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Note File</h3>
                                        <p className="text-gray-600 mb-4">
                                            Drag and drop a .txt file or click to browse
                                        </p>
                                        <label className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-block">
                                            Choose File
                                            <input
                                                type="file"
                                                accept=".txt"
                                                onChange={handleUploadFile}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Or Paste Text */}
                                    <div className="text-center text-gray-500 font-medium">OR</div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Paste Note Content
                                        </label>
                                        <textarea
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="Paste the previous resident's clinical note here..."
                                            rows={15}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none font-mono text-sm"
                                        />
                                    </div>

                                    {/* Analyze Button */}
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={!noteContent.trim() || loading}
                                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Analyzing Note...
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="h-5 w-5" />
                                                Analyze & Parse Note
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Analysis Results */}
                {step === 2 && parseResult && selectedPatient && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Success Header */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <CheckCircle2 className="h-8 w-8" />
                                    <div>
                                        <h2 className="text-2xl font-bold">Note Successfully Parsed!</h2>
                                        <p className="text-green-100 mt-1">
                                            Ready to generate updated note for {selectedPatient.name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            <span className="font-semibold text-blue-900">Format</span>
                                        </div>
                                        <p className="text-blue-700 text-lg font-bold">{parseResult.format}</p>
                                    </div>

                                    <div className="bg-purple-50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Stethoscope className="h-5 w-5 text-purple-600" />
                                            <span className="font-semibold text-purple-900">EMR Type</span>
                                        </div>
                                        <p className="text-purple-700 text-lg font-bold capitalize">{parseResult.emrType}</p>
                                    </div>

                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Brain className="h-5 w-5 text-green-600" />
                                            <span className="font-semibold text-green-900">Confidence</span>
                                        </div>
                                        <p className="text-green-700 text-lg font-bold">
                                            {Math.round(parseResult.confidence * 100)}%
                                        </p>
                                    </div>
                                </div>

                                {/* Parsed Sections */}
                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Sections</h3>
                                    <div className="space-y-4">
                                        {parseResult.sections.map((section, index) => (
                                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-900">{section.type}</span>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span>{section.wordCount} words</span>
                                                        {section.hasEpicSyntax && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                                Epic Syntax
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-gray-700 text-sm line-clamp-3">
                                                    {section.content.substring(0, 200)}
                                                    {section.content.length > 200 && '...'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={navigateToNoteGenerator}
                                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                        Continue to Note Generator
                                    </button>

                                    <button
                                        onClick={() => {
                                            setStep(1);
                                            setNoteContent('');
                                            setParseResult(null);
                                            setSelectedPatient(null);
                                        }}
                                        className="px-6 py-4 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-medium"
                                    >
                                        Process Another Note
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}