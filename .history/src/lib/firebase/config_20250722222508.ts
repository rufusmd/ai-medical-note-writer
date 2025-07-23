// src/lib/firebase/config.ts - REPLACE YOUR EXISTING CONFIG

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ====== ENHANCED COLLECTION NAMES ======
export const COLLECTIONS = {
    // Existing collections
    USERS: 'users',
    PATIENTS: 'patients',
    NOTES: 'notes',
    TEMPLATES: 'templates',
    ENCOUNTERS: 'encounters',
    SMART_LINKS: 'smart_links',
    DOT_PHRASES: 'dot_phrases',
    NOTE_GENERATION_LOGS: 'note_generation_logs',
    USER_PREFERENCES: 'user_preferences',
    AUDIT_LOGS: 'audit_logs',

    // 🆕 NEW: Feedback & Learning Collections
    NOTE_FEEDBACK: 'note_feedback',
    USER_PROMPT_PROFILES: 'user_prompt_profiles',
    PROMPT_EXPERIMENTS: 'prompt_experiments',
    PROMPT_OPTIMIZATIONS: 'prompt_optimizations',
} as const;

// Helper function to get collection reference with proper typing
export const getCollection = (collectionName: keyof typeof COLLECTIONS) => {
    return COLLECTIONS[collectionName];
};

// ====== ENHANCED AUDIT LOGGING ======
export const createAuditLog = async (action: string, details: any, userId: string) => {
    try {
        const auditData = {
            action,
            userId,
            timestamp: Timestamp.now(),
            details: process.env.NEXT_PUBLIC_HIPAA_MODE === 'true' ? '[REDACTED]' : details,
            ipAddress: '[REDACTED]', // In production, you might want to log this
            userAgent: '[REDACTED]',
        };

        // Save to Firestore
        await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), auditData);

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('AUDIT LOG:', {
                action,
                userId,
                timestamp: new Date().toISOString(),
                details: process.env.NEXT_PUBLIC_HIPAA_MODE === 'true' ? '[REDACTED]' : details,
            });
        }
    } catch (error) {
        console.error('Failed to save audit log:', error);
        // Don't throw - audit logging shouldn't break the main flow
    }
};

// ====== ERROR HANDLING ======
export class FirebaseError extends Error {
    constructor(
        message: string,
        public code: string,
        public originalError?: any
    ) {
        super(message);
        this.name = 'FirebaseError';
    }
}

// ====== FIREBASE EXPORTS ======
export { auth, db, storage, Timestamp };

// ====== INITIALIZATION VALIDATION ======
console.log('🔥 Firebase initialized successfully');
console.log('📊 Collections configured:', Object.keys(COLLECTIONS).length);
console.log('🚀 Learning system ready!');

// ====== DEVELOPMENT HELPERS ======
if (process.env.NODE_ENV === 'development') {
    // Log collection structure for debugging
    console.log('📋 Available Collections:', COLLECTIONS);

    // Validate environment variables
    const requiredEnvVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingVars);
    } else {
        console.log('✅ All required environment variables configured');
    }
}