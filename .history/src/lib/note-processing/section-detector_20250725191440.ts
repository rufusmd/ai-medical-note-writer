// src/lib/note-processing/enhanced-section-detector.ts
// 🧠 ENHANCED SECTION DETECTION ENGINE with Standardized Transfer of Care Sections
// Backward compatible with existing SOAP detection + new standardized sections

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

    // Legacy SOAP support (backward compatibility)
    | 'SUBJECTIVE'
    | 'OBJECTIVE'
    | 'ASSESSMENT'
    | 'PLAN'

    // Additional sections from your original detector
    | 'MSE'
    | 'VITALS'
    | 'MEDICATIONS'
    | 'ALLERGIES'
    | 'SOCIAL_HISTORY'
    | 'FAMILY_HISTORY'
    | 'CHIEF_COMPLAINT'
    | 'UNKNOWN'
    | 'HEADER'
    | 'FOOTER';

export interface EnhancedDetectedSection {
    type: StandardizedSectionType;
    title: string;
    content: string;
    startIndex: number;
    endIndex: number;
    confidence: number; // 0-1 confidence score
    metadata: {
        hasEpicSyntax: boolean;
        wordCount: number;
        isEmpty: boolean;
        clinicalTerms: string[];
        originalSectionName?: string; // What was actually found in the note
        isStandardized: boolean; // Whether this matches our standardized sections
    };
}

export interface EnhancedParsedNote {
    originalContent: string;
    detectedFormat: 'SOAP' | 'NARRATIVE' | 'MIXED' | 'UNKNOWN';
    sections: EnhancedDetectedSection[];
    emrType: 'epic' | 'credible' | 'unknown';
    parseMetadata: {
        totalSections: number;
        confidence: number;
        processingTime: number;
        errors: string[];
        warnings: string[];
        matchedPatterns: string[];
        standardizedSections: number; // How many matched our standardized list
    };
}

/**
 * Enhanced section detection patterns for your standardized sections
 */
