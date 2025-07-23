// src/types/editTracking.ts - Updated to match your existing patterns

export interface EditDelta {
    id: string;
    timestamp: number;
    type: 'insert' | 'delete' | 'replace';
    position: number;
    oldContent: string;
    newContent: string;
    length: number;
    clinicalContext: ClinicalContextForTracking;
    userId: string;
    sessionId: string;
}

// Aligned with your existing ClinicalContext from ClinicalContextSelector
export interface ClinicalContextForTracking {
    clinic: 'hmhi-downtown' | 'dbh' | 'other';
    visitType: 'initial' | 'follow-up' | 'crisis' | 'discharge' | 'medication-management' | 'therapy' | 'other';
    emr: 'epic' | 'credible' | 'other';
    specialty: 'psychiatry' | 'psychology' | 'behavioral-health' | 'primary-care' | 'other';

    // Additional context for learning
    institution?: string;
    noteType?: string;
    encounterType?: string;
    patientDemographics?: {
        ageRange?: '0-18' | '19-30' | '31-50' | '51-70' | '70+';
        primaryDiagnosis?: string;
        clinic?: 'hmhi-downtown' | 'dbh' | 'other';
    };

    // Your generation settings
    generationSettings?: {
        updateHPI?: boolean;
        generateAssessment?: boolean;
        addIntervalUpdate?: boolean;
        updatePlan?: boolean;
        modifyPsychExam?: boolean;
        includeEpicSyntax?: boolean;
        comprehensiveIntake?: boolean;
        referencePreviousVisits?: boolean;
    };
}

export interface NoteEditSession {
    id: string;
    noteId: string;
    patientId: string;
    userId: string;
    clinicalContext: ClinicalContextForTracking;

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

    // AI generation metadata - matching your API response format
    aiProvider: 'gemini' | 'claude';
    promptVersion: string;
    generationTime: number;
    templateId?: string; // Your template system

    // User feedback (implicit from edits)
    editPatterns: EditPattern[];
    inferredFeedback: InferredFeedback;

    // Firebase timestamps - matching your pattern
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    lastModified: any; // Your existing pattern
}

export interface EditPattern {
    type: 'consistent_deletion' | 'consistent_addition' | 'style_change' | 'medical_correction' | 'structure_change';
    description: string;
    frequency: number;
    confidence: number; // 0-1
    examples: string[];
    suggestedPromptChange?: string;

    // Contextual relevance
    relevantToClinic?: 'hmhi-downtown' | 'dbh' | 'both';
    relevantToEMR?: 'epic' | 'credible' | 'both';
    relevantToVisitType?: string[];
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
        epic_syntax_issues: number; // 0-1 confidence - specific to your Epic workflows
        credible_format_issues: number; // 0-1 confidence - specific to your Credible workflows
    };

    // Learning recommendations - aligned with your clinical settings
    recommendedPromptAdjustments: {
        addInstructions: string[];
        removeInstructions: string[];
        adjustTone: 'more_formal' | 'more_casual' | 'more_clinical' | null;
        adjustLength: 'shorter' | 'longer' | null;
        adjustStructure: string | null;

        // Specific to your generation settings
        adjustEpicSyntax?: boolean;
        adjustHPIGeneration?: boolean;
        adjustAssessmentStyle?: boolean;
        adjustPlanFormat?: boolean;
    };
}

export interface PromptEvolution {
    id: string;
    basePromptId: string;
    version: string;
    clinicalContext: ClinicalContextForTracking;

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
        epicSyntaxPreservation?: number; // Specific to your Epic workflow
    };

    // A/B testing
    isActive: boolean;
    testGroup?: 'control' | 'variant_a' | 'variant_b';
    testStartDate?: any; // Firestore Timestamp
    testEndDate?: any; // Firestore Timestamp

    // Firebase timestamps - matching your pattern
    createdAt: any; // Firestore Timestamp
    updatedAt?: any; // Firestore Timestamp
    performanceHistory: PromptPerformance[];
}

export interface PromptPerformance {
    date: any; // Firestore Timestamp
    sessionsCount: number;
    averageEditCount: number;
    averageEditTime: number;
    userSatisfactionScore: number;
    commonEditPatterns: string[];

    // Context-specific metrics
    hmhiPerformance?: number; // HMHI Downtown specific
    dbhPerformance?: number;  // Davis Behavioral Health specific
    epicAccuracy?: number;    // Epic EMR specific
    credibleAccuracy?: number; // Credible EMR specific
}

// Firebase Collection Names - aligned with your existing patterns
export const FIREBASE_COLLECTIONS = {
    // Your existing collections
    PATIENTS: 'patients',
    NOTES: 'notes', // if you have this

    // New Phase 4A collections
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

    // Context-specific insights
    clinicSpecificInsights?: {
        clinic: 'hmhi-downtown' | 'dbh';
        insights: string[];
    };
    emrSpecificInsights?: {
        emr: 'epic' | 'credible';
        insights: string[];
    };
}

export interface LearningMetrics {
    userId: string;
    clinicalContext: ClinicalContextForTracking;
    timeRange: {
        start: any; // Firestore Timestamp
        end: any;   // Firestore Timestamp
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

    // Context-specific metrics - aligned with your workflow
    clinicPerformance?: {
        hmhiDowntown?: {
            averageEditCount: number;
            averageEditTime: number;
            satisfaction: number;
        };
        dbh?: {
            averageEditCount: number;
            averageEditTime: number;
            satisfaction: number;
        };
    };

    emrPerformance?: {
        epic?: {
            syntaxPreservation: number;
            smartPhraseAccuracy: number;
            editCount: number;
        };
        credible?: {
            formatAccuracy: number;
            readability: number;
            editCount: number;
        };
    };
}

// Utility type to convert your existing ClinicalContext to tracking format
export type ClinicalContextConverter = {
    fromExisting: (context: {
        clinic: 'hmhi-downtown' | 'dbh' | 'other';
        visitType: string;
        emr: 'epic' | 'credible' | 'other';
        generationSettings?: any;
    }) => ClinicalContextForTracking;
};

export const clinicalContextConverter: ClinicalContextConverter = {
    fromExisting: (context) => ({
        clinic: context.clinic,
        visitType: context.visitType as any,
        emr: context.emr,
        specialty: 'psychiatry', // Default based on your app
        institution: context.clinic === 'hmhi-downtown' ? 'HMHI Downtown' :
            context.clinic === 'dbh' ? 'Davis Behavioral Health' : 'Other',
        noteType: 'psychiatric',
        encounterType: context.visitType,
        generationSettings: context.generationSettings
    })
};