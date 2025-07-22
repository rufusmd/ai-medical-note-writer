// src/components/dashboard/QuickActions.tsx
'use client';

import { useRouter } from 'next/navigation';

export function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            title: 'Generate New Note',
            description: 'Create a clinical note from patient transcript',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            color: 'bg-blue-500 hover:bg-blue-600',
            onClick: () => router.push('/dashboard/notes?action=create'),
        },
        {
            title: 'Add New Patient',
            description: 'Register a new patient in the system',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            color: 'bg-green-500 hover:bg-green-600',
            onClick: () => router.push('/dashboard/patients?action=create'),
        },
        {
            title: 'Create Template',
            description: 'Build a new note template with Epic SmartPhrases',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-purple-500 hover:bg-purple-600',
            onClick: () => router.push('/dashboard/templates?action=create'),
        },
        {
            title: 'Browse SmartLinks',
            description: 'Explore Epic SmartPhrase library',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            ),
            color: 'bg-orange-500 hover:bg-orange-600',
            onClick: () => router.push('/dashboard/library'),
        },
    ];

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Common tasks for efficient clinical documentation
                </p>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {actions.map((action) => (
                        <button
                            key={action.title}
                            onClick={action.onClick}
                            className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200 text-left group hover:shadow-md`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <div className="p-2 bg-white bg-opacity-20 rounded-md group-hover:bg-opacity-30 transition-colors duration-200">
                                        {action.icon}
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-medium text-white">
                                        {action.title}
                                    </h4>
                                    <p className="text-sm text-white text-opacity-80 mt-1">
                                        {action.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}