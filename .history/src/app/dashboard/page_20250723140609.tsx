// src/app/dashboard/page.tsx - Emergency Dashboard Page
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
    DocumentTextIcon,
    UserGroupIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    PlusIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4 flex items-center">
                        <span className="text-6xl mr-6">🏥</span>
                        Dashboard
                    </h1>
                    <p className="text-xl text-gray-600 leading-relaxed">
                        Welcome back, {user?.email || 'Doctor'}! Manage your clinical documentation and patients.
                    </p>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {/* Generate Note */}
                    <Link
                        href="/dashboard/notes"
                        className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <DocumentTextIcon className="h-12 w-12 text-purple-600 group-hover:text-purple-700" />
                            <ArrowRightIcon className="h-6 w-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Generate Note</h3>
                        <p className="text-gray-600">Create clinical notes with AI assistance</p>
                    </Link>

                    {/* Manage Patients */}
                    <Link
                        href="/dashboard/patients"
                        className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <UserGroupIcon className="h-12 w-12 text-blue-600 group-hover:text-blue-700" />
                            <ArrowRightIcon className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Patients</h3>
                        <p className="text-gray-600">Manage patient records and information</p>
                    </Link>

                    {/* Analytics */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 opacity-75">
                        <div className="flex items-center justify-between mb-6">
                            <ChartBarIcon className="h-12 w-12 text-green-600" />
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Soon</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics</h3>
                        <p className="text-gray-600">View insights and performance metrics</p>
                    </div>

                    {/* Settings */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 opacity-75">
                        <div className="flex items-center justify-between mb-6">
                            <Cog6ToothIcon className="h-12 w-12 text-gray-600" />
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Soon</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Settings</h3>
                        <p className="text-gray-600">Configure preferences and account</p>
                    </div>
                </div>

                {/* Quick Start Section */}
                <div className="bg-white rounded-3xl shadow-2xl p-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                        <span className="text-4xl mr-4">🚀</span>
                        Quick Start
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create First Patient */}
                        <div className="border border-gray-200 rounded-2xl p-8">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Your First Patient</h3>
                            <p className="text-gray-600 mb-6">
                                Add a patient to your practice to start generating clinical notes.
                            </p>
                            <Link
                                href="/dashboard/notes?action=create"
                                className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 w-fit"
                            >
                                <PlusIcon className="h-5 w-5" />
                                <span>Create Patient</span>
                            </Link>
                        </div>

                        {/* Generate First Note */}
                        <div className="border border-gray-200 rounded-2xl p-8">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Generate Your First Note</h3>
                            <p className="text-gray-600 mb-6">
                                Use AI to create professional clinical documentation.
                            </p>
                            <Link
                                href="/dashboard/notes"
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 w-fit"
                            >
                                <DocumentTextIcon className="h-5 w-5" />
                                <span>Generate Note</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl">
                    <div className="flex items-center space-x-2 text-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">System Status: All services operational</span>
                    </div>
                    <p className="text-green-700 mt-2">
                        AI note generation, patient management, and data synchronization are working normally.
                    </p>
                </div>
            </div>
        </div>
    );
}