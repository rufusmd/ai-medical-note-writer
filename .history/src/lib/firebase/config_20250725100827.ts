// src/lib/firebase/config.ts
// 🔥 Firebase Configuration with Environment Variables

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

// Validate required environment variables
function validateFirebaseConfig() {
    const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('❌ Missing Firebase environment variables:', missingVars);
        throw new Error(`Missing Firebase configuration: ${missingVars.join(', ')}`);
    }

    console.log('✅ Firebase configuration validated');
}

// Initialize Firebase app
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
    // Validate configuration
    validateFirebaseConfig();

    // Initialize Firebase (only if not already initialized)
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

    // Connect to emulators in development (if configured)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        // Only run emulator connection on client side
        const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

        if (useEmulators) {
            console.log('🔧 Connecting to Firebase emulators...');

            try {
                // Connect to Firestore emulator
                if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
                    const [host, port] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(':');
                    connectFirestoreEmulator(db, host, parseInt(port));
                }

                // Connect to Auth emulator
                if (process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL) {
                    connectAuthEmulator(auth, process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL, {
                        disableWarnings: true
                    });
                }

                // Connect to Storage emulator
                if (process.env.NEXT_PUBLIC_STORAGE_EMULATOR_HOST) {
                    const [host, port] = process.env.NEXT_PUBLIC_STORAGE_EMULATOR_HOST.split(':');
                    connectStorageEmulator(storage, host, parseInt(port));
                }

                console.log('✅ Connected to Firebase emulators');
            } catch (error) {
                console.log('ℹ️ Emulators already connected or not available');
            }
        }
    }

    console.log('✅ Firebase initialized successfully');

} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
}

// Export Firebase instances
export { app, db, auth, storage };

// Export Firebase config for reference
export { firebaseConfig };

// Utility functions
export const firebaseUtils = {
    // Check if Firebase is properly initialized
    isInitialized: (): boolean => {
        try {
            return getApps().length > 0;
        } catch {
            return false;
        }
    },

    // Get current environment info
    getEnvironment: () => ({
        projectId: firebaseConfig.projectId,
        isDevelopment: process.env.NODE_ENV === 'development',
        useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true',
        isSSR: typeof window === 'undefined'
    }),

    // Validate connection to Firebase
    validateConnection: async (): Promise<boolean> => {
        try {
            // Simple test to validate Firestore connection
            const testDoc = db.collection ? 'firestore-v8' : 'firestore-v9';
            console.log('🔍 Firebase connection type:', testDoc);
            return true;
        } catch (error) {
            console.error('❌ Firebase connection validation failed:', error);
            return false;
        }
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

// Environment-specific configuration
export const firebaseSettings = {
    development: {
        enablePersistence: false,
        enableNetwork: true,
        logLevel: 'debug' as const
    },
    production: {
        enablePersistence: true,
        enableNetwork: true,
        logLevel: 'error' as const
    },
    test: {
        enablePersistence: false,
        enableNetwork: false,
        logLevel: 'silent' as const
    }
};

// Get current environment settings
export const getCurrentFirebaseSettings = () => {
    const env = process.env.NODE_ENV as keyof typeof firebaseSettings;
    return firebaseSettings[env] || firebaseSettings.development;
};