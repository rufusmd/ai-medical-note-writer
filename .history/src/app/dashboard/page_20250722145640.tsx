// src/app/dashboard/page.tsx - Fixed Version

import DashboardStats from '@/components/dashboard/DashboardStats';

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

            {/* Simple placeholder for other components until we fix imports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions Placeholder */}
                <div className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-500 text-sm">QuickActions component loading...</p>
                        <div className="mt-4 space-y-2">
                            <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600">
                                Generate Note
                            </button>
                            <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600">
                                Add Patient
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Placeholder */}
                <div className="bg-white shadow rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-500 text-sm">RecentActivity component loading...</p>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm">Note generated for Patient #123</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Template created: Progress Note</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Information */}
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
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