const ENHANCED_SECTION_PATTERNS = {
    // Your standardized transfer of care sections
    BASIC_DEMO_INFO: {
        keywords: ['name:', 'mrn:', 'date of birth:', 'dob:', 'demographics:', 'patient information:', 'patient id:', 'medical record number:'],
        alternativeNames: ['Patient Info', 'Demographics', 'Basic Information', 'Patient Data'],
        confidence: 0.9,
        isStandardized: true
    },
    DIAGNOSIS: {
        keywords: ['diagnosis:', 'diagnoses:', 'icd-10:', 'dsm-5:', 'primary diagnosis:', 'psychiatric diagnosis:', 'working diagnosis:'],
        alternativeNames: ['Diagnoses', 'Primary Diagnosis', 'Psychiatric Diagnoses', 'Working Diagnoses'],
        confidence: 0.9,
        isStandardized: true
    },
    IDENTIFYING_INFO: {
        keywords: ['occupation:', 'employment:', 'identifying information:', 'demographics:', 'social demographics:', 'background:'],
        alternativeNames: ['Demographics', 'Occupation', 'Social Information', 'Background'],
        confidence: 0.8,
        isStandardized: true
    },

    // Medications
    CURRENT_MEDICATIONS: {
        keywords: ['current medications:', 'medications:', 'meds:', 'current meds:', 'medication list:', 'active medications:'],
        alternativeNames: ['Medications', 'Current Meds', 'Medication List', 'Active Meds'],
        confidence: 0.9,
        isStandardized: true
    },
    BH_PRIOR_MEDS_TRIED: {
        keywords: ['behavioral health prior meds tried:', 'previous medications:', 'prior meds:', 'medication history:', 'past medications:', 'prior medication trials:'],
        alternativeNames: ['Previous Medications', 'Medication History', 'Prior Meds Tried', 'Past Meds'],
        confidence: 0.8,
        isStandardized: true
    },
    MEDICATIONS_PLAN: {
        keywords: ['medication changes:', 'prescription changes:', 'new medications:', 'medication plan:', 'medication management:', 'med changes:'],
        alternativeNames: ['Medication Changes', 'Prescription Plan', 'Medication Management', 'Med Plan'],
        confidence: 0.8,
        isStandardized: true
    },

    // Clinical Assessment - Your core sections
    HPI: {
        keywords: ['history of present illness:', 'hpi:', 'reason for visit:', 'chief complaint:', 'present illness:', 'history of presenting illness:'],
        alternativeNames: ['History of Present Illness', 'Chief Complaint', 'Reason for Visit', 'Present Illness'],
        confidence: 0.95,
        isStandardized: true
    },
    REVIEW_OF_SYSTEMS: {
        keywords: ['review of systems:', 'ros:', 'systems review:', 'symptom review:', 'review of symptoms:'],
        alternativeNames: ['ROS', 'Systems Review', 'Symptom Review', 'Review of Symptoms'],
        confidence: 0.9,
        isStandardized: true
    },
    PSYCHIATRIC_EXAM: {
        keywords: ['psychiatric exam:', 'mental status exam:', 'mse:', 'psychiatric examination:', 'mental status examination:', 'psych exam:'],
        alternativeNames: ['Mental Status Exam', 'MSE', 'Psychiatric Examination', 'Psych Exam'],
        confidence: 0.9,
        isStandardized: true
    },
    QUESTIONNAIRES_SURVEYS: {
        keywords: ['questionnaires:', 'surveys:', 'phq-9:', 'gad-7:', 'assessment scales:', 'rating scales:', 'screening tools:'],
        alternativeNames: ['Questionnaires', 'Assessment Scales', 'Rating Scales', 'Screening Tools'],
        confidence: 0.8,
        isStandardized: true
    },

    // Examination
    MEDICAL: {
        keywords: ['medical:', 'medical history:', 'medical update:', 'medical conditions:', 'medical review:', 'past medical history:'],
        alternativeNames: ['Medical History', 'Medical Update', 'Medical Conditions', 'Past Medical History'],
        confidence: 0.8,
        isStandardized: true
    },
    PHYSICAL_EXAM: {
        keywords: ['physical exam:', 'physical examination:', 'pe:', 'physical findings:', 'examination:', 'physical assessment:'],
        alternativeNames: ['Physical Examination', 'PE', 'Physical Findings', 'Physical Assessment'],
        confidence: 0.9,
        isStandardized: true
    },

    // Plan & Safety - Critical sections
    RISKS: {
        keywords: ['risks:', 'risk assessment:', 'suicide risk:', 'safety risk:', 'risk factors:', 'risk evaluation:'],
        alternativeNames: ['Risk Assessment', 'Safety Risk', 'Risk Factors', 'Risk Evaluation'],
        confidence: 0.9,
        isStandardized: true
    },
    ASSESSMENT_AND_PLAN: {
        keywords: ['assessment and plan:', 'assessment & plan:', 'a&p:', 'clinical assessment:', 'treatment plan:', 'assessment/plan:'],
        alternativeNames: ['Assessment & Plan', 'A&P', 'Clinical Assessment', 'Treatment Plan'],
        confidence: 0.95,
        isStandardized: true
    },
    PSYCHOSOCIAL: {
        keywords: ['psychosocial:', 'therapy:', 'counseling:', 'psychotherapy:', 'social interventions:', 'therapeutic interventions:'],
        alternativeNames: ['Therapy', 'Counseling', 'Psychotherapy', 'Social Interventions'],
        confidence: 0.8,
        isStandardized: true
    },
    SAFETY_PLAN: {
        keywords: ['safety plan:', 'crisis plan:', 'safety planning:', 'emergency plan:', 'crisis intervention:', 'safety strategy:'],
        alternativeNames: ['Crisis Plan', 'Safety Planning', 'Emergency Plan', 'Crisis Intervention'],
        confidence: 0.9,
        isStandardized: true
    },

    // Follow-up
    PROGNOSIS: {
        keywords: ['prognosis:', 'outlook:', 'clinical prognosis:', 'expected outcome:', 'prognosis assessment:'],
        alternativeNames: ['Outlook', 'Clinical Prognosis', 'Expected Outcome', 'Prognosis Assessment'],
        confidence: 0.8,
        isStandardized: true
    },
    FOLLOW_UP: {
        keywords: ['follow-up:', 'follow up:', 'next appointment:', 'return visit:', 'follow-up plan:', 'return appointment:'],
        alternativeNames: ['Next Appointment', 'Return Visit', 'Follow-up Plan', 'Return Appointment'],
        confidence: 0.9,
        isStandardized: true
    },

    // Legacy SOAP support (backward compatibility with your existing system)
    SUBJECTIVE: {
        keywords: ['subjective:', 's:'],
        alternativeNames: ['Subjective', 'S'],
        confidence: 0.95,
        isStandardized: false
    },
    OBJECTIVE: {
        keywords: ['objective:', 'o:'],
        alternativeNames: ['Objective', 'O'],
        confidence: 0.95,
        isStandardized: false
    },
    ASSESSMENT: {
        keywords: ['assessment:', 'a:'],
        alternativeNames: ['Assessment', 'A'],
        confidence: 0.95,
        isStandardized: false
    },
    PLAN: {
        keywords: ['plan:', 'p:'],
        alternativeNames: ['Plan', 'P'],
        confidence: 0.95,
        isStandardized: false
    },

    // Additional sections from your original detector
    MSE: {
        keywords: ['mental status exam:', 'mse:', 'mental status examination:'],
        alternativeNames: ['Mental Status Exam', 'Mental Status Examination'],
        confidence: 0.9,
        isStandardized: false
    },
    VITALS: {
        keywords: ['vitals:', 'vital signs:', 'vital statistics:', 'vs:'],
        alternativeNames: ['Vital Signs', 'Vitals', 'VS'],
        confidence: 0.9,
        isStandardized: false
    },
    MEDICATIONS: {
        keywords: ['medications:', 'meds:', 'medication list:'],
        alternativeNames: ['Medications', 'Meds'],
        confidence: 0.9,
        isStandardized: false
    },
    ALLERGIES: {
        keywords: ['allergies:', 'drug allergies:', 'allergy:', 'nkda:', 'nka:'],
        alternativeNames: ['Allergies', 'Drug Allergies', 'NKDA'],
        confidence: 0.9,
        isStandardized: false
    },
    SOCIAL_HISTORY: {
        keywords: ['social history:', 'social hx:', 'sh:', 'social:'],
        alternativeNames: ['Social History', 'Social Hx', 'SH'],
        confidence: 0.8,
        isStandardized: false
    },
    FAMILY_HISTORY: {
        keywords: ['family history:', 'family hx:', 'fh:', 'family:'],
        alternativeNames: ['Family History', 'Family Hx', 'FH'],
        confidence: 0.8,
        isStandardized: false
    },
    CHIEF_COMPLAINT: {
        keywords: ['chief complaint:', 'cc:', 'complaint:', 'chief concern:'],
        alternativeNames: ['Chief Complaint', 'CC', 'Chief Concern'],
        confidence: 0.9,
        isStandardized: false
    }
};

