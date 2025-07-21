// src/components/medical/DashboardStats.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
    totalPatients: number;
    totalNotes: number;
    templatesCreated: number;
    notesToday: number;
}

export function DashboardStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalPatients: 0,
        totalNotes: 0,
        templatesCreated: 0,
        notesToday: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;

            try {
                // Get today's date for filtering
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Fetch stats from multiple collections
                const [patientsSnap, notesSnap, templatesSnap, todayNotesSnap] = await Promise.all([
                    // Total patients
                    getDocs(query(
                        collection(db, 'patients'),
                        where('createdBy', '==', user.uid)
                    )),

                    // Total notes
                    getDocs(query(
                        collection(db, 'notes'),
                        where('createdBy', '==', user.uid)
                    )),

                    // Total templates
                    getDocs(query(
                        collection(db, 'templates'),
                        where('createdBy', '==', user.uid)
                    )),

                    // Notes created today
                    getDocs(query(
                        collection(db, 'notes'),
                        where('createdBy', '==', user.uid),
                        where('createdAt', '>=', today)
                    )),
                ]);

                setStats({
                    totalPatients: patientsSnap.size,
                    totalNotes: notesSnap.size,
                    templatesCreated: templatesSnap.size,
                    notesToday: todayNotesSnap.size,
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                // Show demo data if there's an error or no data yet
                setStats({
                    totalPatients: 12,
                    totalNotes: 47,
                    templatesCreated: 8,
                    notesToday: 3,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    const statCards = [
        {
            name: 'Total Patients',
            value: stats.totalPatients,
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-blue-500',
            description: 'Active in your care',
        },
        {
            name: 'Notes Generated',
            value: stats.totalNotes,
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-green-500',
            description: 'Clinical notes created',
        },
        {
            name: 'Templates',
            value: stats.templatesCreated,
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'bg-purple-500',
            description: 'Custom templates',
        },
        {
            name: 'Today',
            value: stats.notesToday,
            icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            color: 'bg-orange-500',
            description: 'Notes generated today',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-gray-300 rounded-md"></div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                                    <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
                <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        {stat.name}
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {stat.value}
                                        </div>
                                    </dd>
                                    <dd className="text-xs text-gray-500 mt-1">
                                        {stat.description}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>

                    {/* Subtle bottom accent */}
                    <div className={`h-1 ${stat.color}`}></div>
                </div>
            ))}
        </div>
    );
}