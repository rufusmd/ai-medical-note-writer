// src/lib/ai-providers/gemini-client.ts

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
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export class GeminiClient implements AIProvider {
    name: 'gemini' = 'gemini';
    private client: GoogleGenerativeAI;
    private model: any;
    private config: typeof AI_PROVIDER_MODELS.gemini;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new AIProviderError(
                'Gemini API key is required',
                'gemini',
                'MISSING_API_KEY'
            );
        }

        this.client = new GoogleGenerativeAI(apiKey);
        this.config = AI_PROVIDER_MODELS.gemini;

        // Initialize model with safety settings for medical content
        this.model = this.client.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                temperature: this.config.temperature,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: this.config.maxTokens,
            },
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE, // Medical content might trigger false positives
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE, // Medical procedures might be flagged
                },
            ],
        });
    }

    async generateNote(request: NoteGenerationRequest): Promise<NoteGenerationResponse> {
        const startTime = Date.now();
        const processingSteps: string[] = [];

        try {
            processingSteps.push('Starting Gemini note generation');

            // Prepare the prompt
            const systemPrompt = NOTE_GENERATION_PROMPTS.systemPrompt;
            const userPrompt = NOTE_GENERATION_PROMPTS.noteGenerationPrompt(
                request.transcript.content,
                request.template?.content,
                request.patientContext
            );

            processingSteps.push('Prompt prepared');

            // Generate the note
            const providerStartTime = Date.now();
            const result = await this.model.generateContent([
                { text: systemPrompt },
                { text: userPrompt }
            ]);

            const providerEndTime = Date.now();
            const providerDuration = providerEndTime - providerStartTime;

            processingSteps.push('AI generation completed');

            const response = await result.response;
            const generatedContent = response.text();

            if (!generatedContent) {
                throw new AIProviderError(
                    'Empty response from Gemini API',
                    'gemini',
                    'EMPTY_RESPONSE'
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
                aiProvider: 'gemini',
                metadata: {
                    generationTime: new Date(),
                    processingDuration: providerDuration,
                    promptTokens: this.estimateTokenCount(systemPrompt + userPrompt),
                    completionTokens: this.estimateTokenCount(generatedContent),
                    qualityScore,
                    epicSyntaxPreserved: epicValidation.isValid,
                    smartPhrasesUsed: epicValidation.smartPhrasesFound,
                    dotPhrasesUsed: epicValidation.dotPhrasesFound,
                    confidence: this.calculateConfidence(response),
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

            // Handle specific Gemini API errors
            let errorCode = 'UNKNOWN_ERROR';
            let errorMessage = error.message || 'Unknown error occurred';

            if (error.message?.includes('API key')) {
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid or missing Gemini API key';
            } else if (error.message?.includes('quota')) {
                errorCode = 'QUOTA_EXCEEDED';
                errorMessage = 'Gemini API quota exceeded';
            } else if (error.message?.includes('safety')) {
                errorCode = 'SAFETY_FILTER';
                errorMessage = 'Content blocked by Gemini safety filters';
            } else if (error.message?.includes('timeout')) {
                errorCode = 'REQUEST_TIMEOUT';
                errorMessage = 'Gemini API request timed out';
            }

            throw new AIProviderError(
                errorMessage,
                'gemini',
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
            const testResult = await this.model.generateContent([
                { text: 'Respond with just the word "OK" if you can receive this message.' }
            ]);

            const response = await testResult.response;
            const text = response.text()?.trim()?.toLowerCase();

            return text === 'ok' || text === '"ok"' || text === 'ok.';
        } catch (error) {
            console.error('Gemini health check failed:', error);
            return false;
        }
    }

    async getUsageStats() {
        // Note: Google Gemini API doesn't provide detailed usage stats in real-time
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
            // Use AI to evaluate quality
            const qualityPrompt = NOTE_GENERATION_PROMPTS.qualityCheckPrompt(
                generatedContent,
                originalTranscript
            );

            const result = await this.model.generateContent([{ text: qualityPrompt }]);
            const response = await result.response;
            const evaluation = response.text();

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

    private calculateConfidence(response: any): number {
        try {
            // Gemini API doesn't provide direct confidence scores
            // Calculate based on available metadata
            const candidates = response.candidates || [];
            if (candidates.length === 0) return 0.5;

            const candidate = candidates[0];

            // Use safety ratings and finish reason as confidence indicators
            const finishReason = candidate.finishReason;
            let confidence = 0.8; // Base confidence

            if (finishReason === 'STOP') {
                confidence = 0.9; // Normal completion
            } else if (finishReason === 'MAX_TOKENS') {
                confidence = 0.7; // Truncated
            } else if (finishReason === 'SAFETY') {
                confidence = 0.3; // Safety concern
            }

            return Math.max(0, Math.min(1, confidence));

        } catch (error) {
            return 0.5; // Neutral confidence if calculation fails
        }
    }

    private estimateTokenCount(text: string): number {
        // Simple token estimation (roughly 4 characters per token for English)
        return Math.ceil(text.length / 4);
    }
}

// Export factory function for easier instantiation
export const createGeminiClient = (apiKey: string): GeminiClient => {
    return new GeminiClient(apiKey);
};