// src/lib/firebase/schema.ts
import { Timestamp } from 'firebase/firestore';

// ====== FEEDBACK SYSTEM TYPES ======

export interface NoteFeedback {
    id: string;
    noteId: string;
    userId: string;
    patientId: string;
    aiProvider: 'gemini' | 'claude';
    rating: 1 | 2 | 3 | 4 | 5;
    qualityIssues: QualityIssue[];
    freeformFeedback: string;
    timeToReview: number; // seconds
    templateUsed: string;
    noteLength: number;
    wouldUseAgain: boolean;
    createdAt: Timestamp;
}

export type QualityIssue =
    | 'too_long'
    | 'too_brief'
    | 'missing_details'
    | 'wrong_tone'
    | 'poor_structure'
    | 'medical_inaccuracy'
    | 'epic_syntax_errors'
    | 'irrelevant_content'
    | 'formatting_issues';

export interface UserPromptProfile {
    id: string;
    userId: string;
    preferredStyle: 'concise' | 'detailed' | 'structured';
    specialtyFocus: string[];
    epicPreferences: {
        useSmartPhrases: boolean;
        useDotPhrases: boolean;
        preferredTemplates: string[];
    };
    feedbackHistory: {
        averageRating: number;
        totalFeedback: number;
        commonIssues: QualityIssue[];
    };
    lastUpdated: Timestamp;
    createdAt: Timestamp;
}

// ====== COLLECTION NAMES ======

export const FEEDBACK_COLLECTIONS = {
    NOTE_FEEDBACK: 'note_feedback',
    USER_PROMPT_PROFILES: 'user_prompt_profiles',
    PROMPT_EXPERIMENTS: 'prompt_experiments',
    PROMPT_OPTIMIZATIONS: 'prompt_optimizations',
} as const;

// ====== QUALITY ISSUE DEFINITIONS ======

export const QUALITY_ISSUES = [
    {
        value: 'too_long' as const,
        label: 'Too Long',
        description: 'Note contains unnecessary information or is verbose'
    },
    {
        value: 'too_brief' as const,
        label: 'Too Brief',
        description: 'Missing important clinical details'
    },
    {
        value: 'missing_details' as const,
        label: 'Missing Details',
        description: 'Lacks specific clinical information'
    },
    {
        value: 'wrong_tone' as const,
        label: 'Wrong Tone',
        description: 'Not appropriate for clinical documentation'
    },
    {
        value: 'poor_structure' as const,
        label: 'Poor Structure',
        description: 'Disorganized or hard to follow'
    },
    {
        value: 'medical_inaccuracy' as const,
        label: 'Medical Inaccuracy',
        description: 'Contains potential medical errors'
    },
    {
        value: 'epic_syntax_errors' as const,
        label: 'Epic Syntax Errors',
        description: 'SmartPhrases or formatting issues'
    },
    {
        value: 'irrelevant_content' as const,
        label: 'Irrelevant Content',
        description: 'Includes unrelated information'
    },
    {
        value: 'formatting_issues' as const,
        label: 'Formatting Issues',
        description: 'Layout or presentation problems'
    },
] as const;

// ====== TYPE GUARDS ======

export const isValidRating = (rating: any): rating is 1 | 2 | 3 | 4 | 5 => {
    return typeof rating === 'number' && rating >= 1 && rating <= 5;
};

export const isValidQualityIssue = (issue: string): boolean => {
    const validIssues = [
        'too_long', 'too_brief', 'missing_details', 'wrong_tone',
        'poor_structure', 'medical_inaccuracy', 'epic_syntax_errors',
        'irrelevant_content', 'formatting_issues'
    ];
    return validIssues.includes(issue);
};