// src/app/api/generate-note/route.ts
// 🏥 COMPLETE VERSION: Enhanced note generation with transfer of care support

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/ai-providers/gemini-client';
import { ClaudeClient } from '@/lib/ai-providers/claude-client';
import { ClinicalPromptGenerator } from '@/lib/ai-providers/clinical-prompts';
import { notesService } from '@/lib/firebase/notes';
import { patientsService } from '@/lib/firebase/patients';
import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';

// Transfer of Care Data Interface
interface TransferOfCareData {
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

// Request Interface
interface GenerateNoteRequest {
    transcript: {
        content: string;
    };
    patientId: string;
    clinicalContext: ClinicalContext;
    userId: string;
    transferOfCareData?: TransferOfCareData;
    preferredProvider?: 'gemini' | 'claude';
}

// GET: Health check endpoint
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        message: 'AI Medical Note Generator API',
        features: [
            'Dual AI provider support (Gemini + Claude)',
            'Clinical context awareness',
            'Transfer of care processing',
            'SOAP structure enhancement',
            'Epic syntax preservation',
            'Firebase integration'
        ],
        providers: {
            gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
            claude: !!process.env.ANTHROPIC_API_KEY
        }
    });
}

// POST: Generate clinical note
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json() as GenerateNoteRequest;

        // Validation
        if (!body.transcript?.content) {
            return NextResponse.json(
                { success: false, error: 'Transcript content is required' },
                { status: 400 }
            );
        }

        if (!body.clinicalContext) {
            return NextResponse.json(
                { success: false, error: 'Clinical context is required' },
                { status: 400 }
            );
        }

        if (!body.patientId || !body.userId) {
            return NextResponse.json(
                { success: false, error: 'Patient ID and User ID are required' },
                { status: 400 }
            );
        }

        const clinicalContext = body.clinicalContext;
        const isTransferOfCare = clinicalContext.visitType === 'transfer-of-care';

        console.log(`🏥 Generating ${isTransferOfCare ? 'transfer of care' : 'clinical'} note for ${clinicalContext.clinic} (${clinicalContext.emr})`);

        // Get patient context
        const patientContext = await getPatientContext(body.patientId);

        // Initialize AI clients
        const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
        const claudeApiKey = process.env.ANTHROPIC_API_KEY;

        if (!geminiApiKey) {
            console.error('❌ GOOGLE_GEMINI_API_KEY is missing from environment variables');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Gemini API key not configured. Please check environment variables.'
                },
                { status: 500 }
            );
        }

        const geminiClient = new GeminiClient(geminiApiKey);
        const claudeClient = claudeApiKey ? new ClaudeClient(claudeApiKey) : null;
        const preferredProvider = body.preferredProvider || 'gemini';

        // Build appropriate prompt based on context
        let finalPrompt: string;
        let noteType: string;

        if (body.transferOfCareData && isTransferOfCare) {
            // Use transfer of care specific prompt
            finalPrompt = buildTransferOfCarePrompt(
                body.transcript.content,
                body.transferOfCareData,
                clinicalContext
            );
            noteType = 'Transfer of Care Update';
            console.log('🔄 Generating transfer of care note update');
        } else {
            // Use standard clinical prompt
            finalPrompt = ClinicalPromptGenerator.generatePrompt(
                body.transcript.content,
                clinicalContext,
                patientContext
            );
            noteType = 'Standard Clinical Note';
            console.log('📝 Generating standard clinical note');
        }

        console.log(`📋 Prompt generated: ${finalPrompt.length} characters`);

        // Generate note using preferred provider
        let noteContent: string;
        let aiProvider: string;

        try {
            if (preferredProvider === 'gemini') {
                console.log('🤖 Using Gemini for note generation...');
                noteContent = await geminiClient.generateNote(finalPrompt);
                aiProvider = 'gemini';
            } else if (claudeClient && preferredProvider === 'claude') {
                console.log('🤖 Using Claude for note generation...');
                noteContent = await claudeClient.generateNote(finalPrompt);
                aiProvider = 'claude';
            } else {
                // Fallback to Gemini if Claude is not available
                console.log('🤖 Falling back to Gemini for note generation...');
                noteContent = await geminiClient.generateNote(finalPrompt);
                aiProvider = 'gemini';
            }
        } catch (error) {
            console.error(`❌ Error with ${preferredProvider} provider:`, error);

            // Try fallback provider
            if (preferredProvider === 'gemini' && claudeClient) {
                console.log('🔄 Attempting fallback to Claude...');
                try {
                    noteContent = await claudeClient.generateNote(finalPrompt);
                    aiProvider = 'claude';
                } catch (fallbackError) {
                    console.error('❌ Fallback to Claude also failed:', fallbackError);
                    throw error; // Throw original error
                }
            } else if (preferredProvider === 'claude') {
                console.log('🔄 Attempting fallback to Gemini...');
                try {
                    noteContent = await geminiClient.generateNote(finalPrompt);
                    aiProvider = 'gemini';
                } catch (fallbackError) {
                    console.error('❌ Fallback to Gemini also failed:', fallbackError);
                    throw error; // Throw original error
                }
            } else {
                throw error;
            }
        }

        console.log(`✅ Note generated successfully using ${aiProvider}: ${noteContent.length} characters`);

        // Enhance SOAP structure if needed
        const structuredContent = ensureSOAPStructure(noteContent, clinicalContext);

        // Validate the generated note
        const validation = ClinicalPromptGenerator.validateNoteFormatting(structuredContent, clinicalContext);

        // Prepare metadata
        const noteMetadata = {
            patientId: body.patientId,
            patientName: patientContext?.name || `Patient ${body.patientId}`,
            transcriptLength: body.transcript.content.length,
            promptLength: finalPrompt.length,
            aiProvider,
            generatedAt: new Date(),
            visitType: clinicalContext.visitType,
            clinic: clinicalContext.clinic,
            emr: clinicalContext.emr,
            clinicalContext,
            validation: validation.isValid,
            validationDetails: validation,
            noteType,
            isTransferOfCare: !!body.transferOfCareData,
            transferMetadata: body.transferOfCareData ? {
                previousNoteFormat: body.transferOfCareData.parsedNote.format,
                previousNoteEmr: body.transferOfCareData.parsedNote.emrType,
                sectionsCount: body.transferOfCareData.parsedNote.sections.length,
                confidence: body.transferOfCareData.parsedNote.confidence
            } : undefined
        };

        // Save note to Firebase
        const savedNote = await notesService.createNote({
            content: structuredContent,
            originalContent: noteContent,
            metadata: noteMetadata,
            userId: body.userId,
            isEdited: false,
            editAnalytics: {
                totalEdits: 0,
                totalEditTime: 0,
                sectionsEdited: [],
                editHistory: []
            },
            versions: [{
                version: 1,
                content: structuredContent,
                timestamp: new Date(),
                changesSummary: 'Initial AI generation'
            }]
        });

        console.log(`🎉 Note saved successfully: ${savedNote.id}`);

        // Final validation check
        const finalValidation = ClinicalPromptGenerator.validateNoteFormatting(structuredContent, clinicalContext);

        return NextResponse.json({
            success: true,
            note: savedNote,
            metadata: {
                aiProvider,
                generatedAt: new Date().toISOString(),
                clinicalContext,
                validation: finalValidation,
                noteType,
                isTransferOfCare: !!body.transferOfCareData,
                processingTime: Date.now() - startTime
            }
        });

    } catch (error) {
        console.error('💥 Error in generate-note API:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate note',
                details: error instanceof Error ? error.message : 'Unknown error',
                processingTime: Date.now() - startTime
            },
            { status: 500 }
        );
    }
}

