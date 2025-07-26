// src/lib/note-processing/enhanced-section-detector.ts
// Enhanced section detector with your standardized transfer of care sections

export type StandardizedSectionType =
    // Patient Information
    | 'BASIC_DEMO_INFO'
    | 'DIAGNOSIS'
    | 'IDENTIFYING_INFO'

    // Medications
    | 'CURRENT_MEDICATIONS'
    | 'BH_PRIOR_MEDS_TRIED'
    | 'MEDICATIONS_PLAN'

    // Clinical Assessment
    | 'HPI'
    | 'REVIEW_OF_SYSTEMS'
    | 'PSYCHIATRIC_EXAM'
    | 'QUESTIONNAIRES_SURVEYS'

    // Examination
    | 'MEDICAL'
    | 'PHYSICAL_EXAM'

    // Plan & Safety
    | 'RISKS'
    | 'ASSESSMENT_AND_PLAN'
    | 'PSYCHOSOCIAL'
    | 'SAFETY_PLAN'

    // Follow-up
    | 'PROGNOSIS'
    | 'FOLLOW_UP'

    // Legacy SOAP support
    | 'SUBJECTIVE'
    | 'OBJECTIVE'
    | 'ASSESSMENT'
    | 'PLAN'
    | 'UNKNOWN';

export interface StandardizedSection {
    type: StandardizedSectionType;
    title: string;
    content: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
    metadata: {
        hasEpicSyntax: boolean;
        wordCount: number;
        isEmpty: boolean;
        clinicalTerms: string[];
        originalSectionName?: string; // What was actually found in the note
    };
}

export interface EnhancedParsedNote {
    originalContent: string;
    detectedFormat: 'SOAP' | 'NARRATIVE' | 'MIXED' | 'UNKNOWN';
    sections: StandardizedSection[];
    emrType: 'epic' | 'credible' | 'unknown';
    parseMetadata: {
        totalSections: number;
        confidence: number;
        processingTime: number;
        errors: string[];
        warnings: string[];
        matchedPatterns: string[];
    };
}

/**
 * Section detection patterns for your standardized sections
 */
