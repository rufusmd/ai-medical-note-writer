// src/lib/ai-providers/validation-utility.ts
// 🔍 Enhanced validation utility for EMR-specific formatting

import { ClinicalContext } from '@/components/clinical/ClinicalContextSelector';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number; // 0-100 quality score
    recommendations: string[];
}

export class NoteValidationUtility {

    /**
     * Comprehensive note validation with detailed analysis
     */
    static validateNote(noteContent: string, context: ClinicalContext): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Basic content validation
        if (!noteContent || noteContent.trim().length === 0) {
            errors.push('Note content is empty');
            return { isValid: false, errors, warnings, score: 0, recommendations };
        }

        // EMR-specific validation
        const emrValidation = this.validateEMRFormatting(noteContent, context);
        errors.push(...emrValidation.errors);
        warnings.push(...emrValidation.warnings);
        score -= emrValidation.penalties;

        // SOAP structure validation
        const soapValidation = this.validateSOAPStructure(noteContent);
        errors.push(...soapValidation.errors);
        warnings.push(...soapValidation.warnings);
        score -= soapValidation.penalties;

        // Content quality validation
        const qualityValidation = this.validateContentQuality(noteContent, context);
        warnings.push(...qualityValidation.warnings);
        recommendations.push(...qualityValidation.recommendations);
        score -= qualityValidation.penalties;

