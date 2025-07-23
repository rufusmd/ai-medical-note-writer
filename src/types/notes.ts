// src/types/notes.ts
// ✨ NEW FILE: Enhanced note types for Phase 4A functionality

// Re-export existing types from ai-providers for compatibility
export type {
    AIProvider,
    NoteGenerationRequest,
    NoteGenerationResponse,
    PatientTranscript,
    PatientContext,
    NoteTemplate
} from '@/lib/ai-providers/types';

// ===== ENHANCED NOTE TYPES =====

export interface DeltaChange {
    id: string;
    timestamp: Date;
    type: 'addition' | 'deletion' | 'modification';
    content: string;
    position: number;
    context: {
        before: string;  // 50 characters before change
        after: string;   // 50 characters after change
    };
    section?: string;  // Medical note section (HPI, Assessment, Plan, etc.)
    metadata: {
        wordCount: number;
        characterCount: number;
        timeFromStart: number; // ms since editing started
        keystrokes?: number;
    };
}

export interface EditSession {
    id: string;
    noteId: string;
    startTime: Date;
    endTime?: Date;
    totalChanges: number;
    changes: DeltaChange[];
    clinicalContext: any;
}

export interface NoteVersion {
    id: string;
    content: string;
    timestamp: Date;
    changes: DeltaChange[];
    userId: string;
    analytics: {
        totalChanges: number;
        editTime: number;
        keystrokesPerMinute: number;
        changesBySection: Record<string, number>;
    };
}

