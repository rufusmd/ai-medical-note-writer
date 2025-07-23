// src/lib/learning/prompt-optimizer.ts - Core learning engine for prompt optimization

import {
    NoteFeedback,
    UserPromptProfile,
    PromptExperiment,
    PromptOptimization
} from '@/lib/firebase/schema';
import {
    getUserFeedback,
    createOrUpdateUserPromptProfile,
    createPromptExperiment,
    generatePromptOptimization
} from '@/lib/firebase/feedback';

// ====== CORE LEARNING ENGINE ======

export class PromptOptimizer {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    // ====== FEEDBACK ANALYSIS ======

    async analyzeFeedbackPatterns(): Promise<FeedbackAnalysis> {
        const feedback = await getUserFeedback(this.userId, 100);

        if (feedback.length < 3) {
            throw new Error('Insufficient feedback data for analysis (minimum 3 required)');
        }

        // Analyze rating patterns
        const ratingTrends = this.analyzeRatingTrends(feedback);

        // Identify common issues
        const issuePatterns = this.analyzeIssuePatterns(feedback);

        // Analyze temporal patterns
        const temporalPatterns = this.analyzeTemporalPatterns(feedback);

        // Provider performance analysis
        const providerAnalysis = this.analyzeProviderPerformance(feedback);

        // Content analysis
        const contentAnalysis = this.analyzeContentPatterns(feedback);

        return {
            totalFeedbackAnalyzed: feedback.length,
            ratingTrends,
            issuePatterns,
            temporalPatterns,
            providerAnalysis,
            contentAnalysis,
            confidenceScore: this.calculateConfidenceScore(feedback),
            lastAnalyzed: new Date(),
        };
    }

    private analyzeRatingTrends(feedback: NoteFeedback[]): RatingTrendAnalysis {
        const ratings = feedback.map(f => f.rating).reverse(); // chronological order
        const recentRatings = ratings.slice(-10); // last 10 ratings
        const olderRatings = ratings.slice(0, -10);

        const recentAvg = recentRatings.reduce((sum, r) => sum + r, 0) / recentRatings.length;
        const olderAvg = olderRatings.length > 0
            ? olderRatings.reduce((sum, r) => sum + r, 0) / olderRatings.length
            : recentAvg;

        const trend = recentAvg > olderAvg + 0.2 ? 'improving' :
            recentAvg < olderAvg - 0.2 ? 'declining' : 'stable';

        return {
            currentAverage: recentAvg,
            previousAverage: olderAvg,
            trend,
            trendStrength: Math.abs(recentAvg - olderAvg),
            consistencyScore: this.calculateConsistency(recentRatings),
        };
    }

    private analyzeIssuePatterns(feedback: NoteFeedback[]): IssuePattern[] {
        const issueFrequency: Record<string, { count: number; ratings: number[] }> = {};

        feedback.forEach(f => {
            f.qualityIssues.forEach(issue => {
                if (!issueFrequency[issue]) {
                    issueFrequency[issue] = { count: 0, ratings: [] };
                }
                issueFrequency[issue].count++;
                issueFrequency[issue].ratings.push(f.rating);
            });
        });

        return Object.entries(issueFrequency)
            .map(([issue, data]) => ({
                issue,
                frequency: data.count,
                percentage: (data.count / feedback.length) * 100,
                averageRatingWhenPresent: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
                severity: this.calculateIssueSeverity(issue, data.count, data.ratings),
                trend: this.calculateIssueTrend(issue, feedback),
            }))
            .sort((a, b) => b.severity - a.severity);
    }

    private analyzeTemporalPatterns(feedback: NoteFeedback[]): TemporalAnalysis {
        const timeSpent = feedback.map(f => f.timeToReview);
        const avgTimeSpent = timeSpent.reduce((sum, t) => sum + t, 0) / timeSpent.length;

        // Analyze time vs rating correlation
        const timeRatingCorrelation = this.calculateCorrelation(
            timeSpent,
            feedback.map(f => f.rating)
        );

        return {
            averageReviewTime: avgTimeSpent,
            timeRatingCorrelation,
            optimalReviewTimeRange: this.findOptimalTimeRange(feedback),
            timeEfficiencyScore: this.calculateTimeEfficiency(feedback),
        };
    }

