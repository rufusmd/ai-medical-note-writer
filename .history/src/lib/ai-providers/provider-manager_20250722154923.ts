// src/lib/ai-providers/provider-manager.ts - Complete Version

import {
    AIProvider,
    NoteGenerationRequest,
    NoteGenerationResponse,
    ProviderComparisonResult,
    AIProviderError,
    GeneratedNote,
    AI_PROVIDER_MODELS
} from './types';
import { GeminiClient } from './gemini-client';
import { ClaudeClient } from './claude-client';

export interface ProviderManagerConfig {
    primaryProvider: 'gemini' | 'claude';
    enableFallback: boolean;
    enableComparison: boolean;
    qualityThreshold: number; // Minimum quality score to accept (1-10)
    timeoutMs: number;
    retryAttempts: number;
}

export class ProviderManager {
    private geminiClient?: GeminiClient;
    private claudeClient?: ClaudeClient;
    private config: ProviderManagerConfig;
    private usageStats: Map<string, any> = new Map();

    constructor(
        config: ProviderManagerConfig,
        apiKeys: {
            gemini?: string;
            claude?: string;
        }
    ) {
        this.config = config;

        // Initialize providers based on available API keys
        if (apiKeys.gemini) {
            try {
                this.geminiClient = new GeminiClient(apiKeys.gemini);
            } catch (error) {
                console.error('Failed to initialize Gemini client:', error);
            }
        }

        if (apiKeys.claude) {
            try {
                this.claudeClient = new ClaudeClient(apiKeys.claude);
            } catch (error) {
                console.error('Failed to initialize Claude client:', error);
            }
        }

        // Validate that at least one provider is available
        if (!this.geminiClient && !this.claudeClient) {
            throw new Error('At least one AI provider must be configured');
        }

        // Ensure primary provider is available
        const primaryClient = config.primaryProvider === 'gemini' ? this.geminiClient : this.claudeClient;
        if (!primaryClient) {
            console.warn(`Primary provider ${config.primaryProvider} not available, switching to available provider`);
            this.config.primaryProvider = this.geminiClient ? 'gemini' : 'claude';
        }
    }

    // =============================================================================
    // HEALTH CHECK METHODS (Missing from original)
    // =============================================================================

    async checkProviderHealth(provider: 'gemini' | 'claude'): Promise<boolean> {
        try {
            const client = provider === 'gemini' ? this.geminiClient : this.claudeClient;
            if (!client) {
                return false;
            }

            return await client.isHealthy();
        } catch (error) {
            console.error(`Health check failed for ${provider}:`, error);
            return false;
        }
    }

    async checkAllProvidersHealth(): Promise<{ gemini: boolean; claude: boolean }> {
        const [geminiHealthy, claudeHealthy] = await Promise.allSettled([
            this.geminiClient ? this.checkProviderHealth('gemini') : Promise.resolve(false),
            this.claudeClient ? this.checkProviderHealth('claude') : Promise.resolve(false)
        ]);

        return {
            gemini: geminiHealthy.status === 'fulfilled' && geminiHealthy.value,
            claude: claudeHealthy.status === 'fulfilled' && claudeHealthy.value
        };
    }

    // =============================================================================
    // CORE NOTE GENERATION
    // =============================================================================

    async generateNote(request: NoteGenerationRequest): Promise<NoteGenerationResponse> {
        const startTime = Date.now();
        const processingSteps: string[] = [];

        try {
            processingSteps.push('Starting note generation with provider manager');

            // Try primary provider first
            const primaryProvider = this.getPrimaryProvider();
            if (primaryProvider) {
                processingSteps.push(`Attempting with primary provider: ${this.config.primaryProvider}`);

                try {
                    const result = await this.generateWithTimeout(primaryProvider, request);

                    // Check if quality meets threshold
                    if (result.note && result.note.metadata.qualityScore >= this.config.qualityThreshold) {
                        processingSteps.push(`Primary provider succeeded with quality score: ${result.note.metadata.qualityScore}`);
                        this.recordUsage(this.config.primaryProvider, 'success', Date.now() - startTime);

                        return {
                            ...result,
                            performance: {
                                ...result.performance,
                                processingSteps: [...processingSteps, ...result.performance.processingSteps]
                            }
                        };
                    } else {
                        processingSteps.push(`Primary provider quality too low: ${result.note?.metadata.qualityScore || 'unknown'}`);
                        if (!this.config.enableFallback) {
                            // Return low-quality result if fallback disabled
                            return result;
                        }
                    }
                } catch (error: any) {
                    processingSteps.push(`Primary provider failed: ${error.message}`);
                    this.recordUsage(this.config.primaryProvider, 'error', Date.now() - startTime);

                    if (!this.config.enableFallback) {
                        throw error;
                    }
                }
            }

            // Try fallback provider
            if (this.config.enableFallback) {
                const fallbackProvider = this.getFallbackProvider();
                if (fallbackProvider) {
                    const fallbackProviderName = this.config.primaryProvider === 'gemini' ? 'claude' : 'gemini';
                    processingSteps.push(`Attempting with fallback provider: ${fallbackProviderName}`);

                    try {
                        const fallbackStartTime = Date.now();
                        const result = await this.generateWithTimeout(fallbackProvider, request);

                        processingSteps.push(`Fallback provider succeeded with quality score: ${result.note?.metadata.qualityScore || 'unknown'}`);
                        this.recordUsage(fallbackProviderName, 'success', Date.now() - fallbackStartTime);

                        return {
                            ...result,
                            fallbackUsed: true,
                            performance: {
                                ...result.performance,
                                processingSteps: [...processingSteps, ...result.performance.processingSteps]
                            }
                        };
                    } catch (fallbackError: any) {
                        processingSteps.push(`Fallback provider also failed: ${fallbackError.message}`);
                        this.recordUsage(fallbackProviderName, 'error', Date.now() - startTime);
                        throw fallbackError;
                    }
                }
            }

            throw new Error('No available providers could generate the note');

        } catch (error: any) {
            const totalDuration = Date.now() - startTime;
            processingSteps.push(`Total failure after ${totalDuration}ms`);

            return {
                success: false,
                error: {
                    code: error.code || 'PROVIDER_MANAGER_ERROR',
                    message: error.message || 'Failed to generate note with any provider',
                    details: {
                        originalError: error,
                        processingSteps,
                        totalDuration,
                        config: this.config
                    }
                },
                performance: {
                    totalDuration,
                    providerDuration: 0,
                    processingSteps
                }
            };
        }
    }

