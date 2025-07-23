// src/lib/ai-providers/enhanced-provider-manager.ts - AI providers enhanced with learning

import { NoteGenerationRequest, NoteGenerationResponse, AIProvider } from './types';
import { GeminiClient } from './gemini-client';
import { ClaudeClient } from './claude-client';
import PromptOptimizer from '../learning/prompt-optimizer';
import { getUserPromptProfile, createPromptExperiment, updateExperimentResults } from '../firebase/feedback';
import { UserPromptProfile, PromptExperiment } from '../firebase/schema';

export class EnhancedProviderManager {
    private geminiClient: GeminiClient;
    private claudeClient: ClaudeClient;
    private promptOptimizer: PromptOptimizer | null = null;

    constructor() {
        this.geminiClient = new GeminiClient();
        this.claudeClient = new ClaudeClient();
    }

    private initializeOptimizer(userId: string) {
        if (!this.promptOptimizer || this.promptOptimizer.userId !== userId) {
            this.promptOptimizer = new PromptOptimizer(userId);
        }
    }

    // ====== ENHANCED NOTE GENERATION ======

    async generateNoteWithLearning(
        request: NoteGenerationRequest,
        userId: string,
        options: GenerationOptions = {}
    ): Promise<EnhancedNoteResponse> {
        this.initializeOptimizer(userId);

        const startTime = Date.now();

        try {
            // Get user's prompt profile and any active experiments
            const [userProfile, activeExperiment] = await Promise.all([
                getUserPromptProfile(userId),
                this.getActiveExperiment(userId),
            ]);

            // Determine which prompt to use
            const promptStrategy = await this.selectPromptStrategy(request, userProfile, activeExperiment, options);

            // Generate note with selected strategy
            const response = await this.executeGeneration(request, promptStrategy);

            // Track experiment results if applicable
            if (activeExperiment && promptStrategy.experimentVariant) {
                await this.trackExperimentResult(activeExperiment.id, promptStrategy.experimentVariant, response, Date.now() - startTime);
            }

            // Return enhanced response with metadata
            return {
                ...response,
                metadata: {
                    promptStrategy: promptStrategy.type,
                    personalizedPromptUsed: promptStrategy.type === 'personalized',
                    experimentVariant: promptStrategy.experimentVariant,
                    generationTime: Date.now() - startTime,
                    confidenceScore: promptStrategy.confidenceScore,
                    baselineComparison: promptStrategy.baselineComparison,
                },
            };

        } catch (error) {
            console.error('Enhanced generation failed:', error);
            // Fallback to standard generation
            return this.executeStandardGeneration(request);
        }
    }

    // ====== PROMPT STRATEGY SELECTION ======

    private async selectPromptStrategy(
        request: NoteGenerationRequest,
        userProfile: UserPromptProfile | null,
        activeExperiment: PromptExperiment | null,
        options: GenerationOptions
    ): Promise<PromptStrategy> {

        // Force specific strategy if requested
        if (options.forcePersonalized && userProfile) {
            return await this.createPersonalizedStrategy(request, userProfile);
        }

        if (options.forceBaseline) {
            return this.createBaselineStrategy(request);
        }

        // Use experimental variant if active
        if (activeExperiment && this.shouldUseExperiment(activeExperiment)) {
            return this.createExperimentalStrategy(request, activeExperiment);
        }

        // Use personalized prompt if available and effective
        if (userProfile && this.shouldUsePersonalizedPrompt(userProfile)) {
            return await this.createPersonalizedStrategy(request, userProfile);
        }

        // Fallback to baseline
        return this.createBaselineStrategy(request);
    }

    private async createPersonalizedStrategy(
        request: NoteGenerationRequest,
        userProfile: UserPromptProfile
    ): Promise<PromptStrategy> {

        const clinicalContext = this.extractClinicalContext(request);
        const personalizedPrompt = await this.promptOptimizer!.generatePersonalizedPrompt(clinicalContext);

        return {
            type: 'personalized',
            prompt: personalizedPrompt.prompt,
            confidenceScore: personalizedPrompt.confidenceScore,
            baselineComparison: personalizedPrompt.baselineComparison,
            metadata: {
                personalizations: personalizedPrompt.personalizations,
                basedOnFeedbackCount: personalizedPrompt.metadata.basedOnFeedbackCount,
            },
        };
    }

    private createBaselineStrategy(request: NoteGenerationRequest): PromptStrategy {
        return {
            type: 'baseline',
            prompt: this.getBaselinePrompt(request),
            confidenceScore: 1.0,
            baselineComparison: 0,
        };
    }

