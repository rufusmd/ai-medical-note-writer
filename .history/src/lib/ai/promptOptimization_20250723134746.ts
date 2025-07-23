// src/lib/ai/promptOptimization.ts - AI Prompt Optimization Based on Edit Patterns

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    EditPattern,
    EditAnalysisResult,
    UserPromptProfile,
    PromptEvolution,
    ClinicalContextForTracking,
    FIREBASE_COLLECTIONS
} from '@/types/editTracking';

export class PromptOptimizationService {

    /**
     * Generate an optimized prompt based on user's edit patterns
     */
    async generateOptimizedPrompt(
        userId: string,
        clinicalContext: ClinicalContextForTracking,
        basePrompt: { systemPrompt: string; userPrompt: string }
    ): Promise<{ systemPrompt: string; userPrompt: string; version: string } | null> {

        try {
            // Get user's prompt profile
            const userProfile = await this.getUserPromptProfile(userId);

            // Get relevant edit patterns for this clinical context
            const patterns = await this.getRelevantPatterns(userId, clinicalContext);

            if (patterns.length === 0 && !userProfile) {
                return null; // No optimization data available
            }

            // Generate optimized prompts
            const optimizedPrompts = this.applyPatternBasedOptimizations(
                basePrompt,
                patterns,
                userProfile,
                clinicalContext
            );

            // Create version identifier
            const version = `optimized_v${Date.now()}`;

            return {
                ...optimizedPrompts,
                version
            };

        } catch (error) {
            console.error('Error generating optimized prompt:', error);
            return null;
        }
    }

    /**
     * Create and store A/B test prompt variants
     */
    async createPromptVariants(
        userId: string,
        clinicalContext: ClinicalContextForTracking,
        basePrompt: { systemPrompt: string; userPrompt: string }
    ): Promise<PromptEvolution[]> {

        try {
            const patterns = await this.getRelevantPatterns(userId, clinicalContext);

            // Create control variant (base prompt)
            const controlVariant: Omit<PromptEvolution, 'id'> = {
                userId,
                version: 'control_v1.0',
                clinicalContext,
                systemPrompt: basePrompt.systemPrompt,
                userPromptTemplate: basePrompt.userPrompt,
                improvementMetrics: {
                    userSatisfactionScore: 7, // Default baseline
                    editReductionPercentage: 0,
                    approvalTimeReduction: 0,
                    sessionsCount: 0
                },
                testGroup: 'control',
                isActive: true,
                learningSource: [],
                createdAt: serverTimestamp() as Timestamp,
                updatedAt: serverTimestamp() as Timestamp
            };

            // Create optimized variants
            const variantA = this.createOptimizedVariant(
                userId,
                clinicalContext,
                basePrompt,
                patterns,
                'variant_a',
                'conciseness_focused'
            );

            const variantB = this.createOptimizedVariant(
                userId,
                clinicalContext,
                basePrompt,
                patterns,
                'variant_b',
                'detail_focused'
            );

            // Store all variants
            const variants = [controlVariant, variantA, variantB];
            const storedVariants: PromptEvolution[] = [];

            for (const variant of variants) {
                const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS), variant);
                storedVariants.push({ id: docRef.id, ...variant });
            }

