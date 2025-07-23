// src/app/dashboard/notes/page.tsx
// 🎨 ENHANCED VERSION: Beautiful, colorful medical app UI

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notesService } from '@/lib/firebase/notes';
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
    Hospital
} from 'lucide-react';

export default function NotesPage() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<EnhancedNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingNote, setGeneratingNote] = useState(false);
    const [selectedNote, setSelectedNote] = useState<EnhancedNote | null>(null);
    const [transcript, setTranscript] = useState('');
    const [patientId, setPatientId] = useState('');
    const [clinicalContext, setClinicalContext] = useState<ClinicalContext>({
        clinic: 'HMHI Downtown',
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

    useEffect(() => {
        loadNotes();
    }, [user]);

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

    const generateNote = async () => {
        if (!transcript.trim() || !patientId.trim()) {
            alert('Please enter both transcript and patient ID');
            return;
        }

        setGeneratingNote(true);
        try {
            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: { content: transcript },
                    patientId,
                    clinicalContext,
                    userId: user?.uid
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate note');
            }

            const data = await response.json();

            if (data.success && data.note) {
                setNotes(prev => [data.note, ...prev]);
                setSelectedNote(data.note);
                setTranscript('');
                setPatientId('');
            }
        } catch (error) {
            console.error('Error generating note:', error);
            alert('Error generating note. Please try again.');
        } finally {
            setGeneratingNote(false);
        }
    };

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
                                Generate professional {clinicalContext.emr === 'epic' ? 'Epic-ready' : 'Credible-ready'} clinical documentation
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                                    <p className="text-sm text-gray-600 font-medium">Total Notes</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Brain className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">AI</p>
                                    <p className="text-sm text-gray-600 font-medium">Powered</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Hospital className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{clinicalContext.clinic}</p>
                                    <p className="text-sm text-gray-600 font-medium">Active Clinic</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Activity className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{clinicalContext.emr.toUpperCase()}</p>
                                    <p className="text-sm text-gray-600 font-medium">EMR System</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Note Generation Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Sparkles className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Generate New Clinical Note</h2>
                                </div>
                                <p className="text-indigo-100 mt-2">
                                    AI-powered note generation with clinical context awareness
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Clinical Context Configuration */}
                                <ClinicalContextSelector
                                    context={clinicalContext}
                                    onContextChange={setClinicalContext}
                                />

                                {/* Patient Information */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4 text-indigo-600" />
                                        Patient Identifier
                                    </label>
                                    <input
                                        type="text"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        placeholder="Enter patient ID or identifier"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>

                                {/* Visit Transcript */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-indigo-600" />
                                        Clinical Visit Transcript
                                    </label>
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder="Enter the clinical visit transcript here..."
                                        rows={8}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                                    />
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={generateNote}
                                    disabled={generatingNote || !transcript.trim() || !patientId.trim()}
                                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                                >
                                    {generatingNote ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Generating Note...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-5 w-5" />
                                            Generate Clinical Note
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notes History Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden sticky top-8">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
                                <div className="flex items-center gap-3 text-white">
                                    <Clock className="h-6 w-6" />
                                    <h2 className="text-xl font-semibold">Recent Notes</h2>
                                </div>
                                <p className="text-emerald-100 mt-2">
                                    Your generated clinical documentation
                                </p>
                            </div>

                            <div className="p-4 max-h-96 overflow-y-auto">
                                {notes.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">No notes yet</p>
                                        <p className="text-sm text-gray-400">Generate your first clinical note</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notes.slice(0, 10).map((note) => (
                                            <div
                                                key={note.id}
                                                onClick={() => setSelectedNote(note)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${selectedNote?.id === note.id
                                                        ? 'bg-indigo-50 border-indigo-200 shadow-md'
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {note.metadata.patientId}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(note.metadata.generatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`px-2 py-1 rounded-full font-medium ${note.metadata.aiProvider === 'gemini'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {note.metadata.aiProvider}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {note.metadata.visitType}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selected Note Editor */}
                {selectedNote && (
                    <div className="mt-8">
                        <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
                            <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-6">
                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-6 w-6" />
                                        <div>
                                            <h3 className="text-xl font-semibold">
                                                Clinical Note - {selectedNote.metadata.patientId}
                                            </h3>
                                            <p className="text-gray-300 text-sm">
                                                Generated on {new Date(selectedNote.metadata.generatedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNote(null)}
                                        className="text-gray-300 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <EditableNoteView
                                    noteId={selectedNote.id}
                                    initialContent={selectedNote.content}
                                    metadata={selectedNote.metadata}
                                    onSave={async (content, changes) => {
                                        // Handle save logic
                                        console.log('Saving note:', content, changes);
                                    }}
                                    onAutoSave={async (content) => {
                                        // Handle auto-save logic
                                        console.log('Auto-saving note:', content);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}