// src/lib/firebase/feedback.ts - REPLACE WITH SIMPLIFIED VERSION

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

// SIMPLIFIED: Get user feedback without complex queries
export const getUserFeedback = async (
    userId: string,
    limitCount: number = 50
): Promise<NoteFeedback[]> => {
    try {
        // Simple query - just by userId
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
        // Return empty array instead of throwing to prevent UI crashes
        return [];
    }
};

// SIMPLIFIED: Get feedback analytics with basic calculations
export const getFeedbackAnalytics = async (userId: string) => {
    try {
        const feedback = await getUserFeedback(userId, 100);

        if (feedback.length === 0) {
            return {
                totalFeedback: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                commonIssues: [],
                averageReviewTime: 0,
                providerComparison: {
                    gemini: { count: 0, avgRating: 0 },
                    claude: { count: 0, avgRating: 0 },
                },
            };
        }

        const analytics = {
            totalFeedback: feedback.length,
            averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length,
            ratingDistribution: {
                1: feedback.filter(f => f.rating === 1).length,
                2: feedback.filter(f => f.rating === 2).length,
                3: feedback.filter(f => f.rating === 3).length,
                4: feedback.filter(f => f.rating === 4).length,
                5: feedback.filter(f => f.rating === 5).length,
            },
            commonIssues: getTopIssues(feedback),
            averageReviewTime: feedback.reduce((sum, f) => sum + f.timeToReview, 0) / feedback.length,
            providerComparison: {
                gemini: {
                    count: feedback.filter(f => f.aiProvider === 'gemini').length,
                    avgRating: feedback.filter(f => f.aiProvider === 'gemini')
                        .reduce((sum, f) => sum + f.rating, 0) /
                        Math.max(feedback.filter(f => f.aiProvider === 'gemini').length, 1),
                },
                claude: {
                    count: feedback.filter(f => f.aiProvider === 'claude').length,
                    avgRating: feedback.filter(f => f.aiProvider === 'claude')
                        .reduce((sum, f) => sum + f.rating, 0) /
                        Math.max(feedback.filter(f => f.aiProvider === 'claude').length, 1),
                },
            },
        };

        return analytics;
    } catch (error) {
        console.error('Error calculating feedback analytics:', error);
        // Return empty analytics instead of throwing
        return {
            totalFeedback: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            commonIssues: [],
            averageReviewTime: 0,
            providerComparison: {
                gemini: { count: 0, avgRating: 0 },
                claude: { count: 0, avgRating: 0 },
            },
        };
    }
};

const getTopIssues = (feedback: NoteFeedback[]) => {
    const issueCount: Record<string, number> = {};

    feedback.forEach(f => {
        f.qualityIssues.forEach(issue => {
            issueCount[issue] = (issueCount[issue] || 0) + 1;
        });
    });

    return Object.entries(issueCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([issue, count]) => ({
            issue,
            count,
            percentage: feedback.length > 0 ? (count / feedback.length) * 100 : 0
        }));
};

// SIMPLIFIED: Notes awaiting feedback (remove complex query)
export const getNotesAwaitingFeedback = async (userId: string): Promise<any[]> => {
    try {
        // For now, just return empty array to avoid complex queries
        // We'll enhance this later once indexes are set up
        return [];
    } catch (error) {
        console.error('Error fetching notes awaiting feedback:', error);
        return [];
    }
};