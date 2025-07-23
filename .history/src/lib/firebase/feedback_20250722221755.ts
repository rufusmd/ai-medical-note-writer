// src/lib/firebase/feedback.ts - Firebase operations for LLM feedback system

import {
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db, createAuditLog } from './config';
import {
    NoteFeedback,
    UserPromptProfile,
    PromptExperiment,
    PromptOptimization,
    COLLECTIONS,
    isValidRating,
    isValidQualityIssue
} from './schema';

// ====== NOTE FEEDBACK OPERATIONS ======

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

        const docRef = await addDoc(collection(db, COLLECTIONS.NOTE_FEEDBACK), feedbackData);

        // Update the note to mark feedback as collected
        await updateDoc(doc(db, COLLECTIONS.NOTES, feedback.noteId), {
            feedbackCollected: true,
            feedbackRating: feedback.rating,
        });

        // Create audit log
        await createAuditLog('feedback_created', {
            feedbackId: docRef.id,
            noteId: feedback.noteId,
            rating: feedback.rating,
        }, feedback.userId);

        return docRef.id;
    } catch (error) {
        console.error('Error creating note feedback:', error);
        throw new Error('Failed to save feedback');
    }
};

export const getUserFeedback = async (
    userId: string,
    limitCount: number = 50
): Promise<NoteFeedback[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTE_FEEDBACK),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as NoteFeedback[];
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        throw new Error('Failed to fetch feedback');
    }
};

export const getFeedbackAnalytics = async (userId: string) => {
    try {
        const feedback = await getUserFeedback(userId, 100);

        const analytics = {
            totalFeedback: feedback.length,
            averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length || 0,
            ratingDistribution: {
                1: feedback.filter(f => f.rating === 1).length,
                2: feedback.filter(f => f.rating === 2).length,
                3: feedback.filter(f => f.rating === 3).length,
                4: feedback.filter(f => f.rating === 4).length,
                5: feedback.filter(f => f.rating === 5).length,
            },
            commonIssues: getTopIssues(feedback),
            averageReviewTime: feedback.reduce((sum, f) => sum + f.timeToReview, 0) / feedback.length || 0,
            providerComparison: {
                gemini: {
                    count: feedback.filter(f => f.aiProvider === 'gemini').length,
                    avgRating: feedback.filter(f => f.aiProvider === 'gemini')
                        .reduce((sum, f) => sum + f.rating, 0) /
                        feedback.filter(f => f.aiProvider === 'gemini').length || 0,
                },
                claude: {
                    count: feedback.filter(f => f.aiProvider === 'claude').length,
                    avgRating: feedback.filter(f => f.aiProvider === 'claude')
                        .reduce((sum, f) => sum + f.rating, 0) /
                        feedback.filter(f => f.aiProvider === 'claude').length || 0,
                },
            },
        };

        return analytics;
    } catch (error) {
        console.error('Error calculating feedback analytics:', error);
        throw new Error('Failed to calculate analytics');
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
        .map(([issue, count]) => ({ issue, count, percentage: (count / feedback.length) * 100 }));
};

// ====== USER PROMPT PROFILE OPERATIONS ======

export const createOrUpdateUserPromptProfile = async (
    profile: Omit<UserPromptProfile, 'id' | 'createdAt' | 'lastUpdated'>
): Promise<string> => {
    try {
        // Check if profile exists
        const q = query(
            collection(db, COLLECTIONS.USER_PROMPT_PROFILES),
            where('userId', '==', profile.userId),
            limit(1)
        );

        const existingDocs = await getDocs(q);

        if (existingDocs.empty) {
            // Create new profile
            const profileData: Omit<UserPromptProfile, 'id'> = {
                ...profile,
                createdAt: Timestamp.now(),
                lastUpdated: Timestamp.now(),
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.USER_PROMPT_PROFILES), profileData);
            return docRef.id;
        } else {
            // Update existing profile
            const existingDoc = existingDocs.docs[0];
            await updateDoc(existingDoc.ref, {
                ...profile,
                lastUpdated: Timestamp.now(),
            });
            return existingDoc.id;
        }
    } catch (error) {
        console.error('Error creating/updating user prompt profile:', error);
        throw new Error('Failed to save user prompt profile');
    }
};

