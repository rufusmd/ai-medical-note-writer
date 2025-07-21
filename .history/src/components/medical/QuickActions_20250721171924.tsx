// src/components/medical/QuickActions.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';

export function QuickActions() {
    const [isGeneratingNote, setIsGeneratingNote] = useState(false);

    const actions = [
        {
            name: 'Generate Note',
            description: 'Create a new clinical note from transcript',
            href: '/notes/new',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            ),
            color: 'bg-green-500 hover:bg-green-600',
            primary: true,
        },
        {
            name: 'Add Patient',
            description: 'Register a new patient',
            href: '/patients/new',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
            color: 'bg-blue-500 hover:bg-blue-600',
        },
        {
            name: 'Create Template',
            description: 'Design a new note template',
            href: '/templates/new',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-purple-500 hover:bg-purple-600',
        },
        {
            name: 'SmartLink Library',
            description: 'Manage Epic SmartPhrases',
            href: '/library',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
            ),
            color: 'bg-orange-500 hover:bg-orange-600',
        },
        {
            name: 'Quick Test',
            description: 'Test AI note generation',
            href: '/test',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            color: 'bg-gray-500 hover:bg-gray-600',
        },
        {
            name: 'View All Patients',
            description: 'Browse patient list',
            href: '/patients',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-indigo-500 hover:bg-indigo-600',
        },
    ];

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {actions.map((action) => {
                        const isTestAction = action.href === '/test';

                        return (
                            <Link
                                key={action.name}
                                href={action.href}
                                className={`relative rounded-lg p-4 transition-all duration-200 transform hover:scale-105 hover:shadow-md ${action.primary
                                        ? 'ring-2 ring-green-200 shadow-md'
                                        : 'hover:ring-2 hover:ring-gray-200'
                                    }`}
                            >
                                <div className={`${action.color} rounded-lg p-3 inline-flex text-white`}>
                                    {action.icon}
                                </div>

                                <div className="mt-3">
                                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                        {action.name}
                                        {action.primary && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                Recommended
                                            </span>
                                        )}
                                        {isTestAction && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                Phase 1 ✓
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                                </div>

                                {/* Hover arrow */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Special CTA for Primary Action */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-green-900">Ready to Generate Clinical Notes</h4>
                            <p className="text-xs text-green-700 mt-1">
                                Your Gemini AI (primary) and Claude (fallback) providers are active and ready for HIPAA-compliant note generation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}