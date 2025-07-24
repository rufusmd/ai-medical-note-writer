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
     * Get EMR-specific prompt instructions - FIXED VERSION
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
- NO *** wildcards
- Use standard psychiatric documentation in plain text format
- Focus on clear, professional clinical language without any EMR-specific formatting
- Write notes as if you were writing directly in a simple text editor`;

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
     * Get SOAP structure instructions - ENHANCED VERSION
     */
    private static getSOAPStructureInstructions(context: ClinicalContext): string {
        return `SOAP NOTE STRUCTURE REQUIRED:
Structure your response using proper psychiatric SOAP format with clear paragraph breaks:

SUBJECTIVE:
Chief Complaint: [Brief patient statement in quotes]

History of Present Illness:
[Organized narrative with clear paragraph breaks for:]
- Onset and timeline
- Current symptoms and severity  
- Precipitating factors
- Previous treatments and response

Review of Systems:
[Brief relevant systems review]

OBJECTIVE:  
Vital Signs: [If applicable]

Mental Status Exam:
- Appearance: [description]
- Behavior: [description]
- Speech: [description]
- Mood/Affect: [description]
- Thought Process: [description]
- Thought Content: [description]
- Perceptual Disturbances: [description]
- Cognition: [description]
- Insight/Judgment: [description]

ASSESSMENT:
Primary Diagnoses:
- [Diagnosis 1 with supporting rationale]
- [Diagnosis 2 with supporting rationale]

Differential Diagnoses:
- [Considerations...]

Risk Assessment:
[Brief safety assessment]

PLAN:
Medications:
- [Current medications and changes]
- [New prescriptions with rationale]

Therapy:
- [Therapeutic interventions]
- [Referrals if needed]

Follow-up:
- [Next appointment scheduling]
- [Monitoring parameters]
- [Safety planning if indicated]

Each section should be clearly organized with appropriate paragraph breaks for readability.`;
    }

    /**
     * Generate visit-specific instructions
     */
    private static getVisitSpecificInstructions(context: ClinicalContext): string {
        switch (context.visitType) {
            case 'Transfer of Care':
                return `This is a transfer of care visit. Focus on:
- Comprehensive review of current treatment
- Assessment of treatment response
- Clear communication of ongoing needs
- Transitional planning recommendations`;

            case 'Psychiatric Intake':
                return `This is a comprehensive psychiatric intake. Include:
- Detailed psychiatric history
- Comprehensive mental status examination
- Risk assessment and safety planning
- Initial diagnostic formulation
- Comprehensive treatment planning`;

            case 'Follow-up':
                return `This is a follow-up visit. Focus on:
- Interval history since last visit
- Treatment response assessment
- Side effect monitoring
- Plan adjustments as needed`;

            default:
                return `Generate appropriate clinical documentation for the specified visit type.`;
        }
    }

    /**
     * Generate note prompt with proper context differentiation - ENHANCED VERSION
     */
    static generateNotePrompt(
        context: ClinicalContext,
        transcript: string,
        patientContext?: PatientContext,
        template?: string
    ): string {
        // Generate system prompt
        const systemPrompt = this.generateSystemPrompt(context);

        // Generate visit-specific prompt
        const visitPrompt = this.generateVisitSpecificPrompt(context, transcript);

        // Add patient context if available
        let patientInfo = '';
        if (patientContext) {
            patientInfo = `\nPATIENT CONTEXT:
- Age: ${patientContext.age || 'Not specified'}
- Gender: ${patientContext.gender || 'Not specified'}
- Chief Complaint: ${patientContext.chiefComplaint || 'As documented in transcript'}`;
        }

        // Add template if provided
        let templateInfo = '';
        if (template) {
            templateInfo = `\nTEMPLATE STRUCTURE:
${template}
(Adapt content to actual transcript while maintaining structure)`;
        }

        // CRITICAL: Add extra validation for Davis Behavioral Health
        const extraValidation = context.clinic === 'Davis Behavioral Health' ? `

🚨 CRITICAL VALIDATION FOR CREDIBLE EMR:
- Double-check your output contains NO @ symbols
- Double-check your output contains NO { or } symbols  
- Double-check your output contains NO *** symbols
- Double-check your output contains NO .dotphrase syntax
- Your note must be completely plain text
- Use only standard punctuation and formatting` : '';

        return `${systemPrompt}

