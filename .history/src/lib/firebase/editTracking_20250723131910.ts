// src/lib/firebase/editTracking.ts

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    writeBatch,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './config';
import {
    EditDelta,
    NoteEditSession,
    ClinicalContext,
    EditPattern,
    InferredFeedback,
    PromptEvolution,
    FIREBASE_COLLECTIONS,
    EditAnalysisResult,
    LearningMetrics
} from '@/types/editTracking';

export class EditTrackingService {

    // Create new edit session
    async createEditSession(
        noteId: string,
        patientId: string,
        userId: string,
        clinicalContext: ClinicalContext,
        originalContent: string,
        aiProvider: 'gemini' | 'claude',
        promptVersion: string,
        generationTime: number
    ): Promise<string> {
        try {
            const sessionData: Omit<NoteEditSession, 'id'> = {
                noteId,
                patientId,
                userId,
                clinicalContext,
                startTime: Date.now(),
                totalEditTime: 0,
                originalContent,
                finalContent: originalContent,
                originalWordCount: this.countWords(originalContent),
                finalWordCount: this.countWords(originalContent),
                deltas: [],
                totalEdits: 0,
                majorEdits: 0,
                aiProvider,
                promptVersion,
                generationTime,
                editPatterns: [],
                inferredFeedback: this.getDefaultInferredFeedback(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await addDoc(
                collection(db, FIREBASE_COLLECTIONS.NOTE_EDIT_SESSIONS),
                {
                    ...sessionData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            );

            return docRef.id;
        } catch (error) {
            console.error('Error creating edit session:', error);
            throw new Error('Failed to create edit session');
        }
    }

    // Add edit delta to session
    async addEditDelta(sessionId: string, delta: EditDelta): Promise<void> {
        try {
            const batch = writeBatch(db);

            // Add delta to separate collection for detailed tracking
            const deltaRef = doc(collection(db, FIREBASE_COLLECTIONS.EDIT_DELTAS));
            batch.set(deltaRef, {
                ...delta,
                sessionId,
                createdAt: serverTimestamp()
            });

            // Update session with delta and recalculate metrics
            const sessionRef = doc(db, FIREBASE_COLLECTIONS.NOTE_EDIT_SESSIONS, sessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (sessionDoc.exists()) {
                const session = sessionDoc.data() as NoteEditSession;
                const updatedDeltas = [...session.deltas, delta];
                const isMajorEdit = delta.length > 50;

                batch.update(sessionRef, {
                    deltas: updatedDeltas,
                    totalEdits: updatedDeltas.length,
                    majorEdits: session.majorEdits + (isMajorEdit ? 1 : 0),
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();
        } catch (error) {
            console.error('Error adding edit delta:', error);
            throw new Error('Failed to track edit');
        }
    }

    // Complete edit session and analyze patterns
    async completeEditSession(
        sessionId: string,
        finalContent: string,
        totalEditTime: number
    ): Promise<EditAnalysisResult> {
        try {
            const sessionRef = doc(db, FIREBASE_COLLECTIONS.NOTE_EDIT_SESSIONS, sessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('Edit session not found');
            }

            const session = sessionDoc.data() as NoteEditSession;

            // Analyze edit patterns
            const analysisResult = await this.analyzeEditPatterns(session.deltas, session.clinicalContext);

            // Update session with final data
            await updateDoc(sessionRef, {
                endTime: Date.now(),
                totalEditTime,
                finalContent,
                finalWordCount: this.countWords(finalContent),
                editPatterns: analysisResult.patterns,
                inferredFeedback: analysisResult.inferredFeedback,
                updatedAt: serverTimestamp()
            });

            // Trigger prompt optimization if significant patterns found
            if (analysisResult.confidenceScore > 0.7) {
                await this.suggestPromptOptimizations(session.clinicalContext, analysisResult);
            }

            return analysisResult;
        } catch (error) {
            console.error('Error completing edit session:', error);
            throw new Error('Failed to complete edit session');
        }
    }

    // Analyze edit patterns to infer user feedback
    private async analyzeEditPatterns(
        deltas: EditDelta[],
        clinicalContext: ClinicalContext
    ): Promise<EditAnalysisResult> {
        const patterns: EditPattern[] = [];
        const inferredFeedback = this.getDefaultInferredFeedback();
        const promptSuggestions: string[] = [];

        // Pattern 1: Consistent deletions of specific sections
        const deletions = deltas.filter(d => d.type === 'delete');
        if (deletions.length > 3) {
            const deletedContent = deletions.map(d => d.oldContent).join(' ');

            if (this.containsMedicalJargon(deletedContent)) {
                patterns.push({
                    type: 'consistent_deletion',
                    description: 'User consistently removes medical jargon',
                    frequency: deletions.length,
                    confidence: 0.8,
                    examples: deletions.slice(0, 3).map(d => d.oldContent),
                    suggestedPromptChange: 'Use simpler, more accessible language'
                });
                inferredFeedback.specificIssues.wrong_tone = 0.7;
                promptSuggestions.push('Adjust tone to be less clinical and more accessible');
            }

            if (deletedContent.length > deltas.reduce((sum, d) => sum + d.length, 0) * 0.3) {
                patterns.push({
                    type: 'consistent_deletion',
                    description: 'User removes large portions of generated content',
                    frequency: deletions.length,
                    confidence: 0.9,
                    examples: deletions.slice(0, 2).map(d => d.oldContent),
                    suggestedPromptChange: 'Generate more concise content'
                });
                inferredFeedback.specificIssues.too_verbose = 0.8;
                promptSuggestions.push('Reduce verbosity and focus on essential information');
            }
        }

        // Pattern 2: Consistent additions in specific areas
        const additions = deltas.filter(d => d.type === 'insert');
        if (additions.length > 2) {
            const addedContent = additions.map(d => d.newContent).join(' ');

            if (this.containsSpecificDetails(addedContent)) {
                patterns.push({
                    type: 'consistent_addition',
                    description: 'User adds specific medical details',
                    frequency: additions.length,
                    confidence: 0.7,
                    examples: additions.slice(0, 3).map(d => d.newContent),
                    suggestedPromptChange: 'Include more specific medical details'
                });
                inferredFeedback.specificIssues.missing_details = 0.8;
                promptSuggestions.push('Enhance prompts to generate more specific clinical details');
            }
        }

        // Pattern 3: Style changes (formal/informal)
        const replacements = deltas.filter(d => d.type === 'replace');
        let styleChanges = 0;
        replacements.forEach(delta => {
            if (this.isStyleChange(delta.oldContent, delta.newContent)) {
                styleChanges++;
            }
        });

        if (styleChanges > 2) {
            patterns.push({
                type: 'style_change',
                description: 'User modifies writing style consistently',
                frequency: styleChanges,
                confidence: 0.6,
                examples: replacements.slice(0, 2).map(d => `"${d.oldContent}" → "${d.newContent}"`),
                suggestedPromptChange: 'Adjust writing style to match user preference'
            });
            inferredFeedback.specificIssues.style_mismatch = 0.7;
        }

        // Calculate overall satisfaction based on edit patterns
        const editRatio = deltas.length / Math.max(1, this.countWords(deltas[0]?.oldContent || ''));
        inferredFeedback.overallSatisfaction = Math.max(1, Math.min(10, 10 - (editRatio * 3)));

        return {
            patterns,
            inferredFeedback,
            promptSuggestions,
            confidenceScore: this.calculateConfidenceScore(patterns)
        };
    }

    // Suggest prompt optimizations based on analysis
    private async suggestPromptOptimizations(
        clinicalContext: ClinicalContext,
        analysis: EditAnalysisResult
    ): Promise<void> {
        try {
            // Get current prompt version for this context
            const currentPrompt = await this.getCurrentPrompt(clinicalContext);

            if (!currentPrompt) return;

            // Generate optimization suggestions
            const optimizations = this.generatePromptOptimizations(analysis, currentPrompt);

            // Store optimization suggestions
            await addDoc(collection(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS), {
                basePromptId: currentPrompt.id,
                version: `${currentPrompt.version}_optimized_${Date.now()}`,
                clinicalContext,
                systemPrompt: optimizations.systemPrompt,
                userPromptTemplate: optimizations.userPromptTemplate,
                basedOnSessions: [analysis.patterns[0]?.examples[0] || ''],
                improvementMetrics: {
                    averageEditCount: 0,
                    averageEditTime: 0,
                    userSatisfactionScore: 0,
                    medicalAccuracyScore: 0
                },
                isActive: false, // Requires manual activation for testing
                createdAt: serverTimestamp(),
                performanceHistory: []
            });
        } catch (error) {
            console.error('Error suggesting prompt optimizations:', error);
        }
    }

    // Get learning metrics for a user and context
    async getLearningMetrics(
        userId: string,
        clinicalContext: ClinicalContext,
        timeRange: { start: Date; end: Date }
    ): Promise<LearningMetrics> {
        try {
            const sessionsQuery = query(
                collection(db, FIREBASE_COLLECTIONS.NOTE_EDIT_SESSIONS),
                where('userId', '==', userId),
                where('clinicalContext.emrSystem', '==', clinicalContext.emrSystem),
                where('clinicalContext.institution', '==', clinicalContext.institution),
                where('createdAt', '>=', Timestamp.fromDate(timeRange.start)),
                where('createdAt', '<=', Timestamp.fromDate(timeRange.end)),
                orderBy('createdAt', 'desc')
            );

            const sessionsSnapshot = await getDocs(sessionsQuery);
            const sessions = sessionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as NoteEditSession[];

            return this.calculateLearningMetrics(userId, clinicalContext, timeRange, sessions);
        } catch (error) {
            console.error('Error getting learning metrics:', error);
            throw new Error('Failed to retrieve learning metrics');
        }
    }

    // Helper methods
    private countWords(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    private containsMedicalJargon(text: string): boolean {
        const jargonWords = ['etiology', 'pathophysiology', 'contraindication', 'therapeutic', 'pharmacological'];
        return jargonWords.some(word => text.toLowerCase().includes(word));
    }

    private containsSpecificDetails(text: string): boolean {
        const detailPatterns = [/\d+mg/, /\d+:\d+/, /\d+\/\d+/, /\b\d+\s*times?\b/];
        return detailPatterns.some(pattern => pattern.test(text));
    }

    private isStyleChange(oldText: string, newText: string): boolean {
        // Simple heuristic for style changes
        const oldFormal = oldText.includes('patient exhibits') || oldText.includes('demonstrates');
        const newFormal = newText.includes('patient exhibits') || newText.includes('demonstrates');
        return oldFormal !== newFormal;
    }

    private calculateConfidenceScore(patterns: EditPattern[]): number {
        if (patterns.length === 0) return 0;
        return patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    }

    private getDefaultInferredFeedback(): InferredFeedback {
        return {
            overallSatisfaction: 5,
            specificIssues: {
                too_verbose: 0,
                too_brief: 0,
                wrong_tone: 0,
                missing_details: 0,
                poor_structure: 0,
                medical_inaccuracy: 0,
                style_mismatch: 0
            },
            recommendedPromptAdjustments: {
                addInstructions: [],
                removeInstructions: [],
                adjustTone: null,
                adjustLength: null,
                adjustStructure: null
            }
        };
    }

    private async getCurrentPrompt(clinicalContext: ClinicalContext): Promise<PromptEvolution | null> {
        // Implementation would query for current active prompt for this clinical context
        // This is a placeholder for the actual implementation
        return null;
    }

    private generatePromptOptimizations(analysis: EditAnalysisResult, currentPrompt: PromptEvolution) {
        // Implementation would generate optimized prompts based on analysis
        // This is a placeholder for the actual implementation
        return {
            systemPrompt: currentPrompt.systemPrompt,
            userPromptTemplate: currentPrompt.userPromptTemplate
        };
    }

    private calculateLearningMetrics(
        userId: string,
        clinicalContext: ClinicalContext,
        timeRange: { start: Date; end: Date },
        sessions: NoteEditSession[]
    ): LearningMetrics {
        // Calculate metrics from sessions
        const totalSessions = sessions.length;
        const averageEditCount = sessions.reduce((sum, s) => sum + s.totalEdits, 0) / totalSessions;
        const averageEditTime = sessions.reduce((sum, s) => sum + s.totalEditTime, 0) / totalSessions;

        // Determine improvement trend (simplified)
        const recentSessions = sessions.slice(0, Math.floor(sessions.length / 2));
        const olderSessions = sessions.slice(Math.floor(sessions.length / 2));

        const recentAvgEdits = recentSessions.reduce((sum, s) => sum + s.totalEdits, 0) / recentSessions.length;
        const olderAvgEdits = olderSessions.reduce((sum, s) => sum + s.totalEdits, 0) / olderSessions.length;

        let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
        if (recentAvgEdits < olderAvgEdits * 0.9) improvementTrend = 'improving';
        else if (recentAvgEdits > olderAvgEdits * 1.1) improvementTrend = 'declining';

        return {
            userId,
            clinicalContext,
            timeRange,
            totalSessions,
            averageEditCount,
            averageEditTime,
            improvementTrend,
            topEditPatterns: [], // Would be calculated from session patterns
            recommendedOptimizations: [], // Would be generated based on patterns
            performanceVsBaseline: {
                editCountImprovement: 0,
                timeImprovement: 0,
                satisfactionImprovement: 0
            }
        };
    }
}

// Export singleton instance
export const editTrackingService = new EditTrackingService();