// src/app/api/generate-note-enhanced/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { promptOptimizationService } from '@/lib/ai/promptOptimization';
import {
    ClinicalContext,
    PromptEvolution,
    FIREBASE_COLLECTIONS
} from '@/types/editTracking';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

interface GenerateNoteRequest {
    patient: {
        id: string;
        name: string;
        mrn?: string;
        dob?: string;
        demographics?: any;
        medicalHistory?: any;
        medications?: any[];
        allergies?: any[];
    };
    clinicalContext: ClinicalContext;
    encounterData: {
        chiefComplaint?: string;
        historyOfPresentIllness?: string;
        currentMedications?: any[];
        allergies?: any[];
        vitalSigns?: any;
        physicalExam?: any;
        mentalStatusExam?: any;
        assessmentAndPlan?: string;
    };
    useOptimizedPrompt?: boolean;
    testGroup?: 'control' | 'variant_a' | 'variant_b';
}

interface GenerateNoteResponse {
    note: string;
    provider: 'gemini' | 'claude';
    promptVersion: string;
    generationTime: number;
    qualityScore?: number;
    optimizationUsed?: boolean;
    testGroup?: string;
    tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const startTime = Date.now();
        const body: GenerateNoteRequest = await request.json();

        // Validate required fields
        if (!body.patient || !body.clinicalContext) {
            return NextResponse.json(
                { error: 'Patient and clinical context are required' },
                { status: 400 }
            );
        }

        // Get optimized prompt if available and requested
        let prompt: PromptEvolution | null = null;
        let promptVersion = 'base_v1.0';
        let optimizationUsed = false;

        if (body.useOptimizedPrompt !== false) {
            prompt = await getOptimizedPrompt(body.clinicalContext, body.testGroup);
            if (prompt) {
                promptVersion = prompt.version;
                optimizationUsed = true;
            }
        }

        // Generate the note using optimized or base prompt
        const noteResult = await generateNote(body, prompt);
        const generationTime = Date.now() - startTime;

        // Calculate quality score (simplified version)
        const qualityScore = calculateQualityScore(noteResult.note, body.clinicalContext);

        const response: GenerateNoteResponse = {
            note: noteResult.note,
            provider: 'gemini',
            promptVersion,
            generationTime,
            qualityScore,
            optimizationUsed,
            testGroup: body.testGroup,
            tokenUsage: noteResult.tokenUsage
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Note generation error:', error);

        // Fallback to basic generation if optimized fails
        if (error instanceof Error && error.message.includes('optimized')) {
            try {
                const basicResult = await generateBasicNote(await request.json());
                return NextResponse.json(basicResult);
            } catch (fallbackError) {
                console.error('Fallback generation failed:', fallbackError);
            }
        }

        return NextResponse.json(
            { error: 'Failed to generate note' },
            { status: 500 }
        );
    }
}

// Get optimized prompt for clinical context
async function getOptimizedPrompt(
    clinicalContext: ClinicalContext,
    testGroup?: string
): Promise<PromptEvolution | null> {
    try {
        // Query for active optimized prompts for this clinical context
        const promptsQuery = query(
            collection(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS),
            where('clinicalContext.emrSystem', '==', clinicalContext.emrSystem),
            where('clinicalContext.institution', '==', clinicalContext.institution),
            where('clinicalContext.specialty', '==', clinicalContext.specialty),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const querySnapshot = await getDocs(promptsQuery);

        if (querySnapshot.empty) {
            return null;
        }

        // Filter by test group if specified
        const prompts = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as PromptEvolution))
            .filter(p => !testGroup || p.testGroup === testGroup);

        if (prompts.length === 0) {
            return null;
        }

        // Return the best performing prompt
        return prompts.reduce((best, current) =>
            current.improvementMetrics.userSatisfactionScore > best.improvementMetrics.userSatisfactionScore
                ? current
                : best
        );

    } catch (error) {
        console.error('Error retrieving optimized prompt:', error);
        return null;
    }
}

