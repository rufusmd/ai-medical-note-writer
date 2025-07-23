// src/app/layout.tsx - WITH TOAST NOTIFICATIONS
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Medical Note Writer',
  description: 'HIPAA-compliant AI-powered clinical note generation with learning capabilities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}

          {/* Toast notifications for better UX */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                border: '1px solid #e5e7eb',
                color: '#374151',
              },
            }}
            // Success toasts
            successToast={{
              style: {
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
              },
            }}
            // Error toasts  
            errorToast={{
              style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
              },
            }}
            // Loading toasts
            loadingToast={{
              style: {
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                color: '#1d4ed8',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}