const SECTION_DETECTION_PATTERNS = {
    // Patient Information
    BASIC_DEMO_INFO: {
        keywords: ['name:', 'mrn:', 'date of birth:', 'dob:', 'demographics:', 'patient information:'],
        alternativeNames: ['Patient Info', 'Demographics', 'Basic Information'],
        confidence: 0.9
    },
    DIAGNOSIS: {
        keywords: ['diagnosis:', 'diagnoses:', 'icd-10:', 'dsm-5:', 'primary diagnosis:', 'psychiatric diagnosis:'],
        alternativeNames: ['Diagnoses', 'Primary Diagnosis', 'Psychiatric Diagnoses'],
        confidence: 0.9
    },
    IDENTIFYING_INFO: {
        keywords: ['occupation:', 'employment:', 'identifying information:', 'demographics:', 'social demographics:'],
        alternativeNames: ['Demographics', 'Occupation', 'Social Information'],
        confidence: 0.8
    },

    // Medications
    CURRENT_MEDICATIONS: {
        keywords: ['current medications:', 'medications:', 'meds:', 'current meds:', 'medication list:'],
        alternativeNames: ['Medications', 'Current Meds', 'Medication List'],
        confidence: 0.9
    },
    BH_PRIOR_MEDS_TRIED: {
        keywords: ['behavioral health prior meds tried:', 'previous medications:', 'prior meds:', 'medication history:', 'past medications:'],
        alternativeNames: ['Previous Medications', 'Medication History', 'Prior Meds Tried'],
        confidence: 0.8
    },
    MEDICATIONS_PLAN: {
        keywords: ['medication changes:', 'prescription changes:', 'new medications:', 'medication plan:', 'medication management:'],
        alternativeNames: ['Medication Changes', 'Prescription Plan', 'Medication Management'],
        confidence: 0.8
    },

    // Clinical Assessment
    HPI: {
        keywords: ['history of present illness:', 'hpi:', 'reason for visit:', 'chief complaint:', 'present illness:'],
        alternativeNames: ['History of Present Illness', 'Chief Complaint', 'Reason for Visit'],
        confidence: 0.95
    },
    REVIEW_OF_SYSTEMS: {
        keywords: ['review of systems:', 'ros:', 'systems review:', 'symptom review:'],
        alternativeNames: ['ROS', 'Systems Review', 'Symptom Review'],
        confidence: 0.9
    },
    PSYCHIATRIC_EXAM: {
        keywords: ['psychiatric exam:', 'mental status exam:', 'mse:', 'psychiatric examination:', 'mental status examination:'],
        alternativeNames: ['Mental Status Exam', 'MSE', 'Psychiatric Examination'],
        confidence: 0.9
    },
    QUESTIONNAIRES_SURVEYS: {
        keywords: ['questionnaires:', 'surveys:', 'phq-9:', 'gad-7:', 'assessment scales:', 'rating scales:'],
        alternativeNames: ['Questionnaires', 'Assessment Scales', 'Rating Scales'],
        confidence: 0.8
    },

    // Examination
    MEDICAL: {
        keywords: ['medical:', 'medical history:', 'medical update:', 'medical conditions:', 'medical review:'],
        alternativeNames: ['Medical History', 'Medical Update', 'Medical Conditions'],
        confidence: 0.8
    },
    PHYSICAL_EXAM: {
        keywords: ['physical exam:', 'physical examination:', 'pe:', 'physical findings:', 'examination:'],
        alternativeNames: ['Physical Examination', 'PE', 'Physical Findings'],
        confidence: 0.9
    },

    // Plan & Safety
    RISKS: {
        keywords: ['risks:', 'risk assessment:', 'suicide risk:', 'safety risk:', 'risk factors:'],
        alternativeNames: ['Risk Assessment', 'Safety Risk', 'Risk Factors'],
        confidence: 0.9
    },
    ASSESSMENT_AND_PLAN: {
        keywords: ['assessment and plan:', 'assessment & plan:', 'a&p:', 'clinical assessment:', 'treatment plan:'],
        alternativeNames: ['Assessment & Plan', 'A&P', 'Clinical Assessment', 'Treatment Plan'],
        confidence: 0.95
    },
    PSYCHOSOCIAL: {
        keywords: ['psychosocial:', 'therapy:', 'counseling:', 'psychotherapy:', 'social interventions:'],
        alternativeNames: ['Therapy', 'Counseling', 'Psychotherapy', 'Social Interventions'],
        confidence: 0.8
    },
    SAFETY_PLAN: {
        keywords: ['safety plan:', 'crisis plan:', 'safety planning:', 'emergency plan:', 'crisis intervention:'],
        alternativeNames: ['Crisis Plan', 'Safety Planning', 'Emergency Plan'],
        confidence: 0.9
    },

    // Follow-up
    PROGNOSIS: {
        keywords: ['prognosis:', 'outlook:', 'clinical prognosis:', 'expected outcome:'],
        alternativeNames: ['Outlook', 'Clinical Prognosis', 'Expected Outcome'],
        confidence: 0.8
    },
    FOLLOW_UP: {
        keywords: ['follow-up:', 'follow up:', 'next appointment:', 'return visit:', 'follow-up plan:'],
        alternativeNames: ['Next Appointment', 'Return Visit', 'Follow-up Plan'],
        confidence: 0.9
    },

    // Legacy SOAP support
    SUBJECTIVE: {
        keywords: ['subjective:', 's:'],
        alternativeNames: ['Subjective', 'S'],
        confidence: 0.95
    },
    OBJECTIVE: {
        keywords: ['objective:', 'o:'],
        alternativeNames: ['Objective', 'O'],
        confidence: 0.95
    },
    ASSESSMENT: {
        keywords: ['assessment:', 'a:'],
        alternativeNames: ['Assessment', 'A'],
        confidence: 0.95
    },
    PLAN: {
        keywords: ['plan:', 'p:'],
        alternativeNames: ['Plan', 'P'],
        confidence: 0.95
    }
};

