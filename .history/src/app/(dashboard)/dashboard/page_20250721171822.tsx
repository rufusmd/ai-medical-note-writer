// src/app/(dashboard)/dashboard/page.tsx
import { DashboardStats } from '@/components/medical/DashboardStats';
import { RecentActivity } from '@/components/medical/RecentActivity';
import { QuickActions } from '@/components/medical/QuickActions';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Welcome back! Here's an overview of your medical note generation activity.
                </p>
            </div>

            {/* Statistics Overview */}
            <DashboardStats />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1">
                    <QuickActions />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1">
                    <RecentActivity />
                </div>
            </div>

            {/* AI Provider Status */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Provider Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Gemini AI (Primary)</p>
                            <p className="text-sm text-gray-500">HIPAA Compliant • Active</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Claude (Fallback)</p>
                            <p className="text-sm text-gray-500">Backup Provider • Active</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}