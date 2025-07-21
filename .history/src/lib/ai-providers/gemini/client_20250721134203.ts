// src/lib/ai-providers/gemini/client.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export interface GenerateNoteRequest {
    transcript: string;
    template: string;
    patientInfo?: {
        name?: string;
        age?: number;
        gender?: string;
    };
}

export async function generateNoteWithGemini(request: GenerateNoteRequest): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
You are a medical AI assistant helping to generate clinical notes. 
Generate a clinical note based on the following:

TRANSCRIPT: ${request.transcript}

TEMPLATE: ${request.template}

IMPORTANT: 
- Preserve all Epic SmartPhrases (text with @PHRASE@ format) exactly as written
- Preserve all Epic SmartLists (text with {Name:ID} format) exactly as written  
- Replace *** wildcards with appropriate content from the transcript
- Use professional medical language
- Ensure HIPAA compliance by being factual and clinical

Generated Note:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate note with Gemini');
    }
}