// src/app/api/generate-note-enhanced/route.ts - Updated to work with your existing API structure

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
    ClinicalContextForTracking,
    PromptEvolution,
    FIREBASE_COLLECTIONS,
    clinicalContextConverter
} from '@/types/editTracking';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Your existing request interface - preserved
interface GenerateNoteRequest {
    transcript: string;
    patientId: string;
    patientName: string;
    templateId: string;
    clinicalContext: {
        clinic: 'hmhi-downtown' | 'dbh' | 'other';
        visitType: string;
        emr: 'epic' | 'credible' | 'other';
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
    };
    encounterType: string;
    specialty: string;
    userId: string;

    // NEW - Phase 4A additions (optional for backward compatibility)
    useOptimizedPrompt?: boolean;
    testGroup?: 'control' | 'variant_a' | 'variant_b';
}

// Your existing response interface - enhanced
interface GenerateNoteResponse {
    content: string;
    noteId?: string;
    provider: 'gemini' | 'claude';
    promptVersion: string;
    processingTime: number;
    qualityMetrics?: {
        overallScore: number;
        completeness: number;
    };

    // NEW - Phase 4A additions
    optimizationUsed?: boolean;
    testGroup?: string;
    learningMetadata?: {
        showFeedbackPrompt?: boolean;
        editSessionId?: string;
    };

    // Your existing fields preserved
    generationTime?: number;
    tokenUsage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const startTime = Date.now();
        const body: GenerateNoteRequest = await request.json();

        // Validate required fields - your existing validation
        if (!body.transcript || !body.patientId || !body.clinicalContext) {
            return NextResponse.json(
                { error: 'Transcript, patient ID, and clinical context are required' },
                { status: 400 }
            );
        }

        // Convert your clinical context to tracking format
        const trackingContext = clinicalContextConverter.fromExisting(body.clinicalContext);

        // Get optimized prompt if available and requested
        let prompt: PromptEvolution | null = null;
        let promptVersion = 'base_v1.0';
        let optimizationUsed = false;

        if (body.useOptimizedPrompt !== false) {
            prompt = await getOptimizedPrompt(trackingContext, body.testGroup);
            if (prompt) {
                promptVersion = prompt.version;
                optimizationUsed = true;
            }
        }

        // Generate the note using optimized or base prompt
        const noteResult = await generateNote(body, prompt, trackingContext);
        const processingTime = Date.now() - startTime;

        // Calculate quality score (your existing pattern)
        const qualityMetrics = calculateQualityMetrics(noteResult.content, body.clinicalContext);

        // Create note ID for tracking
        const noteId = `note_${body.userId}_${Date.now()}`;

