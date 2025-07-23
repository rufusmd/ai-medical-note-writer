// src/lib/firebase/editTracking.ts - Firebase Edit Tracking Service

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
    onSnapshot,
    QueryConstraint,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    EditDelta,
    NoteEditSession,
    EditPattern,
    InferredFeedback,
    EditAnalysisResult,
    UserPromptProfile,
    PromptEvolution,
    ClinicalContextForTracking,
    LearningInsight,
    FIREBASE_COLLECTIONS
} from '@/types/editTracking';

export class EditTrackingService {

    // ==================== EDIT SESSION MANAGEMENT ====================

    /**
     * Start a new edit session when user enters edit mode
     */
    async createEditSession(
        userId: string,
        patientId: string,
        noteId: string,
        originalContent: string,
        clinicalContext: ClinicalContextForTracking
    ): Promise<string> {
        try {
            const session: Omit<NoteEditSession, 'id'> = {
                userId,
                patientId,
                noteId,
                startTime: serverTimestamp() as Timestamp,
                clinicalContext,
                originalContent,
                finalContent: originalContent,
                wordCountChange: 0,
                editDeltas: [],
                totalEdits: 0,
                majorSectionChanges: [],
                pauseDurations: [],
                averageTypingSpeed: 0,
                backspaceFrequency: 0,
                isAnalyzed: false,
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp
            };

            const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.EDIT_SESSIONS), session);

