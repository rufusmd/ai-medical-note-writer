// src/app/dashboard/page.tsx - Fixed Version

import DashboardStats from '@/components/dashboard/DashboardStats';
import dynamic from 'next/dynamic';

// Dynamically import other components to prevent loading issues
const QuickActions = dynamic(() => import('@/components/dashboard/QuickActions'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
});

const RecentActivity = dynamic(() => import('@/components/dashboard/RecentActivity'), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
});

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome to AI Medical Note Writer
                </h1>
                <p className="mt-2 text-gray-600">
                    Here's an overview of your medical note generation activity.
                    <span className="font-medium text-blue-600 ml-1">Phase 3 Integration Active!</span>
                </p>
            </div>

            {/* Dashboard Statistics */}
            <DashboardStats />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6">
                        <QuickActions />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                        <RecentActivity />
                    </div>
                </div>
            </div>

            {/* Status Information */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Server Running</span>
                    </div>
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">AI Providers Loading</span>
                    </div>
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Phase 3 Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}