export interface EditAnalytics {
    totalEditSessions: number;
    totalChanges: number;
    averageEditTime: number;
    mostEditedSection: string;
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

export interface EnhancedNote {
    id: string;
    content: string;
    originalContent: string;  // Original AI-generated content
    metadata: NoteMetadata;
    versions: NoteVersion[];
    lastModified: Date;
    isEdited: boolean;        // Track if note has been edited
    editAnalytics: EditAnalytics;
    createdBy: string;
}

// ===== CLINICAL CONTEXT TYPES =====

export interface ClinicalContextSettings {
    includeAssessment: boolean;
    includePlan: boolean;
    includeHPI: boolean;
    includeROS: boolean;
    includePE: boolean;
    includeMedications: boolean;
    includeAllergies: boolean;
    includeSocialHistory: boolean;
}

export interface ClinicalContext {
    clinic: string;
    emr: string;
    visitType: string;
    settings: ClinicalContextSettings;
}

// ===== EDITOR CONFIGURATION TYPES =====

export interface EditorPreferences {
    autoSaveInterval: number;     // ms between auto-saves
    showEditHistory: boolean;     // Show edit history sidebar by default
    highlightChanges: boolean;    // Highlight recent changes
    enableSpellCheck: boolean;    // Enable medical spell check
    showWordCount: boolean;       // Show word/character count
    enableKeyboardShortcuts: boolean; // Enable Ctrl+S, etc.
}

export interface EditorState {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    isAutoSaving: boolean;
    lastSaveTime?: Date;
    lastAutoSaveTime?: Date;
    characterCount: number;
    wordCount: number;
    currentSection?: string;
}

// ===== API RESPONSE TYPES =====

export interface NotesListResponse {
    notes: EnhancedNote[];
    pagination: {
        totalCount: number;
        pageSize: number;
        hasMore: boolean;
        lastNoteId: string | null;
    };
}

export interface NoteCreateRequest {
    content: string;
    metadata: Omit<NoteMetadata, 'generatedAt'> & {
        generatedAt?: string | Date;
    };
    userId: string;
}

export interface NoteCreateResponse {
    success: boolean;
    note: EnhancedNote;
}

export interface NoteSaveRequest {
    content: string;
    editSession: EditSession;
    userId: string;
}

export interface NoteSaveResponse {
    success: boolean;
    message: string;
    updatedAnalytics?: EditAnalytics;
}

export interface AutoSaveRequest {
    content: string;
}

export interface AutoSaveResponse {
    success: boolean;
    message: string;
    timestamp: Date;
}

// ===== LEARNING SYSTEM TYPES (for Phase 4B) =====

export interface EditPattern {
    id: string;
    patternType: 'frequent_addition' | 'frequent_deletion' | 'section_reorder' | 'terminology_change';
    section: string;
    frequency: number;
    examples: string[];
    suggestedImprovement: string;
    clinicalContext: ClinicalContext;
}

export interface UserLearningProfile {
    userId: string;
    editPatterns: EditPattern[];
    preferredTerminology: Record<string, string>;
    sectionPreferences: Record<string, boolean>;
    averageEditTime: number;
    mostEditedSections: string[];
    lastUpdated: Date;
}

export interface PromptOptimization {
    id: string;
    originalPrompt: string;
    optimizedPrompt: string;
    improvementReason: string;
    expectedImprovement: number; // percentage
    basedOnPatterns: string[]; // EditPattern IDs
    testResults?: {
        originalQuality: number;
        optimizedQuality: number;
        actualImprovement: number;
    };
}

// ===== UTILITY TYPES =====

export type NoteSection =
    | 'Chief Complaint'
    | 'HPI'
    | 'Assessment'
    | 'Plan'
    | 'Review of Systems'
    | 'Physical Exam'
    | 'Social History'
    | 'Medications'
    | 'Allergies'
    | 'Unknown';

export type ChangeType = 'addition' | 'deletion' | 'modification';

export type VisitType = 'follow-up' | 'intake' | 'transfer-of-care' | 'emergency';

export type EMRSystem = 'Epic' | 'Credible' | 'Other';

export type ClinicName = 'HMHI Downtown' | 'Davis Behavioral Health' | 'Other';

// ===== ERROR TYPES =====

export interface NoteError {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
}

export interface ValidationError extends NoteError {
    field: string;
    value: any;
    expectedType: string;
}

// ===== COMPONENT PROP TYPES =====

export interface EditableNoteViewProps {
    noteId: string;
    initialContent: string;
    metadata: NoteMetadata;
    onSave?: (content: string, changes: DeltaChange[]) => Promise<void>;
    onAutoSave?: (content: string) => Promise<void>;
    readOnly?: boolean;
    preferences?: EditorPreferences;
}

export interface DeltaTrackerProps {
    editor: any;
    noteId: string;
    initialContent: string;
    onDeltaDetected: (delta: DeltaChange) => void;
    children?: React.ReactNode;
}

export interface SaveButtonProps {
    onSave: () => void;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    disabled?: boolean;
}

export interface EditHistoryProps {
    noteId: string;
    editHistory: NoteVersion[];
    onRevertToVersion: (version: NoteVersion) => void;
}

// ===== HOOK TYPES =====

export interface UseNoteEditorReturn {
    editor: any;
    state: EditorState;
    actions: {
        save: () => Promise<void>;
        autoSave: () => Promise<void>;
        undo: () => void;
        redo: () => void;
        focus: () => void;
        getContent: () => string;
        setContent: (content: string) => void;
    };
    deltaTracker: {
        getChanges: () => DeltaChange[];
        getAnalytics: () => any;
        resetBaseline: (content: string) => void;
    };
}

export interface UseEditHistoryReturn {
    history: NoteVersion[];
    loading: boolean;
    error: string | null;
    actions: {
        loadHistory: () => Promise<void>;
        revertToVersion: (version: NoteVersion) => Promise<void>;
        refreshHistory: () => Promise<void>;
    };
}

// ===== CONFIGURATION TYPES =====

export interface DeltaTrackerConfig {
    contextLength: number;        // Characters before/after change to capture
    minChangeLength: number;      // Minimum change length to track
    sectionPatterns: Record<string, RegExp>; // Regex patterns for section detection
    debounceMs: number;          // Debounce time for change detection
    maxChangesPerSession: number; // Maximum changes to track per session
}

export interface AutoSaveConfig {
    enabled: boolean;
    intervalMs: number;          // Auto-save interval in milliseconds
    retryAttempts: number;       // Number of retry attempts on failure
    retryDelayMs: number;        // Delay between retry attempts
}

export interface EditorConfig {
    maxCharacters: number;       // Maximum note length
    enableExtensions: string[];  // TipTap extensions to enable
    keyboardShortcuts: Record<string, () => void>; // Custom keyboard shortcuts
    theme: 'light' | 'dark' | 'auto';
}

// ===== CONSTANTS =====

export const NOTE_SECTIONS: Record<NoteSection, RegExp> = {
    'Chief Complaint': /(?:chief complaint|cc):\s*/i,
    'HPI': /(?:history of present illness|hpi):\s*/i,
    'Assessment': /(?:assessment|impression):\s*/i,
    'Plan': /(?:plan|treatment plan):\s*/i,
    'Review of Systems': /(?:review of systems|ros):\s*/i,
    'Physical Exam': /(?:physical exam|pe|examination):\s*/i,
    'Social History': /(?:social history|sh):\s*/i,
    'Medications': /(?:medications|meds|current medications):\s*/i,
    'Allergies': /(?:allergies|drug allergies):\s*/i,
    'Unknown': /(?:)/ // Fallback pattern
};

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    autoSaveInterval: 2000,      // 2 seconds
    showEditHistory: false,
    highlightChanges: true,
    enableSpellCheck: true,
    showWordCount: true,
    enableKeyboardShortcuts: true
};

export const DEFAULT_DELTA_TRACKER_CONFIG: DeltaTrackerConfig = {
    contextLength: 50,
    minChangeLength: 1,
    sectionPatterns: NOTE_SECTIONS,
    debounceMs: 100,
    maxChangesPerSession: 1000
};

export const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
    enabled: true,
    intervalMs: 2000,
    retryAttempts: 3,
    retryDelayMs: 1000
};