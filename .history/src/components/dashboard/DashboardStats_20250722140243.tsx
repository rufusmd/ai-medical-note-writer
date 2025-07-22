// src/components/dashboard/DashboardStats.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    UserGroupIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    SparklesIcon,
    TrendingUpIcon,
    TrendingDownIcon,
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
            // Fetch all stats in parallel
            const [patientsRes, notesRes, templatesRes, healthRes] = await Promise.allSettled([
                fetch('/api/patients?action=stats'),
                fetch('/api/notes?action=analytics'),
                fetch('/api/templates?action=analytics'),
                fetch('/api/generate-note', { method: 'GET' }), // Health check
            ]);

            // Process patient stats
            let patientStats = { total: 0, active: 0, recentlyAdded: 0, trend: 'stable' as const };
            if (patientsRes.status === 'fulfilled' && patientsRes.value.ok) {
                const data = await patientsRes.value.json();
                if (data.success) {
                    patientStats = {
                        total: data.stats.totalActive + data.stats.totalInactive,
                        active: data.stats.totalActive,
                        recentlyAdded: data.stats.recentlyAdded,
                        trend: data.stats.recentlyAdded > 5 ? 'up' : data.stats.recentlyAdded === 0 ? 'down' : 'stable',
                    };
                }
            }

            // Process note stats
            let noteStats = { total: 0, thisMonth: 0, averageQualityScore: 0, trend: 'stable' as const };
            if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
                const data = await notesRes.value.json();
                if (data.success) {
                    const thisMonth = data.analytics.recentActivity
                        .filter((activity: any) => activity.date >= new Date().toISOString().substring(0, 7))
                        .reduce((sum: number, activity: any) => sum + activity.count, 0);

                    noteStats = {
                        total: data.analytics.totalNotes,
                        thisMonth,
                        averageQualityScore: data.analytics.averageQualityScore,
                        trend: thisMonth > 10 ? 'up' : thisMonth === 0 ? 'down' : 'stable',
                    };
                }
            }

            // Process template stats
            let templateStats = { total: 0, epicCompatible: 0, mostUsed: 'None', trend: 'stable' as const };
            if (templatesRes.status === 'fulfilled' && templatesRes.value.ok) {
                const data = await templatesRes.value.json();
                if (data.success) {
                    templateStats = {
                        total: data.analytics.totalTemplates,
                        epicCompatible: Math.round(data.analytics.totalTemplates * data.analytics.epicCompatibilityRate),
                        mostUsed: data.analytics.mostUsedTemplates[0]?.name || 'None',
                        trend: data.analytics.totalTemplates > 5 ? 'up' : 'stable',
                    };
                }
            }

            // Process AI provider health
            let aiProviderStats = {
                geminiHealth: false,
                claudeHealth: false,
                totalGenerations: 0,
                averageResponseTime: 0
            };
            if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
                const data = await healthRes.value.json();
                aiProviderStats = {
                    geminiHealth: data.providers?.gemini || false,
                    claudeHealth: data.providers?.claude || false,
                    totalGenerations: (data.usage?.gemini?.totalRequests || 0) + (data.usage?.claude?.totalRequests || 0),
                    averageResponseTime: Math.round(
                        ((data.usage?.gemini?.averageResponseTime || 0) + (data.usage?.claude?.averageResponseTime || 0)) / 2
                    ),
                };
            }

            setStats({
                patients: patientStats,
                notes: noteStats,
                templates: templateStats,
                aiProviders: aiProviderStats,
            });

            setLoadingState({
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
            });

        } catch (error: any) {
            console.error('Error fetching dashboard stats:', error);
            setLoadingState({
                isLoading: false,
                error: error.message || 'Failed to load dashboard statistics',
                lastUpdated: null,
            });
        }
    }, []);

    // Initial load and periodic refresh
    useEffect(() => {
        fetchStats();

        // Refresh stats every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchStats]);

    // Loading state
    if (loadingState.isLoading && !loadingState.lastUpdated) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="mb-4">
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Active Patients',
            value: stats.patients.active,
            subtitle: `${stats.patients.total} total, ${stats.patients.recentlyAdded} added this month`,
            icon: UserGroupIcon,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: stats.patients.trend,
        },
        {
            title: 'Clinical Notes',
            value: stats.notes.thisMonth,
            subtitle: `${stats.notes.total} total, ${stats.notes.averageQualityScore}/10 avg quality`,
            icon: ClipboardDocumentListIcon,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            trend: stats.notes.trend,
        },
        {
            title: 'Epic Templates',
            value: stats.templates.epicCompatible,
            subtitle: `${stats.templates.total} total, "${stats.templates.mostUsed}" most used`,
            icon: DocumentTextIcon,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            trend: stats.templates.trend,
        },
        {
            title: 'AI Generations',
            value: stats.aiProviders.totalGenerations,
            subtitle: `${stats.aiProviders.averageResponseTime}ms avg response, ${stats.aiProviders.geminiHealth ? '✓' : '✗'
                } Gemini ${stats.aiProviders.claudeHealth ? '✓' : '✗'
                } Claude`,
            icon: SparklesIcon,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            trend: stats.aiProviders.totalGenerations > 50 ? 'up' : 'stable',
        },
    ];

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
        if (trend === 'up') return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
        if (trend === 'down') return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
        return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {loadingState.isLoading && (
                            <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1 animate-spin" />
                                Updating...
                            </div>
                        )}
                        {loadingState.lastUpdated && (
                            <span>
                                Last updated: {loadingState.lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={fetchStats}
                            disabled={loadingState.isLoading}
                            className="text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {loadingState.error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-red-800">Error loading statistics</h4>
                                <p className="text-sm text-red-700 mt-1">{loadingState.error}</p>
                                <button
                                    onClick={fetchStats}
                                    className="text-sm text-red-600 hover:text-red-500 underline mt-2"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((card, index) => (
                        <div key={index} className="relative overflow-hidden">
                            <div className={`${card.bgColor} rounded-lg p-6 transition-all hover:shadow-md`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-600">{card.title}</p>
                                            <TrendIcon trend={card.trend} />
                                        </div>
                                        <p className={`text-2xl font-bold ${card.color} mt-2`}>
                                            {typeof card.value === 'number' && card.value > 999
                                                ? `${(card.value / 1000).toFixed(1)}k`
                                                : card.value.toLocaleString()
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1 leading-tight">
                                            {card.subtitle}
                                        </p>
                                    </div>
                                    <div className={`ml-4 ${card.bgColor}`}>
                                        <card.icon className={`h-8 w-8 ${card.color}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* System Health Indicator */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h4 className="text-sm font-medium text-gray-700">System Status</h4>
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${stats.aiProviders.geminiHealth && stats.aiProviders.claudeHealth
                                        ? 'bg-green-400'
                                        : stats.aiProviders.geminiHealth || stats.aiProviders.claudeHealth
                                            ? 'bg-yellow-400'
                                            : 'bg-red-400'
                                    }`}></div>
                                <span className="text-xs text-gray-500">
                                    {stats.aiProviders.geminiHealth && stats.aiProviders.claudeHealth
                                        ? 'All systems operational'
                                        : stats.aiProviders.geminiHealth || stats.aiProviders.claudeHealth
                                            ? 'Partial service availability'
                                            : 'Service issues detected'
                                    }
                                </span>
                            </div>
                        </div>

                        {(!stats.aiProviders.geminiHealth || !stats.aiProviders.claudeHealth) && (
                            <button
                                onClick={() => window.open('/dashboard/settings', '_blank')}
                                className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                                Check Settings
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}