export class EnhancedSectionDetector {
    /**
     * Main parsing function - backward compatible with existing interface
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

            // Parse sections using enhanced patterns
            const sections = this.parseEnhancedSections(
                normalizedContent,
                emrType,
                matchedPatterns,
                warnings
            );

            const confidence = this.calculateOverallConfidence(sections);
            const standardizedSections = sections.filter(s => s.metadata.isStandardized).length;

            if (sections.length === 0) {
                warnings.push('No sections detected - manual review recommended');
            }

            if (standardizedSections > 0) {
                console.log(`✅ Enhanced detection found ${standardizedSections} standardized sections`);
            }

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
                    matchedPatterns,
                    standardizedSections
                }
            };

        } catch (error) {
            errors.push(`Enhanced parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
                    matchedPatterns,
                    standardizedSections: 0
                }
            };
        }
    }

    /**
     * Parse sections using enhanced patterns (prioritizes standardized sections)
     */
    private static parseEnhancedSections(
        content: string,
        emrType: 'epic' | 'credible' | 'unknown',
        matchedPatterns: string[],
        warnings: string[]
    ): EnhancedDetectedSection[] {
        const sections: EnhancedDetectedSection[] = [];
        const contentLower = content.toLowerCase();

        // Try to match each pattern (standardized sections first)
        const sortedPatterns = Object.entries(ENHANCED_SECTION_PATTERNS).sort((a, b) => {
            // Prioritize standardized sections
            const aStandardized = a[1].isStandardized;
            const bStandardized = b[1].isStandardized;
            if (aStandardized && !bStandardized) return -1;
            if (!aStandardized && bStandardized) return 1;
            // Then sort by confidence
            return b[1].confidence - a[1].confidence;
        });

        for (const [sectionType, pattern] of sortedPatterns) {
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

        // Check for overlapping sections and resolve conflicts
        const resolvedSections = this.resolveOverlappingSections(sections, warnings);

        return resolvedSections;
    }

    /**
     * Find a section using the detection pattern
     */
    private static findSectionByPattern(
        content: string,
        contentLower: string,
        sectionType: StandardizedSectionType,
        pattern: typeof ENHANCED_SECTION_PATTERNS[keyof typeof ENHANCED_SECTION_PATTERNS],
        emrType: 'epic' | 'credible' | 'unknown',
        matchedPatterns: string[]
    ): EnhancedDetectedSection | null {

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

                    return this.createEnhancedSection(
                        sectionType,
                        keyword,
                        sectionContent,
                        sectionStart,
                        sectionEnd,
                        emrType,
                        pattern.confidence,
                        pattern.isStandardized
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
        for (const pattern of Object.values(ENHANCED_SECTION_PATTERNS)) {
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
     * Create an enhanced section object
     */
    private static createEnhancedSection(
        type: StandardizedSectionType,
        originalHeader: string,
        content: string,
        startIndex: number,
        endIndex: number,
        emrType: 'epic' | 'credible' | 'unknown',
        confidence: number,
        isStandardized: boolean
    ): EnhancedDetectedSection {
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
                originalSectionName: originalHeader,
                isStandardized
            }
        };
    }

    /**
     * Resolve overlapping sections (prioritize standardized sections)
     */
    private static resolveOverlappingSections(
        sections: EnhancedDetectedSection[],
        warnings: string[]
    ): EnhancedDetectedSection[] {
        const resolved: EnhancedDetectedSection[] = [];

        sections.forEach(section => {
            const overlapping = resolved.filter(existing =>
                !(section.endIndex <= existing.startIndex || section.startIndex >= existing.endIndex)
            );

            if (overlapping.length === 0) {
                resolved.push(section);
            } else {
                // Prioritize standardized sections, then confidence
                const allSections = [section, ...overlapping];
                const bestSection = allSections.reduce((best, current) => {
                    if (current.metadata.isStandardized && !best.metadata.isStandardized) return current;
                    if (!current.metadata.isStandardized && best.metadata.isStandardized) return best;
                    return current.confidence > best.confidence ? current : best;
                });

                // Remove overlapping sections and add the best one
                overlapping.forEach(overlap => {
                    const index = resolved.indexOf(overlap);
                    if (index !== -1) resolved.splice(index, 1);
                });

                resolved.push(bestSection);
                warnings.push(`Resolved overlap between ${section.type} and ${overlapping.map(o => o.type).join(', ')}`);
            }
        });

        return resolved.sort((a, b) => a.startIndex - b.startIndex);
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
            MSE: 'Mental Status Exam',
            VITALS: 'Vitals',
            MEDICATIONS: 'Medications',
            ALLERGIES: 'Allergies',
            SOCIAL_HISTORY: 'Social History',
            FAMILY_HISTORY: 'Family History',
            CHIEF_COMPLAINT: 'Chief Complaint',
            UNKNOWN: 'Unknown Section',
            HEADER: 'Header',
            FOOTER: 'Footer'
        };

        return titleMap[type] || type.replace(/_/g, ' ');
    }

    // Utility methods (maintaining backward compatibility)
    private static normalizeContent(content: string): string {
        return content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/[ ]{2,}/g, ' ')
            .trim();
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

        if (foundSoapSections >= 3) return 'SOAP';

        // Check for narrative structure
        const standardizedSections = Object.keys(ENHANCED_SECTION_PATTERNS).filter(key =>
            ENHANCED_SECTION_PATTERNS[key as keyof typeof ENHANCED_SECTION_PATTERNS].isStandardized
        );

        const foundStandardized = standardizedSections.filter(section =>
            ENHANCED_SECTION_PATTERNS[section as keyof typeof ENHANCED_SECTION_PATTERNS].keywords.some(keyword =>
                content.toLowerCase().includes(keyword.toLowerCase())
            )
        ).length;

        if (foundStandardized >= 3) return 'NARRATIVE';
        if (foundSoapSections > 0 && foundStandardized > 0) return 'MIXED';

        return 'UNKNOWN';
    }