            console.log('✅ Created prompt variants for A/B testing:', storedVariants.length);
            return storedVariants;

        } catch (error) {
            console.error('❌ Error creating prompt variants:', error);
            throw error;
        }
    }

    /**
     * Update prompt performance metrics based on edit session results
     */
    async updatePromptPerformance(
        promptId: string,
        sessionResults: {
            userSatisfactionScore: number;
            editCount: number;
            approvalTime: number; // seconds
            originalEditCount?: number; // for comparison
        }
    ): Promise<void> {

        try {
            const promptRef = doc(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS, promptId);

            // Calculate improvement metrics
            const editReduction = sessionResults.originalEditCount
                ? Math.max(0, ((sessionResults.originalEditCount - sessionResults.editCount) / sessionResults.originalEditCount) * 100)
                : 0;

            // Update with new session data (weighted average)
            const updateData = {
                'improvementMetrics.userSatisfactionScore': sessionResults.userSatisfactionScore,
                'improvementMetrics.editReductionPercentage': editReduction,
                'improvementMetrics.approvalTimeReduction': sessionResults.approvalTime,
                'improvementMetrics.sessionsCount': 1, // This should be incremented properly
                updatedAt: serverTimestamp()
            };

            await updateDoc(promptRef, updateData);

            console.log('✅ Updated prompt performance metrics for:', promptId);

        } catch (error) {
            console.error('❌ Error updating prompt performance:', error);
            throw error;
        }
    }

    /**
     * Apply learning from successful prompt optimizations
     */
    async applyLearnings(
        userId: string,
        successfulPromptId: string
    ): Promise<UserPromptProfile> {

        try {
            // Get the successful prompt
            const promptDoc = await getDocs(
                query(
                    collection(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS),
                    where('__name__', '==', successfulPromptId)
                )
            );

            if (promptDoc.empty) {
                throw new Error('Successful prompt not found');
            }

            const successfulPrompt = { id: promptDoc.docs[0].id, ...promptDoc.docs[0].data() } as PromptEvolution;

            // Get or create user prompt profile
            let userProfile = await this.getUserPromptProfile(userId);

            if (!userProfile) {
                userProfile = await this.createUserPromptProfile(userId);
            }

            // Extract learned preferences from successful prompt
            const learnedPreferences = this.extractPreferences(successfulPrompt);

            // Update user profile with new optimizations
            const updatedOptimizations = [
                ...userProfile.contextOptimizations.filter(opt =>
                    !this.isSameClinicalContext(opt.clinicalContext, successfulPrompt.clinicalContext)
                ),
                {
                    clinicalContext: successfulPrompt.clinicalContext,
                    optimizedPrompt: successfulPrompt.systemPrompt,
                    performanceMetrics: successfulPrompt.improvementMetrics,
                    lastUpdated: serverTimestamp() as Timestamp
                }
            ];

            // Update user profile
            const profileRef = doc(db, FIREBASE_COLLECTIONS.USER_PROMPT_PROFILES, userProfile.userId);
            await updateDoc(profileRef, {
                preferredStyle: learnedPreferences.style,
                preferredTerminology: learnedPreferences.terminology,
                contextOptimizations: updatedOptimizations,
                totalLearningEvents: userProfile.totalLearningEvents + 1,
                learningVelocity: this.calculateLearningVelocity(userProfile),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Applied learnings to user profile:', userId);
            return { ...userProfile, ...learnedPreferences, contextOptimizations: updatedOptimizations };

        } catch (error) {
            console.error('❌ Error applying learnings:', error);
            throw error;
        }
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Get user's prompt profile
     */
    private async getUserPromptProfile(userId: string): Promise<UserPromptProfile | null> {
        try {
            const profileQuery = query(
                collection(db, FIREBASE_COLLECTIONS.USER_PROMPT_PROFILES),
                where('userId', '==', userId),
                limit(1)
            );

            const querySnapshot = await getDocs(profileQuery);

            if (querySnapshot.empty) {
                return null;
            }

            return { userId, ...querySnapshot.docs[0].data() } as UserPromptProfile;

        } catch (error) {
            console.error('Error getting user prompt profile:', error);
            return null;
        }
    }

    /**
     * Create new user prompt profile
     */
    private async createUserPromptProfile(userId: string): Promise<UserPromptProfile> {
        const profile: Omit<UserPromptProfile, 'userId'> = {
            preferredStyle: 'moderate',
            preferredTerminology: 'technical',
            structurePreferences: [],
            contextOptimizations: [],
            totalSessions: 0,
            totalLearningEvents: 0,
            learningVelocity: 0,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp
        };

        const docRef = await addDoc(collection(db, FIREBASE_COLLECTIONS.USER_PROMPT_PROFILES), {
            userId,
            ...profile
        });

        return { userId, ...profile };
    }

    /**
     * Get relevant edit patterns for clinical context
     */
    private async getRelevantPatterns(
        userId: string,
        clinicalContext: ClinicalContextForTracking
    ): Promise<EditPattern[]> {

        try {
            const patternsQuery = query(
                collection(db, FIREBASE_COLLECTIONS.EDIT_PATTERNS),
                where('userId', '==', userId),
                where('isActive', '==', true),
                orderBy('confidence', 'desc'),
                limit(10)
            );

            const querySnapshot = await getDocs(patternsQuery);
            const patterns = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EditPattern));

            // Filter patterns relevant to this clinical context
            return patterns.filter(pattern =>
                pattern.clinicalContexts.some(ctx =>
                    this.isSameClinicalContext(ctx, clinicalContext)
                )
            );

        } catch (error) {
            console.error('Error getting relevant patterns:', error);
            return [];
        }
    }

    /**
     * Apply pattern-based optimizations to prompts
     */
    private applyPatternBasedOptimizations(
        basePrompt: { systemPrompt: string; userPrompt: string },
        patterns: EditPattern[],
        userProfile: UserPromptProfile | null,
        clinicalContext: ClinicalContextForTracking
    ): { systemPrompt: string; userPrompt: string } {

        let systemPrompt = basePrompt.systemPrompt;
        let userPrompt = basePrompt.userPrompt;

        // Apply pattern-based optimizations
        patterns.forEach(pattern => {
            switch (pattern.patternType) {
                case 'frequent_deletion':
                    systemPrompt = this.addConcisenessFocus(systemPrompt);
                    break;

                case 'consistent_addition':
                    if (pattern.sectionTypes.includes('assessment')) {
                        userPrompt = this.enhanceAssessmentInstructions(userPrompt);
                    }
                    if (pattern.sectionTypes.includes('plan')) {
                        userPrompt = this.enhancePlanInstructions(userPrompt);
                    }
                    break;

                case 'terminology_preference':
                    systemPrompt = this.adjustTerminologyLevel(systemPrompt, userProfile?.preferredTerminology || 'technical');
                    break;
            }
        });

        // Apply user profile preferences
        if (userProfile) {
            systemPrompt = this.applyStylePreferences(systemPrompt, userProfile.preferredStyle);

            // Apply context-specific optimizations
            const contextOptimization = userProfile.contextOptimizations.find(opt =>
                this.isSameClinicalContext(opt.clinicalContext, clinicalContext)
            );

            if (contextOptimization) {
                // Use proven optimizations for this context
                systemPrompt = contextOptimization.optimizedPrompt;
            }
        }

        return { systemPrompt, userPrompt };
    }

    /**
     * Create optimized variant for A/B testing
     */
    private createOptimizedVariant(
        userId: string,
        clinicalContext: ClinicalContextForTracking,
        basePrompt: { systemPrompt: string; userPrompt: string },
        patterns: EditPattern[],
        testGroup: 'variant_a' | 'variant_b',
        optimizationType: 'conciseness_focused' | 'detail_focused'
    ): Omit<PromptEvolution, 'id'> {

        let optimizedSystemPrompt = basePrompt.systemPrompt;
        let optimizedUserPrompt = basePrompt.userPrompt;

        if (optimizationType === 'conciseness_focused') {
            optimizedSystemPrompt = this.addConcisenessFocus(optimizedSystemPrompt);
            optimizedUserPrompt += '\n\nIMPORTANT: Generate concise, focused clinical documentation. Avoid unnecessary verbosity while maintaining clinical accuracy.';
        } else {
            optimizedSystemPrompt = this.addDetailFocus(optimizedSystemPrompt);
            optimizedUserPrompt += '\n\nIMPORTANT: Generate comprehensive, detailed clinical documentation. Include relevant clinical details and context.';
        }

        return {
            userId,
            version: `${testGroup}_v1.0`,
            clinicalContext,
            systemPrompt: optimizedSystemPrompt,
            userPromptTemplate: optimizedUserPrompt,
            improvementMetrics: {
                userSatisfactionScore: 7,
                editReductionPercentage: 0,
                approvalTimeReduction: 0,
                sessionsCount: 0
            },
            testGroup,
            isActive: true,
            learningSource: patterns.map(p => ({
                sessionId: p.id,
                overallSatisfaction: 7,
                confidence: p.confidence,
                patterns: [p],
                promptSuggestions: {
                    systemPromptChanges: [p.suggestedImprovement],
                    userPromptAdditions: [],
                    clinicalFocusAreas: p.sectionTypes
                },
                improvementPotential: p.confidence,
                learningPriority: 'medium',
                analyzedAt: serverTimestamp() as Timestamp,
                analysisVersion: 'v1.0'
            })),
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp
        };
    }

    // ==================== PROMPT MODIFICATION HELPERS ====================

    private addConcisenessFocus(systemPrompt: string): string {
        if (systemPrompt.includes('concise')) return systemPrompt;

        return systemPrompt + '\n\nFocus on generating concise, essential clinical information. Avoid redundancy and verbose descriptions while maintaining clinical accuracy and completeness.';
    }

    private addDetailFocus(systemPrompt: string): string {
        if (systemPrompt.includes('comprehensive')) return systemPrompt;

        return systemPrompt + '\n\nGenerate comprehensive clinical documentation with appropriate detail and context. Include relevant clinical information that supports assessment and treatment planning.';
    }

    private enhanceAssessmentInstructions(userPrompt: string): string {
        if (userPrompt.includes('detailed assessment')) return userPrompt;

        return userPrompt + '\n\nProvide detailed clinical assessment including diagnostic considerations, differential diagnoses, and clinical reasoning.';
    }

    private enhancePlanInstructions(userPrompt: string): string {
        if (userPrompt.includes('comprehensive plan')) return userPrompt;

        return userPrompt + '\n\nInclude comprehensive treatment planning with specific interventions, follow-up recommendations, and safety considerations.';
    }

    private adjustTerminologyLevel(systemPrompt: string, level: 'technical' | 'accessible' | 'mixed'): string {
        const terminologyInstructions = {
            technical: 'Use precise medical terminology and clinical language appropriate for healthcare professionals.',
            accessible: 'Use clear, accessible language while maintaining clinical accuracy. Explain technical terms when necessary.',
            mixed: 'Balance technical medical terminology with clear explanations for key concepts.'
        };

        return systemPrompt + `\n\nTerminology level: ${terminologyInstructions[level]}`;
    }

    private applyStylePreferences(systemPrompt: string, style: 'concise' | 'detailed' | 'moderate'): string {
        const styleInstructions = {
            concise: 'Generate concise, focused clinical notes with essential information only.',
            detailed: 'Generate comprehensive clinical notes with thorough documentation.',
            moderate: 'Generate balanced clinical notes with appropriate level of detail.'
        };

        return systemPrompt + `\n\nDocumentation style: ${styleInstructions[style]}`;
    }

    // ==================== UTILITY METHODS ====================

    private isSameClinicalContext(ctx1: ClinicalContextForTracking, ctx2: ClinicalContextForTracking): boolean {
        return ctx1.clinic === ctx2.clinic &&
            ctx1.visitType === ctx2.visitType &&
            ctx1.emr === ctx2.emr &&
            ctx1.specialty === ctx2.specialty;
    }

    private extractPreferences(prompt: PromptEvolution): {
        style: 'concise' | 'detailed' | 'moderate';
        terminology: 'technical' | 'accessible' | 'mixed';
    } {
        const systemPrompt = prompt.systemPrompt.toLowerCase();

        let style: 'concise' | 'detailed' | 'moderate' = 'moderate';
        if (systemPrompt.includes('concise') || systemPrompt.includes('focused')) {
            style = 'concise';
        } else if (systemPrompt.includes('comprehensive') || systemPrompt.includes('detailed')) {
            style = 'detailed';
        }

        let terminology: 'technical' | 'accessible' | 'mixed' = 'technical';
        if (systemPrompt.includes('accessible') || systemPrompt.includes('clear')) {
            terminology = 'accessible';
        } else if (systemPrompt.includes('balance') || systemPrompt.includes('mixed')) {
            terminology = 'mixed';
        }

        return { style, terminology };
    }

    private calculateLearningVelocity(userProfile: UserPromptProfile): number {
        // Simple learning velocity calculation
        const sessionsPerEvent = userProfile.totalSessions / Math.max(1, userProfile.totalLearningEvents);
        return Math.min(1, 1 / sessionsPerEvent); // Normalize to 0-1
    }
}

// Export singleton instance
export const promptOptimizationService = new PromptOptimizationService();