/**
 * Build specialized prompt for transfer of care updates
 */
function buildTransferOfCarePrompt(
    newTranscript: string,
    transferData: TransferOfCareData,
    clinicalContext: ClinicalContext
): string {
    const { previousNote, parsedNote } = transferData;

    const basePrompt = `
# TRANSFER OF CARE NOTE UPDATE

You are updating a clinical note as part of a transfer of care process. You have the previous resident's note and new clinical information.

## CLINICAL CONTEXT
- Clinic: ${clinicalContext.clinic}
- EMR System: ${clinicalContext.emr}
- Visit Type: Transfer of Care
- Previous Note Format: ${parsedNote.format}
- Previous Note EMR Type: ${parsedNote.emrType}

## PREVIOUS RESIDENT'S NOTE
${previousNote}

## NEW CLINICAL ENCOUNTER/UPDATES
${newTranscript}

## INSTRUCTIONS FOR UPDATE

### Core Principles:
1. **Preserve Continuity**: Maintain the overall structure and tone of the previous note
2. **Selective Updates**: Only modify sections that are affected by the new clinical information
3. **Epic Syntax**: ${clinicalContext.emr === 'epic' ? 'Preserve all Epic SmartPhrases (@VITALS@, @REVIEW@, etc.) and SmartLists ({MOOD:1234}, etc.)' : 'Use standard Credible formatting'}
4. **Professional Handoff**: Ensure smooth transition between residents

### Section Update Guidelines:

**UPDATE these sections if new information is provided:**
- **HPI (History of Present Illness)**: Add interval updates, new symptoms, or changes in condition
- **Assessment**: Update diagnoses, add new clinical impressions, modify severity assessments
- **Plan**: Update medications, add new interventions, modify follow-up plans
- **Psychiatric Exam**: Update if new mental status findings are documented

**PRESERVE these sections unless specifically changed:**
- **Past Medical History**: Keep unchanged unless new conditions are mentioned
- **Social History**: Preserve unless new social factors are documented
- **Family History**: Keep unchanged unless new information provided
- **Review of Systems**: Update only if new symptoms are reported

### Formatting Requirements:
${clinicalContext.emr === 'epic' ? `
- Maintain Epic formatting with proper SmartPhrase syntax
- Preserve wildcards (***) for template fields
- Keep Epic SmartLists in proper {LIST:ID} format
- Use Epic-standard section headers
` : `
- Use Credible EMR formatting standards
- Clear section delineation
- Standard medical abbreviations
- Proper paragraph structure
`}

### Quality Standards:
- Maintain professional medical language
- Ensure logical flow between sections
- Preserve important clinical details from previous note
- Integrate new information seamlessly
- Flag any contradictions between previous and new information

**Generate the updated clinical note now, incorporating the new information while preserving the unchanged portions of the previous note.**
`;

    return basePrompt;
}

