// src/app/api/generate-note-enhanced/route.ts - Enhanced with Phase 4A Optimization

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

// PRESERVED - Your existing request interface
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

// ENHANCED - Your existing response interface
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

    // PRESERVED - Your existing fields
    generationTime?: number;
    tokenUsage?: {
        prompt: number;
        completion: number;
        total: number;
    };
}

export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        message: 'AI Medical Note Writer API - Enhanced with Learning',
        version: 'v2.0-phase4a',
        features: ['prompt_optimization', 'edit_tracking', 'learning_insights']
    });
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateNoteRequest = await request.json();

        console.log('📝 Enhanced note generation request:', {
            patientName: body.patientName,
            clinic: body.clinicalContext.clinic,
            useOptimized: body.useOptimizedPrompt,
            testGroup: body.testGroup
        });

        // Validate required fields - PRESERVED
        if (!body.transcript || !body.patientId || !body.userId) {
            return NextResponse.json(
                { error: 'Missing required fields: transcript, patientId, or userId' },
                { status: 400 }
            );
        }

        // Convert to tracking format for optimization
        const clinicalContextForTracking: ClinicalContextForTracking = {
            clinic: body.clinicalContext.clinic,
            visitType: body.clinicalContext.visitType as any,
            emr: body.clinicalContext.emr,
            specialty: body.specialty || 'psychiatry',
            generationSettings: {
                updateHPI: body.clinicalContext.generationSettings?.updateHPI || false,
                generateAssessment: body.clinicalContext.generationSettings?.generateAssessment || false,
                addIntervalUpdate: body.clinicalContext.generationSettings?.addIntervalUpdate || false,
                updatePlan: body.clinicalContext.generationSettings?.updatePlan || false,
                modifyPsychExam: body.clinicalContext.generationSettings?.modifyPsychExam || false,
                includeEpicSyntax: body.clinicalContext.generationSettings?.includeEpicSyntax || false,
                comprehensiveIntake: body.clinicalContext.generationSettings?.comprehensiveIntake || false,
                referencePreviousVisits: body.clinicalContext.generationSettings?.referencePreviousVisits || false
            },
            aiProvider: 'gemini',
            promptVersion: 'v1.0'
        };

        // NEW - Phase 4A: Try to get optimized prompt
        let optimizedPrompt: { systemPrompt: string; userPrompt: string; version: string } | null = null;
        let optimizationUsed = false;

        if (body.useOptimizedPrompt !== false) {
            try {
                const basePrompt = buildBasePrompt(body);
                optimizedPrompt = await promptOptimizationService.generateOptimizedPrompt(
                    body.userId,
                    clinicalContextForTracking,
                    basePrompt
                );

                if (optimizedPrompt) {
                    optimizationUsed = true;
                    console.log('✅ Using optimized prompt version:', optimizedPrompt.version);
                } else {
                    console.log('📝 No optimization available, using base prompt');
                }
            } catch (error) {
                console.error('⚠️ Prompt optimization failed, falling back to base:', error);
            }
        }

        // Generate note with optimized or base prompt
        const noteResponse = await generateNote(
            body,
            optimizedPrompt,
            { optimizationUsed, testGroup: body.testGroup }
        );

        console.log('✅ Note generated successfully');
        return NextResponse.json(noteResponse);

    } catch (error) {
        console.error('❌ Error in enhanced note generation:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate note',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// NEW - Function to retrieve optimized prompt from Firebase
async function getOptimizedPrompt(
    userId: string,
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
    optimizedPrompt?: { systemPrompt: string; userPrompt: string; version: string } | null,
    trackingContext?: {
        optimizationUsed: boolean;
        testGroup?: string;
    }
): Promise<GenerateNoteResponse> {

    const startTime = Date.now();

    // Use optimized prompt if available, otherwise fall back to base
    const { systemPrompt, userPrompt } = optimizedPrompt || buildBasePrompt(body);
    const promptVersion = optimizedPrompt?.version || 'base_v1.0';

    try {
        // Generate with Gemini - PRESERVED logic
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userPrompt);
        const content = result.response.text();

        // Post-process note - PRESERVED logic
        const processedContent = postProcessNote(content, body.clinicalContext);
        const processingTime = Date.now() - startTime;

        // Calculate quality metrics - PRESERVED logic
        const qualityMetrics = calculateQualityMetrics(processedContent, body.clinicalContext);

        // Build response with Phase 4A enhancements
        const response: GenerateNoteResponse = {
            content: processedContent,
            provider: 'gemini',
            promptVersion,
            processingTime,
            qualityMetrics,
            // NEW - Phase 4A fields
            optimizationUsed: trackingContext?.optimizationUsed || false,
            testGroup: trackingContext?.testGroup,
            learningMetadata: {
                showFeedbackPrompt: !trackingContext?.optimizationUsed, // Show feedback for non-optimized
                editSessionId: undefined // Will be set when edit session starts
            }
        };

        return response;

    } catch (error) {
        console.error('Error generating note with Gemini:', error);

        // Fallback to basic generation - PRESERVED pattern
        return generateBasicNote(body);
    }
}

// PRESERVED - Your existing base prompt building logic
function buildBasePrompt(body: GenerateNoteRequest): { systemPrompt: string; userPrompt: string } {
    const { clinicalContext } = body;

    // HMHI Downtown - Epic specific prompts - PRESERVED
    if (clinicalContext.clinic === 'hmhi-downtown' && clinicalContext.emr === 'epic') {
        return {
            systemPrompt: `You are an expert psychiatric clinician generating professional medical notes for HMHI Downtown using Epic EMR.

CRITICAL REQUIREMENTS:
- Generate accurate, comprehensive psychiatric documentation
- Use Epic SmartPhrase syntax (@SMARTPHRASE@) appropriately
- Include proper medical terminology and clinical structure
- Maintain professional tone and clinical accuracy
- Follow HMHI Downtown documentation standards

EPIC SYNTAX REQUIREMENTS:
- Use @SMARTPHRASE@ format for Epic elements
- Include @PSYCHEXAM@ for mental status if appropriate
- Use @PSYCHMEDREVIEW@ for medication reviews
- Include @RISKASSESSMENT@ for safety assessments

${clinicalContext.generationSettings?.comprehensiveIntake ? '- Generate comprehensive intake assessment with full clinical history' : ''}
${clinicalContext.generationSettings?.referencePreviousVisits ? '- Reference previous visits and treatment history for continuity' : ''}`,

            userPrompt: `Generate a psychiatric note for HMHI Downtown using Epic EMR:

PATIENT: ${body.patientName}
VISIT TYPE: ${body.clinicalContext.visitType}
TEMPLATE: ${body.templateId}
ENCOUNTER TYPE: ${body.encounterType}

CLINICAL TRANSCRIPT:
${body.transcript}

${clinicalContext.generationSettings?.updateHPI ? '- Include detailed History of Present Illness' : ''}
${clinicalContext.generationSettings?.generateAssessment ? '- Generate comprehensive psychiatric assessment' : ''}
${clinicalContext.generationSettings?.updatePlan ? '- Include detailed treatment plan with specific interventions' : ''}
${clinicalContext.generationSettings?.modifyPsychExam ? '- Include modified psychiatric examination' : ''}

Generate a complete psychiatric note in Epic format with appropriate SmartPhrases.`
        };
    }

    // Davis Behavioral Health - Credible specific - PRESERVED
    if (clinicalContext.clinic === 'dbh') {
        return {
            systemPrompt: `You are an expert behavioral health clinician generating professional medical notes for Davis Behavioral Health using Credible EMR.

REQUIREMENTS:
- Generate accurate, comprehensive behavioral health documentation
- Use clear, professional clinical language
- Follow Credible EMR documentation standards
- Include appropriate behavioral health terminology
- Maintain clinical accuracy and professional tone

${clinicalContext.generationSettings?.comprehensiveIntake ? '- Generate comprehensive intake assessment' : ''}
${clinicalContext.generationSettings?.referencePreviousVisits ? '- Reference treatment history for continuity of care' : ''}`,

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

    // Default clinical note - PRESERVED
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

// PRESERVED - Fallback basic generation
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

// PRESERVED - Helper functions adapted to your patterns
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
    if (wordCount >= 200 && wordCount <= 800) {
        overallScore += 2;
        completeness += 20;
    } else if (wordCount < 100) {
        overallScore -= 1;
        completeness -= 15;
    }

    // Epic syntax validation
    if (clinicalContext.emr === 'epic') {
        const smartPhraseCount = (content.match(/@[A-Z0-9_]+@/g) || []).length;
        if (smartPhraseCount > 0) {
            overallScore += 1;
            completeness += 10;
        }
    }

    // Section completeness
    const sections = ['Assessment', 'Plan', 'HPI'];
    sections.forEach(section => {
        if (content.toLowerCase().includes(section.toLowerCase())) {
            completeness += 5;
        }
    });

    return {
        overallScore: Math.min(10, Math.max(1, overallScore)),
        completeness: Math.min(100, Math.max(0, completeness))
    };
}