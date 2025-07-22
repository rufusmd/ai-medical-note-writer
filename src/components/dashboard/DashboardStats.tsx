// src/components/dashboard/DashboardStats.tsx
'use client';

import { useState, useEffect } from 'react';

interface DashboardStatsData {
    totalNotes: number;
    totalPatients: number;
    totalTemplates: number;
    notesThisMonth: number;
}

export function DashboardStats() {
    const [stats, setStats] = useState<DashboardStatsData>({
        totalNotes: 0,
        totalPatients: 0,
        totalTemplates: 0,
        notesThisMonth: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TODO: Replace with actual API call to fetch dashboard stats
        // For now, using mock data
        const mockStats: DashboardStatsData = {
            totalNotes: 1247,
            totalPatients: 89,
            totalTemplates: 34,
            notesThisMonth: 156,
        };

        setTimeout(() => {
            setStats(mockStats);
            setIsLoading(false);
        }, 1000);
    }, []);

    const statItems = [
        {
            name: 'Total Notes Generated',
            value: stats.totalNotes.toLocaleString(),
            icon: '📝',
            description: 'Clinical notes created',
            color: 'bg-blue-50 text-blue-600'
        },
        {
            name: 'Active Patients',
            value: stats.totalPatients.toLocaleString(),
            description: 'Patients in system',
            icon: '👥',
            color: 'bg-green-50 text-green-600'
        },
        {
            name: 'Note Templates',
            value: stats.totalTemplates.toLocaleString(),
            description: 'Available templates',
            icon: '📄',
            color: 'bg-purple-50 text-purple-600'
        },
        {
            name: 'This Month',
            value: stats.notesThisMonth.toLocaleString(),
            description: 'Notes generated',
            icon: '📊',
            color: 'bg-orange-50 text-orange-600'
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statItems.map((item) => (
                <div
                    key={item.name}
                    className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                    <div className="p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-xl`}>
                                    {item.icon}
                                </div>
                            </div>
                            <div className="ml-4 w-0 flex-1">
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    {item.name}
                                </dt>
                                <dd className="flex items-baseline">
                                    {isLoading ? (
                                        <div className="animate-pulse">
                                            <div className="h-8 bg-gray-300 rounded w-16"></div>
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {item.value}
                                        </div>
                                    )}
                                </dd>
                                <div className="text-xs text-gray-500 mt-1">
                                    {item.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}