        const response: GenerateNoteResponse = {
            content: noteResult.content,
            noteId,
            provider: 'gemini',
            promptVersion,
            processingTime,
            qualityMetrics,
            optimizationUsed,
            testGroup: body.testGroup,
            learningMetadata: {
                showFeedbackPrompt: optimizationUsed || Math.random() < 0.3, // 30% chance for feedback
            },
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
    clinicalContext: ClinicalContextForTracking,
    testGroup?: string
): Promise<PromptEvolution | null> {
    try {
        // Query for active optimized prompts for this clinical context
        const promptsQuery = query(
            collection(db, FIREBASE_COLLECTIONS.PROMPT_EVOLUTIONS),
            where('clinicalContext.clinic', '==', clinicalContext.clinic),
            where('clinicalContext.emr', '==', clinicalContext.emr),
            where('clinicalContext.specialty', '==', clinicalContext.specialty || 'psychiatry'),
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
    optimizedPrompt?: PromptEvolution | null,
    trackingContext?: ClinicalContextForTracking
): Promise<{ content: string; tokenUsage: any }> {

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
        const content = response.text();

        // Validate the note meets basic requirements
        if (!content || content.length < 100) {
            throw new Error('Generated note is too short or empty');
        }

        return {
            content: postProcessNote(content, body.clinicalContext),
            tokenUsage: {
                inputTokens: estimateTokens(systemPrompt + userPrompt),
                outputTokens: estimateTokens(content)
            }
        };

    } catch (error) {
        console.error('Gemini generation error:', error);
        throw new Error('Failed to generate note with Gemini');
    }
}

// Build prompt based on your existing clinical context and optimizations
function buildPrompt(
    body: GenerateNoteRequest,
    optimizedPrompt?: PromptEvolution | null
): { systemPrompt: string; userPrompt: string } {

    if (optimizedPrompt) {
        // Use optimized prompt
        const userPrompt = optimizedPrompt.userPromptTemplate
            .replace('{{transcript}}', body.transcript)
            .replace('{{patientName}}', body.patientName)
            .replace('{{patientId}}', body.patientId)
            .replace('{{clinic}}', body.clinicalContext.clinic)
            .replace('{{visitType}}', body.clinicalContext.visitType)
            .replace('{{emr}}', body.clinicalContext.emr)
            .replace('{{templateId}}', body.templateId)
            .replace('{{encounterType}}', body.encounterType)
            .replace('{{specialty}}', body.specialty);

        return {
            systemPrompt: optimizedPrompt.systemPrompt,
            userPrompt
        };
    }

    // Use base prompt based on your clinical context patterns
    return buildBasePrompt(body);
}

// Build base prompt for your clinical contexts
function buildBasePrompt(body: GenerateNoteRequest): { systemPrompt: string; userPrompt: string } {
    const { clinicalContext } = body;
    const isEpic = clinicalContext.emr === 'epic';
    const isHMHI = clinicalContext.clinic === 'hmhi-downtown';
    const includeEpicSyntax = clinicalContext.generationSettings?.includeEpicSyntax !== false;

    // HMHI Downtown + Epic workflow
    if (isHMHI && isEpic) {
        return {
            systemPrompt: `You are an expert psychiatric clinician generating comprehensive clinical notes for HMHI Downtown using Epic EMR.

CORE REQUIREMENTS:
- Generate professional, thorough psychiatric notes suitable for Epic EMR at HMHI Downtown
- Use appropriate Epic SmartPhrases (@SMARTPHRASE@) when beneficial for workflow efficiency
- Follow HMHI Downtown psychiatric documentation standards
- Maintain HIPAA compliance and clinical accuracy
- Use clear, professional medical language appropriate for peer review

EPIC FORMATTING FOR HMHI:
- Structure with clear sections: HPI, MSE, Assessment, Plan
- Include relevant psychiatric rating scales (PHQ-9, GAD-7, etc.) when applicable
- Format medications with proper dosing and frequency
- Use Epic SmartPhrase syntax (@PHRASE@) where it enhances documentation efficiency
- Follow HMHI Downtown's preferred documentation style

GENERATION SETTINGS:
${clinicalContext.generationSettings?.updateHPI ? '- Update and enhance History of Present Illness' : ''}
${clinicalContext.generationSettings?.generateAssessment ? '- Generate comprehensive clinical assessment' : ''}
${clinicalContext.generationSettings?.addIntervalUpdate ? '- Include interval changes and updates' : ''}
${clinicalContext.generationSettings?.updatePlan ? '- Update treatment plan based on current status' : ''}
${clinicalContext.generationSettings?.modifyPsychExam ? '- Include relevant mental status examination findings' : ''}
${clinicalContext.generationSettings?.referencePreviousVisits ? '- Reference previous visit patterns when relevant' : ''}`,

            userPrompt: `Generate a comprehensive psychiatric note for HMHI Downtown:

PATIENT: ${body.patientName} (ID: ${body.patientId})
VISIT TYPE: ${body.clinicalContext.visitType}
TEMPLATE: ${body.templateId}
ENCOUNTER TYPE: ${body.encounterType}

CLINICAL TRANSCRIPT:
${body.transcript}

Generate a complete Epic-formatted psychiatric note following HMHI Downtown standards.`
        };
    }

    // Davis Behavioral Health + Credible workflow
    if (clinicalContext.clinic === 'dbh') {
        return {
            systemPrompt: `You are an expert behavioral health clinician generating clinical notes for Davis Behavioral Health using Credible EMR.

CORE REQUIREMENTS:
- Generate concise, clear behavioral health notes for Davis Behavioral Health
- Use plain text format optimized for Credible EMR (no Epic-specific syntax)
- Focus on therapeutic interventions and patient progress
- Maintain professional tone while being accessible and person-centered
- Include measurable outcomes and treatment goals

CREDIBLE FORMATTING FOR DBH:
- Use standard section headers without special syntax
- Focus on behavioral observations and therapeutic interventions
- Include treatment plan updates and patient response to interventions
- Document safety assessments and risk factors clearly
- Emphasize patient strengths and collaborative treatment approach

GENERATION SETTINGS:
${clinicalContext.generationSettings?.updateHPI ? '- Update and enhance presenting concerns' : ''}
${clinicalContext.generationSettings?.generateAssessment ? '- Generate comprehensive behavioral assessment' : ''}
${clinicalContext.generationSettings?.addIntervalUpdate ? '- Include progress since last visit' : ''}
${clinicalContext.generationSettings?.updatePlan ? '- Update treatment plan based on current progress' : ''}`,

            userPrompt: `Generate a behavioral health note for Davis Behavioral Health:

PATIENT: ${body.patientName}
VISIT TYPE: ${body.clinicalContext.visitType}  
TEMPLATE: ${body.templateId}
ENCOUNTER TYPE: ${body.encounterType}

CLINICAL TRANSCRIPT:
${body.transcript}

Generate a complete note in plain text format suitable for Credible EMR at Davis Behavioral Health.`
        };
    }

    // Default clinical note
    return {
        systemPrompt: `You are an expert clinician generating professional medical notes.

REQUIREMENTS:
- Generate accurate, comprehensive clinical documentation
- Use appropriate medical terminology and structure
- Maintain professional tone and clinical accuracy
- Follow standard medical documentation practices
- Adapt format based on EMR system: ${clinicalContext.emr}`,

        userPrompt: `Generate a clinical note:

PATIENT: ${body.patientName}
VISIT TYPE: ${body.clinicalContext.visitType}
CLINICAL CONTEXT: ${JSON.stringify(clinicalContext, null, 2)}

TRANSCRIPT:
${body.transcript}

Generate a complete clinical note appropriate for ${clinicalContext.emr} EMR.`
    };
}

// Fallback basic generation - preserving your existing pattern
async function generateBasicNote(body: GenerateNoteRequest): Promise<GenerateNoteResponse> {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = buildBasePrompt(body);

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        systemInstruction: systemPrompt
    });

