// src/components/dashboard/DashboardStats.tsx - Fixed Version
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    UserGroupIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,    // Fixed: Use available icon
    ArrowTrendingDownIcon,  // Fixed: Use available icon  
    ClockIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
    patients: {
        total: number;
        active: number;
        recentlyAdded: number;
        trend: 'up' | 'down' | 'stable';
    };
    notes: {
        total: number;
        thisMonth: number;
        averageQualityScore: number;
        trend: 'up' | 'down' | 'stable';
    };
    templates: {
        total: number;
        epicCompatible: number;
        mostUsed: string;
        trend: 'up' | 'down' | 'stable';
    };
    aiProviders: {
        geminiHealth: boolean;
        claudeHealth: boolean;
        totalGenerations: number;
        averageResponseTime: number;
    };
}

interface StatsLoadingState {
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

// Fixed: Added default export
export default function DashboardStats() {
    const [stats, setStats] = useState<DashboardStats>({
        patients: { total: 0, active: 0, recentlyAdded: 0, trend: 'stable' },
        notes: { total: 0, thisMonth: 0, averageQualityScore: 0, trend: 'stable' },
        templates: { total: 0, epicCompatible: 0, mostUsed: 'None', trend: 'stable' },
        aiProviders: { geminiHealth: false, claudeHealth: false, totalGenerations: 0, averageResponseTime: 0 },
    });

    const [loadingState, setLoadingState] = useState<StatsLoadingState>({
        isLoading: true,
        error: null,
        lastUpdated: null,
    });

    // Fetch dashboard statistics
    const fetchStats = useCallback(async () => {
        setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // For Phase 3, start with mock data and gradually add real API calls
            // This prevents the dashboard from breaking while we set up APIs

            // Simplified initial implementation - replace with real API calls as they're ready
            const mockStats: DashboardStats = {
                patients: { total: 12, active: 8, recentlyAdded: 3, trend: 'up' },
                notes: { total: 45, thisMonth: 12, averageQualityScore: 8.2, trend: 'up' },
                templates: { total: 8, epicCompatible: 6, mostUsed: 'Progress Note', trend: 'stable' },
                aiProviders: { geminiHealth: true, claudeHealth: true, totalGenerations: 127, averageResponseTime: 2.3 },
            };

            // TODO: Replace with real API calls once environment is configured
            // Example of how real calls would work:
            /*
            const [patientsRes, notesRes, templatesRes, healthRes] = await Promise.allSettled([
                fetch('/api/patients?action=stats'),
                fetch('/api/notes?action=analytics'),
                fetch('/api/templates?action=analytics'),
                fetch('/api/generate-note', { method: 'GET' }),
            ]);
            */

            setStats(mockStats);
            setLoadingState({
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            setLoadingState({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load dashboard statistics',
                lastUpdated: null,
            });
        }
    }, []);

    useEffect(() => {
        fetchStats();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    // Utility function to get trend icon
    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up':
                return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
            case 'down':
                return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
            default:
                return <div className="h-4 w-4 bg-gray-300 rounded-full"></div>;
        }
    };

    // Error state
    if (loadingState.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">
                        Failed to load dashboard statistics: {loadingState.error}
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Patients Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <UserGroupIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Patients
                                </dt>
                                <dd className="flex items-center">
                                    <div className="text-lg font-medium text-gray-900">
                                        {loadingState.isLoading ? '...' : stats.patients.total}
                                    </div>
                                    <div className="ml-2 flex items-center">
                                        {getTrendIcon(stats.patients.trend)}
                                    </div>
                                </dd>
                            </dl>
                            <p className="text-xs text-gray-500">
                                {stats.patients.active} active, {stats.patients.recentlyAdded} added recently
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Notes Generated
                                </dt>
                                <dd className="flex items-center">
                                    <div className="text-lg font-medium text-gray-900">
                                        {loadingState.isLoading ? '...' : stats.notes.total}
                                    </div>
                                    <div className="ml-2 flex items-center">
                                        {getTrendIcon(stats.notes.trend)}
                                    </div>
                                </dd>
                            </dl>
                            <p className="text-xs text-gray-500">
                                {stats.notes.thisMonth} this month, avg quality {stats.notes.averageQualityScore}/10
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Templates Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Templates
                                </dt>
                                <dd className="flex items-center">
                                    <div className="text-lg font-medium text-gray-900">
                                        {loadingState.isLoading ? '...' : stats.templates.total}
                                    </div>
                                    <div className="ml-2 flex items-center">
                                        {getTrendIcon(stats.templates.trend)}
                                    </div>
                                </dd>
                            </dl>
                            <p className="text-xs text-gray-500">
                                {stats.templates.epicCompatible} Epic compatible, "{stats.templates.mostUsed}" most used
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Providers Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <SparklesIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    AI Providers
                                </dt>
                                <dd className="flex items-center">
                                    <div className="text-lg font-medium text-gray-900">
                                        {loadingState.isLoading ? '...' : stats.aiProviders.totalGenerations}
                                    </div>
                                    <div className="ml-2 flex items-center space-x-1">
                                        <div className={`h-2 w-2 rounded-full ${stats.aiProviders.geminiHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <div className={`h-2 w-2 rounded-full ${stats.aiProviders.claudeHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </div>
                                </dd>
                            </dl>
                            <p className="text-xs text-gray-500">
                                {stats.aiProviders.averageResponseTime}s avg response time
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Last Updated */}
            {loadingState.lastUpdated && (
                <div className="col-span-full">
                    <p className="text-xs text-gray-400 text-center">
                        <ClockIcon className="h-3 w-3 inline mr-1" />
                        Last updated: {loadingState.lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
            )}
        </div>
    );
}

// Also export as named export for compatibility
export { DashboardStats };