    private analyzeProviderPerformance(feedback: NoteFeedback[]): ProviderAnalysis {
        const geminiData = feedback.filter(f => f.aiProvider === 'gemini');
        const claudeData = feedback.filter(f => f.aiProvider === 'claude');

        return {
            gemini: this.calculateProviderMetrics(geminiData),
            claude: this.calculateProviderMetrics(claudeData),
            recommendedProvider: this.getRecommendedProvider(geminiData, claudeData),
        };
    }

    private analyzeContentPatterns(feedback: NoteFeedback[]): ContentAnalysis {
        const templatePerformance: Record<string, { ratings: number[]; count: number }> = {};

        feedback.forEach(f => {
            if (!templatePerformance[f.templateUsed]) {
                templatePerformance[f.templateUsed] = { ratings: [], count: 0 };
            }
            templatePerformance[f.templateUsed].ratings.push(f.rating);
            templatePerformance[f.templateUsed].count++;
        });

        const templateAnalysis = Object.entries(templatePerformance).map(([template, data]) => ({
            template,
            count: data.count,
            averageRating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
            performance: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length >= 4 ? 'excellent' :
                data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length >= 3 ? 'good' : 'needs_improvement',
        }));

        return {
            templatePerformance: templateAnalysis,
            bestPerformingTemplate: templateAnalysis.reduce((best, current) =>
                current.averageRating > best.averageRating ? current : best
            ),
            contentLengthOptimal: this.analyzeContentLength(feedback),
        };
    }

    // ====== PROMPT GENERATION ======

    async generatePersonalizedPrompt(context: ClinicalContext): Promise<PersonalizedPrompt> {
        const analysis = await this.analyzeFeedbackPatterns();
        const userProfile = await this.buildUserProfile(analysis);

        // Base prompt components
        const basePrompt = this.getBasePromptForContext(context);

        // Apply personalizations based on analysis
        const personalizations = this.generatePersonalizations(analysis, userProfile, context);

        // Construct final prompt
        const personalizedPrompt = this.constructPrompt(basePrompt, personalizations);

        return {
            prompt: personalizedPrompt,
            personalizations,
            confidenceScore: analysis.confidenceScore,
            baselineComparison: await this.predictPerformanceImprovement(analysis),
            metadata: {
                generatedAt: new Date(),
                basedOnFeedbackCount: analysis.totalFeedbackAnalyzed,
                primaryOptimizations: personalizations.slice(0, 3).map(p => p.type),
            },
        };
    }

    private generatePersonalizations(
        analysis: FeedbackAnalysis,
        profile: UserPromptProfile,
        context: ClinicalContext
    ): PromptPersonalization[] {
        const personalizations: PromptPersonalization[] = [];

        // Address common issues
        analysis.issuePatterns.forEach(issue => {
            if (issue.severity > 0.7) {
                personalizations.push(this.createIssuePersonalization(issue));
            }
        });

        // Optimize for rating trends
        if (analysis.ratingTrends.trend === 'declining') {
            personalizations.push(this.createTrendPersonalization(analysis.ratingTrends));
        }

        // Template-specific optimizations
        if (analysis.contentAnalysis.templatePerformance.length > 0) {
            personalizations.push(this.createTemplatePersonalization(analysis.contentAnalysis, context));
        }

        // Provider-specific optimizations
        if (analysis.providerAnalysis.recommendedProvider) {
            personalizations.push(this.createProviderPersonalization(analysis.providerAnalysis));
        }

        // User style preferences
        personalizations.push(...this.createStylePersonalizations(profile));

        return personalizations.sort((a, b) => b.impact - a.impact).slice(0, 5); // Top 5 most impactful
    }

