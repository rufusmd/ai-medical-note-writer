// src/types/medical.ts
import { Timestamp } from 'firebase/firestore';

export interface Patient {
    id: string;
    name: string;
    mrn?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface NoteTemplate {
    id: string;
    name: string;
    category: string;
    content: string; // With SmartPhrases/SmartLists
    isStructured: boolean;
    sections?: TemplateSection[];
    createdBy: string;
    institution: string;
    isPublic: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TemplateSection {
    id: string;
    name: string;
    content: string;
    order: number;
}

export interface GeneratedNote {
    id: string;
    patientId: string;
    templateId: string;
    content: string;
    aiProvider: 'gemini' | 'claude';
    generationTime: number;
    fallbackUsed: boolean;
    createdBy: string;
    createdAt: Timestamp;
}

export interface Encounter {
    id: string;
    patientId: string;
    transcript: string;
    notes: string[];
    startTime: Timestamp;
    endTime?: Timestamp;
    createdBy: string;
}