export class EnhancedSectionDetector {
    /**
     * Main parsing function with standardized section detection
     */
    static parseNote(noteContent: string): EnhancedParsedNote {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        const matchedPatterns: string[] = [];

        try {
            // Clean and normalize content
            const normalizedContent = this.normalizeContent(noteContent);

            // Detect EMR type
            const emrType = this.detectEMRType(normalizedContent);

            // Detect overall format
            const format = this.detectNoteFormat(normalizedContent);

            // Parse sections using our standardized patterns
            const sections = this.parseStandardizedSections(
                normalizedContent,
                emrType,
                matchedPatterns,
                warnings
            );

            const confidence = this.calculateOverallConfidence(sections);

            return {
                originalContent: noteContent,
                detectedFormat: format,
                sections,
                emrType,
                parseMetadata: {
                    totalSections: sections.length,
                    confidence,
                    processingTime: Date.now() - startTime,
                    errors,
                    warnings,
                    matchedPatterns
                }
            };

        } catch (error) {
            errors.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

            return {
                originalContent: noteContent,
                detectedFormat: 'UNKNOWN',
                sections: [],
                emrType: 'unknown',
                parseMetadata: {
                    totalSections: 0,
                    confidence: 0,
                    processingTime: Date.now() - startTime,
                    errors,
                    warnings,
                    matchedPatterns
                }
            };
        }
    }

    /**
     * Parse sections using standardized patterns
     */
    private static parseStandardizedSections(
        content: string,
        emrType: 'epic' | 'credible' | 'unknown',
        matchedPatterns: string[],
        warnings: string[]
    ): StandardizedSection[] {
        const sections: StandardizedSection[] = [];
        const contentLower = content.toLowerCase();

        // Try to match each standardized section
        for (const [sectionType, pattern] of Object.entries(SECTION_DETECTION_PATTERNS)) {
            const foundSection = this.findSectionByPattern(
                content,
                contentLower,
                sectionType as StandardizedSectionType,
                pattern,
                emrType,
                matchedPatterns
            );

            if (foundSection) {
                sections.push(foundSection);
            }
        }

        // Sort by position in document
        sections.sort((a, b) => a.startIndex - b.startIndex);

        // Check for overlapping sections and warn
        this.checkForOverlaps(sections, warnings);

        return sections;
    }

    /**
     * Find a section using the detection pattern
     */
    private static findSectionByPattern(
        content: string,
        contentLower: string,
        sectionType: StandardizedSectionType,
        pattern: typeof SECTION_DETECTION_PATTERNS[keyof typeof SECTION_DETECTION_PATTERNS],
        emrType: 'epic' | 'credible' | 'unknown',
        matchedPatterns: string[]
    ): StandardizedSection | null {

        for (const keyword of pattern.keywords) {
            const keywordIndex = contentLower.indexOf(keyword.toLowerCase());

            if (keywordIndex !== -1) {
                // Find the end of this section
                const sectionStart = keywordIndex;
                const nextSectionIndex = this.findNextSectionStart(
                    contentLower,
                    keywordIndex + keyword.length
                );
                const sectionEnd = nextSectionIndex !== -1 ? nextSectionIndex : content.length;

                // Extract section content (excluding the header)
                const headerEnd = content.indexOf(':', keywordIndex) + 1;
                const sectionContent = content.substring(headerEnd, sectionEnd).trim();

                if (sectionContent.length > 5) { // Minimum content length
                    matchedPatterns.push(`${sectionType}: "${keyword}"`);

                    return this.createStandardizedSection(
                        sectionType,
                        keyword,
                        sectionContent,
                        sectionStart,
                        sectionEnd,
                        emrType,
                        pattern.confidence
                    );
                }
            }
        }

        return null;
    }

    /**
     * Find the start of the next section
     */
    private static findNextSectionStart(contentLower: string, fromIndex: number): number {
        let earliestIndex = -1;

        // Look for any section header from our patterns
        for (const pattern of Object.values(SECTION_DETECTION_PATTERNS)) {
            for (const keyword of pattern.keywords) {
                const nextIndex = contentLower.indexOf(keyword.toLowerCase(), fromIndex);
                if (nextIndex !== -1 && (earliestIndex === -1 || nextIndex < earliestIndex)) {
                    earliestIndex = nextIndex;
                }
            }
        }

        return earliestIndex;
    }