    const result = await model.generateContent(userPrompt);
    const content = result.response.text();

    return {
        content: postProcessNote(content, body.clinicalContext),
        provider: 'gemini',
        promptVersion: 'fallback_v1.0',
        processingTime: Date.now() - startTime,
        optimizationUsed: false
    };
}

// Helper functions - adapted to your patterns
function postProcessNote(content: string, clinicalContext: any): string {
    let processed = content.trim();

    if (clinicalContext.emr === 'epic') {
        // Ensure Epic SmartPhrase formatting is preserved
        processed = processed.replace(/(@[A-Z0-9_]+@)/g, '$1');
    } else if (clinicalContext.emr === 'credible') {
        // Remove any Epic-specific syntax for Credible
        processed = processed.replace(/@[A-Z0-9_]+@/g, '');
    }

    return processed;
}

function calculateQualityMetrics(content: string, clinicalContext: any) {
    let overallScore = 5; // Base score
    let completeness = 50; // Base completeness

    // Length appropriateness
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 200 && wordCount < 1000) {
        overallScore += 1;
        completeness += 15;
    }

    // Section structure
    const hasSections = /Assessment|Plan|HPI|History/i.test(content);
    if (hasSections) {
        overallScore += 1;
        completeness += 15;
    }

    // Clinical terminology
    const medicalTerms = /patient|diagnosis|treatment|medication|symptoms/gi;
    const termMatches = content.match(medicalTerms);
    if (termMatches && termMatches.length > 5) {
        overallScore += 1;
        completeness += 10;
    }

    // EMR-specific formatting
    if (clinicalContext.emr === 'epic' && /@[A-Z0-9_]+@/.test(content)) {
        overallScore += 1;
        completeness += 10;
    }

    return {
        overallScore: Math.min(10, Math.max(1, overallScore)),
        completeness: Math.min(100, Math.max(0, completeness))
    };
}

function estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
}