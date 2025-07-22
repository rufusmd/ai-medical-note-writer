// src/app/dashboard/notes/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ClinicalNote {
    id: string;
    title: string;
    patientName: string;
    patientMRN: string;
    templateUsed: string;
    aiProvider: 'gemini' | 'claude';
    status: 'draft' | 'completed' | 'exported';
    createdAt: string;
    lastModified: string;
    wordCount: number;
    content: string;
}

export default function NotesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get('action');
    const templateId = searchParams.get('template');

    const [notes] = useState<ClinicalNote[]>([
        {
            id: '1',
            title: 'Progress Note - Follow-up Visit',
            patientName: 'Sarah Johnson',
            patientMRN: 'MRN-001',
            templateUsed: 'Progress Note',
            aiProvider: 'gemini',
            status: 'completed',
            createdAt: '2024-01-22T10:30:00Z',
            lastModified: '2024-01-22T10:45:00Z',
            wordCount: 245,
            content: 'Chief Complaint: Follow-up for hypertension...'
        },
        {
            id: '2',
            title: 'Cardiology Consultation',
            patientName: 'Michael Chen',
            patientMRN: 'MRN-002',
            templateUsed: 'Cardiology Consultation',
            aiProvider: 'claude',
            status: 'draft',
            createdAt: '2024-01-22T14:15:00Z',
            lastModified: '2024-01-22T14:30:00Z',
            wordCount: 189,
            content: 'Reason for Consultation: Chest pain evaluation...'
        },
        {
            id: '3',
            title: 'H&P - New Patient',
            patientName: 'Emma Davis',
            patientMRN: 'MRN-003',
            templateUsed: 'H&P',
            aiProvider: 'gemini',
            status: 'exported',
            createdAt: '2024-01-21T09:00:00Z',
            lastModified: '2024-01-21T09:30:00Z',
            wordCount: 412,
            content: 'History of Present Illness: 45-year-old female...'
        }
    ]);

    const [statusFilter, setStatusFilter] = useState<string>('All');
    const statusOptions = ['All', 'Draft', 'Completed', 'Exported'];

    const filteredNotes = statusFilter === 'All'
        ? notes
        : notes.filter(note => note.status === statusFilter.toLowerCase());

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
        switch (status) {
            case 'completed':
                return <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>;
            case 'draft':
                return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Draft</span>;
            case 'exported':
                return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Exported</span>;
            default:
                return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
        }
    };

    const getProviderBadge = (provider: string) => {
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${provider === 'gemini'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                {provider === 'gemini' ? 'Gemini' : 'Claude'}
            </span>
        );
    };

    const handleCreateNote = () => {
        router.push('/dashboard/notes?action=create');
    };

    const handleViewNote = (noteId: string) => {
        router.push(`/dashboard/notes/${noteId}`);
    };

    const handleEditNote = (noteId: string) => {
        router.push(`/dashboard/notes/${noteId}/edit`);
    };

    const handleExportNote = (noteId: string) => {
        console.log('Exporting note to Epic:', noteId);
    };

    // If action=create, show note generation form (placeholder)
    if (action === 'create') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Generate New Note</h1>
                        <p className="mt-2 text-gray-600">
                            Create a clinical note using AI-powered transcription and templates
                            {templateId && <span className="ml-2 text-blue-600 font-medium">(Template selected)</span>}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/notes')}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Back to Notes
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 16h14L17 4M11 9v4m4-4v4" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">AI Note Generation Interface</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            This will include patient selection, transcript input, template selection, and AI provider choice.
                            Full implementation coming in Phase 3.
                        </p>
                        <div className="mt-6 space-y-2">
                            {templateId && (
                                <p className="text-sm text-blue-600">Template ID: {templateId}</p>
                            )}
                            <button
                                onClick={() => router.push('/dashboard/notes')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Return to Notes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clinical Notes</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your AI-generated clinical documentation
                    </p>
                </div>
                <button
                    onClick={handleCreateNote}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Generate Note</span>
                </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                {statusOptions.map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === status
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Notes Table */}
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Note & Patient
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Template
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    AI Provider
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredNotes.map((note) => (
                                <tr key={note.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{note.title}</div>
                                            <div className="text-sm text-gray-500">
                                                {note.patientName} • {note.patientMRN}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {note.wordCount} words
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {note.templateUsed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getProviderBadge(note.aiProvider)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(note.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleViewNote(note.id)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleEditNote(note.id)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            Edit
                                        </button>
                                        {note.status !== 'exported' && (
                                            <button
                                                onClick={() => handleExportNote(note.id)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                Export
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredNotes.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No notes found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Start by generating your first clinical note.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={handleCreateNote}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Generate Note
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}