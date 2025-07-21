// src/types/api.ts
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

export interface APIError {
    error: string;
    details?: string;
}

export interface APIResponse<T> {
    data?: T;
    error?: APIError;
    success: boolean;
}