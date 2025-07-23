// src/lib/firebase/feedback.ts - SIMPLIFIED VERSION
import {
    doc,
    addDoc,
    updateDoc,
    getDocs,
    collection,
    query,
    where,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db, createAuditLog, COLLECTIONS } from './config';
import {
    NoteFeedback,
    isValidRating,
    isValidQualityIssue
} from './schema';

// ====== SIMPLIFIED NOTE FEEDBACK OPERATIONS ======

export const createNoteFeedback = async (
    feedback: Omit<NoteFeedback, 'id' | 'createdAt'>
): Promise<string> => {
    try {
        // Validation
        if (!isValidRating(feedback.rating)) {
            throw new Error('Invalid rating. Must be 1-5.');
        }

        if (!feedback.qualityIssues.every(isValidQualityIssue)) {
            throw new Error('Invalid quality issues provided.');
        }

        const feedbackData: Omit<NoteFeedback, 'id'> = {
            ...feedback,
            createdAt: Timestamp.now(),
        };

        // Create the feedback document
        const docRef = await addDoc(collection(db, COLLECTIONS.NOTE_FEEDBACK), feedbackData);

        // Try to update the note (don't fail if this doesn't work)
        try {
            await updateDoc(doc(db, COLLECTIONS.NOTES, feedback.noteId), {
                feedbackCollected: true,
                feedbackRating: feedback.rating,
            });
        } catch (noteUpdateError) {
            console.warn('Could not update note with feedback status (this is OK):', noteUpdateError);
        }

        // Try to create audit log (don't fail if this doesn't work)
        try {
            await createAuditLog('feedback_created', {
                feedbackId: docRef.id,
                noteId: feedback.noteId,
                rating: feedback.rating,
            }, feedback.userId);
        } catch (auditError) {
            console.warn('Could not create audit log (this is OK):', auditError);
        }

        return docRef.id;
    } catch (error) {
        console.error('Error creating note feedback:', error);
        throw new Error('Failed to save feedback');
    }
};

// Get user feedback without complex queries
export const getUserFeedback = async (
    userId: string,
    limitCount: number = 50
): Promise<NoteFeedback[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTE_FEEDBACK),
            where('userId', '==', userId),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as NoteFeedback[];
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        return [];
    }
};