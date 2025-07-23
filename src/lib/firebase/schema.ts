// src/lib/firebase/schema.ts - Enhanced schema with feedback collections

import { Timestamp } from 'firebase/firestore';

// ====== EXISTING COLLECTIONS (Enhanced) ======

export interface User {
    id: string;
    email: string;
    displayName: string;
    institution: string;
    role: 'physician' | 'nurse' | 'admin' | 'resident';
    preferences: {
        defaultAIProvider: 'gemini' | 'claude';
        templatesPerPage: number;
        autoSaveNotes: boolean;
        enablePersonalizedPrompts: boolean; // 🆕 NEW
        feedbackFrequency: 'always' | 'sometimes' | 'rarely'; // 🆕 NEW
    };
    createdAt: Timestamp;
    lastActive: Timestamp;

    // 🆕 NEW: Prompt learning statistics
    promptStats?: {
        totalFeedbackProvided: number;
        averageRating: number;
        personalizedPromptsEnabled: boolean;
        lastPersonalizationUpdate: Timestamp;
    };
}

export interface Note {
    id: string;
    encounterId: string;
    patientId: string;
    patientName: string;
    templateUsed: string;
    generatedContent: string;
    aiProvider: 'gemini' | 'claude';
    processingTime: number;
    qualityScore?: number; // Existing 1-10 scoring
    epicElements: {
        smartPhrases: string[];
        smartLists: string[];
        wildcards: string[];
    };
    createdBy: string;
    createdAt: Timestamp;
    exported: boolean;
    exportedAt?: Timestamp;

    // 🆕 NEW: Feedback tracking
    feedbackCollected?: boolean;
    feedbackRating?: 1 | 2 | 3 | 4 | 5;
    promptVariant?: string; // For A/B testing
    personalizedPromptUsed?: boolean;
}

// ====== NEW COLLECTIONS FOR FEEDBACK SYSTEM ======

export interface NoteFeedback {
    id: string;
    noteId: string;
    userId: string;
    patientId: string;
    aiProvider: 'gemini' | 'claude';

    // Rating and feedback data
    rating: 1 | 2 | 3 | 4 | 5;
    qualityIssues: (
        'too_long' |
        'too_brief' |
        'missing_details' |
        'wrong_tone' |
        'poor_structure' |
        'medical_inaccuracy' |
        'epic_syntax_errors' |
        'irrelevant_content' |
        'formatting_issues'
    )[];
    freeformFeedback: string;
    timeToReview: number; // seconds spent reviewing note

    // Context for learning
    templateUsed: string;
    noteLength: number;
    clinicalSpecialty?: string;
    encounterType?: string;

    // Improvement suggestions
    suggestedPromptChanges?: string;
    wouldUseAgain: boolean;

    createdAt: Timestamp;
}

export interface UserPromptProfile {
    id: string;
    userId: string;

    // Personalization data
    preferredNoteStyle: 'concise' | 'detailed' | 'structured' | 'narrative';
    preferredTone: 'professional' | 'clinical' | 'conversational';
    averageNoteLength: 'short' | 'medium' | 'long';
    specialtyFocus?: string;

    // Learned preferences from feedback
    customPromptAdditions: string[];
    avoidedPhrases: string[];
    preferredTemplateStructure?: string;

    // Performance tracking
    personalizedPromptPerformance: {
        averageRating: number;
        totalNotes: number;
        improvementOverBaseline: number; // percentage
        lastCalculated: Timestamp;
    };

    // A/B testing results
    successfulPromptVariants: string[];

    createdAt: Timestamp;
    lastUpdated: Timestamp;
}

export interface PromptExperiment {
    id: string;
    userId: string;

    // Experiment setup
    basePrompt: string;
    variantPrompts: string[];
    currentVariantIndex: number;

    // Test configuration
    status: 'active' | 'completed' | 'paused';
    targetNoteCount: number;
    confidenceThreshold: number; // statistical significance

    // Results tracking
    variantResults: {
        variantId: string;
        prompt: string;
        noteCount: number;
        averageRating: number;
        averageProcessingTime: number;
        feedbackCount: number;
    }[];

    // Statistical analysis
    statisticalSignificance?: number;
    winningVariant?: string;
    improvementPercentage?: number;

    createdAt: Timestamp;
    completedAt?: Timestamp;
}

export interface PromptOptimization {
    id: string;
    userId: string;

    // Analysis data
    feedbackPatterns: {
        commonIssues: { issue: string; frequency: number; }[];
        ratingDistribution: { rating: number; count: number; }[];
        timeToReviewTrends: number[];
    };

    // Generated improvements
    suggestedPromptChanges: {
        changeType: 'addition' | 'modification' | 'removal';
        originalText: string;
        suggestedText: string;
        reasoning: string;
        confidence: number;
    }[];

    // Performance predictions
    predictedImprovements: {
        qualityScore: number;
        userSatisfaction: number;
        processingTime: number;
    };

    // Implementation status
    status: 'pending' | 'testing' | 'applied' | 'rejected';
    appliedAt?: Timestamp;

    createdAt: Timestamp;
}

// ====== COLLECTION NAMES ======

export const FEEDBACK_COLLECTIONS = {
    NOTE_FEEDBACK: 'note_feedback',
    USER_PROMPT_PROFILES: 'user_prompt_profiles',
    PROMPT_EXPERIMENTS: 'prompt_experiments',
    PROMPT_OPTIMIZATIONS: 'prompt_optimizations',
} as const;

// Enhanced collection names (including existing ones)
export const COLLECTIONS = {
    // Existing collections
    USERS: 'users',
    PATIENTS: 'patients',
    NOTES: 'notes',
    TEMPLATES: 'templates',
    ENCOUNTERS: 'encounters',
    SMART_LINKS: 'smart_links',
    DOT_PHRASES: 'dot_phrases',

    // New feedback collections
    ...FEEDBACK_COLLECTIONS,
} as const;

// ====== FIRESTORE INDEXES (Required for queries) ======

export const REQUIRED_INDEXES = [
    // Feedback queries
    { collection: 'note_feedback', fields: ['userId', 'createdAt'] },
    { collection: 'note_feedback', fields: ['userId', 'rating'] },
    { collection: 'note_feedback', fields: ['aiProvider', 'rating'] },

    // User profile queries
    { collection: 'user_prompt_profiles', fields: ['userId'] },

    // Experiment queries
    { collection: 'prompt_experiments', fields: ['userId', 'status'] },
    { collection: 'prompt_experiments', fields: ['userId', 'createdAt'] },

    // Optimization queries
    { collection: 'prompt_optimizations', fields: ['userId', 'status'] },
    { collection: 'prompt_optimizations', fields: ['userId', 'createdAt'] },
];

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

// Add this to the END of your src/lib/firebase/schema.ts file

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