${visitPrompt}${patientInfo}${templateInfo}${extraValidation}

Generate a professional psychiatric SOAP note following the above guidelines exactly.`;
    }

    /**
     * Generate visit-specific prompts
     */
    private static generateVisitSpecificPrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n🚨 CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        switch (context.visitType) {
            case 'Transfer of Care':
                return this.generateTransferOfCarePrompt(context, transcript);
            case 'Psychiatric Intake':
                return this.generatePsychiatricIntakePrompt(context, transcript);
            case 'Follow-up':
                return this.generateFollowUpPrompt(context, transcript);
            default:
                return this.generateGenericPrompt(context, transcript);
        }
    }

    /**
     * Generate transfer of care specific prompt
     */
    private static generateTransferOfCarePrompt(context: ClinicalContext, transcript: string): string {
        const epicWarning = context.clinic === 'Davis Behavioral Health' ?
            '\n🚨 CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
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
            '\n🚨 CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `PSYCHIATRIC INTAKE EVALUATION${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a comprehensive SOAP-formatted psychiatric intake note. Include:
- Detailed history of present illness with clear paragraph breaks
- Comprehensive mental status examination in organized format
- Risk assessment and safety planning
- Initial diagnostic impression with supporting rationale
- Comprehensive treatment plan with specific recommendations

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
            '\n🚨 CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `PSYCHIATRIC FOLLOW-UP VISIT${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a SOAP-formatted follow-up note documenting:
- Interval history since last visit with clear organization
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
            '\n🚨 CRITICAL: Davis Behavioral Health uses Credible EMR - output PLAIN TEXT ONLY, no Epic formatting!' :
            '\n✅ HMHI Downtown uses Epic EMR - include Epic SmartPhrases and formatting.';

        return `PSYCHIATRIC DOCUMENTATION${epicWarning}

CLINICAL TRANSCRIPT:
${transcript}

Generate a properly structured SOAP-formatted psychiatric note.
${context.clinic === 'Davis Behavioral Health' ?
                'Use plain text formatting only for Credible EMR system.' :
                'Include appropriate Epic SmartPhrases where beneficial.'
            }`;
    }

    /**
     * Validate note formatting for specific EMR systems
     */
    static validateNoteFormatting(noteContent: string, context: ClinicalContext): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!noteContent || noteContent.trim().length === 0) {
            errors.push('Note content is empty');
            return { isValid: false, errors, warnings };
        }

        // CRITICAL: Davis Behavioral Health validation
        if (context.clinic === 'Davis Behavioral Health') {
            // Check for Epic syntax that should NOT be present
            if (noteContent.includes('@') && noteContent.match(/@[A-Z]/)) {
                errors.push('Epic SmartPhrases (@PHRASE@) detected in Credible EMR note');
            }

            if (noteContent.includes('.') && noteContent.match(/\.[a-z]/)) {
                errors.push('DotPhrases (.phrase) detected in Credible EMR note');
            }

            if (noteContent.includes('{') || noteContent.includes('}')) {
                errors.push('SmartLists ({List:123}) detected in Credible EMR note');
            }

            if (noteContent.includes('***')) {
                errors.push('Epic wildcards (***) detected in Credible EMR note');
            }

            if (noteContent.includes('SMARTPHRASE') || noteContent.includes('SmartPhrase')) {
                errors.push('SmartPhrase references detected in Credible EMR note');
            }
        }

        // HMHI Downtown (Epic) validation
        if (context.clinic === 'HMHI Downtown') {
            // Epic notes should be more flexible, but we can add warnings
            if (!noteContent.includes('@') && !noteContent.includes('.')) {
                warnings.push('No Epic SmartPhrases or DotPhrases detected - consider adding for efficiency');
            }
        }

        // SOAP structure validation
        const requiredSections = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];
        const missingSections = requiredSections.filter(section =>
            !noteContent.includes(section)
        );

        if (missingSections.length > 0) {
            errors.push(`Missing SOAP sections: ${missingSections.join(', ')}`);
        }

        // Length validation
        if (noteContent.length < 100) {
            warnings.push('Note content seems very short for a clinical note');
        }

        if (noteContent.length > 10000) {
            warnings.push('Note content is very long - consider breaking into sections');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}