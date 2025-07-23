// src/types/editTracking.ts - Phase 4A Edit Tracking & Learning Types

import { Timestamp } from 'firebase/firestore';

// Core edit tracking interfaces
export interface EditDelta {
    id: string;
    sessionId: string;
    timestamp: number;

    // Change details
    operation: 'insert' | 'delete' | 'retain' | 'replace';
    position: number;
    length?: number;
    content?: string;
    previousContent?: string;

    // Context information
    sectionType?: 'hpi' | 'assessment' | 'plan' | 'psychexam' | 'header' | 'other';
    charPosition: number;
    lineNumber: number;

    // Metadata
    userAgent: string;
    sessionDuration: number; // milliseconds since edit session started
}

export interface NoteEditSession {
    id: string;
    userId: string;
    patientId: string;
    noteId: string;

    // Session metadata
    startTime: Timestamp;
    endTime?: Timestamp;
    totalDuration?: number; // milliseconds

    // Clinical context for this session
    clinicalContext: ClinicalContextForTracking;

    // Original content and final content
    originalContent: string;
    finalContent: string;
    wordCountChange: number;

    // Edit tracking
    editDeltas: EditDelta[];
    totalEdits: number;
    majorSectionChanges: string[]; // sections that had significant changes

    // User behavior
    pauseDurations: number[]; // milliseconds between edits
    averageTypingSpeed: number; // words per minute
    backspaceFrequency: number;

    // Analysis results
    analysisResults?: EditAnalysisResult;
    isAnalyzed: boolean;

    // Firebase fields
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface ClinicalContextForTracking {
    clinic: 'hmhi-downtown' | 'dbh' | 'other';
    visitType: 'initial' | 'follow-up' | 'crisis' | 'discharge' | 'medication-management' | 'therapy' | 'other';
    emr: 'epic' | 'credible' | 'other';
    specialty?: string;

    // Generation settings that were used
    generationSettings: {
        updateHPI: boolean;
        generateAssessment: boolean;
        addIntervalUpdate: boolean;
        updatePlan: boolean;
        modifyPsychExam: boolean;
        includeEpicSyntax: boolean;
        comprehensiveIntake: boolean;
        referencePreviousVisits: boolean;
    };

    // AI generation metadata
    aiProvider: 'gemini' | 'claude';
    promptVersion: string;
    originalQualityScore?: number;
}

export interface EditPattern {
    id: string;
    userId: string;

    // Pattern identification
    patternType: 'frequent_deletion' | 'consistent_addition' | 'section_reorganization' | 'terminology_preference' | 'style_adjustment';
    description: string;
    confidence: number; // 0-1

    // Context where pattern applies
    clinicalContexts: ClinicalContextForTracking[];
    sectionTypes: string[];

    // Pattern details
    frequencyCount: number;
    exampleEdits: string[];
    suggestedImprovement: string;

    // Metadata
    firstDetected: Timestamp;
    lastSeen: Timestamp;
    isActive: boolean;
}

export interface InferredFeedback {
    id: string;
    sessionId: string;
    userId: string;

    // Feedback inference
    satisfactionScore: number; // 1-10 inferred from edit behavior
    inferenceConfidence: number; // 0-1

    // Specific issues detected
    detectedIssues: {
        verbosity?: 'too_verbose' | 'too_brief';
        accuracy?: 'medical_inaccuracy' | 'missing_details';
        structure?: 'poor_organization' | 'missing_sections';
        style?: 'inappropriate_tone' | 'formatting_issues';
        epic?: 'syntax_errors' | 'missing_smartphrases';
    };

    // Evidence for inference
    evidence: {
        editCount: number;
        majorDeletions: number;
        contentAdditions: number;
        timeSpentEditing: number; // milliseconds
        backspaceRatio: number;
    };

    // Suggested improvements
    suggestedPromptChanges: string[];

    createdAt: Timestamp;
}

export interface EditAnalysisResult {
    sessionId: string;

    // Overall analysis
    overallSatisfaction: number; // 1-10 inferred score
    confidence: number; // 0-1

    // Detected patterns
    patterns: EditPattern[];

    // Specific improvements
    promptSuggestions: {
        systemPromptChanges: string[];
        userPromptAdditions: string[];
        clinicalFocusAreas: string[];
    };

    // Quality metrics
    improvementPotential: number; // 0-1 - how much the AI could improve
    learningPriority: 'high' | 'medium' | 'low';

    // Processing metadata
    analyzedAt: Timestamp;
    analysisVersion: string;
}

export interface UserPromptProfile {
    userId: string;

    // Learned preferences
    preferredStyle: 'concise' | 'detailed' | 'moderate';
    preferredTerminology: 'technical' | 'accessible' | 'mixed';
    structurePreferences: string[];

    // Clinical context optimizations
    contextOptimizations: Array<{
        clinicalContext: ClinicalContextForTracking;
        optimizedPrompt: string;
        performanceMetrics: {
            averageSatisfaction: number;
            editReduction: number; // percentage reduction in edits
            timeToApproval: number; // average seconds to approve note
        };
        lastUpdated: Timestamp;
    }>;

    // Learning metadata
    totalSessions: number;
    totalLearningEvents: number;
    learningVelocity: number; // improvement rate over time

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PromptEvolution {
    id: string;
    userId: string;

    // Version control
    version: string;
    parentVersion?: string;

    // Clinical context this applies to
    clinicalContext: ClinicalContextForTracking;

    // Prompt content
    systemPrompt: string;
    userPromptTemplate: string;

    // Performance metrics
    improvementMetrics: {
        userSatisfactionScore: number; // average 1-10
        editReductionPercentage: number;
        approvalTimeReduction: number; // seconds
        sessionsCount: number;
    };

    // A/B testing
    testGroup?: 'control' | 'variant_a' | 'variant_b';
    isActive: boolean;

    // Learning metadata
    learningSource: EditAnalysisResult[];

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Firebase collection names
export const FIREBASE_COLLECTIONS = {
    EDIT_SESSIONS: 'editSessions',
    EDIT_DELTAS: 'editDeltas',
    EDIT_PATTERNS: 'editPatterns',
    INFERRED_FEEDBACK: 'inferredFeedback',
    EDIT_ANALYSIS: 'editAnalysis',
    USER_PROMPT_PROFILES: 'userPromptProfiles',
    PROMPT_EVOLUTIONS: 'promptEvolutions'
} as const;

// Converter for Firebase
export const clinicalContextConverter = {
    toFirestore: (context: ClinicalContextForTracking) => context,
    fromFirestore: (snapshot: any) => snapshot.data() as ClinicalContextForTracking
};

// Helper types for UI components
export interface EditModeState {
    isEnabled: boolean;
    sessionId: string | null;
    hasUnsavedChanges: boolean;
    originalContent: string;
    currentContent: string;
}

export interface LearningInsight {
    type: 'pattern_detected' | 'improvement_applied' | 'optimization_available';
    title: string;
    description: string;
    confidence: number;
    actionable?: boolean;
    action?: {
        label: string;
        type: 'apply_optimization' | 'view_details' | 'dismiss';
    };
}

// Performance tracking
export interface EditTrackingMetrics {
    deltaCount: number;
    processingTime: number;
    storageSize: number;
    analysisLatency: number;
}