/**
 * Get patient context information
 */
async function getPatientContext(patientId: string) {
    try {
        const patient = await patientsService.getPatient(patientId);
        return patient ? {
            id: patient.id,
            name: patient.name,
            mrn: patient.mrn,
            dob: patient.dob
        } : null;
    } catch (error) {
        console.error('Error fetching patient context:', error);
        return null;
    }
}

/**
 * Enhanced SOAP structure formatting
 */
function ensureSOAPStructure(content: string, context: ClinicalContext): string {
    // Add safety check
    if (!content || typeof content !== 'string') {
        console.error('⚠️ ensureSOAPStructure received invalid content:', typeof content);
        return createEmptySOAPTemplate();
    }

    // If content already has SOAP headers, enhance the formatting
    if (content.includes('SUBJECTIVE:') && content.includes('OBJECTIVE:') &&
        content.includes('ASSESSMENT:') && content.includes('PLAN:')) {
        return enhanceExistingSOAPStructure(content);
    }

    // If no SOAP structure, create intelligent distribution
    return createSOAPFromContent(content, context);
}

/**
 * Create empty SOAP template for error cases
 */
function createEmptySOAPTemplate(): string {
    return `SUBJECTIVE:
[Note generation failed - please try again]

OBJECTIVE:
Mental Status Exam:
- Appearance: [To be documented]
- Behavior: [To be documented] 
- Speech: [To be documented]
- Mood/Affect: [To be documented]
- Thought Process: [To be documented]
- Thought Content: [To be documented]
- Cognition: [To be documented]
- Insight/Judgment: [To be documented]

ASSESSMENT:
[Clinical impression and diagnostic assessment to be documented]

PLAN:
Medications:
- [Medication recommendations to be documented]

Therapy:
- [Therapy recommendations to be documented]

Follow-up:
- [Follow-up planning to be documented]`;
}

