// src/lib/firebase/config.ts - CORRECTED VERSION
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// DEBUG: Log what's actually being loaded (remove after debugging)
console.log('🔍 Environment Variables Debug:', {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Loaded' : '❌ Missing',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Loaded' : '❌ Missing',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Loaded' : '❌ Missing',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Loaded' : '❌ Missing',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Loaded' : '❌ Missing',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Loaded' : '❌ Missing',
    nodeEnv: process.env.NODE_ENV,
    allNextPublicVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
});

// SIMPLIFIED validation (to match your current code and avoid the strict error)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase config missing required fields:', {
        apiKey: firebaseConfig.apiKey ? '✅' : '❌',
        projectId: firebaseConfig.projectId ? '✅' : '❌'
    });
    throw new Error('Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully');

export { app, auth, db, firebaseConfig };