        // Clinical completeness validation
        const completenessValidation = this.validateClinicalCompleteness(noteContent, context);
        warnings.push(...completenessValidation.warnings);
        recommendations.push(...completenessValidation.recommendations);
        score -= completenessValidation.penalties;

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: Math.max(0, score),
            recommendations
        };
    }

    /**
     * EMR-specific formatting validation
     */
    private static validateEMRFormatting(noteContent: string, context: ClinicalContext): {
        errors: string[];
        warnings: string[];
        penalties: number;
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        let penalties = 0;

        if (context.clinic === 'Davis Behavioral Health') {
            // CRITICAL: Credible EMR should have NO Epic syntax

            // Check for Epic SmartPhrases
            const smartPhraseMatches = noteContent.match(/@[A-Z][A-Z0-9]*[A-Z]@/g);
            if (smartPhraseMatches) {
                errors.push(`Epic SmartPhrases detected in Credible EMR note: ${smartPhraseMatches.join(', ')}`);
                penalties += 30;
            }

            // Check for any @ symbols (even partial SmartPhrases)
            if (noteContent.includes('@') && noteContent.match(/@[A-Z]/)) {
                errors.push('Epic SmartPhrase syntax (@) detected in Credible EMR note');
                penalties += 25;
            }

            // Check for DotPhrases
            const dotPhraseMatches = noteContent.match(/\.[a-z][a-z0-9]*[a-z]/g);
            if (dotPhraseMatches) {
                errors.push(`DotPhrases detected in Credible EMR note: ${dotPhraseMatches.join(', ')}`);
                penalties += 20;
            }

            // Check for SmartLists
            const smartListMatches = noteContent.match(/\{[A-Za-z\s]+:\d+\}/g);
            if (smartListMatches) {
                errors.push(`SmartLists detected in Credible EMR note: ${smartListMatches.join(', ')}`);
                penalties += 20;
            }

            // Check for Epic wildcards
            if (noteContent.includes('***')) {
                errors.push('Epic wildcards (***) detected in Credible EMR note');
                penalties += 15;
            }

            // Check for Epic-specific terms
            const epicTerms = ['SMARTPHRASE', 'SmartPhrase', 'DotPhrase', 'SmartList'];
            epicTerms.forEach(term => {
                if (noteContent.includes(term)) {
                    errors.push(`Epic terminology "${term}" detected in Credible EMR note`);
                    penalties += 10;
                }
            });

            // Check for specific Epic formatting patterns
            if (noteContent.includes('***') || noteContent.includes('$$$')) {
                errors.push('Epic placeholder patterns detected in Credible EMR note');
                penalties += 15;
            }

        } else if (context.clinic === 'HMHI Downtown') {
            // Epic EMR validation - more permissive

            // Epic notes can have SmartPhrases, but warn if none are present
            if (!noteContent.includes('@') && !noteContent.includes('.') && noteContent.length > 500) {
                warnings.push('No Epic SmartPhrases or DotPhrases detected - consider adding for workflow efficiency');
                penalties += 5;
            }

            // Check for malformed SmartPhrases
            const malformedSmartPhrases = noteContent.match(/@[^@]*[^A-Z]@/g);
            if (malformedSmartPhrases) {
                warnings.push(`Potentially malformed SmartPhrases: ${malformedSmartPhrases.join(', ')}`);
                penalties += 10;
            }
        }

        return { errors, warnings, penalties };
    }

    /**
     * SOAP structure validation
     */
    private static validateSOAPStructure(noteContent: string): {
        errors: string[];
        warnings: string[];
        penalties: number;
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        let penalties = 0;

        const requiredSections = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];
        const missingSections = requiredSections.filter(section =>
            !noteContent.includes(section)
        );

        if (missingSections.length > 0) {
            errors.push(`Missing SOAP sections: ${missingSections.join(', ')}`);
            penalties += missingSections.length * 15;
        }

        // Check section order
        const sectionPositions = requiredSections.map(section => ({
            section,
            position: noteContent.indexOf(section)
        })).filter(item => item.position !== -1);

        const isCorrectOrder = sectionPositions.every((item, index) => {
            if (index === 0) return true;
            return item.position > sectionPositions[index - 1].position;
        });

        if (!isCorrectOrder && sectionPositions.length > 1) {
            warnings.push('SOAP sections appear to be out of order');
            penalties += 10;
        }

        // Check for empty sections
        requiredSections.forEach(section => {
            if (noteContent.includes(section)) {
                const sectionStart = noteContent.indexOf(section);
                const nextSectionIndex = requiredSections.findIndex(s => s === section) + 1;
                const nextSection = nextSectionIndex < requiredSections.length ?
                    requiredSections[nextSectionIndex] : null;

                let sectionContent;
                if (nextSection && noteContent.includes(nextSection)) {
                    sectionContent = noteContent.substring(
                        sectionStart + section.length,
                        noteContent.indexOf(nextSection)
                    ).trim();
                } else {
                    sectionContent = noteContent.substring(sectionStart + section.length).trim();
                }

                if (sectionContent.length < 20) {
                    warnings.push(`${section.replace(':', '')} section appears to be very short or empty`);
                    penalties += 8;
                }
            }
        });

        return { errors, warnings, penalties };
    }

    /**
     * Content quality validation
     */
    private static validateContentQuality(noteContent: string, context: ClinicalContext): {
        warnings: string[];
        recommendations: string[];
        penalties: number;
    } {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let penalties = 0;

        // Length validation
        if (noteContent.length < 200) {
            warnings.push('Note content seems very short for a clinical note');
            penalties += 15;
            recommendations.push('Consider adding more detail to each SOAP section');
        }

        if (noteContent.length > 15000) {
            warnings.push('Note content is very long - consider condensing');
            penalties += 10;
            recommendations.push('Review for redundant information and consider breaking into multiple notes');
        }

        // Paragraph structure validation
        const paragraphCount = noteContent.split('\n\n').filter(p => p.trim().length > 0).length;
        if (paragraphCount < 4) {
            warnings.push('Note lacks proper paragraph structure');
            penalties += 10;
            recommendations.push('Add paragraph breaks for better readability');
        }

        // Clinical terminology check
        const clinicalTerms = [
            'mental status', 'mood', 'affect', 'thought', 'behavior',
            'assessment', 'plan', 'treatment', 'medication', 'therapy'
        ];

        const foundTerms = clinicalTerms.filter(term =>
            noteContent.toLowerCase().includes(term)
        );

        if (foundTerms.length < 3) {
            warnings.push('Limited clinical terminology detected');
            penalties += 8;
            recommendations.push('Consider using more specific psychiatric terminology');
        }

        // Placeholder detection
        const placeholders = ['[To be documented]', '[TBD]', '[TODO]', 'XXX', 'placeholder'];
        placeholders.forEach(placeholder => {
            if (noteContent.toLowerCase().includes(placeholder.toLowerCase())) {
                warnings.push(`Placeholder text detected: ${placeholder}`);
                penalties += 5;
                recommendations.push('Replace placeholder text with actual clinical content');
            }
        });

        return { warnings, recommendations, penalties };
    }

    /**
     * Clinical completeness validation based on visit type
     */
    private static validateClinicalCompleteness(noteContent: string, context: ClinicalContext): {
        warnings: string[];
        recommendations: string[];
        penalties: number;
    } {
        const warnings: string[] = [];
        const recommendations: string[] = [];
        let penalties = 0;

        const lowerContent = noteContent.toLowerCase();

        // Visit type specific validation
        if (context.visitType === 'Psychiatric Intake') {
            const intakeRequirements = [
                { term: 'chief complaint', weight: 15 },
                { term: 'history of present illness', weight: 10 },
                { term: 'mental status', weight: 15 },
                { term: 'risk assessment', weight: 20 },
                { term: 'treatment plan', weight: 10 }
            ];

            intakeRequirements.forEach(req => {
                if (!lowerContent.includes(req.term)) {
                    warnings.push(`Missing ${req.term} for psychiatric intake`);
                    penalties += req.weight;
                    recommendations.push(`Add comprehensive ${req.term} section for intake documentation`);
                }
            });
        }

        if (context.visitType === 'Transfer of Care') {
            const transferRequirements = [
                { term: 'current treatment', weight: 15 },
                { term: 'medication', weight: 10 },
                { term: 'response', weight: 10 },
                { term: 'recommendation', weight: 15 }
            ];

            transferRequirements.forEach(req => {
                if (!lowerContent.includes(req.term)) {
                    warnings.push(`Missing ${req.term} information for transfer of care`);
                    penalties += req.weight;
                    recommendations.push(`Include ${req.term} details for proper care transition`);
                }
            });
        }

        // Mental status exam components (for all psychiatric notes)
        const mseComponents = [
            'appearance', 'behavior', 'speech', 'mood', 'affect',
            'thought process', 'thought content', 'cognition', 'insight', 'judgment'
        ];

        const foundMSEComponents = mseComponents.filter(component =>
            lowerContent.includes(component)
        );

        if (foundMSEComponents.length < 5) {
            warnings.push('Mental status exam appears incomplete');
            penalties += 12;
            recommendations.push('Include more comprehensive mental status exam components');
        }

        // Safety assessment
        const safetyTerms = ['risk', 'safety', 'suicid', 'harm', 'danger'];
        const hasSafetyAssessment = safetyTerms.some(term => lowerContent.includes(term));

        if (!hasSafetyAssessment && context.visitType !== 'Follow-up') {
            warnings.push('No explicit safety/risk assessment documented');
            penalties += 15;
            recommendations.push('Include risk assessment and safety planning');
        }

        return { warnings, recommendations, penalties };
    }

    /**
     * Quick Epic syntax check for Davis Behavioral Health
     */
    static hasEpicSyntax(noteContent: string): boolean {
        const epicPatterns = [
            /@[A-Z]/,  // SmartPhrase start
            /\.[a-z]/, // DotPhrase pattern
            /\{[A-Za-z\s]+:\d+\}/, // SmartList pattern
            /\*\*\*/, // Epic wildcards
            /SMARTPHRASE/i,
            /SmartList/i
        ];

        return epicPatterns.some(pattern => pattern.test(noteContent));
    }

    /**
     * Clean Epic syntax from text (emergency fallback)
     */
    static cleanEpicSyntax(noteContent: string): string {
        let cleanedContent = noteContent;

        // Remove SmartPhrases
        cleanedContent = cleanedContent.replace(/@[A-Z][A-Z0-9]*[A-Z]@/g, '[SmartPhrase removed]');

        // Remove DotPhrases
        cleanedContent = cleanedContent.replace(/\.[a-z][a-z0-9]*[a-z]/g, '[DotPhrase removed]');

        // Remove SmartLists
        cleanedContent = cleanedContent.replace(/\{[A-Za-z\s]+:\d+\}/g, '[SmartList removed]');

        // Remove wildcards
        cleanedContent = cleanedContent.replace(/\*\*\*/g, '[field]');

        // Remove Epic terminology
        cleanedContent = cleanedContent.replace(/SMARTPHRASE/gi, 'template');
        cleanedContent = cleanedContent.replace(/SmartList/gi, 'list');

        return cleanedContent;
    }

    /**
     * Generate validation report
     */
    static generateValidationReport(result: ValidationResult, context: ClinicalContext): string {
        let report = `VALIDATION REPORT - ${context.clinic} (${context.emr})\n`;
        report += `Score: ${result.score}/100\n`;
        report += `Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

        if (result.errors.length > 0) {
            report += `ERRORS (${result.errors.length}):\n`;
            result.errors.forEach((error, index) => {
                report += `${index + 1}. ❌ ${error}\n`;
            });
            report += '\n';
        }

        if (result.warnings.length > 0) {
            report += `WARNINGS (${result.warnings.length}):\n`;
            result.warnings.forEach((warning, index) => {
                report += `${index + 1}. ⚠️ ${warning}\n`;
            });
            report += '\n';
        }

        if (result.recommendations.length > 0) {
            report += `RECOMMENDATIONS (${result.recommendations.length}):\n`;
            result.recommendations.forEach((rec, index) => {
                report += `${index + 1}. 💡 ${rec}\n`;
            });
        }

        return report;
    }
}