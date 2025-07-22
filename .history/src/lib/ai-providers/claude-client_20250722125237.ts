// src/lib/ai-providers/claude-client.ts

import {
    AIProvider,
    NoteGenerationRequest,
    NoteGenerationResponse,
    GeneratedNote,
    EpicSyntaxValidation,
    AIProviderError,
    AI_PROVIDER_MODELS,
    EPIC_SYNTAX_PATTERNS,
    NOTE_GENERATION_PROMPTS
} from './types';

export class ClaudeClient implements AIProvider {
    name: 'claude' = 'claude';
    private apiKey: string;
    private config: typeof AI_PROVIDER_MODELS.claude;
    private baseUrl: string = 'https://api.anthropic.com';

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new AIProviderError(
                'Claude API key is required',
                'claude',
                'MISSING_API_KEY'
            );
        }

        this.apiKey = apiKey;
        this.config = AI_PROVIDER_MODELS.claude;
    }

    async generateNote(request: NoteGenerationRequest): Promise<NoteGenerationResponse> {
        const startTime = Date.now();
        const processingSteps: string[] = [];

        try {
            processingSteps.push('Starting Claude note generation');

            // Prepare the messages
            const systemPrompt = NOTE_GENERATION_PROMPTS.systemPrompt;
            const userPrompt = NOTE_GENERATION_PROMPTS.noteGenerationPrompt(
                request.transcript.content,
                request.template?.content,
                request.patientContext
            );

            processingSteps.push('Prompt prepared');

            // Prepare API request
            const requestBody = {
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            };

            processingSteps.push('API request prepared');

            // Make the API call
            const providerStartTime = Date.now();
            const response = await fetch(`${this.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true' // For browser usage
                },
                body: JSON.stringify(requestBody)
            });

            const providerEndTime = Date.now();
            const providerDuration = providerEndTime - providerStartTime;

            processingSteps.push('API call completed');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;

                let errorCode = 'API_ERROR';
                if (response.status === 401) errorCode = 'INVALID_API_KEY';
                else if (response.status === 429) errorCode = 'RATE_LIMITED';
                else if (response.status === 400) errorCode = 'BAD_REQUEST';
                else if (response.status >= 500) errorCode = 'SERVER_ERROR';

                throw new AIProviderError(
                    errorMessage,
                    'claude',
                    errorCode,
                    { status: response.status, errorData }
                );
            }

            const result = await response.json();
            processingSteps.push('Response parsed');

            const generatedContent = result.content?.[0]?.text;
            if (!generatedContent) {
                throw new AIProviderError(
                    'Empty response from Claude API',
                    'claude',
                    'EMPTY_RESPONSE',
                    result
                );
            }

            processingSteps.push('Content extracted');

            // Validate Epic syntax preservation
            const epicValidation = await this.validateEpicSyntax(generatedContent);
            processingSteps.push('Epic syntax validated');

            // Calculate quality score based on various factors
            const qualityScore = await this.calculateQualityScore(
                generatedContent,
                request.transcript.content,
                epicValidation
            );
            processingSteps.push('Quality score calculated');

            // Create the generated note object
            const generatedNote: GeneratedNote = {
                id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                patientId: request.transcript.patientId,
                templateId: request.template?.id,
                transcriptId: request.transcript.id,
                content: generatedContent,
                status: 'draft',
                aiProvider: 'claude',
                metadata: {
                    generationTime: new Date(),
                    processingDuration: providerDuration,
                    promptTokens: result.usage?.input_tokens || this.estimateTokenCount(systemPrompt + userPrompt),
                    completionTokens: result.usage?.output_tokens || this.estimateTokenCount(generatedContent),
                    qualityScore,
                    epicSyntaxPreserved: epicValidation.isValid,
                    smartPhrasesUsed: epicValidation.smartPhrasesFound,
                    dotPhrasesUsed: epicValidation.dotPhrasesFound,
                    confidence: this.calculateConfidence(result),
                },
            };

            const totalDuration = Date.now() - startTime;
            processingSteps.push('Note generation completed successfully');

            return {
                success: true,
                note: generatedNote,
                performance: {
                    totalDuration,
                    providerDuration,
                    processingSteps,
                },
            };

        } catch (error: any) {
            const totalDuration = Date.now() - startTime;
            processingSteps.push(`Error occurred: ${error.message}`);

            // Handle specific error types
            if (error instanceof AIProviderError) {
                error.details = {
                    ...error.details,
                    processingSteps,
                    totalDuration,
                };
                throw error;
            }

            // Handle network/fetch errors
            let errorCode = 'UNKNOWN_ERROR';
            let errorMessage = error.message || 'Unknown error occurred';

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorCode = 'NETWORK_ERROR';
                errorMessage = 'Network error connecting to Claude API';
            } else if (error.message?.includes('timeout')) {
                errorCode = 'REQUEST_TIMEOUT';
                errorMessage = 'Claude API request timed out';
            }

            throw new AIProviderError(
                errorMessage,
                'claude',
                errorCode,
                {
                    originalError: error,
                    processingSteps,
                    totalDuration,
                }
            );
        }
    }

    async validateEpicSyntax(content: string): Promise<EpicSyntaxValidation> {
        try {
            const smartPhrasesFound = content.match(EPIC_SYNTAX_PATTERNS.smartPhrase) || [];
            const dotPhrasesFound = content.match(EPIC_SYNTAX_PATTERNS.dotPhrase) || [];
            const placeholdersFound = content.match(EPIC_SYNTAX_PATTERNS.placeholder) || [];

            // Check for invalid syntax variations that might have been corrupted
            const invalidSyntax: string[] = [];
            const suggestions: string[] = [];

            // Check for malformed SmartPhrases (common corruption patterns)
            const malformedSmartPhrases = content.match(/@[^@]*[a-z][^@]*@/g) || [];
            malformedSmartPhrases.forEach(phrase => {
                invalidSyntax.push(phrase);
                const corrected = phrase.toUpperCase();
                suggestions.push(`Consider: ${corrected}`);
            });

            // Check for malformed DotPhrases
            const malformedDotPhrases = content.match(/\.[A-Z][^.\s]*(?:\.[A-Z][^.\s]*)*/g) || [];
            malformedDotPhrases.forEach(phrase => {
                invalidSyntax.push(phrase);
                const corrected = phrase.toLowerCase();
                suggestions.push(`Consider: ${corrected}`);
            });

            // Check for broken placeholders
            const brokenPlaceholders = content.match(/\*{1,2}[^*]+\*{1,2}(?!\*)/g) || [];
            brokenPlaceholders.forEach(phrase => {
                invalidSyntax.push(phrase);
                suggestions.push(`Consider: ***${phrase.replace(/\*/g, '')}***`);
            });

            // Calculate preservation score
            const totalExpectedSyntax = smartPhrasesFound.length + dotPhrasesFound.length + placeholdersFound.length;
            const totalInvalidSyntax = invalidSyntax.length;

            const preservationScore = totalExpectedSyntax > 0
                ? Math.max(0, (totalExpectedSyntax - totalInvalidSyntax) / totalExpectedSyntax)
                : 1; // Perfect score if no Epic syntax was expected

            return {
                isValid: invalidSyntax.length === 0,
                smartPhrasesFound: smartPhrasesFound.map(s => s.slice(1, -1)), // Remove @ symbols
                dotPhrasesFound: dotPhrasesFound.map(s => s.substring(1)), // Remove leading .
                invalidSyntax,
                suggestions,
                preservationScore,
            };

        } catch (error) {
            console.error('Error validating Epic syntax:', error);
            return {
                isValid: false,
                smartPhrasesFound: [],
                dotPhrasesFound: [],
                invalidSyntax: ['Validation error occurred'],
                suggestions: ['Please review Epic syntax manually'],
                preservationScore: 0,
            };
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: 10,
                    messages: [
                        {
                            role: 'user',
                            content: 'Respond with just the word "OK" if you can receive this message.'
                        }
                    ]
                })
            });

            if (!response.ok) return false;

            const result = await response.json();
            const text = result.content?.[0]?.text?.trim()?.toLowerCase();

            return text === 'ok' || text === '"ok"' || text === 'ok.';

        } catch (error) {
            console.error('Claude health check failed:', error);
            return false;
        }
    }

    async getUsageStats() {
        // Claude API doesn't provide detailed usage stats in real-time
        // This would typically be tracked in your application database
        return {
            requestsToday: 0, // Would be retrieved from your usage tracking
            tokensUsedToday: 0,
            averageResponseTime: 0,
            errorRate: 0,
        };
    }

    private async calculateQualityScore(
        generatedContent: string,
        originalTranscript: string,
        epicValidation: EpicSyntaxValidation
    ): Promise<number> {
        try {
            // Use Claude itself to evaluate quality (recursive evaluation)
            const qualityPrompt = NOTE_GENERATION_PROMPTS.qualityCheckPrompt(
                generatedContent,
                originalTranscript
            );

            const response = await fetch(`${this.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: 500,
                    temperature: 0.1, // Lower temperature for evaluation
                    messages: [
                        {
                            role: 'user',
                            content: qualityPrompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Quality evaluation failed');
            }

            const result = await response.json();
            const evaluation = result.content?.[0]?.text || '';

            // Extract score from response (look for patterns like "Score: 8/10" or "8 out of 10")
            const scoreMatch = evaluation.match(/(?:score|rating)[:]\s*(\d+)(?:\/10|\s*out\s*of\s*10)?/i);
            let aiScore = scoreMatch ? parseInt(scoreMatch[1]) : 7; // Default to 7 if no score found

            // Normalize to 0-10 scale
            aiScore = Math.max(1, Math.min(10, aiScore));

            // Adjust score based on Epic syntax preservation
            const epicPenalty = epicValidation.isValid ? 0 : 2;
            const preservationBonus = epicValidation.preservationScore * 1;

            // Calculate final score with various factors
            const finalScore = Math.max(1, Math.min(10,
                aiScore - epicPenalty + preservationBonus
            ));

            return finalScore;

        } catch (error) {
            console.error('Error calculating quality score:', error);
            // Return a neutral score if quality calculation fails
            return epicValidation.isValid ? 7 : 5;
        }
    }

    private calculateConfidence(result: any): number {
        try {
            // Claude API provides usage statistics which can indicate confidence
            const usage = result.usage;

            if (!usage) return 0.7; // Default confidence

            // Higher token usage relative to max might indicate more thorough response
            const outputRatio = (usage.output_tokens || 0) / this.config.maxTokens;
            let confidence = 0.8; // Base confidence

            // Adjust based on output length (longer responses might be more complete)
            if (outputRatio > 0.8) {
                confidence = 0.9; // Near max tokens used, comprehensive response
            } else if (outputRatio < 0.1) {
                confidence = 0.6; // Very short response, might be incomplete
            }

            return Math.max(0.1, Math.min(1, confidence));

        } catch (error) {
            return 0.7; // Neutral confidence if calculation fails
        }
    }

    private estimateTokenCount(text: string): number {
        // Simple token estimation (roughly 4 characters per token for English)
        return Math.ceil(text.length / 4);
    }
}

// Export factory function for easier instantiation
export const createClaudeClient = (apiKey: string): ClaudeClient => {
    return new ClaudeClient(apiKey);
};