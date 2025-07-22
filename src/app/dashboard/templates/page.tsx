// src/app/dashboard/templates/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Template {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
    isStructured: boolean;
    smartPhrases: string[];
    createdAt: string;
    lastUsed?: string;
}

export default function TemplatesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get('action');

    const [templates] = useState<Template[]>([
        {
            id: '1',
            name: 'Progress Note',
            category: 'General',
            description: 'Standard progress note template with Epic SmartPhrases',
            content: 'Chief Complaint: ***\nHPI: ***\nAssessment: ***\nPlan: ***',
            isStructured: true,
            smartPhrases: ['@CC@', '@HPI@', '@ASSESSMENT@', '@PLAN@'],
            createdAt: '2024-01-15',
            lastUsed: '2024-01-20'
        },
        {
            id: '2',
            name: 'Cardiology Consultation',
            category: 'Specialty',
            description: 'Comprehensive cardiac evaluation template',
            content: 'Reason for Consultation: ***\nCardiac History: ***\nExam: ***\nEcho: ***\nRecommendations: ***',
            isStructured: true,
            smartPhrases: ['@CARDIO@', '@ECHO@', '@EKG@'],
            createdAt: '2024-01-10',
            lastUsed: '2024-01-18'
        },
    ]);

    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const categories = ['All', 'General', 'Specialty', 'Emergency', 'Surgical'];

    const filteredTemplates = selectedCategory === 'All'
        ? templates
        : templates.filter(template => template.category === selectedCategory);

    const handleCreateTemplate = () => {
        router.push('/dashboard/templates?action=create');
    };

    const handleEditTemplate = (templateId: string) => {
        console.log('Editing template:', templateId);
    };

    const handleUseTemplate = (templateId: string) => {
        router.push(`/dashboard/notes?template=${templateId}`);
    };

    // If action=create, show create form (placeholder for now)
    if (action === 'create') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create New Template</h1>
                        <p className="mt-2 text-gray-600">
                            Build a reusable note template with Epic SmartPhrase integration
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/templates')}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Back to Templates
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Template Creation Form</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            This will be implemented in the next phase with full Epic SmartPhrase support.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => router.push('/dashboard/templates')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Return to Templates
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
                    <h1 className="text-2xl font-bold text-gray-900">Note Templates</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your clinical note templates with Epic SmartPhrase integration
                    </p>
                </div>
                <button
                    onClick={handleCreateTemplate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Template</span>
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex space-x-4">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${selectedCategory === category
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                    <div key={template.id} className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {template.category}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                            {/* SmartPhrase Indicators */}
                            {template.smartPhrases.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Epic SmartPhrases:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {template.smartPhrases.slice(0, 3).map((phrase, index) => (
                                            <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-mono">
                                                {phrase}
                                            </span>
                                        ))}
                                        {template.smartPhrases.length > 3 && (
                                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                                +{template.smartPhrases.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Template Stats */}
                            <div className="text-xs text-gray-500 mb-4">
                                <div>Created: {new Date(template.createdAt).toLocaleDateString()}</div>
                                {template.lastUsed && (
                                    <div>Last used: {new Date(template.lastUsed).toLocaleDateString()}</div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleUseTemplate(template.id)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Use Template
                                </button>
                                <button
                                    onClick={() => handleEditTemplate(template.id)}
                                    className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first note template.
                    </p>
                    <div className="mt-6">
                        <button
                            onClick={handleCreateTemplate}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Create Template
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}