    private createIssuePersonalization(issue: IssuePattern): PromptPersonalization {
        const prompts: Record<string, string> = {
            too_long: 'Be concise and focus on essential clinical information. Aim for clarity and brevity.',
            too_brief: 'Provide comprehensive clinical documentation with detailed observations and assessments.',
            missing_details: 'Include all relevant clinical details, patient history, current symptoms, and treatment plans.',
            wrong_tone: 'Use professional, clinical language appropriate for medical documentation.',
            poor_structure: 'Organize content logically with clear sections and proper medical formatting.',
            medical_inaccuracy: 'Ensure medical accuracy and use evidence-based clinical terminology.',
            epic_syntax_errors: 'Maintain proper Epic SmartPhrase formatting and preserve all @ and {} syntax.',
        };

        return {
            type: 'issue_resolution',
            prompt: prompts[issue.issue] || 'Address reported quality issues in documentation.',
            reasoning: `Addresses ${issue.issue} which occurs in ${issue.percentage.toFixed(1)}% of notes`,
            impact: issue.severity,
            confidence: Math.min(issue.frequency / 10, 1), // Higher confidence with more data
        };
    }

    // ====== A/B TESTING ======

    async createPromptExperiment(basePrompt: string, context: ClinicalContext): Promise<string> {
        const variants = await this.generatePromptVariants(basePrompt, context);

        const experiment: Omit<PromptExperiment, 'id' | 'createdAt'> = {
            userId: this.userId,
            basePrompt,
            variantPrompts: variants,
            currentVariantIndex: 0,
            status: 'active',
            targetNoteCount: 20, // Test with 20 notes
            confidenceThreshold: 0.8,
            variantResults: variants.map((prompt, index) => ({
                variantId: `variant_${index}`,
                prompt,
                noteCount: 0,
                averageRating: 0,
                averageProcessingTime: 0,
                feedbackCount: 0,
            })),
        };

        return await createPromptExperiment(experiment);
    }

    private async generatePromptVariants(basePrompt: string, context: ClinicalContext): Promise<string[]> {
        const analysis = await this.analyzeFeedbackPatterns();

        const variants = [basePrompt]; // Include original as control

        // Generate variations based on common issues
        analysis.issuePatterns.slice(0, 3).forEach(issue => {
            const variant = this.createPromptVariant(basePrompt, issue);
            if (variant !== basePrompt) {
                variants.push(variant);
            }
        });

        // Generate style variants
        const styleVariants = this.generateStyleVariants(basePrompt, analysis);
        variants.push(...styleVariants);

        return variants.slice(0, 4); // Limit to 4 variants for manageable testing
    }

    // ====== UTILITY METHODS ======

    private calculateConfidenceScore(feedback: NoteFeedback[]): number {
        const count = feedback.length;
        const consistency = this.calculateConsistency(feedback.map(f => f.rating));
        const recency = this.calculateRecencyScore(feedback);

        // Confidence increases with data quantity, consistency, and recency
        const countScore = Math.min(count / 20, 1); // Max confidence at 20+ feedback
        const confidenceScore = (countScore * 0.5) + (consistency * 0.3) + (recency * 0.2);

        return Math.min(confidenceScore, 0.95); // Cap at 95%
    }

    private calculateConsistency(ratings: number[]): number {
        if (ratings.length < 2) return 0;

        const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
        const stdDev = Math.sqrt(variance);

        // Convert to consistency score (lower std dev = higher consistency)
        return Math.max(0, 1 - (stdDev / 2)); // Normalize to 0-1
    }

    private calculateRecencyScore(feedback: NoteFeedback[]): number {
        if (feedback.length === 0) return 0;

        const now = Date.now();
        const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

        const recentFeedback = feedback.filter(f => {
            const feedbackTime = f.createdAt.toMillis();
            return (now - feedbackTime) < recentThreshold;
        });

        return recentFeedback.length / feedback.length;
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        if (x.length !== y.length || x.length === 0) return 0;

        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + (val * y[i]), 0);
        const sumXX = x.reduce((sum, val) => sum + (val * val), 0);
        const sumYY = y.reduce((sum, val) => sum + (val * val), 0);

        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    private async buildUserProfile(analysis: FeedbackAnalysis): Promise<UserPromptProfile> {
        // This would build a comprehensive user profile based on feedback analysis
        // For now, return a basic profile structure
        return {
            id: '',
            userId: this.userId,
            preferredNoteStyle: this.inferNoteStyle(analysis),
            preferredTone: this.inferTone(analysis),
            averageNoteLength: this.inferNoteLength(analysis),
            customPromptAdditions: [],
            avoidedPhrases: [],
            personalizedPromptPerformance: {
                averageRating: 0,
                totalNotes: 0,
                improvementOverBaseline: 0,
                lastCalculated: new Date() as any,
            },
            successfulPromptVariants: [],
            createdAt: new Date() as any,
            lastUpdated: new Date() as any,
        };
    }

