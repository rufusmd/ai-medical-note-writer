// src/lib/ai-providers/types.ts - Complete Types with All Missing Exports

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface PatientTranscript {
    id: string;
    content: string;
    timestamp: Date;
    patientId?: string;
    encounterType?: 'office-visit' | 'telehealth' | 'emergency' | 'consultation' | 'follow-up';
    duration?: number; // in minutes
    metadata?: Record<string, any>;
}

export interface NoteTemplate {
    id: string;
    name: string;
    description?: string;
    content: string;
    category: string;
    isStructured: boolean;
    sections?: TemplateSection[];
    smartPhrases?: string[]; // @SMARTPHRASE@ references
    dotPhrases?: string[]; // .dotphrase references
    epicCompatible: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
}

export interface TemplateSection {
    id: string;
    name: string;
    content: string;
    order: number;
    required: boolean;
    smartPhrases?: string[];
}

export interface PatientContext {
    id: string;
    name?: string;
    mrn?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    chiefComplaint?: string;
    allergies?: string[];
    medications?: string[];
    medicalHistory?: string[];
    lastVisit?: Date;
}

export interface NoteGenerationPreferences {
    includeSmartPhrases: boolean;
    includeDotPhrases: boolean;
    preserveEpicSyntax: boolean;
    detailLevel: 'brief' | 'standard' | 'detailed';
    focusAreas?: string[];
    excludeAreas?: string[];
}

export interface NoteGenerationRequest {
    transcript: PatientTranscript;
    template?: NoteTemplate;
    patientContext?: PatientContext;
    preferences?: NoteGenerationPreferences;
}

export interface GeneratedNote {
    id: string;
    content: string;
    aiProvider: 'gemini' | 'claude';
    qualityScore: number; // 1-10 scale
    epicSyntaxValidation: EpicSyntaxValidation;
    metadata: {
        generatedAt: Date;
        processingDuration: number;
        tokensUsed: number;
        modelVersion: string;
        qualityScore: number;
        smartPhrasesDetected: string[];
        dotPhrasesDetected: string[];
        templateUsed?: string;
        patientId?: string;
    };
    rawResponse?: any; // Original AI response for debugging
}

export interface EpicSyntaxValidation {
    isValid: boolean;
    smartPhrases: {
        found: string[];
        missing: string[];
        malformed: string[];
    };
    dotPhrases: {
        found: string[];
        missing: string[];
        malformed: string[];
    };
    wildcards: {
        found: string[];
        replaced: boolean;
    };
}

export interface NoteGenerationResponse {
    success: boolean;
    note?: GeneratedNote;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    fallbackUsed?: boolean;
    performance: {
        totalDuration: number;
        providerDuration: number;
        processingSteps: string[];
    };
}

export interface ProviderComparisonResult {
    comparison: {
        qualityScores: Record<string, number>;
        epicSyntaxPreservation: Record<string, boolean>;
        responseTime: Record<string, number>;
        recommendation: 'gemini' | 'claude' | 'manual_review';
        reasoning: string;
    };
    notes?: {
        gemini?: GeneratedNote;
        claude?: GeneratedNote;
    };
}

// =============================================================================
// AI PROVIDER INTERFACES
// =============================================================================

