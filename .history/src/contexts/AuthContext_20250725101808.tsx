// src/contexts/AuthContext.tsx
// 🔐 Authentication Context with Firebase Auth

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseUtils } from '@/lib/firebase/config';

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    institution?: string;
    role?: 'physician' | 'nurse' | 'admin' | 'resident';
    createdAt?: any;
    lastLogin?: any;
    preferences?: {
        defaultAIProvider?: 'gemini' | 'claude';
        templatesPerPage?: number;
        autoSaveNotes?: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize Google Auth Provider
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
        prompt: 'select_account'
    });

    // Load user profile from Firestore
    const loadUserProfile = async (user: User): Promise<UserProfile | null> => {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const profileData = userDoc.data();
                return {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || undefined,
                    ...profileData
                };
            } else {
                // Create initial profile if it doesn't exist
                const initialProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || undefined,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    preferences: {
                        defaultAIProvider: 'gemini',
                        templatesPerPage: 10,
                        autoSaveNotes: true
                    }
                };

                await setDoc(userDocRef, initialProfile);
                return initialProfile;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    };

    // Update user profile in Firestore
    const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
        if (!user) throw new Error('No user logged in');

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                ...updates,
                lastModified: serverTimestamp()
            }, { merge: true });

            // Update local state
            setUserProfile(prev => prev ? { ...prev, ...updates } : null);

            console.log('✅ User profile updated');
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            throw error;
        }
    };

    // Sign in with email and password
    const signIn = async (email: string, password: string): Promise<void> => {
        if (!firebaseUtils.isInitialized()) {
            throw new Error('Firebase not initialized. Please check your configuration.');
        }

        try {
            setLoading(true);
            const result = await signInWithEmailAndPassword(auth, email, password);

            // Update last login
            if (result.user) {
                const userDocRef = doc(db, 'users', result.user.uid);
                await setDoc(userDocRef, {
                    lastLogin: serverTimestamp()
                }, { merge: true });
            }

            console.log('✅ User signed in with email/password');
        } catch (error) {
            console.error('❌ Sign in error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Sign up with email and password
    const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
        if (!firebaseUtils.isInitialized()) {
            throw new Error('Firebase not initialized. Please check your configuration.');
        }

        try {
            setLoading(true);
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update user profile
            await updateProfile(result.user, { displayName });

            // Create user document in Firestore
            const userProfile: UserProfile = {
                uid: result.user.uid,
                email: result.user.email || '',
                displayName: displayName,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                preferences: {
                    defaultAIProvider: 'gemini',
                    templatesPerPage: 10,
                    autoSaveNotes: true
                }
            };

            const userDocRef = doc(db, 'users', result.user.uid);
            await setDoc(userDocRef, userProfile);

            console.log('✅ User account created');
        } catch (error) {
            console.error('❌ Sign up error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Sign in with Google
    const signInWithGoogle = async (): Promise<void> => {
        if (!firebaseUtils.isInitialized()) {
            throw new Error('Firebase not initialized. Please check your configuration.');
        }

        try {
            setLoading(true);
            const result = await signInWithPopup(auth, googleProvider);

            // Update last login
            if (result.user) {
                const userDocRef = doc(db, 'users', result.user.uid);
                await setDoc(userDocRef, {
                    lastLogin: serverTimestamp(),
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL
                }, { merge: true });
            }

            console.log('✅ User signed in with Google');
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Sign out
    const signOut = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Sign out error:', error);
            throw error;
        }
    };

    // Reset password
    const resetPassword = async (email: string): Promise<void> => {
        try {
            await sendPasswordResetEmail(auth, email);
            console.log('✅ Password reset email sent');
        } catch (error) {
            console.error('❌ Password reset error:', error);
            throw error;
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        // Check if Firebase is properly initialized
        if (!firebaseUtils.isInitialized()) {
            console.warn('⚠️ Firebase not initialized, skipping auth state listener');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setLoading(true);

                if (user) {
                    setUser(user);
                    const profile = await loadUserProfile(user);
                    setUserProfile(profile);
                    console.log('✅ User authenticated:', user.email);
                } else {
                    setUser(null);
                    setUserProfile(null);
                    console.log('ℹ️ User not authenticated');
                }
            } catch (error) {
                console.error('❌ Auth state change error:', error);
                setUser(null);
                setUserProfile(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
    Component: React.ComponentType<P>
): React.ComponentType<P> {
    return function AuthenticatedComponent(props: P) {
        const { user, loading } = useAuth();

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        if (!user) {
            // Redirect to login or show login component
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
                        <p className="text-gray-600">Please sign in to continue.</p>
                    </div>
                </div>
            );
        }

        return <Component {...props} />;
    };
}

// Hook for checking specific permissions
export function usePermissions() {
    const { userProfile } = useAuth();

    const hasRole = (role: UserProfile['role']) => {
        return userProfile?.role === role;
    };

    const canManagePatients = () => {
        return ['physician', 'nurse', 'admin'].includes(userProfile?.role || '');
    };

    const canGenerateNotes = () => {
        return ['physician', 'resident', 'nurse'].includes(userProfile?.role || '');
    };

    const canManageTemplates = () => {
        return ['physician', 'admin'].includes(userProfile?.role || '');
    };

    return {
        hasRole,
        canManagePatients,
        canGenerateNotes,
        canManageTemplates,
        isAdmin: hasRole('admin'),
        isPhysician: hasRole('physician'),
        isNurse: hasRole('nurse'),
        isResident: hasRole('resident')
    };
}