    private createExperimentalStrategy(
        request: NoteGenerationRequest,
        experiment: PromptExperiment
    ): PromptStrategy {

        // Select next variant to test
        const variantIndex = this.selectExperimentVariant(experiment);
        const variant = experiment.variantResults[variantIndex];

        return {
            type: 'experimental',
            prompt: variant.prompt,
            confidenceScore: 0.5, // Lower confidence during testing
            baselineComparison: 0, // Unknown until experiment completes
            experimentVariant: variant.variantId,
        };
    }

    // ====== GENERATION EXECUTION ======

    private async executeGeneration(
        request: NoteGenerationRequest,
        strategy: PromptStrategy
    ): Promise<NoteGenerationResponse> {

        // Create enhanced request with optimized prompt
        const enhancedRequest: NoteGenerationRequest = {
            ...request,
            systemPrompt: strategy.prompt,
        };

        // Use preferred provider or fallback
        const preferredProvider = this.getPreferredProvider(request.userId);

        try {
            if (preferredProvider === 'gemini') {
                return await this.geminiClient.generateNote(enhancedRequest);
            } else {
                return await this.claudeClient.generateNote(enhancedRequest);
            }
        } catch (error) {
            console.error(`${preferredProvider} generation failed, trying fallback:`, error);

            // Try fallback provider
            const fallbackProvider = preferredProvider === 'gemini' ? 'claude' : 'gemini';

            if (fallbackProvider === 'gemini') {
                return await this.geminiClient.generateNote(enhancedRequest);
            } else {
                return await this.claudeClient.generateNote(enhancedRequest);
            }
        }
    }

    private async executeStandardGeneration(request: NoteGenerationRequest): Promise<EnhancedNoteResponse> {
        const startTime = Date.now();

        try {
            const response = await (this.getPreferredProvider(request.userId) === 'gemini'
                ? this.geminiClient.generateNote(request)
                : this.claudeClient.generateNote(request));

            return {
                ...response,
                metadata: {
                    promptStrategy: 'baseline',
                    personalizedPromptUsed: false,
                    generationTime: Date.now() - startTime,
                    confidenceScore: 1.0,
                },
            };
        } catch (error) {
            throw new Error(`Standard generation failed: ${error}`);
        }
    }

    // ====== EXPERIMENT MANAGEMENT ======

    async startPromptExperiment(userId: string, context: ClinicalContext): Promise<string> {
        this.initializeOptimizer(userId);

        const basePrompt = this.getBaselinePromptForContext(context);
        return await this.promptOptimizer!.createPromptExperiment(basePrompt, context);
    }

    private async getActiveExperiment(userId: string): Promise<PromptExperiment | null> {
        try {
            // This would query for active experiments
            // For now, return null to use standard prompts
            return null;
        } catch (error) {
            console.error('Error fetching active experiment:', error);
            return null;
        }
    }

    private shouldUseExperiment(experiment: PromptExperiment): boolean {
        // Use experiment if it's active and hasn't reached target
        if (experiment.status !== 'active') return false;

        const totalNotes = experiment.variantResults.reduce((sum, result) => sum + result.noteCount, 0);
        return totalNotes < experiment.targetNoteCount;
    }

    private selectExperimentVariant(experiment: PromptExperiment): number {
        // Round-robin selection for balanced testing
        const totalNotes = experiment.variantResults.reduce((sum, result) => sum + result.noteCount, 0);
        return totalNotes % experiment.variantResults.length;
    }

    private async trackExperimentResult(
        experimentId: string,
        variantId: string,
        response: NoteGenerationResponse,
        processingTime: number
    ): Promise<void> {
        try {
            // This will be updated when feedback is provided
            // For now, just track that a note was generated with this variant
            await updateExperimentResults(experimentId, variantId, 3, processingTime); // Default rating of 3
        } catch (error) {
            console.error('Error tracking experiment result:', error);
        }
    }

    // ====== DECISION LOGIC ======

    private shouldUsePersonalizedPrompt(userProfile: UserPromptProfile): boolean {
        // Use personalized prompts if they're performing well
        const performance = userProfile.personalizedPromptPerformance;

        if (!performance || performance.totalNotes < 5) {
            return false; // Not enough data
        }

        // Use if showing improvement over baseline
        return performance.improvementOverBaseline > 5; // 5% improvement threshold
    }

    private getPreferredProvider(userId: string): AIProvider {
        // This would check user preferences and performance data
        // For now, return default
        return process.env.NEXT_PUBLIC_AI_PROVIDER_PRIMARY as AIProvider || 'gemini';
    }

    private extractClinicalContext(request: NoteGenerationRequest): ClinicalContext {
        return {
            templateType: request.templateType || 'general',
            specialty: request.specialty,
            encounterType: request.encounterType,
            patientContext: request.patientHistory,
        };
    }

