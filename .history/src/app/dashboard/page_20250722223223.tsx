// src/app/dashboard/page.tsx - REPLACE YOUR EXISTING FILE

'use client'; // 🆕 NEW: Make this a client component

import DashboardStats from '@/components/dashboard/DashboardStats';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import SimpleFeedbackAnalytics from '@/components/feedback/SimpleFeedbackAnalytics'; // 🆕 NEW
import { useAuth } from '@/contexts/AuthContext'; // 🆕 NEW

export default function DashboardPage() {
    const { user } = useAuth(); // 🆕 NEW: Get current user for analytics

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome to AI Medical Note Writer
                </h1>
                <p className="mt-2 text-gray-600">
                    Here's an overview of your medical note generation activity.
                    <span className="font-medium text-blue-600 ml-1">
                        🧠 AI Learning System Active!
                    </span>
                </p>
            </div>

            {/* 🆕 NEW: AI Learning Analytics */}
            {user && (
                <SimpleFeedbackAnalytics
                    userId={user.uid}
                    className="mb-6"
                />
            )}

            {/* Dashboard Statistics */}
            <DashboardStats />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <QuickActions />

                {/* Recent Activity */}
                <RecentActivity />
            </div>

            {/* Enhanced System Status */}
            <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Server Running</span>
                    </div>
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Components Loaded</span>
                    </div>
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Enhanced API Active</span>
                    </div>
                    <div className="flex items-center">
                        <div className="h-2 w-2 bg-purple-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Learning System Ready</span>
                    </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                    🚀 Phase 1 Implementation: AI Feedback & Learning System Active.
                    Generate notes and provide feedback to see the learning analytics in action!
                </div>
            </div>
        </div>
    );
}