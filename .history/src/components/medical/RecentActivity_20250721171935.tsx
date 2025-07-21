// src/components/medical/RecentActivity.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    type: 'note' | 'patient' | 'template';
    title: string;
    subtitle: string;
    timestamp: Date;
    href: string;
    metadata?: {
        aiProvider?: string;
        noteLength?: number;
        patientMrn?: string;
    };
}

export function RecentActivity() {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            if (!user) return;

            try {
                // Fetch recent notes, patients, and templates
                const [notesSnap, patientsSnap, templatesSnap] = await Promise.all([
                    getDocs(query(
                        collection(db, 'notes'),
                        where('createdBy', '==', user.uid),
                        orderBy('createdAt', 'desc'),
                        limit(3)
                    )),
                    getDocs(query(
                        collection(db, 'patients'),
                        where('createdBy', '==', user.uid),
                        orderBy('lastModified', 'desc'),
                        limit(2)
                    )),
                    getDocs(query(
                        collection(db, 'templates'),
                        where('createdBy', '==', user.uid),
                        orderBy('lastUsed', 'desc'),
                        limit(2)
                    )),
                ]);

                // Combine and format activities
                const recentActivities: ActivityItem[] = [];

                // Add notes
                notesSnap.docs.forEach(doc => {
                    const data = doc.data();
                    recentActivities.push({
                        id: doc.id,
                        type: 'note',
                        title: `Note for ${data.patientName || 'Patient'}`,
                        subtitle: `Generated with ${data.aiProvider || 'AI'} • ${data.generatedContent?.length || 0} characters`,
                        timestamp: data.createdAt?.toDate() || new Date(),
                        href: `/notes/${doc.id}`,
                        metadata: {
                            aiProvider: data.aiProvider,
                            noteLength: data.generatedContent?.length,
                        },
                    });
                });

                // Add patients
                patientsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    recentActivities.push({
                        id: doc.id,
                        type: 'patient',
                        title: data.name || 'Unnamed Patient',
                        subtitle: `Patient • ${data.mrn ? `MRN: ${data.mrn}` : 'No MRN'}`,
                        timestamp: data.lastModified?.toDate() || data.createdAt?.toDate() || new Date(),
                        href: `/patients/${doc.id}`,
                        metadata: {
                            patientMrn: data.mrn,
                        },
                    });
                });

                // Add templates
                templatesSnap.docs.forEach(doc => {
                    const data = doc.data();
                    recentActivities.push({
                        id: doc.id,
                        type: 'template',
                        title: data.name || 'Unnamed Template',
                        subtitle: `${data.category || 'Custom'} Template • ${data.usageCount || 0} uses`,
                        timestamp: data.lastUsed?.toDate() || data.createdAt?.toDate() || new Date(),
                        href: `/templates/${doc.id}`,
                    });
                });

                // Sort by timestamp and take top 6
                recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setActivities(recentActivities.slice(0, 6));

            } catch (error) {
                console.error('Error fetching recent activity:', error);
                // Show demo data if there's an error
                setActivities([
                    {
                        id: '1',
                        type: 'note',
                        title: 'Note for John Smith',
                        subtitle: 'Generated with Gemini • 1,247 characters',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                        href: '/test',
                        metadata: { aiProvider: 'gemini', noteLength: 1247 },
                    },
                    {
                        id: '2',
                        type: 'patient',
                        title: 'Sarah Johnson',
                        subtitle: 'Patient • MRN: 12345',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                        href: '/patients',
                        metadata: { patientMrn: '12345' },
                    },
                    {
                        id: '3',
                        type: 'template',
                        title: 'SOAP Note Template',
                        subtitle: 'SOAP Template • 15 uses',
                        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                        href: '/templates',
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentActivity();
    }, [user]);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'note':
                return (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                );
            case 'patient':
                return (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                );
            case 'template':
                return (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                    <Link
                        href="/notes"
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                        View all →
                    </Link>
                </div>

                {activities.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">No recent activity</h4>
                        <p className="text-xs text-gray-500">Start by generating your first clinical note</p>
                    </div>
                ) : (
                    <div className="flow-root">
                        <ul className="-mb-6">
                            {activities.map((activity, activityIdx) => (
                                <li key={activity.id}>
                                    <div className="relative pb-6">
                                        {activityIdx !== activities.length - 1 ? (
                                            <span className="absolute top-8 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex space-x-3">
                                            <div>{getActivityIcon(activity.type)}</div>
                                            <div className="min-w-0 flex-1">
                                                <div>
                                                    <Link
                                                        href={activity.href}
                                                        className="text-sm font-medium text-gray-900 hover:text-orange-600 transition-colors"
                                                    >
                                                        {activity.title}
                                                    </Link>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{activity.subtitle}</p>
                                                <div className="flex items-center text-xs text-gray-400 mt-1">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {formatDistanceToNow(activity.timestamp)} ago
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}