// Generate note using optimized or base prompt
async function generateNote(
    body: GenerateNoteRequest,
    optimizedPrompt?: PromptEvolution | null
): Promise<{ note: string; tokenUsage: any }> {

    // Build the prompt
    const { systemPrompt, userPrompt } = buildPrompt(body, optimizedPrompt);

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: systemPrompt,
        generationConfig: {
            temperature: 0.1, // Lower temperature for consistency
            maxOutputTokens: 4000,
            topP: 0.8,
            topK: 40
        }
    });

    try {
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const note = response.text();

        // Validate the note meets basic requirements
        if (!note || note.length < 100) {
            throw new Error('Generated note is too short or empty');
        }

        return {
            note: postProcessNote(note, body.clinicalContext),
            tokenUsage: {
                inputTokens: estimateTokens(systemPrompt + userPrompt),
                outputTokens: estimateTokens(note)
            }
        };

    } catch (error) {
        console.error('Gemini generation error:', error);
        throw new Error('Failed to generate note with Gemini');
    }
}

// Build prompt based on clinical context and optimizations
function buildPrompt(
    body: GenerateNoteRequest,
    optimizedPrompt?: PromptEvolution | null
): { systemPrompt: string; userPrompt: string } {

    if (optimizedPrompt) {
        // Use optimized prompt
        const userPrompt = optimizedPrompt.userPromptTemplate
            .replace('{{patientInfo}}', formatPatientInfo(body.patient))
            .replace('{{institution}}', body.clinicalContext.institution)
            .replace('{{noteType}}', body.clinicalContext.noteType)
            .replace('{{encounterType}}', body.clinicalContext.encounterType)
            .replace('{{specialty}}', body.clinicalContext.specialty)
            .replace('{{encounterData}}', formatEncounterData(body.encounterData));

        return {
            systemPrompt: optimizedPrompt.systemPrompt,
            userPrompt
        };
    }

    // Use base prompt based on clinical context
    return buildBasePrompt(body);
}

// Build base prompt for clinical context
function buildBasePrompt(body: GenerateNoteRequest): { systemPrompt: string; userPrompt: string } {
    const { clinicalContext } = body;

    if (clinicalContext.emrSystem === 'epic' && clinicalContext.specialty === 'psychiatry') {
        return {
            systemPrompt: `You are an expert psychiatric clinician generating comprehensive clinical notes for Epic EMR.

CORE REQUIREMENTS:
- Generate professional, thorough psychiatric notes suitable for Epic EMR
- Use appropriate Epic SmartPhrases (@SMARTPHRASE@) where beneficial
- Follow standard psychiatric documentation structure
- Maintain HIPAA compliance and clinical accuracy
- Use clear, professional medical language

EPIC FORMATTING:
- Structure with clear sections: HPI, MSE, Assessment, Plan
- Include relevant psychiatric rating scales when applicable
- Format medications with proper dosing and frequency
- Use Epic SmartPhrase syntax where appropriate`,

            userPrompt: `Generate a comprehensive psychiatric note for:

PATIENT: ${body.patient.name} (MRN: ${body.patient.mrn || 'N/A'})
INSTITUTION: ${clinicalContext.institution}
ENCOUNTER TYPE: ${clinicalContext.encounterType}

CLINICAL DATA:
${formatEncounterData(body.encounterData)}

PATIENT MEDICATIONS:
${formatMedications(body.patient.medications || [])}

ALLERGIES:
${formatAllergies(body.patient.allergies || [])}

Generate a complete Epic-formatted psychiatric note.`
        };
    }

    if (clinicalContext.emrSystem === 'credible') {
        return {
            systemPrompt: `You are an expert behavioral health clinician generating clinical notes for Credible EMR.

CORE REQUIREMENTS:
- Generate concise, clear behavioral health notes
- Use plain text format without Epic-specific syntax
- Focus on therapeutic interventions and patient progress
- Maintain professional tone while being accessible
- Include measurable outcomes and treatment goals`,

            userPrompt: `Generate a behavioral health note for:

PATIENT: ${body.patient.name}
INSTITUTION: ${clinicalContext.institution}
ENCOUNTER TYPE: ${clinicalContext.encounterType}

CLINICAL DATA:
${formatEncounterData(body.encounterData)}

Generate a complete note in plain text format suitable for Credible EMR.`
        };
    }

    // Default clinical note
    return {
        systemPrompt: `You are an expert clinician generating professional medical notes.

REQUIREMENTS:
- Generate accurate, comprehensive clinical documentation
- Use appropriate medical terminology and structure
- Maintain professional tone and clinical accuracy
- Follow standard medical documentation practices`,

        userPrompt: `Generate a clinical note for:

PATIENT: ${body.patient.name}
CLINICAL CONTEXT: ${JSON.stringify(clinicalContext, null, 2)}
ENCOUNTER DATA: ${formatEncounterData(body.encounterData)}

Generate a complete clinical note.`
    };
}

