// src/app/(dashboard)/dashboard/page.tsx - TEMPORARY SIMPLE VERSION
export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Welcome back! Your dashboard is loading properly.
                </p>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
                <p className="text-gray-600">Dashboard components will be added back once routing is fixed.</p>
            </div>
        </div>
    );
}