    private getBaselinePrompt(request: NoteGenerationRequest): string {
        // Return the standard system prompt based on request type
        return this.getBaselinePromptForContext(this.extractClinicalContext(request));
    }

    private getBaselinePromptForContext(context: ClinicalContext): string {
        // Base prompt templates for different contexts
        const basePrompts = {
            soap: `Generate a professional SOAP note based on the provided clinical information. 
             Ensure proper medical terminology, clear organization, and Epic-compatible formatting.
             Preserve all SmartPhrases (@PHRASES@) and SmartLists ({Lists:123}) exactly as provided.`,

            progress: `Create a detailed progress note documenting the patient's current status, 
                treatment response, and care plan. Use clinical language appropriate for 
                medical documentation.`,

            general: `Generate a comprehensive clinical note based on the provided information. 
               Use professional medical language, proper structure, and maintain Epic formatting.
               Include relevant clinical details while ensuring accuracy and clarity.`,
        };

        return basePrompts[context.templateType as keyof typeof basePrompts] || basePrompts.general;
    }

    // ====== ANALYTICS & INSIGHTS ======

    async getPersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
        this.initializeOptimizer(userId);

        try {
            const analysis = await this.promptOptimizer!.analyzeFeedbackPatterns();
            const userProfile = await getUserPromptProfile(userId);

            return {
                isPersonalizationActive: !!userProfile && userProfile.personalizedPromptPerformance.totalNotes > 0,
                confidenceScore: analysis.confidenceScore,
                improvementOverBaseline: userProfile?.personalizedPromptPerformance.improvementOverBaseline || 0,
                totalFeedbackAnalyzed: analysis.totalFeedbackAnalyzed,
                keyOptimizations: analysis.issuePatterns.slice(0, 3).map(issue => ({
                    area: issue.issue.replace(/_/g, ' '),
                    improvement: issue.severity,
                    frequency: issue.percentage,
                })),
                recommendedActions: this.generateRecommendedActions(analysis),
            };
        } catch (error) {
            console.error('Error getting personalization insights:', error);
            return this.getDefaultInsights();
        }
    }

    private generateRecommendedActions(analysis: FeedbackAnalysis): string[] {
        const actions: string[] = [];

        if (analysis.totalFeedbackAnalyzed < 10) {
            actions.push('Provide feedback on more notes to improve AI personalization');
        }

        if (analysis.confidenceScore < 0.6) {
            actions.push('Continue providing consistent feedback to build confidence');
        }

        if (analysis.issuePatterns.length > 0) {
            const topIssue = analysis.issuePatterns[0];
            actions.push(`Focus on addressing ${topIssue.issue.replace(/_/g, ' ')} in note generation`);
        }

        return actions;
    }

    private getDefaultInsights(): PersonalizationInsights {
        return {
            isPersonalizationActive: false,
            confidenceScore: 0,
            improvementOverBaseline: 0,
            totalFeedbackAnalyzed: 0,
            keyOptimizations: [],
            recommendedActions: ['Start providing feedback on generated notes to enable AI personalization'],
        };
    }
}

// ====== TYPE DEFINITIONS ======

interface GenerationOptions {
    forcePersonalized?: boolean;
    forceBaseline?: boolean;
    experimentId?: string;
}

interface PromptStrategy {
    type: 'baseline' | 'personalized' | 'experimental';
    prompt: string;
    confidenceScore: number;
    baselineComparison: number;
    experimentVariant?: string;
    metadata?: any;
}

interface EnhancedNoteResponse extends NoteGenerationResponse {
    metadata: {
        promptStrategy: string;
        personalizedPromptUsed: boolean;
        experimentVariant?: string;
        generationTime: number;
        confidenceScore: number;
        baselineComparison?: number;
    };
}

interface ClinicalContext {
    templateType: string;
    specialty?: string;
    encounterType?: string;
    patientContext?: string;
}

interface FeedbackAnalysis {
    totalFeedbackAnalyzed: number;
    confidenceScore: number;
    issuePatterns: Array<{
        issue: string;
        severity: number;
        percentage: number;
    }>;
    ratingTrends: any;
    providerAnalysis: any;
    contentAnalysis: any;
    temporalPatterns: any;
}

interface PersonalizationInsights {
    isPersonalizationActive: boolean;
    confidenceScore: number;
    improvementOverBaseline: number;
    totalFeedbackAnalyzed: number;
    keyOptimizations: Array<{
        area: string;
        improvement: number;
        frequency: number;
    }>;
    recommendedActions: string[];
}

// Export the enhanced provider manager
export default EnhancedProviderManager;