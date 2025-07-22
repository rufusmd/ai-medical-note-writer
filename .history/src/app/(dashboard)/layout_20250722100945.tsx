// src/app/(dashboard)/layout.tsx
import { Navbar } from '@/components/shared/Navbar';
import { AuthWrapper } from '@/components/auth/AuthWrapper';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthWrapper>
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </AuthWrapper>
    );
}