export interface AIProvider {
    name: 'gemini' | 'claude';
    generateNote(request: NoteGenerationRequest): Promise<NoteGenerationResponse>;
    generateNoteWithPrompts(request: NoteGenerationRequest, systemPrompt: string, userPrompt: string): Promise<NoteGenerationResponse>;
    validateEpicSyntax(content: string): EpicSyntaxValidation;
    isHealthy(): Promise<boolean>;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class AIProviderError extends Error {
    public readonly provider: 'gemini' | 'claude';
    public readonly code: string;
    public readonly details?: any;

    constructor(message: string, provider: 'gemini' | 'claude', code: string, details?: any) {
        super(message);
        this.name = 'AIProviderError';
        this.provider = provider;
        this.code = code;
        this.details = details;
    }
}

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const AI_PROVIDER_MODELS = {
    gemini: {
        model: 'gemini-1.5-pro',
        maxTokens: 8192,
        temperature: 0.3, // Lower for medical accuracy
        contextWindow: 1000000,
        costPer1kTokens: 0.00375,
    },
    claude: {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4096,
        temperature: 0.2, // Even lower for medical precision
        contextWindow: 200000,
        costPer1kTokens: 0.003,
    }
} as const;

// =============================================================================
// EPIC SYNTAX PATTERNS
// =============================================================================

export const EPIC_SYNTAX_PATTERNS = {
    smartPhrase: /@([A-Z][A-Z0-9]*[A-Z])@/g,
    dotPhrase: /\.([a-z][a-z0-9]*[a-z])/g,
    smartList: /\{([A-Za-z\s]+):(\d+)\}/g,
    wildcard: /\*\*\*/g,

    // Validation patterns
    validSmartPhrase: /^@[A-Z][A-Z0-9]*[A-Z]@$/,
    validDotPhrase: /^\.[a-z][a-z0-9]*[a-z]$/,
    validSmartList: /^\{[A-Za-z\s]+:\d+\}$/,

    // Common Epic elements
    commonSmartPhrases: [
        '@ASSESSMENT@',
        '@PLAN@',
        '@HPI@',
        '@ROS@',
        '@PHYSICAL@',
        '@VITALS@',
        '@ALLERGIES@',
        '@MEDICATIONS@',
        '@ORDERS@',
        '@FOLLOWUP@'
    ],

    commonDotPhrases: [
        '.hpi',
        '.ros',
        '.physical',
        '.assessment',
        '.plan',
        '.vitals',
        '.allergies',
        '.meds',
        '.orders',
        '.followup'
    ]
} as const;

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export const NOTE_GENERATION_PROMPTS = {
    systemPrompt: `You are an expert medical AI assistant specialized in generating HIPAA-compliant clinical notes. Your role is to:

1. Generate accurate, professional clinical documentation from patient transcripts
2. Preserve Epic EMR syntax including @SMARTPHRASES@, .dotphrases, and {SmartLists:123}
3. Maintain strict medical accuracy and appropriate clinical language
4. Structure notes according to standard medical documentation practices
5. NEVER include patient identifiers or specific personal information
6. Always use clinical terminology appropriately
7. Include relevant Epic SmartPhrase placeholders where appropriate

CRITICAL REQUIREMENTS:
- Preserve ALL Epic syntax elements EXACTLY as they appear: @SMARTPHRASE@, .dotphrase, {SmartList:123}
- Use *** as wildcards for variable content that should be filled in later
- Generate notes that are ready for Epic EMR integration
- Maintain professional medical tone throughout
- Include appropriate clinical sections based on encounter type`,

    noteGenerationPrompt: (
        transcript: string,
        template?: string,
        patientContext?: PatientContext
    ) => {
        let prompt = `Generate a clinical note from the following patient encounter transcript:

TRANSCRIPT:
${transcript}

`;

        if (template) {
            prompt += `TEMPLATE TO FOLLOW:
${template}

Use this template structure but adapt the content based on the actual transcript. Preserve all Epic syntax elements (@SMARTPHRASES@, .dotphrases, {SmartLists:123}) exactly as they appear.

`;
        }

        if (patientContext) {
            prompt += `PATIENT CONTEXT:
- Age: ${patientContext.age || 'Not specified'}
- Gender: ${patientContext.gender || 'Not specified'}
- Chief Complaint: ${patientContext.chiefComplaint || 'As documented in transcript'}

`;
        }

        prompt += `REQUIREMENTS:
1. Generate a properly structured clinical note
2. Use appropriate medical terminology
3. Preserve Epic syntax: @SMARTPHRASES@, .dotphrases, {SmartLists:123}
4. Use *** wildcards for variable content
5. Include standard sections: HPI, Physical Exam, Assessment, Plan (as appropriate)
6. Maintain HIPAA compliance - no patient identifiers
7. Use professional medical language throughout
8. Make the note ready for Epic EMR integration

Generate the clinical note now:`;

        return prompt;
    },

    qualityAssessmentPrompt: (note: string) => `Assess the quality of this clinical note on a scale of 1-10:

CLINICAL NOTE:
${note}

Rate the note based on:
1. Medical accuracy and appropriateness (25%)
2. Epic syntax preservation (25%)
3. Completeness and structure (25%)
4. Professional language and clarity (25%)

Provide:
- Overall quality score (1-10)
- Brief reasoning for the score
- Any Epic syntax issues found
- Suggestions for improvement

Format your response as JSON:
{
    "qualityScore": number,
    "reasoning": "string",
    "epicSyntaxIssues": ["array of issues"],
    "suggestions": ["array of suggestions"]
}`
} as const;

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type AIProviderName = 'gemini' | 'claude';
export type EncounterType = 'office-visit' | 'telehealth' | 'emergency' | 'consultation' | 'follow-up';
export type DetailLevel = 'brief' | 'standard' | 'detailed';
export type Gender = 'male' | 'female' | 'other' | 'unknown';