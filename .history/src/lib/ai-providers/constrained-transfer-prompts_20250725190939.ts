// src/lib/ai-providers/constrained-transfer-prompts.ts
// Constrained prompt system for reliable transfer of care updates

import { StandardizedSectionType, StandardizedSection, EnhancedParsedNote } from '@/lib/note-processing/enhanced-section-detector';

export interface TransferOfCareContext {
    previousNote: string;
    newTranscript: string;
    sectionsToUpdate: StandardizedSectionType[];
    sectionsToPreserve: StandardizedSectionType[];
    parsedSections: StandardizedSection[];
    clinicalContext: {
        clinic: string;
        emr: 'epic' | 'credible';
        visitType: string;
    };
}

export interface SectionUpdateRequest {
    sectionType: StandardizedSectionType;
    currentContent: string;
    shouldUpdate: boolean;
    position: number; // Order in the original note
}

/**
 * Main function to build constrained update prompt
 * This approach prevents AI from restructuring and ensures format preservation
 */
export function buildConstrainedTransferPrompt(context: TransferOfCareContext): string {
    const {
        previousNote,
        newTranscript,
        sectionsToUpdate,
        sectionsToPreserve,
        parsedSections,
        clinicalContext
    } = context;

    // Sort sections by their original position
    const orderedSections = parsedSections.sort((a, b) => a.startIndex - b.startIndex);

    // Build the constrained prompt
    const prompt = `# TRANSFER OF CARE - CONSTRAINED SECTION UPDATE

## CRITICAL INSTRUCTIONS - MUST FOLLOW EXACTLY:
1. Generate a complete clinical note using the EXACT structure and formatting of the original note
2. PRESERVE sections marked as "PRESERVE" - copy them EXACTLY with no modifications
3. UPDATE sections marked as "UPDATE" - use new clinical information appropriately
4. MAINTAIN the original order and formatting of all sections
5. DO NOT restructure, reformat, or reorganize the note in any way
6. DO NOT add explanatory text, comments, or notes about changes
7. DO NOT break ${clinicalContext.emr.toUpperCase()} syntax or formatting conventions

## SECTIONS TO PRESERVE (copy exactly as provided):
${sectionsToPreserve.map(sectionType => {
        const section = orderedSections.find(s => s.type === sectionType);
        return section ? `### ${section.title}:\n${section.content}` : '';
    }).filter(Boolean).join('\n\n')}

## SECTIONS TO UPDATE (use new clinical information):
${sectionsToUpdate.map(sectionType => {
        const section = orderedSections.find(s => s.type === sectionType);
        return section ? `### ${section.title} (UPDATE THIS SECTION):
Current content: ${section.content}

Update instructions: ${getSectionUpdateInstructions(sectionType)}` : '';
    }).filter(Boolean).join('\n\n')}

## NEW CLINICAL INFORMATION (use only for sections marked for update):
${newTranscript}

## OUTPUT REQUIREMENTS:
Generate the complete updated clinical note following this EXACT structure:

${orderedSections.map(section => {
        const shouldUpdate = sectionsToUpdate.includes(section.type);
        return `${section.title}:
${shouldUpdate ? '[UPDATE THIS SECTION using new clinical information]' : '[PRESERVE EXACTLY as provided above]'}`;
    }).join('\n\n')}

## FORMATTING REQUIREMENTS:
- Use ${clinicalContext.emr.toUpperCase()} formatting conventions
- Preserve all Epic SmartPhrases (@PHRASE@) and DotPhrases (.phrase) exactly
- Maintain original line breaks and spacing
- Keep section headers in the same format as the original

BEGIN UPDATED NOTE:`;

    return prompt;
}

/**
 * Alternative approach: Section-by-section generation
 * This method updates one section at a time for maximum control
 */
export function buildSectionBySection(context: TransferOfCareContext): {
    preservedSections: { type: StandardizedSectionType; content: string; position: number }[];
    updateRequests: { type: StandardizedSectionType; prompt: string; position: number }[];
} {
    const { newTranscript, sectionsToUpdate, sectionsToPreserve, parsedSections, clinicalContext } = context;

    // Sort by original position
    const orderedSections = parsedSections.sort((a, b) => a.startIndex - b.startIndex);

    // Preserved sections - just pass through
    const preservedSections = sectionsToPreserve.map(sectionType => {
        const section = orderedSections.find(s => s.type === sectionType);
        return section ? {
            type: sectionType,
            content: section.content,
            position: section.startIndex
        } : null;
    }).filter(Boolean) as { type: StandardizedSectionType; content: string; position: number }[];

    // Update requests - generate individual prompts
    const updateRequests = sectionsToUpdate.map(sectionType => {
        const section = orderedSections.find(s => s.type === sectionType);
        if (!section) return null;

        const sectionPrompt = `# UPDATE SINGLE SECTION: ${section.title}