export const getUserPromptProfile = async (userId: string): Promise<UserPromptProfile | null> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.USER_PROMPT_PROFILES),
            where('userId', '==', userId),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        } as UserPromptProfile;
    } catch (error) {
        console.error('Error fetching user prompt profile:', error);
        throw new Error('Failed to fetch user prompt profile');
    }
};

// ====== PROMPT EXPERIMENT OPERATIONS ======

export const createPromptExperiment = async (
    experiment: Omit<PromptExperiment, 'id' | 'createdAt'>
): Promise<string> => {
    try {
        const experimentData: Omit<PromptExperiment, 'id'> = {
            ...experiment,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PROMPT_EXPERIMENTS), experimentData);

        await createAuditLog('experiment_created', {
            experimentId: docRef.id,
            variantCount: experiment.variantPrompts.length,
        }, experiment.userId);

        return docRef.id;
    } catch (error) {
        console.error('Error creating prompt experiment:', error);
        throw new Error('Failed to create experiment');
    }
};

export const updateExperimentResults = async (
    experimentId: string,
    variantId: string,
    rating: number,
    processingTime: number
): Promise<void> => {
    try {
        const experimentRef = doc(db, COLLECTIONS.PROMPT_EXPERIMENTS, experimentId);
        const experimentDoc = await getDoc(experimentRef);

        if (!experimentDoc.exists()) {
            throw new Error('Experiment not found');
        }

        const experiment = experimentDoc.data() as PromptExperiment;
        const updatedResults = experiment.variantResults.map(result => {
            if (result.variantId === variantId) {
                return {
                    ...result,
                    noteCount: result.noteCount + 1,
                    averageRating: ((result.averageRating * result.noteCount) + rating) / (result.noteCount + 1),
                    averageProcessingTime: ((result.averageProcessingTime * result.noteCount) + processingTime) / (result.noteCount + 1),
                    feedbackCount: result.feedbackCount + 1,
                };
            }
            return result;
        });

        await updateDoc(experimentRef, {
            variantResults: updatedResults,
        });

        // Check if experiment should be completed
        const totalNotes = updatedResults.reduce((sum, result) => sum + result.noteCount, 0);
        if (totalNotes >= experiment.targetNoteCount) {
            await completeExperiment(experimentId);
        }
    } catch (error) {
        console.error('Error updating experiment results:', error);
        throw new Error('Failed to update experiment results');
    }
};

export const completeExperiment = async (experimentId: string): Promise<void> => {
    try {
        const experimentRef = doc(db, COLLECTIONS.PROMPT_EXPERIMENTS, experimentId);
        const experimentDoc = await getDoc(experimentRef);

        if (!experimentDoc.exists()) {
            throw new Error('Experiment not found');
        }

        const experiment = experimentDoc.data() as PromptExperiment;

        // Find winning variant (highest average rating)
        const winningVariant = experiment.variantResults.reduce((best, current) =>
            current.averageRating > best.averageRating ? current : best
        );

        // Calculate improvement percentage vs baseline (first variant)
        const baselineRating = experiment.variantResults[0]?.averageRating || 0;
        const improvementPercentage = baselineRating > 0
            ? ((winningVariant.averageRating - baselineRating) / baselineRating) * 100
            : 0;

        await updateDoc(experimentRef, {
            status: 'completed',
            completedAt: Timestamp.now(),
            winningVariant: winningVariant.variantId,
            improvementPercentage,
            statisticalSignificance: calculateStatisticalSignificance(experiment.variantResults),
        });

        await createAuditLog('experiment_completed', {
            experimentId,
            winningVariant: winningVariant.variantId,
            improvementPercentage,
        }, experiment.userId);
    } catch (error) {
        console.error('Error completing experiment:', error);
        throw new Error('Failed to complete experiment');
    }
};

