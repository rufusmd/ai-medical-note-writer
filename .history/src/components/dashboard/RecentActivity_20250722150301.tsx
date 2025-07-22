// src/components/dashboard/RecentActivity.tsx - Complete Version
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ActivityItem {
    id: string;
    type: 'note' | 'patient' | 'template';
    title: string;
    description: string;
    timestamp: string;
    status: 'completed' | 'in-progress' | 'draft';
    aiProvider?: 'gemini' | 'claude';
}

export default function RecentActivity() {
    const router = useRouter();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TODO: Replace with actual API call to fetch recent activity
        // For now, using mock data
        const mockActivities: ActivityItem[] = [
            {
                id: '1',
                type: 'note',
                title: 'Progress Note - Sarah Johnson',
                description: 'Generated clinical note for follow-up visit',
                timestamp: '2 minutes ago',
                status: 'completed',
                aiProvider: 'gemini'
            },
            {
                id: '2',
                type: 'patient',
                title: 'New Patient - Michael Chen',
                description: 'Added patient with MRN #12345',
                timestamp: '15 minutes ago',
                status: 'completed'
            },
            {
                id: '3',
                type: 'template',
                title: 'Cardiology Consultation Template',
                description: 'Created new template with Epic SmartPhrases',
                timestamp: '1 hour ago',
                status: 'completed'
            },
            {
                id: '4',
                type: 'note',
                title: 'SOAP Note - David Wilson',
                description: 'Note generation in progress...',
                timestamp: '2 hours ago',
                status: 'in-progress',
                aiProvider: 'claude'
            },
            {
                id: '5',
                type: 'note',
                title: 'H&P - Emma Davis',
                description: 'Draft saved, pending review',
                timestamp: '3 hours ago',
                status: 'draft',
                aiProvider: 'gemini'
            }
        ];

        setTimeout(() => {
            setActivities(mockActivities);
            setIsLoading(false);
        }, 800);
    }, []);

    const getActivityIcon = (type: string, status: string) => {
        if (status === 'in-progress') {
            return (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            );
        }

        switch (type) {
            case 'note':
                return (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            case 'patient':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
            case 'template':
                return (
                    <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            default:
                return (
                    <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                );
        }
    };

    const getStatusBadge = (status: string, aiProvider?: string) => {
        const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

        switch (status) {
            case 'completed':
                return (
                    <div className="flex items-center space-x-2">
                        <span className={`${baseClasses} bg-green-100 text-green-800`}>Completed</span>
                        {aiProvider && (
                            <span className={`${baseClasses} ${aiProvider === 'gemini' ?
                                'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                {aiProvider === 'gemini' ? 'Gemini' : 'Claude'}
                            </span>
                        )}
                    </div>
                );
            case 'in-progress':
                return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>In Progress</span>;
            case 'draft':
                return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Draft</span>;
            default:
                return null;
        }
    };

    const handleActivityClick = (activity: ActivityItem) => {
        switch (activity.type) {
            case 'note':
                router.push(`/dashboard/notes/${activity.id}`);
                break;
            case 'patient':
                router.push(`/dashboard/patients/${activity.id}`);
                break;
            case 'template':
                router.push(`/dashboard/templates/${activity.id}`);
                break;
        }
    };

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Your latest clinical documentation work
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/activity')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        View all
                    </button>
                </div>
            </div>

            <div className="divide-y divide-gray-200">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex items-center space-x-4">
                                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                </div>
                                <div className="h-6 bg-gray-300 rounded w-20"></div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="text-gray-400">
                            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Start generating notes or adding patients to see activity here.
                        </p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            onClick={() => handleActivityClick(activity)}
                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        >
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                    {getActivityIcon(activity.type, activity.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-gray-900 truncate">
                                            {activity.title}
                                        </h4>
                                        <div className="flex-shrink-0 ml-2">
                                            {getStatusBadge(activity.status, activity.aiProvider)}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {activity.timestamp}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}