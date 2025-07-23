// src/lib/ai-providers/clinical-prompts.ts
// 🏥 ENHANCED VERSION: Proper clinical context differentiation for different EMR systems

import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';
import { PatientContext } from './types';

export class ClinicalPromptGenerator {

    /**
     * Generate system prompt with proper EMR-specific formatting
     */
    static generateSystemPrompt(context: ClinicalContext): string {
        const basePrompt = `You are an expert psychiatric provider specializing in clinical documentation. Your role is to generate professional, accurate, and contextually appropriate clinical notes.`;

        // CRITICAL: Different prompts based on clinic/EMR
        const emrSpecificPrompt = this.getEMRSpecificPrompt(context);
        const formatInstructions = this.getFormatInstructions(context);
        const soapStructure = this.getSOAPStructureInstructions(context);

        return `${basePrompt}

${emrSpecificPrompt}

${formatInstructions}

${soapStructure}

CRITICAL FORMATTING REQUIREMENTS:
${context.clinic === 'Davis Behavioral Health' ?
                '- OUTPUT PLAIN TEXT ONLY - NO Epic SmartPhrases, no @SMARTPHRASE@ syntax, no .dotphrases, no special formatting' :
                '- Include Epic SmartPhrases (@SMARTPHRASE@) and DotPhrases (.dotphrase) where appropriate'
            }
- Structure notes in proper SOAP format with clear section headers
- Maintain professional psychiatric documentation standards
- Use appropriate clinical terminology
- Ensure HIPAA compliance - no real patient identifiers`;
    }

    /**
     * Get EMR-specific prompt instructions
     */
    private static getEMRSpecificPrompt(context: ClinicalContext): string {
        switch (context.clinic) {
            case 'Davis Behavioral Health':
                return `CLINIC: Davis Behavioral Health
EMR SYSTEM: Credible
CRITICAL: This clinic uses Credible EMR system. You MUST output PLAIN TEXT ONLY.
- NO Epic SmartPhrases (@SMARTPHRASE@)
- NO DotPhrases (.dotphrase)  
- NO SmartLists ({List:123})
- NO special EMR syntax of any kind
- Use standard psychiatric documentation in plain text format
- Focus on clear, professional clinical language without any EMR-specific formatting`;

            case 'HMHI Downtown':
                return `CLINIC: HMHI Downtown  
EMR SYSTEM: Epic
This clinic uses Epic EMR system. Include Epic-specific formatting:
- Use Epic SmartPhrases where appropriate (@SMARTPHRASE@)
- Include DotPhrases for common elements (.dotphrase)
- Use SmartLists for structured data ({Diagnosis:123})
- Include *** wildcards for variable content that will be filled in Epic
- Make the note ready for direct Epic EMR integration`;

            default:
                return `CLINIC: ${context.clinic}
EMR SYSTEM: ${context.emr}
Generate standard clinical documentation appropriate for the specified EMR system.`;
        }
    }

    /**
     * Get format-specific instructions based on clinical context
     */
    private static getFormatInstructions(context: ClinicalContext): string {
        const visitSpecific = this.getVisitSpecificInstructions(context);

        return `VISIT TYPE: ${context.visitType}
${visitSpecific}

GENERATION SETTINGS:
- Comprehensive Intake: ${context.generationSettings.comprehensiveIntake}
- Update HPI: ${context.generationSettings.updateHPI}
- Generate Assessment: ${context.generationSettings.generateAssessment}
- Update Plan: ${context.generationSettings.updatePlan}
- Include Epic Syntax: ${context.generationSettings.includeEpicSyntax}`;
    }

    /**
     * Get SOAP structure instructions
     */
    private static getSOAPStructureInstructions(context: ClinicalContext): string {
        return `SOAP NOTE STRUCTURE REQUIRED:
Structure your response using proper psychiatric SOAP format:

SUBJECTIVE:
[Patient's presentation, history of present illness, chief complaint, subjective symptoms]

OBJECTIVE:  
[Mental status exam, behavioral observations, vital signs if applicable, objective findings]

ASSESSMENT:
[Clinical impression, diagnoses, differential diagnoses, risk assessment]

PLAN:
[Treatment plan, medications, therapy recommendations, follow-up, safety planning]

Each section should be clearly labeled and well-organized.`;
    }

    /**
     * Generate note prompt with proper context differentiation
     */
    static generateNotePrompt(
        context: ClinicalContext,
        transcript: string,
        patientContext?: PatientContext
    ): string {
        const systemPrompt = this.generateSystemPrompt(context);

        let notePrompt = '';

        switch (context.visitType) {
            case 'transfer-of-care':
                notePrompt = this.generateTransferOfCarePrompt(context, transcript);
                break;
            case 'psychiatric-intake':
                notePrompt = this.generatePsychiatricIntakePrompt(context, transcript);
                break;
            case 'follow-up':
                notePrompt = this.generateFollowUpPrompt(context, transcript);
                break;
            default:
                notePrompt = this.generateGenericPrompt(context, transcript);
        }

        return `${systemPrompt}

${notePrompt}`;
    }