    private inferNoteStyle(analysis: FeedbackAnalysis): 'concise' | 'detailed' | 'structured' | 'narrative' {
        // Analyze feedback patterns to infer preferred style
        const briefIssues = analysis.issuePatterns.find(p => p.issue === 'too_brief');
        const longIssues = analysis.issuePatterns.find(p => p.issue === 'too_long');
        const structureIssues = analysis.issuePatterns.find(p => p.issue === 'poor_structure');

        if (briefIssues && briefIssues.frequency > 2) return 'detailed';
        if (longIssues && longIssues.frequency > 2) return 'concise';
        if (structureIssues && structureIssues.frequency > 2) return 'structured';

        return 'structured'; // Default
    }

    private inferTone(analysis: FeedbackAnalysis): 'professional' | 'clinical' | 'conversational' {
        const toneIssues = analysis.issuePatterns.find(p => p.issue === 'wrong_tone');
        return toneIssues && toneIssues.frequency > 2 ? 'clinical' : 'professional';
    }

    private inferNoteLength(analysis: FeedbackAnalysis): 'short' | 'medium' | 'long' {
        const briefIssues = analysis.issuePatterns.find(p => p.issue === 'too_brief')?.frequency || 0;
        const longIssues = analysis.issuePatterns.find(p => p.issue === 'too_long')?.frequency || 0;

        if (briefIssues > longIssues) return 'long';
        if (longIssues > briefIssues) return 'short';
        return 'medium';
    }
}

// ====== TYPE DEFINITIONS ======

interface FeedbackAnalysis {
    totalFeedbackAnalyzed: number;
    ratingTrends: RatingTrendAnalysis;
    issuePatterns: IssuePattern[];
    temporalPatterns: TemporalAnalysis;
    providerAnalysis: ProviderAnalysis;
    contentAnalysis: ContentAnalysis;
    confidenceScore: number;
    lastAnalyzed: Date;
}

interface RatingTrendAnalysis {
    currentAverage: number;
    previousAverage: number;
    trend: 'improving' | 'declining' | 'stable';
    trendStrength: number;
    consistencyScore: number;
}

interface IssuePattern {
    issue: string;
    frequency: number;
    percentage: number;
    averageRatingWhenPresent: number;
    severity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}

interface TemporalAnalysis {
    averageReviewTime: number;
    timeRatingCorrelation: number;
    optimalReviewTimeRange: [number, number];
    timeEfficiencyScore: number;
}

interface ProviderAnalysis {
    gemini: ProviderMetrics;
    claude: ProviderMetrics;
    recommendedProvider: 'gemini' | 'claude' | null;
}

interface ProviderMetrics {
    noteCount: number;
    averageRating: number;
    consistency: number;
    performance: 'excellent' | 'good' | 'needs_improvement';
}

interface ContentAnalysis {
    templatePerformance: Array<{
        template: string;
        count: number;
        averageRating: number;
        performance: 'excellent' | 'good' | 'needs_improvement';
    }>;
    bestPerformingTemplate: {
        template: string;
        averageRating: number;
    };
    contentLengthOptimal: number;
}

interface PersonalizedPrompt {
    prompt: string;
    personalizations: PromptPersonalization[];
    confidenceScore: number;
    baselineComparison: number;
    metadata: {
        generatedAt: Date;
        basedOnFeedbackCount: number;
        primaryOptimizations: string[];
    };
}

interface PromptPersonalization {
    type: string;
    prompt: string;
    reasoning: string;
    impact: number;
    confidence: number;
}

interface ClinicalContext {
    templateType: string;
    specialty?: string;
    encounterType?: string;
    patientContext?: string;
}

// Export the optimizer class
export default PromptOptimizer;