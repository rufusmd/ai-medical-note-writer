// src/types/editTracking.ts

export interface EditDelta {
    id: string;
    timestamp: number;
    type: 'insert' | 'delete' | 'replace';
    position: number;
    oldContent: string;
    newContent: string;
    length: number;
    clinicalContext: ClinicalContext;
    userId: string;
    sessionId: string;
}

export interface ClinicalContext {
    emrSystem: 'epic' | 'athena' | 'cerner' | 'credible' | 'other';
    institution: string;
    noteType: string;
    encounterType: 'initial' | 'follow-up' | 'crisis' | 'discharge' | 'other';
    specialty: string;
    patientDemographics?: {
        ageRange: '0-18' | '19-30' | '31-50' | '51-70' | '70+';
        primaryDiagnosis?: string;
    };
}

export interface NoteEditSession {
    id: string;
    noteId: string;
    patientId: string;
    userId: string;
    clinicalContext: ClinicalContext;

    // Session metadata
    startTime: number;
    endTime?: number;
    totalEditTime: number; // milliseconds actively editing

    // Original and final content
    originalContent: string;
    finalContent: string;
    originalWordCount: number;
    finalWordCount: number;

    // Edit tracking
    deltas: EditDelta[];
    totalEdits: number;
    majorEdits: number; // edits > 50 characters

    // AI generation metadata
    aiProvider: 'gemini' | 'claude';
    promptVersion: string;
    generationTime: number;

    // User feedback (implicit from edits)
    editPatterns: EditPattern[];
    inferredFeedback: InferredFeedback;

    createdAt: Date;
    updatedAt: Date;
}

export interface EditPattern {
    type: 'consistent_deletion' | 'consistent_addition' | 'style_change' | 'medical_correction' | 'structure_change';
    description: string;
    frequency: number;
    confidence: number; // 0-1
    examples: string[];
    suggestedPromptChange?: string;
}

export interface InferredFeedback {
    overallSatisfaction: number; // 1-10 based on edit patterns
    specificIssues: {
        too_verbose: number;      // 0-1 confidence
        too_brief: number;        // 0-1 confidence
        wrong_tone: number;       // 0-1 confidence
        missing_details: number;  // 0-1 confidence
        poor_structure: number;   // 0-1 confidence
        medical_inaccuracy: number; // 0-1 confidence
        style_mismatch: number;   // 0-1 confidence
    };

    // Learning recommendations
    recommendedPromptAdjustments: {
        addInstructions: string[];
        removeInstructions: string[];
        adjustTone: 'more_formal' | 'more_casual' | 'more_clinical' | null;
        adjustLength: 'shorter' | 'longer' | null;
        adjustStructure: string | null;
    };
}

export interface PromptEvolution {
    id: string;
    basePromptId: string;
    version: string;
    clinicalContext: ClinicalContext;

    // Prompt content
    systemPrompt: string;
    userPromptTemplate: string;

    // Learning data
    basedOnSessions: string[]; // NoteEditSession IDs
    improvementMetrics: {
        averageEditCount: number;
        averageEditTime: number;
        userSatisfactionScore: number;
        medicalAccuracyScore: number;
    };

    // A/B testing
    isActive: boolean;
    testGroup?: 'control' | 'variant_a' | 'variant_b';
    testStartDate?: Date;
    testEndDate?: Date;

    createdAt: Date;
    performanceHistory: PromptPerformance[];
}

export interface PromptPerformance {
    date: Date;
    sessionsCount: number;
    averageEditCount: number;
    averageEditTime: number;
    userSatisfactionScore: number;
    commonEditPatterns: string[];
}

// Firebase Collection Names
export const FIREBASE_COLLECTIONS = {
    NOTE_EDIT_SESSIONS: 'noteEditSessions',
    EDIT_DELTAS: 'editDeltas',
    PROMPT_EVOLUTIONS: 'promptEvolutions',
    PROMPT_PERFORMANCE: 'promptPerformance',
    LEARNING_ANALYTICS: 'learningAnalytics'
} as const;

// Edit analysis utilities
export interface EditAnalysisResult {
    patterns: EditPattern[];
    inferredFeedback: InferredFeedback;
    promptSuggestions: string[];
    confidenceScore: number;
}

export interface LearningMetrics {
    userId: string;
    clinicalContext: ClinicalContext;
    timeRange: {
        start: Date;
        end: Date;
    };

    // Performance metrics
    totalSessions: number;
    averageEditCount: number;
    averageEditTime: number;
    improvementTrend: 'improving' | 'stable' | 'declining';

    // Common patterns
    topEditPatterns: EditPattern[];
    recommendedOptimizations: string[];

    // Comparative analysis
    performanceVsBaseline: {
        editCountImprovement: number; // percentage
        timeImprovement: number;      // percentage
        satisfactionImprovement: number; // percentage
    };
}