## CURRENT SECTION CONTENT:
${section.content}

## NEW CLINICAL INFORMATION:
${newTranscript}

## SECTION UPDATE INSTRUCTIONS:
${getSectionUpdateInstructions(sectionType)}

## FORMATTING REQUIREMENTS:
- Maintain ${clinicalContext.emr.toUpperCase()} formatting conventions
- Preserve any Epic SmartPhrases (@PHRASE@) and DotPhrases (.phrase)
- Keep the same structure and tone as the original section
- If no relevant new information is found, return the section unchanged

## UPDATED SECTION CONTENT:`;

        return {
            type: sectionType,
            prompt: sectionPrompt,
            position: section.startIndex
        };
    }).filter(Boolean) as { type: StandardizedSectionType; prompt: string; position: number }[];

    return { preservedSections, updateRequests };
}

/**
 * Get specific update instructions for each section type
 */
function getSectionUpdateInstructions(sectionType: StandardizedSectionType): string {
    const instructions: Record<StandardizedSectionType, string> = {
        HPI: `Update with current visit information, patient reports, and progress since last visit. Include:
- Reason for current visit
- Patient's current status and reports
- Changes since last appointment
- Response to previous treatment plan`,

        REVIEW_OF_SYSTEMS: `Update with current symptom assessment:
- Current mood state and symptoms
- Sleep, appetite, energy levels
- Anxiety levels and manifestations
- Any new or changed symptoms`,

        PSYCHIATRIC_EXAM: `Update with current mental status examination findings:
- Appearance and behavior
- Mood and affect
- Thought process and content
- Cognitive function
- Insight and judgment`,

        ASSESSMENT_AND_PLAN: `Update the clinical assessment and treatment plan:
- Current diagnostic impressions
- Response to treatment
- Treatment modifications
- New interventions or recommendations`,

        CURRENT_MEDICATIONS: `Update the current medication list:
- Current active medications with dosages
- Recent medication changes
- Medication compliance and tolerability`,

        MEDICATIONS_PLAN: `Update medication management plan:
- New prescriptions or dosage changes
- Medication adjustments planned
- Monitoring requirements
- Patient education provided`,

        RISKS: `Update current risk assessment:
- Suicide risk factors and protective factors
- Safety concerns
- Risk level assessment
- Safety planning needs`,

        SAFETY_PLAN: `Update safety planning:
- Current safety plan status
- Any modifications needed
- Emergency contacts and resources
- Coping strategies reviewed`,

        QUESTIONNAIRES_SURVEYS: `Update with current assessment scores:
- PHQ-9, GAD-7, or other standardized assessments
- Comparison to previous scores
- Clinical significance of changes`,

        MEDICAL: `Update medical information:
- New medical conditions or changes
- Recent medical appointments or findings
- Relevant medical updates affecting psychiatric treatment`,

        PSYCHOSOCIAL: `Update psychosocial interventions:
- Therapy progress and recommendations
- Social support systems
- Psychosocial stressors or improvements`,

        FOLLOW_UP: `Update follow-up planning:
- Next appointment scheduling
- Interim contact plans
- Monitoring requirements
- Patient instructions`,

        // Default for any sections not specifically listed
        BASIC_DEMO_INFO: 'Update any changes to demographic information',
        DIAGNOSIS: 'Update diagnostic information if there are changes',
        IDENTIFYING_INFO: 'Update identifying information if there are changes',
        BH_PRIOR_MEDS_TRIED: 'Update medication history if new information is available',
        PHYSICAL_EXAM: 'Update with current physical examination findings',
        PROGNOSIS: 'Update prognostic assessment if there are changes',

        // Legacy SOAP sections
        SUBJECTIVE: 'Update with current subjective findings and patient reports',
        OBJECTIVE: 'Update with current objective findings and observations',
        ASSESSMENT: 'Update clinical assessment and diagnostic impressions',
        PLAN: 'Update treatment plan and recommendations',
        UNKNOWN: 'Update section content appropriately based on context'
    };

    return instructions[sectionType] || 'Update section with relevant new information from the clinical encounter';
}

/**
 * Template-based section generation for highly standardized sections
 */
