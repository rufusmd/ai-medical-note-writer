// src/lib/ai-providers/gemini-client.ts - Real Implementation with Google AI SDK

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
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
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
            processingSteps.push('Preparing prompt for Gemini');

            const systemPrompt = NOTE_GENERATION_PROMPTS.systemPrompt;
            const userPrompt = NOTE_GENERATION_PROMPTS.noteGenerationPrompt(
                request.transcript.content,
                request.template?.content,
                request.patientContext
            );

            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

            processingSteps.push('Making API call to Gemini');

            // Call the actual Gemini API
            const providerStartTime = Date.now();
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const generatedContent = response.text();

            const providerDuration = Date.now() - providerStartTime;
            processingSteps.push(`Gemini API call completed in ${providerDuration}ms`);

            if (!generatedContent || generatedContent.trim().length === 0) {
                throw new AIProviderError(
                    'Gemini returned empty response',
                    'gemini',
                    'EMPTY_RESPONSE'
                );
            }

            processingSteps.push('Processing Gemini response');

            // Validate Epic syntax
            const epicValidation = this.validateEpicSyntax(generatedContent);

            // Calculate quality score based on content analysis
            const qualityScore = this.calculateQualityScore(generatedContent, request);

            processingSteps.push(`Quality assessment completed: ${qualityScore}/10`);

            // Create generated note
            const generatedNote: GeneratedNote = {
                id: `note_${Date.now()}`,
                content: generatedContent,
                aiProvider: 'gemini',
                qualityScore,
                epicSyntaxValidation: epicValidation,
                metadata: {
                    generatedAt: new Date(),
                    processingDuration: Date.now() - startTime,
                    tokensUsed: this.estimateTokens(fullPrompt + generatedContent),
                    modelVersion: this.config.model,
                    qualityScore,
                    smartPhrasesDetected: epicValidation.smartPhrases.found,
                    dotPhrasesDetected: epicValidation.dotPhrases.found,
                    templateUsed: request.template?.id,
                    patientId: request.transcript.patientId
                },
                rawResponse: {
                    fullResponse: response,
                    prompt: fullPrompt,
                    generationConfig: this.config
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
            processingSteps.push(`Gemini generation failed: ${error.message}`);

            // Handle specific Gemini API errors
            let errorCode = 'GEMINI_ERROR';
            let errorMessage = error.message || 'Failed to generate note with Gemini';

            if (error.message?.includes('API key')) {
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid or missing Gemini API key';
            } else if (error.message?.includes('quota')) {
                errorCode = 'QUOTA_EXCEEDED';
                errorMessage = 'Gemini API quota exceeded';
            } else if (error.message?.includes('safety')) {
                errorCode = 'SAFETY_FILTER';
                errorMessage = 'Content filtered by Gemini safety settings';
            }

            return {
                success: false,
                error: {
                    code: errorCode,
                    message: errorMessage,
                    details: {
                        originalError: error,
                        apiProvider: 'gemini',
                        model: this.config.model
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
            // Test with a simple generation request
            const result = await this.model.generateContent('Test prompt for health check');
            const response = await result.response;
            return !!response.text();
        } catch (error) {
            console.error('Gemini health check failed:', error);
            return false;
        }
    }

    private calculateQualityScore(content: string, request: NoteGenerationRequest): number {
        let score = 5; // Base score

        // Length check (not too short, not too long)
        if (content.length > 200 && content.length < 2000) score += 1;

        // Medical terminology check
        const medicalTerms = ['patient', 'history', 'examination', 'assessment', 'plan', 'symptoms', 'diagnosis'];
        const foundTerms = medicalTerms.filter(term =>
            content.toLowerCase().includes(term)
        );
        score += Math.min(foundTerms.length * 0.3, 2);

        // Epic syntax preservation
        const smartPhrases = content.match(EPIC_SYNTAX_PATTERNS.smartPhrase) || [];
        const dotPhrases = content.match(EPIC_SYNTAX_PATTERNS.dotPhrase) || [];
        if (smartPhrases.length > 0) score += 1;
        if (dotPhrases.length > 0) score += 0.5;

        // Structure check (sections)
        const sections = ['HISTORY', 'PHYSICAL', 'ASSESSMENT', 'PLAN', 'HPI', 'ROS'];
        const foundSections = sections.filter(section =>
            content.toUpperCase().includes(section)
        );
        if (foundSections.length >= 2) score += 1;

        // Professional language (no first person)
        if (!content.toLowerCase().includes(' i ') && !content.toLowerCase().includes('i ')) {
            score += 0.5;
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
            processingSteps.push('Starting Gemini note generation with custom prompts');

            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

            processingSteps.push('Making API call to Gemini with clinical prompts');

            // Call the actual Gemini API
            const providerStartTime = Date.now();
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const generatedContent = response.text();

            const providerDuration = Date.now() - providerStartTime;
            processingSteps.push(`Gemini API call completed in ${providerDuration}ms`);

            if (!generatedContent || generatedContent.trim().length === 0) {
                throw new AIProviderError(
                    'Gemini returned empty response',
                    'gemini',
                    'EMPTY_RESPONSE'
                );
            }

            processingSteps.push('Processing Gemini clinical response');

            // Validate Epic syntax
            const epicValidation = this.validateEpicSyntax(generatedContent);

            // Calculate quality score based on content analysis
            const qualityScore = this.calculateQualityScore(generatedContent, request);

            processingSteps.push(`Clinical quality assessment completed: ${qualityScore}/10`);

            // Create generated note
            const generatedNote: GeneratedNote = {
                id: `clinical_note_${Date.now()}`,
                content: generatedContent,
                aiProvider: 'gemini',
                qualityScore,
                epicSyntaxValidation: epicValidation,
                metadata: {
                    generatedAt: new Date(),
                    processingDuration: Date.now() - startTime,
                    tokensUsed: this.estimateTokens(fullPrompt + generatedContent),
                    modelVersion: this.config.model,
                    qualityScore,
                    smartPhrasesDetected: epicValidation.smartPhrases.found,
                    dotPhrasesDetected: epicValidation.dotPhrases.found,
                    templateUsed: request.template?.id,
                    patientId: request.transcript.patientId
                },
                rawResponse: {
                    fullResponse: response,
                    prompt: fullPrompt,
                    systemPrompt,
                    userPrompt,
                    generationConfig: this.config
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
            processingSteps.push(`Gemini clinical generation failed: ${error.message}`);

            // Handle specific Gemini API errors
            let errorCode = 'GEMINI_CLINICAL_ERROR';
            let errorMessage = error.message || 'Failed to generate clinical note with Gemini';

            if (error.message?.includes('API key')) {
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid or missing Gemini API key';
            } else if (error.message?.includes('quota')) {
                errorCode = 'QUOTA_EXCEEDED';
                errorMessage = 'Gemini API quota exceeded';
            } else if (error.message?.includes('safety')) {
                errorCode = 'SAFETY_FILTER';
                errorMessage = 'Content filtered by Gemini safety settings';
            }

            return {
                success: false,
                error: {
                    code: errorCode,
                    message: errorMessage,
                    details: {
                        originalError: error,
                        apiProvider: 'gemini',
                        model: this.config.model,
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
        // Rough estimation: ~4 characters per token
        return Math.floor(text.length / 4);
    }
}