    private static detectEpicSyntax(content: string): boolean {
        return /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(content);
    }

    private static extractClinicalTerms(content: string): string[] {
        const clinicalTerms = [
            'anxiety', 'depression', 'bipolar', 'adhd', 'ptsd', 'ocd', 'schizophrenia',
            'medication', 'therapy', 'counseling', 'psychiatric', 'psychotherapy',
            'diagnosis', 'treatment', 'symptoms', 'mood', 'affect', 'behavior',
            'suicidal', 'homicidal', 'safety', 'risk', 'crisis', 'emergency',
            'follow-up', 'appointment', 'referral', 'consultation'
        ];

        return clinicalTerms.filter(term =>
            content.toLowerCase().includes(term)
        );
    }

    private static calculateOverallConfidence(sections: EnhancedDetectedSection[]): number {
        if (sections.length === 0) return 0;

        const totalConfidence = sections.reduce((sum, section) => sum + section.confidence, 0);
        const avgConfidence = totalConfidence / sections.length;

        // Boost confidence if we found standardized sections
        const standardizedCount = sections.filter(s => s.metadata.isStandardized).length;
        const standardizedBonus = Math.min(0.2, standardizedCount * 0.05);

        return Math.min(1.0, avgConfidence + standardizedBonus);
    }

    /**
     * Backward compatibility: Get section by type (legacy interface)
     */
    static getSectionByType(sections: EnhancedDetectedSection[], type: string): EnhancedDetectedSection | undefined {
        return sections.find(section => section.type === type);
    }