    /**
     * Create a standardized section object
     */
    private static createStandardizedSection(
        type: StandardizedSectionType,
        originalHeader: string,
        content: string,
        startIndex: number,
        endIndex: number,
        emrType: 'epic' | 'credible' | 'unknown',
        confidence: number
    ): StandardizedSection {
        return {
            type,
            title: this.getDisplayTitle(type),
            content: content,
            startIndex,
            endIndex,
            confidence,
            metadata: {
                hasEpicSyntax: this.detectEpicSyntax(content),
                wordCount: content.split(/\s+/).length,
                isEmpty: content.trim().length === 0,
                clinicalTerms: this.extractClinicalTerms(content),
                originalSectionName: originalHeader
            }
        };
    }

    /**
     * Get display-friendly title for section type
     */
    private static getDisplayTitle(type: StandardizedSectionType): string {
        const titleMap: Record<StandardizedSectionType, string> = {
            BASIC_DEMO_INFO: 'Basic Demo Information',
            DIAGNOSIS: 'Diagnosis',
            IDENTIFYING_INFO: 'Identifying Information',
            CURRENT_MEDICATIONS: 'Current Medications',
            BH_PRIOR_MEDS_TRIED: 'Behavioral Health Prior Meds Tried',
            MEDICATIONS_PLAN: 'Medication Changes',
            HPI: 'History of Present Illness',
            REVIEW_OF_SYSTEMS: 'Review of Systems',
            PSYCHIATRIC_EXAM: 'Psychiatric Exam',
            QUESTIONNAIRES_SURVEYS: 'Questionnaires/Surveys',
            MEDICAL: 'Medical',
            PHYSICAL_EXAM: 'Physical Exam',
            RISKS: 'Risks',
            ASSESSMENT_AND_PLAN: 'Assessment and Plan',
            PSYCHOSOCIAL: 'Psychosocial',
            SAFETY_PLAN: 'Safety Plan',
            PROGNOSIS: 'Prognosis',
            FOLLOW_UP: 'Follow-Up',
            SUBJECTIVE: 'Subjective',
            OBJECTIVE: 'Objective',
            ASSESSMENT: 'Assessment',
            PLAN: 'Plan',
            UNKNOWN: 'Unknown Section'
        };

        return titleMap[type] || type.replace(/_/g, ' ');
    }

    // Helper methods (simplified versions of your existing methods)
    private static normalizeContent(content: string): string {
        return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    private static detectEMRType(content: string): 'epic' | 'credible' | 'unknown' {
        const epicPatterns = /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/;
        return epicPatterns.test(content) ? 'epic' : 'credible';
    }

    private static detectNoteFormat(content: string): 'SOAP' | 'NARRATIVE' | 'MIXED' | 'UNKNOWN' {
        const soapKeywords = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];
        const foundSoapSections = soapKeywords.filter(keyword =>
            content.toUpperCase().includes(keyword)
        ).length;

        return foundSoapSections >= 3 ? 'SOAP' : 'NARRATIVE';
    }

    private static detectEpicSyntax(content: string): boolean {
        return /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(content);
    }

    private static extractClinicalTerms(content: string): string[] {
        // Simplified clinical term extraction
        const clinicalTerms = [
            'anxiety', 'depression', 'bipolar', 'adhd', 'ptsd', 'ocd',
            'medication', 'therapy', 'counseling', 'psychiatric',
            'diagnosis', 'treatment', 'symptoms', 'mood'
        ];

        return clinicalTerms.filter(term =>
            content.toLowerCase().includes(term)
        );
    }

    private static calculateOverallConfidence(sections: StandardizedSection[]): number {
        if (sections.length === 0) return 0;

        const totalConfidence = sections.reduce((sum, section) => sum + section.confidence, 0);
        return totalConfidence / sections.length;
    }

    private static checkForOverlaps(sections: StandardizedSection[], warnings: string[]): void {
        for (let i = 0; i < sections.length - 1; i++) {
            const current = sections[i];
            const next = sections[i + 1];

            if (current.endIndex > next.startIndex) {
                warnings.push(`Overlapping sections detected: ${current.type} and ${next.type}`);
            }
        }
    }
}