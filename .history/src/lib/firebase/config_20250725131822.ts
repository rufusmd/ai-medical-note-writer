// src/lib/firebase/config.ts
// 🔥 Firebase Configuration - Aligned with existing repository structure

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
    // Check if we have the minimum required config
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        // Initialize Firebase app
        if (!getApps().length) {
            console.log('🔥 Initializing Firebase app...');
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
            console.log('🔥 Using existing Firebase app');
        }

        // Initialize services
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        console.log('✅ Firebase initialized successfully');
    } else {
        console.warn('⚠️ Firebase configuration incomplete. Please check your environment variables.');
        console.log('Missing:', {
            apiKey: !firebaseConfig.apiKey,
            projectId: !firebaseConfig.projectId
        });

        // Create placeholder objects for development
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Development mode: Creating Firebase placeholders');
        }
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    if (process.env.NODE_ENV === 'production') {
        throw error;
    }
}

// Collection names for consistency
export const COLLECTIONS = {
    USERS: 'users',
    PATIENTS: 'patients',
    NOTES: 'notes',
    TEMPLATES: 'templates',
    TRANSFERS: 'transfer-of-care',
    ENCOUNTERS: 'encounters'
} as const;

// Export Firebase instances
export { app, db, auth, storage };

// Export Firebase config for reference
export { firebaseConfig };

// Default export for compatibility
export default { app, db, auth, storage, firebaseConfig };

// Utility functions
export const firebaseUtils = {
    // Check if Firebase is properly initialized
    isInitialized: (): boolean => {
        try {
            return getApps().length > 0 && !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
        } catch {
            return false;
        }
    },

    // Get current environment info
    getEnvironment: () => ({
        projectId: firebaseConfig.projectId,
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        hasConfig: !!(firebaseConfig.apiKey && firebaseConfig.projectId)
    }),

    // Check if we're in development mode with missing config
    isDevelopmentWithoutConfig: (): boolean => {
        return process.env.NODE_ENV === 'development' && (!firebaseConfig.apiKey || !firebaseConfig.projectId);
    }
};

// Firebase error handling
export class FirebaseError extends Error {
    code: string;
    originalError?: Error;

    constructor(message: string, code: string = 'unknown', originalError?: Error) {
        super(message);
        this.name = 'FirebaseError';
        this.code = code;
        this.originalError = originalError;
    }
}

// Helper function to handle Firebase errors
export const handleFirebaseError = (error: any): FirebaseError => {
    let message = 'An unknown Firebase error occurred';
    let code = 'unknown';

    if (error?.code) {
        code = error.code;

        // User-friendly error messages
        switch (error.code) {
            case 'permission-denied':
                message = 'You do not have permission to perform this action.';
                break;
            case 'not-found':
                message = 'The requested data was not found.';
                break;
            case 'already-exists':
                message = 'This data already exists.';
                break;
            case 'unauthenticated':
                message = 'Please log in to continue.';
                break;
            case 'unavailable':
                message = 'Service temporarily unavailable. Please try again.';
                break;
            case 'resource-exhausted':
                message = 'Too many requests. Please wait and try again.';
                break;
            case 'invalid-argument':
                message = 'Invalid data provided.';
                break;
            default:
                message = error.message || message;
        }
    } else if (error.message) {
        message = error.message;
    }

    return new FirebaseError(message, code, error);
};

// Development helpers
export const devHelpers = {
    logConfig: () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Firebase Config Status:', {
                hasApiKey: !!firebaseConfig.apiKey,
                hasProjectId: !!firebaseConfig.projectId,
                hasAuthDomain: !!firebaseConfig.authDomain,
                projectId: firebaseConfig.projectId || 'NOT_SET'
            });
        }
    },

    createMockUser: () => ({
        uid: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Development User'
    })
};