    /**
     * Generate visit-specific instructions
     */
    private static getVisitSpecificInstructions(context: ClinicalContext): string {
        switch (context.visitType) {
            case 'transfer-of-care':
                return `TRANSFER OF CARE VISIT:
You are taking over care from another provider. Generate documentation that:
- Updates existing care plans based on the current visit
- Maintains continuity with previous treatment
- Documents any changes in condition or treatment response
- Provides clear transition of care documentation`;

            case 'psychiatric-intake':
                return `PSYCHIATRIC INTAKE VISIT:
This is a comprehensive initial psychiatric evaluation. Generate documentation that:
- Includes comprehensive psychiatric history
- Documents mental status examination
- Establishes initial diagnoses and differential diagnoses
- Creates initial treatment plan
- Addresses safety and risk factors`;

            case 'follow-up':
                return `FOLLOW-UP VISIT:
This is a routine follow-up appointment. Generate documentation that:
- Updates interval history since last visit
- Assesses treatment response and medication effectiveness
- Modifies treatment plan as needed
- Documents ongoing symptoms and functional status`;

            default:
                return `Generate appropriate psychiatric documentation for the specified visit type.`;
        }
    }

    /**
     * Generate transfer of care specific prompt
     */
    private static generateTransferOfCarePrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n⚠️ CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `TRANSFER OF CARE DOCUMENTATION${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a SOAP-formatted psychiatric note for this transfer of care visit. 
${context.clinic === 'Davis Behavioral Health' ?
                'Use plain text formatting only - no special EMR syntax.' :
                'Include appropriate Epic SmartPhrases and DotPhrases where beneficial.'
            }`;
    }

    /**
     * Generate psychiatric intake specific prompt
     */
    private static generatePsychiatricIntakePrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n⚠️ CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `PSYCHIATRIC INTAKE EVALUATION${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a comprehensive SOAP-formatted psychiatric intake note. Include:
- Detailed history of present illness
- Comprehensive mental status examination  
- Risk assessment and safety planning
- Initial diagnostic impression
- Comprehensive treatment plan

${context.clinic === 'Davis Behavioral Health' ?
                'Format in plain text only for Credible EMR system.' :
                'Use Epic SmartPhrases like @HPI@, @MSE@, @ASSESSMENT@, @PLAN@ where appropriate.'
            }`;
    }

    /**
     * Generate follow-up specific prompt
     */
    private static generateFollowUpPrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n⚠️ CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `PSYCHIATRIC FOLLOW-UP VISIT${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a SOAP-formatted follow-up note documenting:
- Interval history since last visit
- Current mental status and symptom assessment
- Treatment response and medication effectiveness
- Updated treatment plan and recommendations

${context.clinic === 'Davis Behavioral Health' ?
                'Use plain text formatting only - no Epic SmartPhrases or special syntax.' :
                'Include Epic SmartPhrases and DotPhrases where they enhance documentation efficiency.'
            }`;
    }

    /**
     * Generate generic prompt
     */
    private static generateGenericPrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n⚠️ CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases.';

        return `CLINICAL DOCUMENTATION${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a professional SOAP-formatted psychiatric note based on this clinical encounter.
${context.clinic === 'Davis Behavioral Health' ?
                'Output plain text only for Credible EMR system.' :
                'Include Epic SmartPhrases and formatting for Epic EMR integration.'
            }`;
    }
}

/**
 * Epic SmartPhrase templates for HMHI Downtown
 */
export const EPIC_SMARTPHRASE_TEMPLATES = {
    HPI: '@HPI@',
    MSE: '@MSE@',
    ASSESSMENT: '@ASSESSMENT@',
    PLAN: '@PLAN@',
    SAFETY: '@SAFETY@',
    MEDICATIONS: '@MEDICATIONS@',
    FOLLOWUP: '@FOLLOWUP@'
} as const;

/**
 * Plain text templates for Davis Behavioral Health
 */
export const CREDIBLE_PLAIN_TEXT_TEMPLATES = {
    SOAP_STRUCTURE: `
SUBJECTIVE:
[Patient presentation and history]

OBJECTIVE:
[Mental status exam and observations]

ASSESSMENT:
[Clinical impression and diagnoses]

PLAN:
[Treatment plan and recommendations]
    `.trim()
} as const;

/**
 * Validation function to ensure proper formatting
 */
export function validateNoteFormatting(noteContent: string, context: ClinicalContext): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add null/undefined checks
    if (!noteContent || typeof noteContent !== 'string') {
        errors.push('Note content is missing or invalid');
        return { isValid: false, errors, warnings };
    }

    if (!context || typeof context !== 'object') {
        warnings.push('Clinical context is missing - skipping context-specific validation');
        return { isValid: true, errors, warnings };
    }

    // Check for improper Epic syntax in Davis Behavioral Health notes
    if (context.clinic === 'Davis Behavioral Health') {
        if (noteContent.includes('@') || (noteContent.includes('.') && noteContent.match(/\.[a-z]+/))) {
            errors.push('Davis Behavioral Health notes should not contain Epic SmartPhrases or DotPhrases');
        }
    }

    // Check for SOAP structure
    const soapSections = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN'];
    const missingSections = soapSections.filter(section => !noteContent.includes(section));

    if (missingSections.length > 0) {
        warnings.push(`Missing SOAP sections: ${missingSections.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}