export const SECTION_TEMPLATES = {
    HPI: `Reason for visit: {reason_for_visit}
Patient reports: {patient_name} is a {age} year old {gender} with a history of {diagnoses}, who presents for {visit_type} for {chief_complaint}.

At {pronoun} last appointment, the plan included:
{previous_plan}

{current_visit_findings}`,

    ASSESSMENT_AND_PLAN: `{patient_name} is a {age} year old {gender} with a history of {diagnoses}, who presents for {visit_type} for {chief_complaint}. {clinical_assessment}

{treatment_plan}`,

    MEDICATIONS_PLAN: `Risks and benefits discussed: {medication_risks}
Medication comments: {medication_changes}`,

    FOLLOW_UP: `Appointment with this provider in {timeframe}
{additional_follow_up}`
};

/**
 * Generate a section using template (for very standardized sections)
 */
export function generateFromTemplate(
    sectionType: StandardizedSectionType,
    template: string,
    newTranscript: string,
    currentContent: string,
    clinicalContext: any
): string {
    return `# GENERATE SECTION FROM TEMPLATE: ${sectionType}

## TEMPLATE STRUCTURE:
${template}

## CURRENT SECTION CONTENT:
${currentContent}

## NEW CLINICAL INFORMATION:
${newTranscript}

## INSTRUCTIONS:
- Use the template structure to organize the information
- Fill in template variables {in_brackets} with appropriate content from the new clinical information
- Maintain the professional clinical tone and language
- If specific information is not available, use clinically appropriate language
- Preserve any existing Epic syntax or formatting from the current content

## GENERATED SECTION:`;
}

/**
 * Validation prompt to check the final updated note
 */
export function buildValidationPrompt(
    originalNote: string,
    updatedNote: string,
    sectionsUpdated: StandardizedSectionType[],
    sectionsPreserved: StandardizedSectionType[]
): string {
    return `# CLINICAL NOTE UPDATE VALIDATION

## VALIDATION TASK:
Check if the updated note correctly follows the transfer of care instructions.

## ORIGINAL NOTE:
${originalNote.substring(0, 1000)}${originalNote.length > 1000 ? '...' : ''}

## UPDATED NOTE:
${updatedNote.substring(0, 1000)}${updatedNote.length > 1000 ? '...' : ''}

## SECTIONS THAT SHOULD HAVE BEEN UPDATED:
${sectionsUpdated.join(', ')}

## SECTIONS THAT SHOULD HAVE BEEN PRESERVED:
${sectionsPreserved.join(', ')}

## VALIDATION CHECKLIST:
1. Are preserved sections identical to the original? (Yes/No)
2. Are updated sections appropriately modified with new information? (Yes/No)
3. Is the overall note structure maintained? (Yes/No)
4. Is the formatting consistent with the original? (Yes/No)
5. Are there any duplicated or misplaced content? (Yes/No)

## VALIDATION RESULT (respond with JSON):
{
  "overall_quality": 1-10,
  "preserved_correctly": true/false,
  "updated_appropriately": true/false,
  "structure_maintained": true/false,
  "formatting_consistent": true/false,
  "issues_found": ["list of any issues"],
  "recommendations": ["list of improvements needed"]
}`;
}

/**
 * Build reconstruction prompt - assembles final note from individual sections
 */
export function buildReconstructionPrompt(
    originalStructure: string,
    updatedSections: { type: StandardizedSectionType; content: string; position: number }[],
    preservedSections: { type: StandardizedSectionType; content: string; position: number }[],
    clinicalContext: any
): string {
    // Combine and sort all sections by original position
    const allSections = [
        ...updatedSections.map(s => ({ ...s, isUpdated: true })),
        ...preservedSections.map(s => ({ ...s, isUpdated: false }))
    ].sort((a, b) => a.position - b.position);

    return `# RECONSTRUCT CLINICAL NOTE

## INSTRUCTIONS:
Reconstruct the complete clinical note using the provided sections in their original order and formatting.

## ORIGINAL NOTE STRUCTURE (for reference):
${originalStructure.substring(0, 500)}...

## SECTIONS TO INCLUDE (in order):
${allSections.map(section => `
### ${section.type}:
${section.content}
`).join('\n')}

## FORMATTING REQUIREMENTS:
- Use ${clinicalContext.emr.toUpperCase()} formatting conventions
- Maintain original section headers and formatting
- Preserve line breaks and spacing
- Keep any Epic SmartPhrases or DotPhrases intact

## COMPLETE RECONSTRUCTED NOTE:`;
}