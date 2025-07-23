// src/app/layout.tsx - REPLACE YOUR EXISTING FILE

import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner'; // 🆕 NEW: Add toast notifications
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
          {/* 🆕 NEW: Toast notifications for feedback system */}
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
          />
        </AuthProvider>
      </body>
    </html>
  );
}