    // =============================================================================
    // PROVIDER COMPARISON
    // =============================================================================

    async compareProviders(request: NoteGenerationRequest): Promise<ProviderComparisonResult> {
        if (!this.config.enableComparison) {
            throw new Error('Provider comparison is not enabled');
        }

        if (!this.geminiClient || !this.claudeClient) {
            throw new Error('Both providers must be available for comparison');
        }

        const results: ProviderComparisonResult = {
            comparison: {
                qualityScores: {},
                epicSyntaxPreservation: {
                    gemini: false,
                    claude: false
                },
                responseTime: {},
                recommendation: 'manual_review',
                reasoning: 'Comparison in progress'
            }
        };

        // Generate notes with both providers concurrently
        const promises = [
            this.generateWithTimeout(this.geminiClient, request).catch(error => ({ error, provider: 'gemini' })),
            this.generateWithTimeout(this.claudeClient, request).catch(error => ({ error, provider: 'claude' }))
        ];

        const [geminiResult, claudeResult] = await Promise.all(promises);

        // Process Gemini results
        if ('note' in geminiResult && geminiResult.note) {
            results.comparison.qualityScores.gemini = geminiResult.note.metadata.qualityScore;
            results.comparison.epicSyntaxPreservation.gemini = geminiResult.note.epicSyntaxValidation.isValid;
            results.comparison.responseTime.gemini = geminiResult.performance.providerDuration;
            if (!results.notes) results.notes = {};
            results.notes.gemini = geminiResult.note;
        }

        // Process Claude results
        if ('note' in claudeResult && claudeResult.note) {
            results.comparison.qualityScores.claude = claudeResult.note.metadata.qualityScore;
            results.comparison.epicSyntaxPreservation.claude = claudeResult.note.epicSyntaxValidation.isValid;
            results.comparison.responseTime.claude = claudeResult.performance.providerDuration;
            if (!results.notes) results.notes = {};
            results.notes.claude = claudeResult.note;
        }

        // Make recommendation based on results
        results.comparison = this.makeProviderRecommendation(results.comparison);

        return results;
    }

    // =============================================================================
    // CONFIGURATION MANAGEMENT
    // =============================================================================

    getUsageStats() {
        return Object.fromEntries(this.usageStats);
    }

    getConfig(): ProviderManagerConfig {
        return { ...this.config };
    }

    switchPrimaryProvider() {
        this.config.primaryProvider = this.config.primaryProvider === 'gemini' ? 'claude' : 'gemini';

        // Ensure the new primary provider is available
        const newPrimaryClient = this.config.primaryProvider === 'gemini' ? this.geminiClient : this.claudeClient;
        if (!newPrimaryClient) {
            // Switch back if new primary is not available
            this.config.primaryProvider = this.config.primaryProvider === 'gemini' ? 'claude' : 'gemini';
            throw new Error(`Cannot switch to ${this.config.primaryProvider}: provider not available`);
        }
    }

    updateConfig(newConfig: Partial<ProviderManagerConfig>) {
        this.config = { ...this.config, ...newConfig };
    }

    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================

    private getPrimaryProvider(): AIProvider | null {
        return this.config.primaryProvider === 'gemini' ? this.geminiClient || null : this.claudeClient || null;
    }

