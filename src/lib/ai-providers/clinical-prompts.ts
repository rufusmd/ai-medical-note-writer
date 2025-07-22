// src/lib/ai-providers/clinical-prompts.ts - Context-Aware Clinical Prompt Generation

import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import { PatientContext } from './types';

export class ClinicalPromptGenerator {

    static generateSystemPrompt(context: ClinicalContext): string {
        const basePrompt = `You are an expert psychiatric provider specializing in clinical documentation. Your role is to generate professional, accurate, and contextually appropriate clinical notes.`;

        const settingSpecific = context.clinic === 'hmhi-downtown'
            ? `You are working at HMHI Downtown Clinic using Epic EMR. Include Epic SmartPhrases (@SMARTPHRASE@) and DotPhrases (.dotphrase) where appropriate.`
            : `You are working at Davis Behavioral Health using Credible EMR. Output plain text only - no Epic SmartPhrases or special formatting.`;

        const visitSpecific = this.getVisitSpecificInstructions(context);

        return `${basePrompt}

${settingSpecific}

${visitSpecific}

CRITICAL REQUIREMENTS:
- Maintain professional psychiatric documentation standards
- Use appropriate clinical terminology
- ${context.generationSettings.includeEpicSyntax ? 'Include Epic SmartPhrases where beneficial' : 'Use plain text only'}
- ${context.generationSettings.comprehensiveIntake ? 'Generate comprehensive psychiatric intake documentation' : 'Focus on interval updates and modifications'}
- Ensure HIPAA compliance - no real patient identifiers
- Follow standard psychiatric documentation practices`;
    }

    static generateNotePrompt(
        context: ClinicalContext,
        transcript: string,
        patientContext?: PatientContext
    ): string {
        switch (context.visitType) {
            case 'transfer-of-care':
                return this.generateTransferOfCarePrompt(context, transcript);

            case 'psychiatric-intake':
                return this.generatePsychiatricIntakePrompt(context, transcript);

            case 'follow-up':
                return this.generateFollowUpPrompt(context, transcript);

            default:
                return this.generateGenericPrompt(context, transcript);
        }
    }

    private static getVisitSpecificInstructions(context: ClinicalContext): string {
        switch (context.visitType) {
            case 'transfer-of-care':
                return `TRANSFER OF CARE VISIT:
You are taking over care from a resident. You will be provided with their existing note and a new visit transcript.

Your task:
- UPDATE HPI: Rewrite as interval history since last visit
- PRESERVE ASSESSMENT: Keep existing assessment but ADD interval update at the end
- UPDATE PLAN: Modify based on today's discussion and decisions
- MODIFY PSYCH EXAM: Make minor updates based on today's observations
- MAINTAIN STRUCTURE: Preserve the original note's format and organization

The resident's note structure may vary - adapt to their format while making necessary updates.`;

            case 'psychiatric-intake':
                return `PSYCHIATRIC INTAKE VISIT:
Generate a comprehensive psychiatric evaluation for a new patient.

Required components:
- Chief Complaint
- History of Present Illness
- Past Psychiatric History
- Past Medical History
- Medications and Allergies
- Family History
- Social History
- Mental Status Examination
- Risk Assessment
- Assessment and Diagnosis
- Treatment Plan

Make this thorough and professional - this establishes the foundation for ongoing care.`;

            case 'follow-up':
                return `FOLLOW-UP VISIT:
This is a continuing care visit. Reference previous treatment and show progression.

Focus on:
- Interval history since last visit
- Treatment response and side effects
- Current symptoms and functioning
- Medication compliance and effectiveness
- Updated mental status
- Modified treatment plan
- Continuity with previous documentation

Show evolution of care and clinical reasoning for any changes.`;

            default:
                return 'Generate appropriate clinical documentation based on the encounter transcript.';
        }
    }

    private static generateTransferOfCarePrompt(context: ClinicalContext, transcript: string): string {
        const epicSyntax = context.generationSettings.includeEpicSyntax;

        return `TRANSFER OF CARE NOTE UPDATE

EXISTING NOTE FROM RESIDENT:
${context.previousNote || '[No previous note provided]'}

TODAY'S VISIT TRANSCRIPT:
${transcript}

INSTRUCTIONS:
${context.generationSettings.updateHPI ? '✓ UPDATE HPI: Rewrite as interval history focusing on changes since last visit' : '✗ Skip HPI updates'}
${context.generationSettings.addIntervalUpdate ? '✓ ADD INTERVAL UPDATE: Append to existing assessment with treatment response, side effects, new developments' : '✗ Skip interval update'}
${context.generationSettings.updatePlan ? '✓ UPDATE PLAN: Modify based on today\'s discussion and clinical decisions' : '✗ Keep existing plan'}
${context.generationSettings.modifyPsychExam ? '✓ MODIFY PSYCH EXAM: Make appropriate updates based on today\'s observations' : '✗ Copy psych exam forward unchanged'}

PRESERVE:
- Patient demographics and identifiers
- Original note structure and format
- Resident's documentation style
- Existing assessment (just add interval update)

OUTPUT FORMAT:
${epicSyntax ? 'Include Epic SmartPhrases (@ASSESSMENT@, @PLAN@, etc.) where appropriate' : 'Plain text only - no Epic SmartPhrases'}

Generate the updated note maintaining the resident's structure while incorporating today's visit information.`;
    }