/**
 * Enhance existing SOAP structure with better formatting
 */
function enhanceExistingSOAPStructure(content: string): string {
    // Split by SOAP sections
    const sections = content.split(/(?=SUBJECTIVE:|OBJECTIVE:|ASSESSMENT:|PLAN:)/);

    let enhancedContent = '';

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;

        if (trimmedSection.startsWith('SUBJECTIVE:')) {
            enhancedContent += enhanceSubjectiveSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('OBJECTIVE:')) {
            enhancedContent += enhanceObjectiveSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('ASSESSMENT:')) {
            enhancedContent += enhanceAssessmentSection(trimmedSection) + '\n\n';
        } else if (trimmedSection.startsWith('PLAN:')) {
            enhancedContent += enhancePlanSection(trimmedSection) + '\n\n';
        } else {
            enhancedContent += trimmedSection + '\n\n';
        }
    }

    return enhancedContent.trim();
}

/**
 * Create SOAP structure from unstructured content
 */
function createSOAPFromContent(content: string, context: ClinicalContext): string {
    // Clean and prepare content
    const lines = content.split('\n').filter(line => line.trim()).map(line => line.trim());

    if (lines.length === 0) {
        return createEmptySOAPTemplate();
    }

    // Intelligent content distribution based on keywords and context
    const subjective = extractSubjectiveContent(lines);
    const objective = extractObjectiveContent(lines);
    const assessment = extractAssessmentContent(lines);
    const plan = extractPlanContent(lines);

    return `SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}

ASSESSMENT:
${assessment}

PLAN:
${plan}`;
}

/**
 * Extract subjective content using intelligent parsing
 */