// ====== PROMPT OPTIMIZATION OPERATIONS ======

export const generatePromptOptimization = async (userId: string): Promise<string> => {
    try {
        // Get user feedback for analysis
        const feedback = await getUserFeedback(userId, 50);

        if (feedback.length < 5) {
            throw new Error('Not enough feedback data for optimization (minimum 5 required)');
        }

        // Analyze feedback patterns
        const analytics = await getFeedbackAnalytics(userId);

        // Generate suggestions based on common issues
        const suggestions = generatePromptSuggestions(feedback, analytics);

        const optimization: Omit<PromptOptimization, 'id'> = {
            userId,
            feedbackPatterns: {
                commonIssues: analytics.commonIssues,
                ratingDistribution: Object.entries(analytics.ratingDistribution)
                    .map(([rating, count]) => ({ rating: parseInt(rating), count })),
                timeToReviewTrends: feedback.map(f => f.timeToReview),
            },
            suggestedPromptChanges: suggestions,
            predictedImprovements: {
                qualityScore: Math.min(analytics.averageRating + 0.5, 5),
                userSatisfaction: Math.min(analytics.averageRating + 0.3, 5),
                processingTime: analytics.averageReviewTime * 0.8, // 20% reduction prediction
            },
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.PROMPT_OPTIMIZATIONS), optimization);
        return docRef.id;
    } catch (error) {
        console.error('Error generating prompt optimization:', error);
        throw new Error('Failed to generate optimization');
    }
};

const generatePromptSuggestions = (feedback: NoteFeedback[], analytics: any) => {
    const suggestions = [];

    // Analyze common issues and generate suggestions
    analytics.commonIssues.forEach((issue: any) => {
        switch (issue.issue) {
            case 'too_long':
                suggestions.push({
                    changeType: 'addition',
                    originalText: '',
                    suggestedText: 'Keep responses concise and focused. Aim for brevity while maintaining clinical accuracy.',
                    reasoning: `${issue.percentage.toFixed(1)}% of feedback indicates notes are too long`,
                    confidence: Math.min(issue.percentage / 100, 0.9),
                });
                break;

            case 'too_brief':
                suggestions.push({
                    changeType: 'addition',
                    originalText: '',
                    suggestedText: 'Provide more detailed clinical information and comprehensive documentation.',
                    reasoning: `${issue.percentage.toFixed(1)}% of feedback indicates notes are too brief`,
                    confidence: Math.min(issue.percentage / 100, 0.9),
                });
                break;

            case 'missing_details':
                suggestions.push({
                    changeType: 'addition',
                    originalText: '',
                    suggestedText: 'Ensure all relevant clinical details are included. Pay special attention to patient history, current symptoms, and treatment plans.',
                    reasoning: `${issue.percentage.toFixed(1)}% of feedback indicates missing clinical details`,
                    confidence: Math.min(issue.percentage / 100, 0.9),
                });
                break;

            case 'wrong_tone':
                suggestions.push({
                    changeType: 'modification',
                    originalText: '',
                    suggestedText: 'Use professional, clinical language appropriate for medical documentation. Maintain objectivity and medical terminology.',
                    reasoning: `${issue.percentage.toFixed(1)}% of feedback indicates inappropriate tone`,
                    confidence: Math.min(issue.percentage / 100, 0.9),
                });
                break;
        }
    });

    return suggestions;
};

const calculateStatisticalSignificance = (results: any[]): number => {
    // Simplified statistical significance calculation
    // In a real implementation, you'd use proper statistical tests
    if (results.length < 2) return 0;

    const ratings = results.map(r => r.averageRating);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Return simplified confidence score (0-1)
    return stdDev < 0.5 ? 0.95 : stdDev < 1.0 ? 0.80 : 0.60;
};

// ====== UTILITY FUNCTIONS ======

export const getNotesAwaitingFeedback = async (userId: string): Promise<any[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTES),
            where('createdBy', '==', userId),
            where('feedbackCollected', '!=', true),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching notes awaiting feedback:', error);
        throw new Error('Failed to fetch notes');
    }
};