    /**
     * New utility: Get all standardized sections
     */
    static getStandardizedSections(sections: EnhancedDetectedSection[]): EnhancedDetectedSection[] {
        return sections.filter(section => section.metadata.isStandardized);
    }

    /**
     * New utility: Get sections by group
     */
    static getSectionsByGroup(sections: EnhancedDetectedSection[]): Record<string, EnhancedDetectedSection[]> {
        const groups = {
            'PATIENT_INFO': ['BASIC_DEMO_INFO', 'DIAGNOSIS', 'IDENTIFYING_INFO'],
            'MEDICATIONS': ['CURRENT_MEDICATIONS', 'BH_PRIOR_MEDS_TRIED', 'MEDICATIONS_PLAN'],
            'CLINICAL_ASSESSMENT': ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS'],
            'EXAMINATION': ['MEDICAL', 'PHYSICAL_EXAM'],
            'PLAN_AND_SAFETY': ['RISKS', 'ASSESSMENT_AND_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN'],
            'FOLLOW_UP': ['PROGNOSIS', 'FOLLOW_UP'],
            'LEGACY_SOAP': ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN']
        };

        const result: Record<string, EnhancedDetectedSection[]> = {};

        for (const [groupName, sectionTypes] of Object.entries(groups)) {
            result[groupName] = sections.filter(section =>
                sectionTypes.includes(section.type)
            );
        }

        return result;
    }
}

// Export types for backward compatibility
export type SectionType = StandardizedSectionType;
export type DetectedSection = EnhancedDetectedSection;
export type ParsedNote = EnhancedParsedNote;

// Export the main class with backward compatibility
export const IntelligentSectionDetector = EnhancedSectionDetector;