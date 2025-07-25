// src/lib/firebase/config.ts (ENHANCED VERSION)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
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
const storage = getStorage(app); // Added for Phase 3

// Firestore collection names (centralized for consistency)
export const COLLECTIONS = {
    USERS: 'users',
    PATIENTS: 'patients',
    NOTES: 'notes',
    TEMPLATES: 'templates',
    SMART_LINKS: 'smart_links',
    DOT_PHRASES: 'dot_phrases',
    ENCOUNTERS: 'encounters',
    NOTE_GENERATION_LOGS: 'note_generation_logs',
    USER_PREFERENCES: 'user_preferences',
    AUDIT_LOGS: 'audit_logs',
} as const;

// Helper function to get collection reference with proper typing
export const getCollection = (collectionName: keyof typeof COLLECTIONS) => {
    return COLLECTIONS[collectionName];
};

// HIPAA-compliant helper functions
export const createAuditLog = async (action: string, details: any, userId: string) => {
    // In a real implementation, you'd save audit logs to Firestore
    // For now, just console.log in development
    if (process.env.NODE_ENV === 'development') {
        console.log('AUDIT LOG:', {
            action,
            userId,
            timestamp: new Date().toISOString(),
            details: process.env.NEXT_PUBLIC_HIPAA_MODE === 'true' ? '[REDACTED]' : details,
        });
    }

    // Optionally save to Firestore (uncomment when ready)
    // try {
    //   await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
    //     action,
    //     userId,
    //     timestamp: new Date(),
    //     details: process.env.NEXT_PUBLIC_HIPAA_MODE === 'true' ? '[REDACTED]' : details,
    //   });
    // } catch (error) {
    //   console.error('Failed to save audit log:', error);
    // }
};

// Error handling for Firebase operations
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

// Helper function to handle Firebase errors
export const handleFirebaseError = (error: any): FirebaseError => {
    let message = 'An unknown Firebase error occurred';
    let code = 'unknown';

    if (error.code) {
        code = error.code;

        // Map common Firebase error codes to user-friendly messages
        switch (error.code) {
            case 'permission-denied':
                message = 'Access denied. Please check your permissions.';
                break;
            case 'not-found':
                message = 'The requested document was not found.';
                break;
            case 'already-exists':
                message = 'A document with this ID already exists.';
                break;
            case 'resource-exhausted':
                message = 'Quota exceeded. Please try again later.';
                break;
            case 'unauthenticated':
                message = 'Authentication required. Please log in.';
                break;
            case 'unavailable':
                message = 'Service temporarily unavailable. Please try again.';
                break;
            default:
                message = error.message || message;
        }
    } else if (error.message) {
        message = error.message;
    }

    return new FirebaseError(message, code, error);
};

// Utility functions for common Firestore operations
export const firestoreUtils = {
    // Sanitize data before saving (remove undefined values, etc.)
    sanitizeData: (data: any): any => {
        if (data === null || data === undefined) return null;

        if (Array.isArray(data)) {
            return data.map(firestoreUtils.sanitizeData);
        }

        if (typeof data === 'object' && data.constructor === Object) {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined) {
                    sanitized[key] = firestoreUtils.sanitizeData(value);
                }
            }
            return sanitized;
        }

        return data;
    },

    // Convert Firestore timestamps to JavaScript dates
    convertTimestamps: (data: any): any => {
        if (!data) return data;

        if (data.toDate && typeof data.toDate === 'function') {
            return data.toDate();
        }

        if (Array.isArray(data)) {
            return data.map(firestoreUtils.convertTimestamps);
        }

        if (typeof data === 'object' && data.constructor === Object) {
            const converted: any = {};
            for (const [key, value] of Object.entries(data)) {
                converted[key] = firestoreUtils.convertTimestamps(value);
            }
            return converted;
        }

        return data;
    },

    // Generate a document ID that's HIPAA-compliant (no PHI)
    generateSecureId: (): string => {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Validate that data doesn't contain obvious PHI patterns
    validateNoPHI: (data: any): { isValid: boolean; warnings: string[] } => {
        const warnings: string[] = [];
        const dataStr = JSON.stringify(data).toLowerCase();

        // Basic PHI detection patterns (extend as needed)
        const phiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
            /\b\d{10,}\b/, // Long numbers (could be phone, account numbers)
            /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/, // Email pattern
        ];

        phiPatterns.forEach((pattern, index) => {
            if (pattern.test(dataStr)) {
                warnings.push(`Potential PHI detected (pattern ${index + 1})`);
            }
        });

        return {
            isValid: warnings.length === 0,
            warnings
        };
    }
};

// Export everything (keeping your original exports + new ones)
export { app, auth, db, storage, firebaseConfig };

// Default export for compatibility
export default app;