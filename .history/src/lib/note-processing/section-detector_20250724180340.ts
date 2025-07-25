// src/lib/note-processing/section-detector.ts
// 🧠 INTELLIGENT SECTION DETECTION ENGINE for Transfer of Care
// Parses clinical notes into structured sections for selective updating

export interface DetectedSection {
    type: SectionType;
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
    };
}

export interface ParsedNote {
    originalContent: string;
    detectedFormat: 'SOAP' | 'NARRATIVE' | 'MIXED' | 'UNKNOWN';
    sections: DetectedSection[];
    emrType: 'epic' | 'credible' | 'unknown';
    parseMetadata: {
        totalSections: number;
        confidence: number;
        processingTime: number;
        errors: string[];
        warnings: string[];
    };
}

export type SectionType =
    | 'SUBJECTIVE'
    | 'OBJECTIVE'
    | 'ASSESSMENT'
    | 'PLAN'
    | 'HPI'
    | 'MSE'
    | 'VITALS'
    | 'MEDICATIONS'
    | 'ALLERGIES'
    | 'SOCIAL_HISTORY'
    | 'FAMILY_HISTORY'
    | 'REVIEW_OF_SYSTEMS'
    | 'CHIEF_COMPLAINT'
    | 'UNKNOWN'
    | 'HEADER'
    | 'FOOTER';

export class IntelligentSectionDetector {