    private static generatePsychiatricIntakePrompt(context: ClinicalContext, transcript: string): string {
        const epicSyntax = context.generationSettings.includeEpicSyntax;
        const emrSystem = context.emr === 'epic' ? 'Epic EMR' : 'Credible EMR';

        return `COMPREHENSIVE PSYCHIATRIC INTAKE EVALUATION

VISIT TRANSCRIPT:
${transcript}

PATIENT CONTEXT:
${context.patientHistory ? `
- Previous treatment: ${context.patientHistory.treatmentResponse || 'None documented'}
- Current medications: ${context.patientHistory.currentMedications || 'None documented'}
- Ongoing concerns: ${context.patientHistory.ongoingConcerns || 'As documented in transcript'}
` : 'New patient evaluation'}

GENERATE COMPREHENSIVE INTAKE NOTE INCLUDING:

1. CHIEF COMPLAINT
2. HISTORY OF PRESENT ILLNESS
   - Onset, duration, triggers
   - Symptoms and severity
   - Functional impairment
   - Previous treatment attempts

3. PAST PSYCHIATRIC HISTORY
   - Previous diagnoses
   - Hospitalizations
   - Medications tried
   - Therapy history

4. PAST MEDICAL HISTORY
5. CURRENT MEDICATIONS AND ALLERGIES
6. FAMILY HISTORY (psychiatric and medical)
7. SOCIAL HISTORY
   - Substance use
   - Relationships
   - Work/education
   - Living situation

8. MENTAL STATUS EXAMINATION
   - Appearance and behavior
   - Speech and thought process
   - Mood and affect
   - Perceptual disturbances
   - Cognition
   - Insight and judgment

9. RISK ASSESSMENT
   - Suicidal ideation
   - Homicidal ideation
   - Safety concerns

10. ASSESSMENT AND DIAGNOSIS
11. TREATMENT PLAN

TARGET EMR: ${emrSystem}
OUTPUT FORMAT: ${epicSyntax ? 'Include Epic SmartPhrases and structured formatting' : 'Plain text suitable for Credible EMR'}

Generate a thorough, professional psychiatric intake evaluation.`;
    }

    private static generateFollowUpPrompt(context: ClinicalContext, transcript: string): string {
        const epicSyntax = context.generationSettings.includeEpicSyntax;

        return `PSYCHIATRIC FOLLOW-UP VISIT

TODAY'S VISIT TRANSCRIPT:
${transcript}

PREVIOUS VISIT CONTEXT:
${context.patientHistory ? `
- Last visit: ${context.patientHistory.lastVisit || 'Recent'}
- Treatment response: ${context.patientHistory.treatmentResponse || 'To be assessed'}
- Current medications: ${context.patientHistory.currentMedications || 'As documented'}
- Ongoing concerns: ${context.patientHistory.ongoingConcerns || 'Per transcript'}
` : 'Continuing care visit'}

FOCUS ON:

1. INTERVAL HISTORY
   - Changes since last visit
   - Treatment response
   - Side effects
   - Life events or stressors

2. CURRENT SYMPTOMS
   - Improvement, stability, or worsening
   - Functional status
   - Quality of life measures

3. MEDICATION REVIEW
   - Compliance
   - Effectiveness
   - Side effects
   - Dosage considerations

4. MENTAL STATUS UPDATE
   - Current presentation
   - Changes from baseline
   - Risk assessment update

5. ASSESSMENT UPDATE
   - Response to treatment
   - Diagnostic considerations
   - Prognosis

6. PLAN MODIFICATIONS
   - Medication adjustments
   - Therapy recommendations
   - Follow-up timing
   - Safety planning

DOCUMENTATION STYLE:
${context.generationSettings.referencePreviousVisits ? '- Reference previous visits to show progression' : '- Focus on current visit only'}
${context.generationSettings.addIntervalUpdate ? '- Emphasize changes and treatment response' : '- Standard follow-up format'}
${epicSyntax ? '- Include Epic SmartPhrases where appropriate' : '- Plain text format'}

Generate a professional follow-up note that demonstrates continuity of care and clinical reasoning.`;
    }

    private static generateGenericPrompt(context: ClinicalContext, transcript: string): string {
        return `CLINICAL DOCUMENTATION

VISIT TRANSCRIPT:
${transcript}

Generate appropriate clinical documentation based on the encounter transcript and clinical context.

${context.generationSettings.includeEpicSyntax ? 'Include Epic SmartPhrases where appropriate.' : 'Use plain text formatting only.'}
${context.generationSettings.comprehensiveIntake ? 'Generate comprehensive evaluation documentation.' : 'Focus on visit-specific documentation.'}

Ensure professional, accurate, and clinically appropriate documentation.`;
    }
}

// Enhanced prompt templates for specific EMR systems
export const CLINICAL_PROMPT_TEMPLATES = {
    epic: {
        smartPhrases: [
            '@HPI@', '@ROS@', '@PHYSICAL@', '@MSE@', '@ASSESSMENT@', '@PLAN@',
            '@ALLERGIES@', '@MEDICATIONS@', '@FOLLOWUP@', '@SAFETY@'
        ],
        dotPhrases: [
            '.hpi', '.mentalstatus', '.riskassessment', '.plan', '.followup'
        ],
        structures: {
            transferOfCare: `
Update existing note structure:
- HPI: @HPI@ (interval history)
- Assessment: [Preserve existing] + Interval update: ***
- Plan: @PLAN@ (updated)
- MSE: @MSE@ (modified)
      `,
            psychiatricIntake: `
Comprehensive structure:
- CC: ***
- HPI: @HPI@
- Past Psych Hx: ***
- MSE: @MSE@
- Risk: @SAFETY@
- Assessment: @ASSESSMENT@
- Plan: @PLAN@
      `
        }
    },

    credible: {
        plainTextStructure: `
Plain text formatting for Credible EMR:
- No SmartPhrases or special syntax
- Standard paragraph format
- Clear section headers
- Professional clinical language
    `
    }
} as const;