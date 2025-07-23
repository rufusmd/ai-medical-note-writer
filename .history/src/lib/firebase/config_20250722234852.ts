// src/lib/firebase/config.ts - FIXED VERSION
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
    console.warn('Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Collection names
export const COLLECTIONS = {
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
    NOTE_FEEDBACK: 'note_feedback',
    USER_PROMPT_PROFILES: 'user_prompt_profiles',
    PROMPT_EXPERIMENTS: 'prompt_experiments',
    PROMPT_OPTIMIZATIONS: 'prompt_optimizations',
} as const;

// Helper function to get collection reference
export const getCollection = (collectionName: keyof typeof COLLECTIONS) => {
    return COLLECTIONS[collectionName];
};

// Simplified audit logging
export const createAuditLog = async (action: string, details: any, userId: string) => {
    try {
        const auditData = {
            action,
            userId,
            timestamp: Timestamp.now(),
            details: process.env.NEXT_PUBLIC_HIPAA_MODE === 'true' ? '[REDACTED]' : details,
        };

        await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), auditData);

        if (process.env.NODE_ENV === 'development') {
            console.log('AUDIT LOG:', { action, userId, timestamp: new Date().toISOString() });
        }
    } catch (error) {
        console.error('Failed to save audit log:', error);
    }
};

// Firebase error handling
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

// Utility functions
export const firestoreUtils = {
    sanitizeData: (data: any) => {
        // Remove undefined values and convert dates
        const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
            if (value === undefined) return null;
            if (value instanceof Date) return Timestamp.fromDate(value);
            return value;
        }));
        return sanitized;
    },

    convertTimestamps: (data: any) => {
        // Convert Firestore timestamps back to dates
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                if (data[key] && data[key].toDate) {
                    data[key] = data[key].toDate();
                }
            });
        }
        return data;
    }
};

// Handle Firebase errors
export const handleFirebaseError = (error: any): FirebaseError => {
    if (error instanceof FirebaseError) return error;

    return new FirebaseError(
        error.message || 'Unknown Firebase error',
        error.code || 'unknown',
        error
    );
};

export { auth, db, storage, Timestamp };