function extractSubjectiveContent(lines: string[]): string {
    const subjectiveKeywords = [
        'chief complaint', 'presents with', 'reports', 'states', 'describes',
        'history of present illness', 'current symptoms', 'patient reports',
        'feeling', 'experiencing', 'complains of'
    ];

    const subjectiveLines = lines.filter(line =>
        subjectiveKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (subjectiveLines.length === 0) {
        // Take first third of content if no keywords match
        const firstThird = Math.ceil(lines.length / 3);
        return lines.slice(0, firstThird).join('\n') || '[Patient presentation to be documented]';
    }

    return subjectiveLines.join('\n');
}

/**
 * Extract objective content focusing on mental status and observations
 */
function extractObjectiveContent(lines: string[]): string {
    const objectiveKeywords = [
        'mental status', 'appearance', 'behavior', 'speech', 'mood', 'affect',
        'thought process', 'thought content', 'cognition', 'vital signs',
        'examination', 'observed', 'appears', 'alert', 'oriented'
    ];

    const objectiveLines = lines.filter(line =>
        objectiveKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (objectiveLines.length === 0) {
        return `Mental Status Exam:
- Appearance: [To be documented]
- Behavior: [To be documented]
- Speech: [To be documented]
- Mood/Affect: [To be documented]
- Thought Process: [To be documented]
- Thought Content: [To be documented]
- Cognition: [To be documented]
- Insight/Judgment: [To be documented]`;
    }

    return `Mental Status Exam:
${objectiveLines.map(line => `- ${line}`).join('\n')}`;
}

/**
 * Extract assessment content focusing on diagnoses and clinical impressions
 */
function extractAssessmentContent(lines: string[]): string {
    const assessmentKeywords = [
        'diagnosis', 'impression', 'assessment', 'condition', 'disorder',
        'syndrome', 'episode', 'acute', 'chronic', 'major depressive',
        'anxiety', 'bipolar', 'psychosis', 'personality'
    ];

    const assessmentLines = lines.filter(line =>
        assessmentKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (assessmentLines.length === 0) {
        return `Primary Diagnoses:
- [Clinical impression to be documented]

Risk Assessment:
- [Safety assessment to be completed]`;
    }

    return `Primary Diagnoses:
${assessmentLines.map(line => `- ${line}`).join('\n')}

Risk Assessment:
- [Safety assessment completed during visit]`;
}

/**
 * Extract plan content focusing on treatment recommendations
 */
function extractPlanContent(lines: string[]): string {
    const planKeywords = [
        'plan', 'treatment', 'medication', 'therapy', 'follow-up', 'referral',
        'recommend', 'continue', 'start', 'adjust', 'monitor', 'schedule'
    ];

    const planLines = lines.filter(line =>
        planKeywords.some(keyword =>
            line.toLowerCase().includes(keyword)
        )
    );

    if (planLines.length === 0) {
        return `Medications:
- [Medication recommendations to be documented]

Therapy:
- [Therapeutic interventions to be documented]

Follow-up:
- [Follow-up planning to be documented]`;
    }

    // Organize plan content by categories
    const medicationLines = planLines.filter(line =>
        line.toLowerCase().includes('medication') ||
        line.toLowerCase().includes('prescription') ||
        line.toLowerCase().includes('drug')
    );

    const therapyLines = planLines.filter(line =>
        line.toLowerCase().includes('therapy') ||
        line.toLowerCase().includes('counseling') ||
        line.toLowerCase().includes('intervention')
    );

    const followUpLines = planLines.filter(line =>
        line.toLowerCase().includes('follow') ||
        line.toLowerCase().includes('appointment') ||
        line.toLowerCase().includes('schedule')
    );

    let planContent = '';

    if (medicationLines.length > 0) {
        planContent += `Medications:\n${medicationLines.map(line => `- ${line}`).join('\n')}\n\n`;
    } else {
        planContent += `Medications:\n- [Medication recommendations to be documented]\n\n`;
    }

    if (therapyLines.length > 0) {
        planContent += `Therapy:\n${therapyLines.map(line => `- ${line}`).join('\n')}\n\n`;
    } else {
        planContent += `Therapy:\n- [Therapeutic interventions to be documented]\n\n`;
    }

    if (followUpLines.length > 0) {
        planContent += `Follow-up:\n${followUpLines.map(line => `- ${line}`).join('\n')}`;
    } else {
        planContent += `Follow-up:\n- [Follow-up planning to be documented]`;
    }

    return planContent.trim();
}

/**
 * Enhanced section formatters
 */
function enhanceSubjectiveSection(section: string): string {
    // Clean up and enhance subjective section formatting
    let enhanced = section.replace(/^SUBJECTIVE:\s*/i, 'SUBJECTIVE:\n');

    // Add proper paragraph breaks and formatting
    enhanced = enhanced.replace(/\.\s+/g, '.\n\n');
    enhanced = enhanced.replace(/\n\n\n+/g, '\n\n');

    return enhanced.trim();
}

function enhanceObjectiveSection(section: string): string {
    // Clean up and enhance objective section formatting
    let enhanced = section.replace(/^OBJECTIVE:\s*/i, 'OBJECTIVE:\n');

    // Ensure Mental Status Exam structure
    if (!enhanced.includes('Mental Status Exam:')) {
        enhanced += '\n\nMental Status Exam:\n- [Clinical observations to be documented]';
    }

    return enhanced.trim();
}

function enhanceAssessmentSection(section: string): string {
    // Clean up and enhance assessment section formatting
    let enhanced = section.replace(/^ASSESSMENT:\s*/i, 'ASSESSMENT:\n');

    // Ensure proper diagnosis structure
    if (!enhanced.includes('Primary Diagnoses:')) {
        enhanced += '\n\nPrimary Diagnoses:\n- [Clinical impressions to be documented]';
    }

    return enhanced.trim();
}

function enhancePlanSection(section: string): string {
    // Clean up and enhance plan section formatting
    let enhanced = section.replace(/^PLAN:\s*/i, 'PLAN:\n');

    // Ensure structured plan format
    const hasCategories = enhanced.includes('Medications:') ||
        enhanced.includes('Therapy:') ||
        enhanced.includes('Follow-up:');

    if (!hasCategories) {
        enhanced += `\n\nMedications:\n- [Medication recommendations to be documented]\n\nTherapy:\n- [Therapeutic interventions to be documented]\n\nFollow-up:\n- [Follow-up planning to be documented]`;
    }

    return enhanced.trim();
}