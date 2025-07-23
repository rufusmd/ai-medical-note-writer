// src/app/layout.tsx - FIXED VERSION (without sonner for now)
import { AuthProvider } from '@/contexts/AuthContext';
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
          {/* TODO: Add toast notifications back when sonner is properly installed */}
        </AuthProvider>
      </body>
    </html>
  );
}