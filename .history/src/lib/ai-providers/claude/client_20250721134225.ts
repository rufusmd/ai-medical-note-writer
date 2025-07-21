// src/lib/ai-providers/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerateNoteRequest {
    transcript: string;
    template: string;
    patientInfo?: {
        name?: string;
        age?: number;
        gender?: string;
    };
}

export async function generateNoteWithClaude(request: GenerateNoteRequest): Promise<string> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{
                role: 'user',
                content: `You are a medical AI assistant helping to generate clinical notes. 
Generate a clinical note based on the following:

TRANSCRIPT: ${request.transcript}

TEMPLATE: ${request.template}

IMPORTANT: 
- Preserve all Epic SmartPhrases (text with @PHRASE@ format) exactly as written
- Preserve all Epic SmartLists (text with {Name:ID} format) exactly as written  
- Replace *** wildcards with appropriate content from the transcript
- Use professional medical language
- Ensure HIPAA compliance by being factual and clinical

Generated Note:`
            }]
        });

        return response.content[0].text;
    } catch (error) {
        console.error('Claude API error:', error);
        throw new Error('Failed to generate note with Claude');
    }
}