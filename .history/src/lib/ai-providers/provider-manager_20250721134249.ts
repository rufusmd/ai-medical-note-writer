// src/lib/ai-providers/provider-manager.ts
import { generateNoteWithGemini } from './gemini/client';
import { generateNoteWithClaude } from './claude/client';

export type AIProvider = 'gemini' | 'claude';

export interface GenerateNoteRequest {
    transcript: string;
    template: string;
    patientInfo?: {
        name?: string;
        age?: number;
        gender?: string;
    };
    preferredProvider?: AIProvider;
}

export interface GenerateNoteResponse {
    note: string;
    provider: AIProvider;
    fallbackUsed: boolean;
    generationTime: number;
}

export async function generateNote(request: GenerateNoteRequest): Promise<GenerateNoteResponse> {
    const startTime = Date.now();
    const primaryProvider = request.preferredProvider ||
        (process.env.NEXT_PUBLIC_AI_PROVIDER_PRIMARY as AIProvider) || 'gemini';

    try {
        let note: string;

        if (primaryProvider === 'gemini') {
            note = await generateNoteWithGemini(request);
        } else {
            note = await generateNoteWithClaude(request);
        }

        return {
            note,
            provider: primaryProvider,
            fallbackUsed: false,
            generationTime: Date.now() - startTime
        };
    } catch (error) {
        // Fallback to secondary provider
        console.warn(`Primary provider ${primaryProvider} failed, using fallback:`, error);

        const fallbackProvider = primaryProvider === 'gemini' ? 'claude' : 'gemini';

        try {
            let note: string;

            if (fallbackProvider === 'gemini') {
                note = await generateNoteWithGemini(request);
            } else {
                note = await generateNoteWithClaude(request);
            }

            return {
                note,
                provider: fallbackProvider,
                fallbackUsed: true,
                generationTime: Date.now() - startTime
            };
        } catch (fallbackError) {
            console.error('Both providers failed:', error, fallbackError);
            throw new Error('Note generation failed with both providers');
        }
    }
}