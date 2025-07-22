// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// We'll keep it simple for Phase 3 - no Google OAuth yet

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                // For Phase 3: Simple demo authentication
                // In production, verify against your user database
                if (credentials?.email && credentials?.password) {
                    // Demo: any email/password combo works for now
                    return {
                        id: '1',
                        email: credentials.email,
                        name: credentials.email.split('@')[0],
                    };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 15 * 60, // 15 minutes (HIPAA compliance)
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};