    private getFallbackProvider(): AIProvider | null {
        return this.config.primaryProvider === 'gemini' ? this.claudeClient || null : this.geminiClient || null;
    }

    private async generateWithTimeout(
        provider: AIProvider,
        request: NoteGenerationRequest
    ): Promise<NoteGenerationResponse> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new AIProviderError(
                    `Provider ${provider.name} timed out after ${this.config.timeoutMs}ms`,
                    provider.name,
                    'REQUEST_TIMEOUT'
                ));
            }, this.config.timeoutMs);

            provider.generateNote(request)
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    private makeProviderRecommendation(comparison: ProviderComparisonResult['comparison']) {
        const { qualityScores, epicSyntaxPreservation, responseTime } = comparison;

        let reasoning = '';
        let recommendation: 'gemini' | 'claude' | 'manual_review' = 'manual_review';

        // Score factors
        let geminiScore = 0;
        let claudeScore = 0;

        // Quality comparison (40% weight)
        if (qualityScores.gemini && qualityScores.claude) {
            if (qualityScores.gemini > qualityScores.claude) {
                geminiScore += 4;
                reasoning += `Gemini has higher quality (${qualityScores.gemini} vs ${qualityScores.claude}). `;
            } else if (qualityScores.claude > qualityScores.gemini) {
                claudeScore += 4;
                reasoning += `Claude has higher quality (${qualityScores.claude} vs ${qualityScores.gemini}). `;
            } else {
                reasoning += 'Quality scores are equal. ';
            }
        } else if (qualityScores.gemini) {
            geminiScore += 4;
            reasoning += 'Only Gemini provided a quality score. ';
        } else if (qualityScores.claude) {
            claudeScore += 4;
            reasoning += 'Only Claude provided a quality score. ';
        }

        // Epic syntax preservation (30% weight)
        if (epicSyntaxPreservation.gemini && !epicSyntaxPreservation.claude) {
            geminiScore += 3;
            reasoning += 'Gemini preserved Epic syntax better. ';
        } else if (epicSyntaxPreservation.claude && !epicSyntaxPreservation.gemini) {
            claudeScore += 3;
            reasoning += 'Claude preserved Epic syntax better. ';
        } else if (epicSyntaxPreservation.gemini && epicSyntaxPreservation.claude) {
            reasoning += 'Both preserved Epic syntax well. ';
        }

        // Response time comparison (20% weight)
        if (responseTime.gemini && responseTime.claude) {
            if (responseTime.gemini < responseTime.claude) {
                geminiScore += 2;
                reasoning += `Gemini was faster (${responseTime.gemini}ms vs ${responseTime.claude}ms). `;
            } else if (responseTime.claude < responseTime.gemini) {
                claudeScore += 2;
                reasoning += `Claude was faster (${responseTime.claude}ms vs ${responseTime.gemini}ms). `;
            }
        }

        // Availability bonus (10% weight)
        const geminiAvailable = !!qualityScores.gemini;
        const claudeAvailable = !!qualityScores.claude;

        if (geminiAvailable && !claudeAvailable) {
            geminiScore += 1;
            reasoning += 'Only Gemini was available. ';
        } else if (claudeAvailable && !geminiAvailable) {
            claudeScore += 1;
            reasoning += 'Only Claude was available. ';
        }

        // Make final recommendation
        if (geminiScore > claudeScore && geminiScore >= 5) {
            recommendation = 'gemini';
        } else if (claudeScore > geminiScore && claudeScore >= 5) {
            recommendation = 'claude';
        } else {
            recommendation = 'manual_review';
            reasoning += 'Scores too close for automatic recommendation. ';
        }

        return {
            ...comparison,
            recommendation,
            reasoning: reasoning.trim()
        };
    }

    private recordUsage(provider: 'gemini' | 'claude', result: 'success' | 'error', duration: number) {
        const stats = this.usageStats.get(provider) || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            lastUsed: null
        };

        stats.totalRequests++;
        stats.totalResponseTime += duration;
        stats.averageResponseTime = stats.totalResponseTime / stats.totalRequests;
        stats.lastUsed = new Date();

        if (result === 'success') {
            stats.successfulRequests++;
        } else {
            stats.failedRequests++;
        }

        this.usageStats.set(provider, stats);
    }
}

// =============================================================================
// FACTORY FUNCTIONS AND DEFAULTS
// =============================================================================

// Factory function for easier setup
export const createProviderManager = (
    config: ProviderManagerConfig,
    apiKeys: { gemini?: string; claude?: string; }
): ProviderManager => {
    return new ProviderManager(config, apiKeys);
};

// Default configuration
export const DEFAULT_PROVIDER_CONFIG: ProviderManagerConfig = {
    primaryProvider: 'gemini',
    enableFallback: true,
    enableComparison: false, // Disabled by default to save API costs
    qualityThreshold: 6, // Accept quality scores of 6 or higher
    timeoutMs: 30000, // 30 second timeout
    retryAttempts: 1,
};