            console.log('✅ Edit session created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error creating edit session:', error);
            throw error;
        }
    }

    /**
     * Add an edit delta to track individual changes
     */
    async addEditDelta(sessionId: string, delta: Omit<EditDelta, 'id' | 'sessionId'>): Promise<void> {
        try {
            const editDelta: Omit<EditDelta, 'id'> = {
                sessionId,
                ...delta
            };

            // Add the delta
            await addDoc(collection(db, FIREBASE_COLLECTIONS.EDIT_DELTAS), editDelta);

            // Update session statistics in transaction
            await runTransaction(db, async (transaction) => {
                const sessionRef = doc(db, FIREBASE_COLLECTIONS.EDIT_SESSIONS, sessionId);
                const sessionDoc = await transaction.get(sessionRef);

                if (!sessionDoc.exists()) {
                    throw new Error('Edit session not found');
                }

                const sessionData = sessionDoc.data() as NoteEditSession;

                // Update session with new delta
                transaction.update(sessionRef, {
                    totalEdits: (sessionData.totalEdits || 0) + 1,
                    updatedAt: serverTimestamp()
                });
            });

        } catch (error) {
            console.error('❌ Error adding edit delta:', error);
            throw error;
        }
    }

    /**
     * Complete an edit session and trigger analysis
     */
    async completeEditSession(
        sessionId: string,
        finalContent: string,
        behaviorMetrics: {
            pauseDurations: number[];
            averageTypingSpeed: number;
            backspaceFrequency: number;
        }
    ): Promise<EditAnalysisResult | null> {
        try {
            const sessionRef = doc(db, FIREBASE_COLLECTIONS.EDIT_SESSIONS, sessionId);
            const sessionDoc = await getDoc(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('Edit session not found');
            }

            const sessionData = sessionDoc.data() as NoteEditSession;

            // Calculate metrics
            const wordCountChange = this.calculateWordCountChange(sessionData.originalContent, finalContent);
            const majorSectionChanges = this.detectMajorSectionChanges(sessionData.originalContent, finalContent);

            // Update session completion
            await updateDoc(sessionRef, {
                endTime: serverTimestamp(),
                finalContent,
                wordCountChange,
                majorSectionChanges,
                pauseDurations: behaviorMetrics.pauseDurations,
                averageTypingSpeed: behaviorMetrics.averageTypingSpeed,
                backspaceFrequency: behaviorMetrics.backspaceFrequency,
                updatedAt: serverTimestamp()
            });

            // Trigger analysis
            const analysisResult = await this.analyzeEditSession(sessionId);

            console.log('✅ Edit session completed:', sessionId);
            return analysisResult;

        } catch (error) {
            console.error('❌ Error completing edit session:', error);
            throw error;
        }
    }

    // ==================== EDIT PATTERN ANALYSIS ====================

    /**
     * Analyze edit patterns from a completed session
     */
    async analyzeEditSession(sessionId: string): Promise<EditAnalysisResult | null> {
        try {
            // Get session data and all deltas
            const sessionDoc = await getDoc(doc(db, FIREBASE_COLLECTIONS.EDIT_SESSIONS, sessionId));
            if (!sessionDoc.exists()) return null;

            const session = { id: sessionDoc.id, ...sessionDoc.data() } as NoteEditSession;

            // Get all edit deltas for this session
            const deltasQuery = query(
                collection(db, FIREBASE_COLLECTIONS.EDIT_DELTAS),
                where('sessionId', '==', sessionId),
                orderBy('timestamp', 'asc')
            );
            const deltasSnapshot = await getDocs(deltasQuery);
            const deltas = deltasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EditDelta));

            // Perform analysis
            const analysisResult = await this.performEditAnalysis(session, deltas);

            // Store analysis result
            await addDoc(collection(db, FIREBASE_COLLECTIONS.EDIT_ANALYSIS), analysisResult);

            // Update session as analyzed
            await updateDoc(doc(db, FIREBASE_COLLECTIONS.EDIT_SESSIONS, sessionId), {
                analysisResults: analysisResult,
                isAnalyzed: true,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Edit analysis completed for session:', sessionId);
            return analysisResult;

        } catch (error) {
            console.error('❌ Error analyzing edit session:', error);
            throw error;
        }
    }

    /**
     * Core analysis logic - processes edit patterns and generates insights
     */
    private async performEditAnalysis(
        session: NoteEditSession,
        deltas: EditDelta[]
    ): Promise<EditAnalysisResult> {

        // Calculate overall satisfaction based on edit behavior
        const overallSatisfaction = this.inferSatisfactionScore(session, deltas);

        // Detect patterns
        const patterns = await this.detectEditPatterns(session.userId, session, deltas);

        // Generate prompt suggestions
        const promptSuggestions = this.generatePromptSuggestions(session, deltas, patterns);

        // Calculate improvement metrics
        const improvementPotential = this.calculateImprovementPotential(session, deltas);
        const learningPriority = this.determineLearningPriority(overallSatisfaction, improvementPotential);

        const analysisResult: EditAnalysisResult = {
            sessionId: session.id,
            overallSatisfaction,
            confidence: Math.min(0.8, deltas.length / 10), // Higher confidence with more data
            patterns,
            promptSuggestions,
            improvementPotential,
            learningPriority,
            analyzedAt: serverTimestamp() as Timestamp,
            analysisVersion: 'v1.0'
        };

        return analysisResult;
    }

    /**
     * Infer user satisfaction from edit behavior
     */
    private inferSatisfactionScore(session: NoteEditSession, deltas: EditDelta[]): number {
        let score = 7; // Start with neutral-positive score

        // Factor in total edit count (more edits = lower satisfaction)
        const editCount = deltas.length;
        if (editCount > 20) score -= 2;
        else if (editCount > 10) score -= 1;
        else if (editCount < 3) score += 1;

        // Factor in deletion patterns (major deletions suggest dissatisfaction)
        const deletions = deltas.filter(d => d.operation === 'delete');
        const majorDeletions = deletions.filter(d => (d.length || 0) > 50);
        score -= majorDeletions.length * 0.5;

        // Factor in edit session duration (too long suggests problems)
        const estimatedDuration = session.pauseDurations?.reduce((a, b) => a + b, 0) || 0;
        if (estimatedDuration > 300000) score -= 1; // > 5 minutes

        // Factor in backspace frequency (high = frustration)
        if (session.backspaceFrequency > 0.3) score -= 1;

        return Math.max(1, Math.min(10, Math.round(score)));
    }

    /**
     * Detect patterns in edit behavior
     */
    private async detectEditPatterns(
        userId: string,
        session: NoteEditSession,
        deltas: EditDelta[]
    ): Promise<EditPattern[]> {
        const patterns: EditPattern[] = [];

        // Pattern 1: Frequent deletion of specific content types
        const deletions = deltas.filter(d => d.operation === 'delete' && (d.length || 0) > 20);
        if (deletions.length > 3) {
            patterns.push({
                id: `${session.id}_deletion_pattern`,
                userId,
                patternType: 'frequent_deletion',
                description: 'User frequently deletes generated content, suggesting verbosity issues',
                confidence: Math.min(0.9, deletions.length / 5),
                clinicalContexts: [session.clinicalContext],
                sectionTypes: deletions.map(d => d.sectionType || 'unknown'),
                frequencyCount: deletions.length,
                exampleEdits: deletions.slice(0, 3).map(d => d.content || ''),
                suggestedImprovement: 'Generate more concise content, focus on essential clinical information',
                firstDetected: serverTimestamp() as Timestamp,
                lastSeen: serverTimestamp() as Timestamp,
                isActive: true
            });
        }

        // Pattern 2: Consistent additions in specific sections
        const additions = deltas.filter(d => d.operation === 'insert' && (d.content?.length || 0) > 10);
        const sectionAdditions = this.groupBySection(additions);

        for (const [section, sectionDeltas] of Object.entries(sectionAdditions)) {
            if (sectionDeltas.length > 2) {
                patterns.push({
                    id: `${session.id}_addition_pattern_${section}`,
                    userId,
                    patternType: 'consistent_addition',
                    description: `User consistently adds content to ${section} section`,
                    confidence: Math.min(0.8, sectionDeltas.length / 3),
                    clinicalContexts: [session.clinicalContext],
                    sectionTypes: [section],
                    frequencyCount: sectionDeltas.length,
                    exampleEdits: sectionDeltas.slice(0, 3).map(d => d.content || ''),
                    suggestedImprovement: `Include more detailed ${section} information in initial generation`,
                    firstDetected: serverTimestamp() as Timestamp,
                    lastSeen: serverTimestamp() as Timestamp,
                    isActive: true
                });
            }
        }

        return patterns;
    }

    /**
     * Generate prompt optimization suggestions
     */
    private generatePromptSuggestions(
        session: NoteEditSession,
        deltas: EditDelta[],
        patterns: EditPattern[]
    ) {
        const suggestions = {
            systemPromptChanges: [] as string[],
            userPromptAdditions: [] as string[],
            clinicalFocusAreas: [] as string[]
        };

        // Analyze patterns for suggestions
        patterns.forEach(pattern => {
            switch (pattern.patternType) {
                case 'frequent_deletion':
                    suggestions.systemPromptChanges.push('Generate more concise clinical documentation');
                    suggestions.systemPromptChanges.push('Focus on essential information only');
                    break;

                case 'consistent_addition':
                    if (pattern.sectionTypes.includes('assessment')) {
                        suggestions.userPromptAdditions.push('Include detailed clinical assessment');
                        suggestions.clinicalFocusAreas.push('assessment');
                    }
                    if (pattern.sectionTypes.includes('plan')) {
                        suggestions.userPromptAdditions.push('Provide comprehensive treatment planning');
                        suggestions.clinicalFocusAreas.push('plan');
                    }
                    break;
            }
        });

        // Analyze deltas for context-specific improvements
        const epicSyntaxEdits = deltas.filter(d =>
            d.content?.includes('@') || d.previousContent?.includes('@')
        );
        if (epicSyntaxEdits.length > 0 && session.clinicalContext.emr === 'epic') {
            suggestions.systemPromptChanges.push('Ensure proper Epic SmartPhrase formatting');
        }

        return suggestions;
    }

    // ==================== LEARNING INSIGHTS ====================

    /**
     * Get learning insights for a user
     */
    async getLearningInsights(userId: string, limit: number = 5): Promise<LearningInsight[]> {
        try {
            // Get recent patterns for this user
            const patternsQuery = query(
                collection(db, FIREBASE_COLLECTIONS.EDIT_PATTERNS),
                where('userId', '==', userId),
                where('isActive', '==', true),
                orderBy('lastSeen', 'desc'),
                limit(limit)
            );

            const patternsSnapshot = await getDocs(patternsQuery);
            const patterns = patternsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EditPattern));

            const insights: LearningInsight[] = patterns.map(pattern => ({
                type: 'pattern_detected',
                title: this.getPatternTitle(pattern.patternType),
                description: pattern.description,
                confidence: pattern.confidence,
                actionable: true,
                action: {
                    label: 'Apply Optimization',
                    type: 'apply_optimization'
                }
            }));

            return insights;

        } catch (error) {
            console.error('❌ Error getting learning insights:', error);
            return [];
        }
    }

    // ==================== UTILITY METHODS ====================

    private calculateWordCountChange(originalContent: string, finalContent: string): number {
        const originalWords = originalContent.trim().split(/\s+/).length;
        const finalWords = finalContent.trim().split(/\s+/).length;
        return finalWords - originalWords;
    }

    private detectMajorSectionChanges(originalContent: string, finalContent: string): string[] {
        const sections = ['HPI', 'Assessment', 'Plan', 'Exam'];
        const changes: string[] = [];

        sections.forEach(section => {
            const originalSection = this.extractSection(originalContent, section);
            const finalSection = this.extractSection(finalContent, section);

            if (originalSection !== finalSection) {
                const changeRatio = this.calculateSimilarity(originalSection, finalSection);
                if (changeRatio < 0.7) { // More than 30% change
                    changes.push(section);
                }
            }
        });

        return changes;
    }

    private extractSection(content: string, sectionName: string): string {
        const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=${sections.join('|')}|$)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private groupBySection(deltas: EditDelta[]): Record<string, EditDelta[]> {
        return deltas.reduce((acc, delta) => {
            const section = delta.sectionType || 'unknown';
            if (!acc[section]) acc[section] = [];
            acc[section].push(delta);
            return acc;
        }, {} as Record<string, EditDelta[]>);
    }

    private calculateImprovementPotential(session: NoteEditSession, deltas: EditDelta[]): number {
        // Base improvement potential on edit complexity and patterns
        const editComplexity = deltas.length / 100; // Normalize to 0-1
        const majorChanges = session.majorSectionChanges?.length || 0;
        const wordChanges = Math.abs(session.wordCountChange || 0) / 1000; // Normalize

        return Math.min(1, (editComplexity + majorChanges * 0.2 + wordChanges) / 3);
    }

    private determineLearningPriority(satisfaction: number, improvement: number): 'high' | 'medium' | 'low' {
        if (satisfaction <= 4 || improvement > 0.7) return 'high';
        if (satisfaction <= 6 || improvement > 0.4) return 'medium';
        return 'low';
    }

    private getPatternTitle(patternType: EditPattern['patternType']): string {
        const titles = {
            'frequent_deletion': 'Frequent Content Deletion Detected',
            'consistent_addition': 'Consistent Content Addition Pattern',
            'section_reorganization': 'Section Reorganization Pattern',
            'terminology_preference': 'Terminology Preference Detected',
            'style_adjustment': 'Style Adjustment Pattern'
        };
        return titles[patternType] || 'Unknown Pattern Detected';
    }
}

// Export singleton instance
export const editTrackingService = new EditTrackingService();