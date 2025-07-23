// src/types/notes.ts
// Basic types for notes functionality

export interface EnhancedNote {
    id: string;
    content: string;
    originalContent: string;
    metadata: {
        patientId: string;
        clinicalContext: any;
        generatedAt: Date;
        aiProvider: string;
        visitType?: string;
        clinic?: string;
        emr?: string;
        [key: string]: any;
    };
    versions?: any[];
    lastModified: Date;
    isEdited: boolean;
    editAnalytics: {
        totalEdits: number;
        totalEditTime: number;
        sectionsEdited: string[];
        editHistory: any[];
    };
    createdBy: string;
}

export interface ClinicalContext {
    clinic: string;
    emr: string;
    visitType: string;
    settings: any;
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

export interface NoteMetadata {
    patientId: string;
    clinicalContext: ClinicalContext;
    generatedAt: Date;
    aiProvider: string;
    template?: string;
    qualityScore?: number;
    smartPhrasesDetected?: string[];
    dotPhrasesDetected?: string[];
    epicSyntaxValid?: boolean;
}

// Basic interfaces that can be expanded later
export interface EditSession {
    id: string;
    noteId: string;
    startTime: Date;
    endTime?: Date;
    totalChanges: number;
    changes: any[];
}

export interface DeltaChange {
    id: string;
    timestamp: Date;
    type: 'addition' | 'deletion' | 'modification';
    content: string;
    position: number;
    context: {
        before: string;
        after: string;
    };
    section?: string;
    metadata: {
        wordCount: number;
        characterCount: number;
        timeFromStart: number;
        keystrokes?: number;
    };
}