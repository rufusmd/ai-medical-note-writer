// src/lib/ai-providers/claude-client.ts - Real Implementation with Anthropic SDK

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
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient implements AIProvider {
    name: 'claude' = 'claude';
    private client: Anthropic;
    private config: typeof AI_PROVIDER_MODELS.claude;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new AIProviderError(
                'Claude API key is required',
                'claude',
                'MISSING_API_KEY'
            );
        }

        this.client = new Anthropic({
            apiKey: apiKey,
        });
        this.config = AI_PROVIDER_MODELS.claude;
    }

    async generateNote(request: NoteGenerationRequest): Promise<NoteGenerationResponse> {
        const startTime = Date.now();
        const processingSteps: string[] = [];

        try {
            processingSteps.push('Starting Claude note generation');

            const systemPrompt = NOTE_GENERATION_PROMPTS.systemPrompt;
            const userPrompt = NOTE_GENERATION_PROMPTS.noteGenerationPrompt(
                request.transcript.content,
                request.template?.content,
                request.patientContext
            );

            processingSteps.push('Prompt prepared for Claude');

            // Make the API call to Claude
            const providerStartTime = Date.now();
            const response = await this.client.messages.create({
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
            });

            const providerDuration = Date.now() - providerStartTime;
            processingSteps.push(`Claude API call completed in ${providerDuration}ms`);

            // Extract the generated content
            const generatedContent = response.content[0]?.type === 'text'
                ? response.content[0].text
                : '';

            if (!generatedContent || generatedContent.trim().length === 0) {
                throw new AIProviderError(
                    'Claude returned empty response',
                    'claude',
                    'EMPTY_RESPONSE'
                );
            }

            processingSteps.push('Processing Claude response');

            // Validate Epic syntax
            const epicValidation = this.validateEpicSyntax(generatedContent);

            // Calculate quality score
            const qualityScore = this.calculateQualityScore(generatedContent, request);

            processingSteps.push(`Quality assessment completed: ${qualityScore}/10`);

            // Create generated note
            const generatedNote: GeneratedNote = {
                id: `note_${Date.now()}`,
                content: generatedContent,
                aiProvider: 'claude',
                qualityScore,
                epicSyntaxValidation: epicValidation,
                metadata: {
                    generatedAt: new Date(),
                    processingDuration: Date.now() - startTime,
                    tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || this.estimateTokens(userPrompt + generatedContent),
                    modelVersion: this.config.model,
                    qualityScore,
                    smartPhrasesDetected: epicValidation.smartPhrases.found,
                    dotPhrasesDetected: epicValidation.dotPhrases.found,
                    templateUsed: request.template?.id,
                    patientId: request.transcript.patientId
                },
                rawResponse: {
                    fullResponse: response,
                    usage: response.usage,
                    stopReason: response.stop_reason
                }
            };

            processingSteps.push('Note generation completed successfully');

            return {
                success: true,
                note: generatedNote,
                performance: {
                    totalDuration: Date.now() - startTime,
                    providerDuration,
                    processingSteps
                }
            };

        } catch (error: any) {
            processingSteps.push(`Claude generation failed: ${error.message}`);

            // Handle specific Claude API errors
            let errorCode = 'CLAUDE_ERROR';
            let errorMessage = error.message || 'Failed to generate note with Claude';

            if (error.status === 401) {
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid or missing Claude API key';
            } else if (error.status === 429) {
                errorCode = 'RATE_LIMITED';
                errorMessage = 'Claude API rate limit exceeded';
            } else if (error.status === 400) {
                errorCode = 'INVALID_REQUEST';
                errorMessage = 'Invalid request to Claude API';
            } else if (error.type === 'overloaded_error') {
                errorCode = 'SERVICE_OVERLOADED';
                errorMessage = 'Claude service is temporarily overloaded';
            }

            return {
                success: false,
                error: {
                    code: errorCode,
                    message: errorMessage,
                    details: {
                        originalError: error,
                        apiProvider: 'claude',
                        model: this.config.model,
                        status: error.status
                    }
                },
                performance: {
                    totalDuration: Date.now() - startTime,
                    providerDuration: Date.now() - startTime,
                    processingSteps
                }
            };
        }
    }

    validateEpicSyntax(content: string): EpicSyntaxValidation {
        const smartPhrases = content.match(EPIC_SYNTAX_PATTERNS.smartPhrase) || [];
        const dotPhrases = content.match(EPIC_SYNTAX_PATTERNS.dotPhrase) || [];
        const wildcards = content.match(EPIC_SYNTAX_PATTERNS.wildcard) || [];

        // Check for malformed patterns
        const malformedSmartPhrases: string[] = [];
        const malformedDotPhrases: string[] = [];

        // Look for partial or malformed smartphrases
        const partialSmartPhrases = content.match(/@[A-Za-z0-9]+[^@]*(?!@)/g) || [];
        partialSmartPhrases.forEach(partial => {
            if (!EPIC_SYNTAX_PATTERNS.validSmartPhrase.test(partial + '@')) {
                malformedSmartPhrases.push(partial);
            }
        });

        // Look for partial or malformed dotphrases
        const partialDotPhrases = content.match(/\.[a-z][a-z0-9]*/g) || [];
        partialDotPhrases.forEach(partial => {
            if (!EPIC_SYNTAX_PATTERNS.validDotPhrase.test(partial)) {
                malformedDotPhrases.push(partial);
            }
        });

        const isValid = malformedSmartPhrases.length === 0 && malformedDotPhrases.length === 0;

        return {
            isValid,
            smartPhrases: {
                found: smartPhrases,
                missing: [], // Would require template comparison
                malformed: malformedSmartPhrases
            },
            dotPhrases: {
                found: dotPhrases,
                missing: [], // Would require template comparison
                malformed: malformedDotPhrases
            },
            wildcards: {
                found: wildcards,
                replaced: wildcards.length > 0
            }
        };
    }

    async isHealthy(): Promise<boolean> {
        try {
            // Test with a simple message
            const response = await this.client.messages.create({
                model: this.config.model,
                max_tokens: 50,
                messages: [
                    {
                        role: 'user',
                        content: 'Health check test'
                    }
                ]
            });

            return response.content.length > 0;
        } catch (error) {
            console.error('Claude health check failed:', error);
            return false;
        }
    }

    private calculateQualityScore(content: string, request: NoteGenerationRequest): number {
        let score = 5; // Base score

        // Length check (appropriate medical note length)
        if (content.length > 300 && content.length < 2500) score += 1;

        // Medical terminology and structure
        const medicalTerms = ['patient', 'history', 'examination', 'assessment', 'plan', 'symptoms', 'diagnosis', 'subjective', 'objective'];
        const foundTerms = medicalTerms.filter(term =>
            content.toLowerCase().includes(term)
        );
        score += Math.min(foundTerms.length * 0.25, 2);

        // Epic syntax preservation
        const smartPhrases = content.match(EPIC_SYNTAX_PATTERNS.smartPhrase) || [];
        const dotPhrases = content.match(EPIC_SYNTAX_PATTERNS.dotPhrase) || [];
        if (smartPhrases.length > 0) score += 1;
        if (dotPhrases.length > 0) score += 0.5;

        // SOAP or structured format check
        const structureKeywords = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN', 'HPI', 'HISTORY', 'PHYSICAL'];
        const foundStructure = structureKeywords.filter(keyword =>
            content.toUpperCase().includes(keyword)
        );
        if (foundStructure.length >= 3) score += 1.5;

        // Professional tone (avoid first person, informal language)
        if (!content.toLowerCase().includes(' i ') &&
            !content.toLowerCase().includes('i think') &&
            !content.toLowerCase().includes('i believe')) {
            score += 0.5;
        }

        // Clinical relevance to transcript
        const transcriptWords = request.transcript.content.toLowerCase().split(/\s+/);
        const noteWords = content.toLowerCase().split(/\s+/);
        const relevantWords = transcriptWords.filter(word =>
            word.length > 3 && noteWords.includes(word)
        );

        if (relevantWords.length > Math.min(transcriptWords.length * 0.1, 10)) {
            score += 1;
        }

        return Math.min(Math.max(Math.round(score * 10) / 10, 1), 10);
    }

    async generateNoteWithPrompts(
        request: NoteGenerationRequest,
        systemPrompt: string,
        userPrompt: string
    ): Promise<NoteGenerationResponse> {
        const startTime = Date.now();
        const processingSteps: string[] = [];

        try {
            processingSteps.push('Starting Claude note generation with custom prompts');

            processingSteps.push('Clinical prompt prepared for Claude');

            // Make the API call to Claude with custom prompts
            const providerStartTime = Date.now();
            const response = await this.client.messages.create({
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
            });

            const providerDuration = Date.now() - providerStartTime;
            processingSteps.push(`Claude API call completed in ${providerDuration}ms`);

            // Extract the generated content
            const generatedContent = response.content[0]?.type === 'text'
                ? response.content[0].text
                : '';

            if (!generatedContent || generatedContent.trim().length === 0) {
                throw new AIProviderError(
                    'Claude returned empty response',
                    'claude',
                    'EMPTY_RESPONSE'
                );
            }

            processingSteps.push('Processing Claude clinical response');

            // Validate Epic syntax
            const epicValidation = this.validateEpicSyntax(generatedContent);

            // Calculate quality score
            const qualityScore = this.calculateQualityScore(generatedContent, request);

            processingSteps.push(`Clinical quality assessment completed: ${qualityScore}/10`);

            // Create generated note
            const generatedNote: GeneratedNote = {
                id: `clinical_note_${Date.now()}`,
                content: generatedContent,
                aiProvider: 'claude',
                qualityScore,
                epicSyntaxValidation: epicValidation,
                metadata: {
                    generatedAt: new Date(),
                    processingDuration: Date.now() - startTime,
                    tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || this.estimateTokens(userPrompt + generatedContent),
                    modelVersion: this.config.model,
                    qualityScore,
                    smartPhrasesDetected: epicValidation.smartPhrases.found,
                    dotPhrasesDetected: epicValidation.dotPhrases.found,
                    templateUsed: request.template?.id,
                    patientId: request.transcript.patientId
                },
                rawResponse: {
                    fullResponse: response,
                    usage: response.usage,
                    stopReason: response.stop_reason,
                    systemPrompt,
                    userPrompt
                }
            };

            processingSteps.push('Clinical note generation completed successfully');

            return {
                success: true,
                note: generatedNote,
                performance: {
                    totalDuration: Date.now() - startTime,
                    providerDuration,
                    processingSteps
                }
            };

        } catch (error: any) {
            processingSteps.push(`Claude clinical generation failed: ${error.message}`);

            // Handle specific Claude API errors
            let errorCode = 'CLAUDE_CLINICAL_ERROR';
            let errorMessage = error.message || 'Failed to generate clinical note with Claude';

            if (error.status === 401) {
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid or missing Claude API key';
            } else if (error.status === 429) {
                errorCode = 'RATE_LIMITED';
                errorMessage = 'Claude API rate limit exceeded';
            } else if (error.status === 400) {
                errorCode = 'INVALID_REQUEST';
                errorMessage = 'Invalid request to Claude API';
            } else if (error.type === 'overloaded_error') {
                errorCode = 'SERVICE_OVERLOADED';
                errorMessage = 'Claude service is temporarily overloaded';
            }

            return {
                success: false,
                error: {
                    code: errorCode,
                    message: errorMessage,
                    details: {
                        originalError: error,
                        apiProvider: 'claude',
                        model: this.config.model,
                        status: error.status,
                        clinicalMode: true
                    }
                },
                performance: {
                    totalDuration: Date.now() - startTime,
                    providerDuration: Date.now() - startTime,
                    processingSteps
                }
            };
        }
    }

    private estimateTokens(text: string): number {
        // Claude tokenization: roughly 3.5-4 characters per token
        return Math.floor(text.length / 3.7);
    }
}