    /**
     * Main parsing function - intelligently detect and parse note sections
     */
    static parseNote(noteContent: string): ParsedNote {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Clean and normalize content
            const normalizedContent = this.normalizeContent(noteContent);

            // Detect EMR type from syntax patterns
            const emrType = this.detectEMRType(normalizedContent);

            // Detect overall note format
            const format = this.detectNoteFormat(normalizedContent);

            // Parse sections based on detected format
            let sections: DetectedSection[] = [];

            switch (format) {
                case 'SOAP':
                    sections = this.parseSOAPSections(normalizedContent, emrType);
                    break;
                case 'NARRATIVE':
                    sections = this.parseNarrativeSections(normalizedContent, emrType);
                    break;
                case 'MIXED':
                    sections = this.parseMixedFormatSections(normalizedContent, emrType);
                    break;
                default:
                    sections = this.parseUnknownFormatSections(normalizedContent, emrType);
                    warnings.push('Unknown note format - using heuristic parsing');
            }

            // Post-process and validate sections
            sections = this.postProcessSections(sections, normalizedContent);

            // Calculate overall confidence
            const confidence = this.calculateOverallConfidence(sections, format);

            if (confidence < 0.6) {
                warnings.push('Low confidence in section detection - manual review recommended');
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
                    warnings
                }
            };

        } catch (error) {
            errors.push(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
                    warnings
                }
            };
        }
    }

    /**
     * Normalize content for consistent parsing
     */
    private static normalizeContent(content: string): string {
        return content
            .replace(/\r\n/g, '\n')  // Normalize line endings
            .replace(/\t/g, ' ')     // Replace tabs with spaces
            .replace(/[ ]{2,}/g, ' ') // Collapse multiple spaces
            .trim();
    }

    /**
     * Detect EMR type from syntax patterns
     */
    private static detectEMRType(content: string): 'epic' | 'credible' | 'unknown' {
        const epicPatterns = [
            /@[A-Z][A-Z0-9]*[A-Z]@/,    // SmartPhrases
            /\.[a-z][a-z0-9]*[a-z]/,     // DotPhrases
            /\{[A-Za-z\s]+:\d+\}/,       // SmartLists
            /\*\*\*/                     // Epic wildcards
        ];

        const hasEpicSyntax = epicPatterns.some(pattern => pattern.test(content));

        if (hasEpicSyntax) {
            return 'epic';
        }

        // Additional credible indicators
        const credibleIndicators = [
            /credible/i,
            /mental status exam:/i,
            /assessment and plan:/i
        ];

        const hasCredibleIndicators = credibleIndicators.some(pattern => pattern.test(content));

        return hasCredibleIndicators ? 'credible' : 'unknown';
    }

    /**
     * Detect overall note format structure
     */
    private static detectNoteFormat(content: string): 'SOAP' | 'NARRATIVE' | 'MIXED' | 'UNKNOWN' {
        const soapKeywords = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];
        const foundSoapSections = soapKeywords.filter(keyword =>
            content.toUpperCase().includes(keyword)
        );

        if (foundSoapSections.length >= 3) {
            return 'SOAP';
        }

        // Check for other structured formats
        const structuredKeywords = [
            'CHIEF COMPLAINT:', 'HPI:', 'HISTORY OF PRESENT ILLNESS:',
            'MENTAL STATUS EXAM:', 'MSE:', 'VITALS:', 'MEDICATIONS:'
        ];

        const foundStructured = structuredKeywords.filter(keyword =>
            content.toUpperCase().includes(keyword)
        );

        if (foundStructured.length >= 2) {
            return foundSoapSections.length > 0 ? 'MIXED' : 'NARRATIVE';
        }

        return 'UNKNOWN';
    }

    /**
     * Parse SOAP formatted notes
     */
    private static parseSOAPSections(content: string, emrType: string): DetectedSection[] {
        const sections: DetectedSection[] = [];
        const soapSections = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];

        soapSections.forEach((sectionTitle, index) => {
            const sectionStart = content.toUpperCase().indexOf(sectionTitle);

            if (sectionStart !== -1) {
                const nextSectionIndex = index + 1;
                const nextSection = nextSectionIndex < soapSections.length ? soapSections[nextSectionIndex] : null;

                let sectionEnd = content.length;
                if (nextSection) {
                    const nextSectionStart = content.toUpperCase().indexOf(nextSection, sectionStart + 1);
                    if (nextSectionStart !== -1) {
                        sectionEnd = nextSectionStart;
                    }
                }

                const sectionContent = content.substring(sectionStart + sectionTitle.length, sectionEnd).trim();

                if (sectionContent.length > 0) {
                    sections.push(this.createSection(
                        sectionTitle.replace(':', '') as SectionType,
                        sectionTitle,
                        sectionContent,
                        sectionStart,
                        sectionEnd,
                        emrType,
                        0.9 // High confidence for SOAP sections
                    ));
                }
            }
        });

        return sections;
    }

    /**
     * Parse narrative/mixed format notes using intelligent keywords
     */
    private static parseNarrativeSections(content: string, emrType: string): DetectedSection[] {
        const sections: DetectedSection[] = [];

        const narrativePatterns = [
            { type: 'CHIEF_COMPLAINT', keywords: ['chief complaint:', 'cc:', 'presenting concern:'] },
            { type: 'HPI', keywords: ['history of present illness:', 'hpi:', 'present illness:'] },
            { type: 'MSE', keywords: ['mental status exam:', 'mse:', 'mental status:'] },
            { type: 'VITALS', keywords: ['vital signs:', 'vitals:', 'vs:'] },
            { type: 'MEDICATIONS', keywords: ['medications:', 'current medications:', 'meds:'] },
            { type: 'ALLERGIES', keywords: ['allergies:', 'nkda:', 'drug allergies:'] },
            { type: 'SOCIAL_HISTORY', keywords: ['social history:', 'social hx:', 'sh:'] },
            { type: 'FAMILY_HISTORY', keywords: ['family history:', 'family hx:', 'fh:'] },
            { type: 'REVIEW_OF_SYSTEMS', keywords: ['review of systems:', 'ros:', 'systems review:'] }
        ];

        narrativePatterns.forEach(pattern => {
            const foundSection = this.findSectionByKeywords(
                content,
                pattern.keywords,
                pattern.type as SectionType,
                emrType
            );

            if (foundSection) {
                sections.push(foundSection);
            }
        });

        return sections.sort((a, b) => a.startIndex - b.startIndex);
    }

    /**
     * Parse mixed format sections (combination of SOAP and narrative)
     */
    private static parseMixedFormatSections(content: string, emrType: string): DetectedSection[] {
        // Combine SOAP and narrative parsing
        const soapSections = this.parseSOAPSections(content, emrType);
        const narrativeSections = this.parseNarrativeSections(content, emrType);

        // Merge and deduplicate
        const allSections = [...soapSections, ...narrativeSections];
        const uniqueSections = this.deduplicateSections(allSections);

        return uniqueSections.sort((a, b) => a.startIndex - b.startIndex);
    }

    /**
     * Fallback parsing for unknown formats using heuristics
     */
    private static parseUnknownFormatSections(content: string, emrType: string): DetectedSection[] {
        const sections: DetectedSection[] = [];

        // Use paragraph-based detection as fallback
        const paragraphs = content.split(/\n\s*\n/);

        paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim().length > 20) { // Skip very short paragraphs
                const startIndex = content.indexOf(paragraph);
                const endIndex = startIndex + paragraph.length;

                // Try to classify paragraph content
                const sectionType = this.classifyParagraphContent(paragraph);

                sections.push(this.createSection(
                    sectionType,
                    `Section ${index + 1}`,
                    paragraph.trim(),
                    startIndex,
                    endIndex,
                    emrType,
                    0.4 // Lower confidence for heuristic detection
                ));
            }
        });

        return sections;
    }

    /**
     * Find section by matching keywords
     */
    private static findSectionByKeywords(
        content: string,
        keywords: string[],
        sectionType: SectionType,
        emrType: string
    ): DetectedSection | null {
        const contentLower = content.toLowerCase();

        for (const keyword of keywords) {
            const keywordIndex = contentLower.indexOf(keyword.toLowerCase());

            if (keywordIndex !== -1) {
                // Find the end of this section (next section or end of content)
                const sectionStart = keywordIndex;
                let sectionEnd = content.length;

                // Look for next section header
                const nextHeaderIndex = this.findNextSectionHeader(content, keywordIndex + keyword.length);
                if (nextHeaderIndex !== -1) {
                    sectionEnd = nextHeaderIndex;
                }

                const sectionContent = content.substring(
                    sectionStart + keyword.length,
                    sectionEnd
                ).trim();

                if (sectionContent.length > 0) {
                    return this.createSection(
                        sectionType,
                        keyword,
                        sectionContent,
                        sectionStart,
                        sectionEnd,
                        emrType,
                        0.8
                    );
                }
            }
        }

        return null;
    }

    /**
     * Find the next section header in content
     */
    private static findNextSectionHeader(content: string, fromIndex: number): number {
        const sectionPatterns = [
            /\n[A-Z][A-Z\s]+:/g,  // All caps headers like "ASSESSMENT:"
            /\n[A-Za-z\s]+:/g     // Title case headers like "Mental Status:"
        ];

        let earliestIndex = -1;

        sectionPatterns.forEach(pattern => {
            pattern.lastIndex = fromIndex;
            const match = pattern.exec(content);
            if (match && (earliestIndex === -1 || match.index < earliestIndex)) {
                earliestIndex = match.index;
            }
        });

        return earliestIndex;
    }

    /**
     * Classify paragraph content to determine section type
     */
    private static classifyParagraphContent(paragraph: string): SectionType {
        const contentLower = paragraph.toLowerCase();

        // Keywords that suggest specific section types
        const classificationRules = [
            { type: 'SUBJECTIVE' as SectionType, keywords: ['reports', 'states', 'describes', 'complains', 'feeling'] },
            { type: 'OBJECTIVE' as SectionType, keywords: ['appears', 'observed', 'mental status', 'vital signs', 'examination'] },
            { type: 'ASSESSMENT' as SectionType, keywords: ['diagnosis', 'impression', 'assessment', 'disorder', 'condition'] },
            { type: 'PLAN' as SectionType, keywords: ['plan', 'treatment', 'medication', 'therapy', 'follow-up', 'recommend'] },
            { type: 'HPI' as SectionType, keywords: ['history', 'onset', 'duration', 'symptoms', 'started'] },
            { type: 'MSE' as SectionType, keywords: ['mental status', 'mood', 'affect', 'thought', 'cognition', 'oriented'] }
        ];

        for (const rule of classificationRules) {
            const matchCount = rule.keywords.filter(keyword =>
                contentLower.includes(keyword)
            ).length;

            if (matchCount >= 2) {
                return rule.type;
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Create a standardized section object
     */
    private static createSection(
        type: SectionType,
        title: string,
        content: string,
        startIndex: number,
        endIndex: number,
        emrType: string,
        confidence: number
    ): DetectedSection {
        // Detect Epic syntax in content
        const hasEpicSyntax = this.detectEpicSyntaxInText(content);

        // Extract clinical terms
        const clinicalTerms = this.extractClinicalTerms(content);

        // Count words
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

        return {
            type,
            title,
            content,
            startIndex,
            endIndex,
            confidence,
            metadata: {
                hasEpicSyntax,
                wordCount,
                isEmpty: content.trim().length === 0,
                clinicalTerms
            }
        };
    }

    /**
     * Detect Epic syntax in text content
     */
    private static detectEpicSyntaxInText(content: string): boolean {
        const epicPatterns = [
            /@[A-Z][A-Z0-9]*[A-Z]@/,
            /\.[a-z][a-z0-9]*[a-z]/,
            /\{[A-Za-z\s]+:\d+\}/,
            /\*\*\*/
        ];

        return epicPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Extract clinical terms from content
     */
    private static extractClinicalTerms(content: string): string[] {
        const clinicalKeywords = [
            'anxiety', 'depression', 'mood', 'affect', 'thought', 'behavior',
            'medication', 'therapy', 'treatment', 'diagnosis', 'assessment',
            'mental status', 'cognition', 'orientation', 'memory', 'insight',
            'judgment', 'suicidal', 'homicidal', 'psychosis', 'delusion',
            'hallucination', 'panic', 'phobia', 'ptsd', 'bipolar', 'adhd'
        ];

        const contentLower = content.toLowerCase();
        return clinicalKeywords.filter(term => contentLower.includes(term));
    }

    /**
     * Remove duplicate sections that overlap significantly
     */
    private static deduplicateSections(sections: DetectedSection[]): DetectedSection[] {
        const unique: DetectedSection[] = [];

        sections.forEach(section => {
            const hasOverlap = unique.some(existing => {
                const overlapStart = Math.max(section.startIndex, existing.startIndex);
                const overlapEnd = Math.min(section.endIndex, existing.endIndex);
                const overlapLength = Math.max(0, overlapEnd - overlapStart);

                const sectionLength = section.endIndex - section.startIndex;
                const existingLength = existing.endIndex - existing.startIndex;

                const overlapPercentage = overlapLength / Math.min(sectionLength, existingLength);

                return overlapPercentage > 0.5; // 50% overlap threshold
            });

            if (!hasOverlap) {
                unique.push(section);
            }
        });

        return unique;
    }

    /**
     * Post-process sections for quality and consistency
     */
    private static postProcessSections(sections: DetectedSection[], originalContent: string): DetectedSection[] {
        // Remove empty sections
        let processed = sections.filter(section => !section.metadata.isEmpty);

        // Ensure sections don't overlap inappropriately
        processed = this.resolveOverlappingSections(processed);

        // Validate section boundaries
        processed = this.validateSectionBoundaries(processed, originalContent);

        return processed;
    }

    /**
     * Resolve overlapping sections by keeping higher confidence ones
     */
    private static resolveOverlappingSections(sections: DetectedSection[]): DetectedSection[] {
        const resolved: DetectedSection[] = [];
        const sortedSections = [...sections].sort((a, b) => a.startIndex - b.startIndex);

        sortedSections.forEach(section => {
            const conflicting = resolved.filter(existing => {
                return !(section.endIndex <= existing.startIndex || section.startIndex >= existing.endIndex);
            });

            if (conflicting.length === 0) {
                resolved.push(section);
            } else {
                // Keep the section with highest confidence
                const allSections = [section, ...conflicting];
                const bestSection = allSections.reduce((best, current) =>
                    current.confidence > best.confidence ? current : best
                );

                // Remove conflicting sections and add the best one
                conflicting.forEach(conflict => {
                    const index = resolved.indexOf(conflict);
                    if (index !== -1) resolved.splice(index, 1);
                });

                resolved.push(bestSection);
            }
        });

        return resolved.sort((a, b) => a.startIndex - b.startIndex);
    }

    /**
     * Validate section boundaries against original content
     */
    private static validateSectionBoundaries(sections: DetectedSection[], originalContent: string): DetectedSection[] {
        return sections.map(section => {
            // Ensure indices are within bounds
            const validStartIndex = Math.max(0, Math.min(section.startIndex, originalContent.length));
            const validEndIndex = Math.max(validStartIndex, Math.min(section.endIndex, originalContent.length));

            // Extract actual content using validated indices
            const actualContent = originalContent.substring(validStartIndex, validEndIndex);

            return {
                ...section,
                startIndex: validStartIndex,
                endIndex: validEndIndex,
                content: actualContent.trim()
            };
        });
    }

    /**
     * Calculate overall parsing confidence based on section quality
     */
    private static calculateOverallConfidence(sections: DetectedSection[], format: string): number {
        if (sections.length === 0) return 0;

        // Base confidence on format detection
        let baseConfidence = 0.5;
        switch (format) {
            case 'SOAP': baseConfidence = 0.9; break;
            case 'MIXED': baseConfidence = 0.7; break;
            case 'NARRATIVE': baseConfidence = 0.6; break;
            default: baseConfidence = 0.3;
        }

        // Average section confidence
        const avgSectionConfidence = sections.reduce((sum, section) =>
            sum + section.confidence, 0
        ) / sections.length;

        // Weighted combination
        return (baseConfidence * 0.4) + (avgSectionConfidence * 0.6);
    }

    /**
     * Utility: Get section by type
     */
    static getSectionByType(parsedNote: ParsedNote, sectionType: SectionType): DetectedSection | null {
        return parsedNote.sections.find(section => section.type === sectionType) || null;
    }

    /**
     * Utility: Get all SOAP sections
     */
    static getSOAPSections(parsedNote: ParsedNote): { [key: string]: DetectedSection | null } {
        return {
            subjective: this.getSectionByType(parsedNote, 'SUBJECTIVE'),
            objective: this.getSectionByType(parsedNote, 'OBJECTIVE'),
            assessment: this.getSectionByType(parsedNote, 'ASSESSMENT'),
            plan: this.getSectionByType(parsedNote, 'PLAN')
        };
    }

    /**
     * Utility: Generate section summary for UI display
     */
    static generateSectionSummary(parsedNote: ParsedNote): string {
        const sectionCounts = parsedNote.sections.reduce((counts, section) => {
            counts[section.type] = (counts[section.type] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        const sectionTypes = Object.entries(sectionCounts)
            .map(([type, count]) => count > 1 ? `${type}(${count})` : type)
            .join(', ');

        return `${parsedNote.detectedFormat} format, ${parsedNote.sections.length} sections: ${sectionTypes}`;
    }
}