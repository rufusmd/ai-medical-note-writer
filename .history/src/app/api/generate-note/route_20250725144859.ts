// src/app/api/generate-note/route.ts
// Fixed version with proper error handling and serialization

import { NextRequest, NextResponse } from 'next/server';
import { ProviderManager } from '@/lib/ai-providers/provider-manager';
import { ClinicalPromptGenerator } from '@/lib/ai-providers/clinical-prompt-generator';
import { notesService } from '@/lib/firebase/notes';
import { patientsService } from '@/lib/firebase/patients';
import { ClinicalContext } from '@/types/clinical-context';

// Add this helper function to sanitize error objects for Firebase
function sanitizeForFirebase(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
    }

    if (obj instanceof Date) {
        return obj;
    }

    if (obj instanceof Error) {
        // Convert Error objects to plain objects that Firebase can serialize
        return {
            name: obj.name,
            message: obj.message,
            stack: obj.stack
        };
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirebase(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeForFirebase(value);
        }
        return sanitized;
    }

    return obj;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        console.log('🚀 Note generation request received');

        const body = await request.json();
        const {
            transcript,
            patientId,
            userId,
            clinicalContext,
            transferOfCareData
        } = body;

        // Validation
        if (!transcript || !patientId || !userId || !clinicalContext) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: transcript, patientId, userId, clinicalContext'
                },
                { status: 400 }
            );
        }

        // Get patient context
        const patientContext = await getPatientContext(patientId);
        if (!patientContext) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Patient not found'
                },
                { status: 404 }
            );
        }

        // Generate the note using AI
        console.log('🤖 Generating note with AI provider');
        let noteContent: string;
        let aiProvider: string;

        try {
            const prompt = body.transferOfCareData
                ? buildTransferOfCarePrompt(transcript, transferOfCareData, clinicalContext)
                : ClinicalPromptGenerator.generatePrompt(transcript, clinicalContext, patientContext);

            const result = await ProviderManager.generateNote(prompt, clinicalContext);

            if (!result.success || !result.content) {
                throw new Error(result.error || 'Failed to generate note content');
            }

            noteContent = result.content;
            aiProvider = result.provider || 'unknown';

            console.log(`✅ Note generated successfully using ${aiProvider}: ${noteContent.length} characters`);
        } catch (aiError) {
            console.error('❌ AI generation failed:', aiError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI note generation failed',
                    details: aiError instanceof Error ? aiError.message : 'Unknown AI error'
                },
                { status: 500 }
            );
        }

        // Apply SOAP structure formatting
        const structuredContent = ensureSOAPStructure(noteContent, clinicalContext);

        // Prepare metadata - sanitize any potential error objects
        const noteMetadata = sanitizeForFirebase({
            patientId,
            patientName: patientContext.name,
            patientMrn: patientContext.mrn,
            generatedAt: new Date(),
            aiProvider,
            clinicalContext,
            noteType: body.transferOfCareData ? 'transfer-of-care' : 'standard',
            processingTimeMs: Date.now() - startTime,
            isTransferOfCare: !!body.transferOfCareData,
            transferMetadata: body.transferOfCareData ? {
                previousNoteFormat: body.transferOfCareData.parsedNote.format,
                previousNoteEmr: body.transferOfCareData.parsedNote.emrType,
                sectionsCount: body.transferOfCareData.parsedNote.sections.length,
                confidence: body.transferOfCareData.parsedNote.confidence
            } : undefined
        });

        // Sanitize the original content as well 
        const sanitizedOriginalContent = sanitizeForFirebase(noteContent);

        // Save note to Firebase
        console.log('💾 Saving note to Firebase');
        const savedNote = await notesService.createNote({
            content: structuredContent,
            originalContent: sanitizedOriginalContent, // This should now be safe for Firebase
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
                noteType: body.transferOfCareData ? 'transfer-of-care' : 'standard',
                isTransferOfCare: !!body.transferOfCareData,
                processingTime: Date.now() - startTime
            }
        });

    } catch (error) {
        console.error('💥 Error in generate-note API:', error);

        // Sanitize the error object before returning it
        const sanitizedError = sanitizeForFirebase(error);

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

// Helper functions for section enhancement
function enhanceSubjectiveSection(section: string): string {
    return section; // Add enhancement logic as needed
}

function enhanceObjectiveSection(section: string): string {
    return section; // Add enhancement logic as needed
}

function enhanceAssessmentSection(section: string): string {
    return section; // Add enhancement logic as needed
}

function enhancePlanSection(section: string): string {
    return section; // Add enhancement logic as needed
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
 * Build specialized prompt for transfer of care updates
 */
function buildTransferOfCarePrompt(
    newTranscript: string,
    transferData: any,
    clinicalContext: ClinicalContext
): string {
    const { previousNote, parsedNote } = transferData;

    const basePrompt = `
# TRANSFER OF CARE NOTE UPDATE

You are updating a clinical note as part of a transfer of care process. You have the previous resident's note and new clinical information.

## Previous Note:
${previousNote}

## New Clinical Information:
${newTranscript}

## Clinical Context:
- Clinic: ${clinicalContext.clinic}
- EMR: ${clinicalContext.emr}
- Visit Type: ${clinicalContext.visitType}

Please update the note appropriately, preserving relevant information from the previous note while incorporating the new clinical data. Maintain the same format and structure as the original note.

**Note: Ensure all content is properly formatted for ${clinicalContext.emr} EMR system.**
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