// src/types/notes.ts
// 📝 Types for clinical notes and related functionality

import { Timestamp } from 'firebase/firestore';

// Core note interfaces
export interface EnhancedNote {
    id: string;
    content: string;
    originalContent?: string;
    metadata: NoteMetadata;
    userId: string;
    isEdited: boolean;
    editAnalytics: EditAnalytics;
    versions: NoteVersion[];
    tags?: string[];
    createdAt: Timestamp;
    generatedAt: Timestamp;
    lastModified: Timestamp;
    status: 'draft' | 'final' | 'archived';
}

// Note metadata interface
export interface NoteMetadata {
    patientId: string;
    patientName: string;
    transcriptLength: number;
    promptLength: number;
    aiProvider: 'gemini' | 'claude';
    generatedAt: Date;
    visitType: 'transfer-of-care' | 'psychiatric-intake' | 'follow-up' | 'emergency';
    clinic: string;
    emr: 'epic' | 'credible' | 'other';
    clinicalContext: any;
    validation: boolean;
    validationDetails: any;
    noteType?: string;
    isTransferOfCare?: boolean;
    transferMetadata?: TransferMetadata;
    qualityScore?: number;
    processingTime?: number;
}

// Transfer of care metadata
export interface TransferMetadata {
    previousNoteFormat: 'SOAP' | 'NARRATIVE';
    previousNoteEmr: 'epic' | 'credible';
    sectionsCount: number;
    confidence: number;
}

// Edit analytics for tracking user modifications
export interface EditAnalytics {
    totalEdits: number;
    totalEditTime: number; // in milliseconds
    sectionsEdited: string[];
    editHistory: EditEvent[];
}

export interface EditEvent {
    timestamp: Date;
    section?: string;
    changeType: 'addition' | 'deletion' | 'modification';
    charactersAdded: number;
    charactersRemoved: number;
    timeSpent: number; // in milliseconds
}

// Note versioning
export interface NoteVersion {
    version: number;
    content: string;
    timestamp: Date;
    changesSummary: string;
    editedBy?: string;
}

// Note template interfaces
export interface NoteTemplate {
    id: string;
    name: string;
    description?: string;
    category: 'SOAP' | 'H&P' | 'Progress' | 'Discharge' | 'Transfer' | 'Custom';
    content: string;
    sections?: TemplateSection[];
    variables?: TemplateVariable[];
    isPublic: boolean;
    isStructured: boolean;
    createdBy: string;
    institution: string;
    createdAt: Timestamp;
    lastModified: Timestamp;
    usageCount: number;
    epicElements?: EpicElements;
}

export interface TemplateSection {
    id: string;
    name: string;
    content: string;
    order: number;
    required: boolean;
    type: 'text' | 'list' | 'table' | 'smartphrase';
}

export interface TemplateVariable {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    defaultValue?: any;
    options?: string[]; // for select type
    required: boolean;
    description?: string;
}

// Epic SmartPhrase and SmartList support
export interface EpicElements {
    smartPhrases: string[]; // @VITALS@, @REVIEW@, etc.
    smartLists: string[]; // {Mood:1234}, {Behavior:5678}, etc.
    wildcards: string[]; // *** placeholders for manual entry
}

// Note search and filtering
export interface NoteSearchFilters {
    patientId?: string;
    aiProvider?: 'gemini' | 'claude';
    visitType?: EnhancedNote['metadata']['visitType'];
    clinic?: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
    status?: EnhancedNote['status'];
    hasTransferData?: boolean;
    qualityScore?: {
        min: number;
        max: number;
    };
    searchTerm?: string;
    tags?: string[];
}

export interface NoteSearchResult {
    notes: EnhancedNote[];
    totalCount: number;
    hasMore: boolean;
    nextCursor?: string;
}

// Note generation request/response
export interface NoteGenerationRequest {
    transcript: {
        content: string;
    };
    patientId: string;
    clinicalContext: any;
    userId: string;
    templateId?: string;
    transferOfCareData?: TransferOfCareData;
    preferredProvider?: 'gemini' | 'claude';
}

export interface TransferOfCareData {
    previousNote: string;
    parsedNote: {
        format: 'SOAP' | 'NARRATIVE';
        emrType: 'epic' | 'credible';
        sections: Array<{
            type: string;
            content: string;
            wordCount: number;
            hasEpicSyntax: boolean;
        }>;
        confidence: number;
    };
}

export interface NoteGenerationResponse {
    success: boolean;
    note?: EnhancedNote;
    error?: string;
    metadata?: {
        aiProvider: string;
        generatedAt: string;
        clinicalContext: any;
        validation: any;
        noteType: string;
        isTransferOfCare: boolean;
        processingTime: number;
    };
}

// Note validation
export interface NoteValidation {
    isValid: boolean;
    score: number; // 1-10 quality score
    issues: ValidationIssue[];
    suggestions: string[];
    epicSyntaxValid: boolean;
    soapStructureValid: boolean;
}

export interface ValidationIssue {
    type: 'warning' | 'error';
    section: string;
    message: string;
    suggestion?: string;
}

// Note statistics and analytics
export interface NoteStatistics {
    totalNotes: number;
    notesByProvider: {
        gemini: number;
        claude: number;
    };
    notesByVisitType: Record<string, number>;
    averageQualityScore: number;
    averageProcessingTime: number;
    totalEditTime: number;
    averageEditsPerNote: number;
    transferOfCareNotes: number;
}

// Export interfaces
export interface NoteExport {
    format: 'epic' | 'credible' | 'pdf' | 'docx' | 'txt';
    includeMetadata: boolean;
    includeEditHistory: boolean;
    dateRange?: {
        start: Date;
        end: Date;
    };
    patientIds?: string[];
}

// Collaboration and sharing
export interface NoteShare {
    id: string;
    noteId: string;
    sharedBy: string;
    sharedWith: string[];
    permissions: ('read' | 'edit' | 'comment')[];
    expiresAt?: Date;
    createdAt: Date;
}

export interface NoteComment {
    id: string;
    noteId: string;
    userId: string;
    userName: string;
    content: string;
    section?: string; // Which section of the note
    createdAt: Date;
    isResolved: boolean;
}

// Utility types
export type NoteStatus = EnhancedNote['status'];
export type VisitType = NoteMetadata['visitType'];
export type AIProvider = NoteMetadata['aiProvider'];
export type EMRType = NoteMetadata['emr'];

// Error types
export interface NoteError {
    code: string;
    message: string;
    details?: any;
}

// Constants
export const NOTE_STATUSES = ['draft', 'final', 'archived'] as const;
export const VISIT_TYPES = ['transfer-of-care', 'psychiatric-intake', 'follow-up', 'emergency'] as const;
export const AI_PROVIDERS = ['gemini', 'claude'] as const;
export const EMR_TYPES = ['epic', 'credible', 'other'] as const;