// Fallback basic generation
async function generateBasicNote(body: GenerateNoteRequest): Promise<GenerateNoteResponse> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = buildBasePrompt(body);

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: systemPrompt
    });

    const result = await model.generateContent(userPrompt);
    const note = result.response.text();

    return {
        note: postProcessNote(note, body.clinicalContext),
        provider: 'gemini',
        promptVersion: 'fallback_v1.0',
        generationTime: Date.now() - startTime,
        optimizationUsed: false
    };
}

// Helper functions
function formatPatientInfo(patient: any): string {
    return `Name: ${patient.name}
MRN: ${patient.mrn || 'N/A'}
DOB: ${patient.dob || 'N/A'}
Medical History: ${JSON.stringify(patient.medicalHistory || {}, null, 2)}`;
}

function formatEncounterData(encounter: any): string {
    return Object.entries(encounter)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
}

function formatMedications(medications: any[]): string {
    if (!medications.length) return 'None reported';
    return medications.map(med =>
        `- ${med.name || med} ${med.dosage || ''} ${med.frequency || ''}`
    ).join('\n');
}

function formatAllergies(allergies: any[]): string {
    if (!allergies.length) return 'NKDA (No Known Drug Allergies)';
    return allergies.map(allergy =>
        `- ${allergy.allergen || allergy} (${allergy.reaction || 'reaction unknown'})`
    ).join('\n');
}

function postProcessNote(note: string, clinicalContext: ClinicalContext): string {
    // Clean up and format based on EMR system
    let processed = note.trim();

    if (clinicalContext.emrSystem === 'epic') {
        // Ensure Epic SmartPhrase formatting
        processed = processed.replace(/(@[A-Z0-9_]+@)/g, '$1');
    } else if (clinicalContext.emrSystem === 'credible') {
        // Remove any Epic-specific syntax for Credible
        processed = processed.replace(/@[A-Z0-9_]+@/g, '');
    }

    return processed;
}

function calculateQualityScore(note: string, clinicalContext: ClinicalContext): number {
    let score = 5; // Base score

    // Length appropriateness
    const wordCount = note.split(/\s+/).length;
    if (wordCount > 200 && wordCount < 1000) score += 1;

    // Section structure
    const hasSections = /Assessment|Plan|HPI|History/i.test(note);
    if (hasSections) score += 1;

    // Clinical terminology
    const medicalTerms = /patient|diagnosis|treatment|medication|symptoms/gi;
    const termMatches = note.match(medicalTerms);
    if (termMatches && termMatches.length > 5) score += 1;

    // EMR-specific formatting
    if (clinicalContext.emrSystem === 'epic' && /@[A-Z0-9_]+@/.test(note)) {
        score += 1;
    }

    return Math.min(10, Math.max(1, score));
}

function estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
}