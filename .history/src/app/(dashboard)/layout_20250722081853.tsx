import { Navbar } from '@/components/shared/Navbar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}