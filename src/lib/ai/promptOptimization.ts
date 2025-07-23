// src/lib/ai/promptOptimization.ts

import {
    ClinicalContext,
    EditPattern,
    InferredFeedback,
    PromptEvolution,
    EditAnalysisResult
} from '@/types/editTracking';

interface PromptTemplate {
    id: string;
    name: string;
    systemPrompt: string;
    userPromptTemplate: string;
    clinicalContext: ClinicalContext;
    version: string;
    performanceMetrics: {
        averageEditCount: number;
        averageEditTime: number;
        userSatisfactionScore: number;
        usageCount: number;
    };
}

interface OptimizationRule {
    pattern: string;
    condition: (feedback: InferredFeedback) => boolean;
    systemPromptAdjustment: string;
    userPromptAdjustment: string;
    confidence: number;
}

export class PromptOptimizationService {

    // Base prompt templates for different clinical contexts
    private basePrompts: Map<string, PromptTemplate> = new Map([
        ['epic_psychiatry', {
            id: 'epic_psychiatry_v1',
            name: 'Epic Psychiatry Note',
            systemPrompt: `You are an expert psychiatric clinician generating comprehensive clinical notes for Epic EMR. 

CORE REQUIREMENTS:
- Generate professional, thorough psychiatric notes suitable for Epic EMR
- Use appropriate Epic SmartPhrases and SmartLists where indicated
- Follow standard psychiatric documentation structure
- Maintain HIPAA compliance and clinical accuracy
- Use clear, professional medical language appropriate for peer review

EPIC FORMATTING:
- Use @SMARTPHRASE@ syntax for Epic shortcuts where appropriate
- Structure with clear sections: HPI, MSE, Assessment, Plan
- Include relevant psychiatric rating scales when applicable
- Format medications with proper dosing and frequency`,

            userPromptTemplate: `Generate a comprehensive psychiatric note for the following patient encounter:

PATIENT INFORMATION:
{{patientInfo}}

CLINICAL CONTEXT:
- Institution: {{institution}}
- Note Type: {{noteType}}
- Encounter Type: {{encounterType}}
- Provider Specialty: {{specialty}}

ENCOUNTER DATA:
{{encounterData}}

Please generate a complete psychiatric note following Epic documentation standards.`,

            clinicalContext: {
                emrSystem: 'epic',
                institution: 'HMHI Downtown',
                noteType: 'psychiatric',
                encounterType: 'follow-up',
                specialty: 'psychiatry'
            },
            version: 'v1.0',
            performanceMetrics: {
                averageEditCount: 0,
                averageEditTime: 0,
                userSatisfactionScore: 0,
                usageCount: 0
            }
        }],

        ['credible_behavioral_health', {
            id: 'credible_behavioral_v1',
            name: 'Credible Behavioral Health Note',
            systemPrompt: `You are an expert behavioral health clinician generating clinical notes for Credible EMR.

CORE REQUIREMENTS:
- Generate concise, clear behavioral health notes for Credible EMR
- Use plain text format without Epic-specific syntax
- Focus on therapeutic interventions and patient progress
- Maintain professional tone while being accessible
- Include measurable outcomes and treatment goals

CREDIBLE FORMATTING:
- Use standard section headers without special syntax
- Focus on behavioral observations and interventions
- Include treatment plan updates and patient response
- Document safety assessments and risk factors`,

            userPromptTemplate: `Generate a behavioral health note for the following patient encounter:

PATIENT INFORMATION:
{{patientInfo}}

CLINICAL CONTEXT:
- Institution: {{institution}}
- Note Type: {{noteType}}
- Encounter Type: {{encounterType}}
- Provider Specialty: {{specialty}}

ENCOUNTER DATA:
{{encounterData}}

Please generate a complete behavioral health note in plain text format suitable for Credible EMR.`,

            clinicalContext: {
                emrSystem: 'credible',
                institution: 'Davis Behavioral Health',
                noteType: 'behavioral_health',
                encounterType: 'therapy',
                specialty: 'psychology'
            },
            version: 'v1.0',
            performanceMetrics: {
                averageEditCount: 0,
                averageEditTime: 0,
                userSatisfactionScore: 0,
                usageCount: 0
            }
        }]
    ]);

    // Optimization rules based on edit patterns
    private optimizationRules: OptimizationRule[] = [
        {
            pattern: 'too_verbose',
            condition: (feedback) => feedback.specificIssues.too_verbose > 0.6,
            systemPromptAdjustment: 'Be more concise and focused. Avoid redundant information and lengthy descriptions.',
            userPromptAdjustment: 'Generate a concise note focusing on essential clinical information only.',
            confidence: 0.8
        },

        {
            pattern: 'too_brief',
            condition: (feedback) => feedback.specificIssues.too_brief > 0.6,
            systemPromptAdjustment: 'Provide more comprehensive details and thorough clinical reasoning.',
            userPromptAdjustment: 'Generate a detailed note with comprehensive clinical assessment and reasoning.',
            confidence: 0.8
        },

        {
            pattern: 'wrong_tone',
            condition: (feedback) => feedback.specificIssues.wrong_tone > 0.6,
            systemPromptAdjustment: 'Adjust tone to be more professional and clinical while remaining accessible.',
            userPromptAdjustment: 'Use professional medical language appropriate for clinical documentation.',
            confidence: 0.7
        },

        {
            pattern: 'missing_details',
            condition: (feedback) => feedback.specificIssues.missing_details > 0.6,
            systemPromptAdjustment: 'Include specific clinical details, measurements, and quantitative assessments.',
            userPromptAdjustment: 'Ensure the note includes specific details about symptoms, medications, and clinical observations.',
            confidence: 0.8
        },

        {
            pattern: 'poor_structure',
            condition: (feedback) => feedback.specificIssues.poor_structure > 0.6,
            systemPromptAdjustment: 'Follow standard clinical note structure with clear section organization.',
            userPromptAdjustment: 'Structure the note with clear, well-organized sections following clinical documentation standards.',
            confidence: 0.9
        },

        {
            pattern: 'style_mismatch',
            condition: (feedback) => feedback.specificIssues.style_mismatch > 0.6,
            systemPromptAdjustment: 'Match the clinical writing style and terminology preferences of the provider.',
            userPromptAdjustment: 'Generate the note using clinical language and style consistent with the provider\'s preferences.',
            confidence: 0.6
        }
    ];

    // Generate optimized prompt based on edit analysis
    public generateOptimizedPrompt(
        clinicalContext: ClinicalContext,
        editAnalysis: EditAnalysisResult,
        currentPrompt?: PromptTemplate
    ): PromptEvolution {

        // Get base prompt for this clinical context
        const basePrompt = this.getBasePrompt(clinicalContext) || this.getDefaultPrompt();
        const workingPrompt = currentPrompt || basePrompt;

        // Apply optimization rules based on inferred feedback
        const applicableRules = this.optimizationRules.filter(rule =>
            rule.condition(editAnalysis.inferredFeedback)
        );

        let optimizedSystemPrompt = workingPrompt.systemPrompt;
        let optimizedUserPrompt = workingPrompt.userPromptTemplate;

        // Apply system prompt optimizations
        applicableRules.forEach(rule => {
            if (!optimizedSystemPrompt.includes(rule.systemPromptAdjustment)) {
                optimizedSystemPrompt += `\n\nOPTIMIZATION (${rule.pattern}): ${rule.systemPromptAdjustment}`;
            }
        });

        // Apply user prompt optimizations
        applicableRules.forEach(rule => {
            if (!optimizedUserPrompt.includes(rule.userPromptAdjustment)) {
                optimizedUserPrompt += `\n\nNOTE: ${rule.userPromptAdjustment}`;
            }
        });

        // Apply pattern-specific optimizations
        editAnalysis.patterns.forEach(pattern => {
            const patternOptimization = this.getPatternSpecificOptimization(pattern);
            if (patternOptimization) {
                optimizedSystemPrompt += `\n\nPATTERN OPTIMIZATION: ${patternOptimization}`;
            }
        });

        // Calculate improvement metrics
        const improvementMetrics = this.calculateImprovementMetrics(editAnalysis);

        return {
            id: `optimized_${Date.now()}`,
            basePromptId: workingPrompt.id,
            version: `${workingPrompt.version}_opt_${Date.now()}`,
            clinicalContext,
            systemPrompt: optimizedSystemPrompt,
            userPromptTemplate: optimizedUserPrompt,
            basedOnSessions: [], // Would be populated with actual session IDs
            improvementMetrics,
            isActive: false, // Requires manual activation for A/B testing
            createdAt: new Date(),
            performanceHistory: []
        };
    }

    // Get appropriate base prompt for clinical context
    private getBasePrompt(clinicalContext: ClinicalContext): PromptTemplate | null {
        const contextKey = `${clinicalContext.emrSystem}_${clinicalContext.specialty}`;
        return this.basePrompts.get(contextKey) || null;
    }

    // Get default prompt as fallback
    private getDefaultPrompt(): PromptTemplate {
        return {
            id: 'default_clinical_v1',
            name: 'Default Clinical Note',
            systemPrompt: `You are an expert clinician generating professional medical notes.

CORE REQUIREMENTS:
- Generate accurate, comprehensive clinical documentation
- Use appropriate medical terminology and structure
- Maintain professional tone and clinical accuracy
- Follow standard medical documentation practices
- Ensure HIPAA compliance and patient privacy`,

            userPromptTemplate: `Generate a clinical note for the following patient encounter:

PATIENT INFORMATION:
{{patientInfo}}

CLINICAL CONTEXT:
{{clinicalContext}}

ENCOUNTER DATA:
{{encounterData}}

Please generate a complete clinical note following standard documentation practices.`,

            clinicalContext: {
                emrSystem: 'other',
                institution: 'General',
                noteType: 'clinical',
                encounterType: 'visit',
                specialty: 'general'
            },
            version: 'v1.0',
            performanceMetrics: {
                averageEditCount: 0,
                averageEditTime: 0,
                userSatisfactionScore: 0,
                usageCount: 0
            }
        };
    }

    // Get pattern-specific optimizations
    private getPatternSpecificOptimization(pattern: EditPattern): string | null {
        switch (pattern.type) {
            case 'consistent_deletion':
                if (pattern.description.includes('medical jargon')) {
                    return 'Use simpler, more accessible language while maintaining clinical accuracy.';
                }
                if (pattern.description.includes('large portions')) {
                    return 'Focus on essential information and avoid excessive detail.';
                }
                return 'Reduce content that users consistently remove.';

            case 'consistent_addition':
                if (pattern.description.includes('specific medical details')) {
                    return 'Include more specific clinical details, measurements, and quantitative data.';
                }
                return 'Anticipate information that users commonly add.';

            case 'style_change':
                return 'Adapt writing style to match user preferences for formality and terminology.';

            case 'medical_correction':
                return 'Improve medical accuracy and ensure proper clinical terminology.';

            case 'structure_change':
                return 'Adjust note organization and section structure to user preferences.';

            default:
                return null;
        }
    }

    // Calculate expected improvement metrics
    private calculateImprovementMetrics(editAnalysis: EditAnalysisResult) {
        const baselineEditCount = 10; // Assumed baseline
        const expectedEditReduction = editAnalysis.confidenceScore * 0.3; // Up to 30% reduction

        return {
            averageEditCount: Math.max(1, baselineEditCount * (1 - expectedEditReduction)),
            averageEditTime: 0, // To be measured
            userSatisfactionScore: Math.min(10, editAnalysis.inferredFeedback.overallSatisfaction + 1),
            medicalAccuracyScore: 8.5 // Baseline assumption
        };
    }

    // A/B testing support
    public createPromptVariants(
        basePrompt: PromptEvolution,
        editAnalysis: EditAnalysisResult
    ): { control: PromptEvolution; variantA: PromptEvolution; variantB: PromptEvolution } {

        // Control: Current optimized prompt
        const control = { ...basePrompt, testGroup: 'control' as const };

        // Variant A: Conservative optimizations
        const variantA: PromptEvolution = {
            ...basePrompt,
            id: `${basePrompt.id}_variant_a`,
            systemPrompt: this.applyConservativeOptimizations(basePrompt.systemPrompt, editAnalysis),
            testGroup: 'variant_a',
            version: `${basePrompt.version}_conservative`
        };

        // Variant B: Aggressive optimizations
        const variantB: PromptEvolution = {
            ...basePrompt,
            id: `${basePrompt.id}_variant_b`,
            systemPrompt: this.applyAggressiveOptimizations(basePrompt.systemPrompt, editAnalysis),
            testGroup: 'variant_b',
            version: `${basePrompt.version}_aggressive`
        };

        return { control, variantA, variantB };
    }

    private applyConservativeOptimizations(systemPrompt: string, editAnalysis: EditAnalysisResult): string {
        // Apply only high-confidence optimizations
        let optimized = systemPrompt;

        editAnalysis.patterns
            .filter(p => p.confidence > 0.8)
            .forEach(pattern => {
                const optimization = this.getPatternSpecificOptimization(pattern);
                if (optimization) {
                    optimized += `\n\nCONSERVATIVE OPTIMIZATION: ${optimization}`;
                }
            });

        return optimized;
    }

    private applyAggressiveOptimizations(systemPrompt: string, editAnalysis: EditAnalysisResult): string {
        // Apply all reasonable optimizations
        let optimized = systemPrompt;

        editAnalysis.patterns
            .filter(p => p.confidence > 0.5)
            .forEach(pattern => {
                const optimization = this.getPatternSpecificOptimization(pattern);
                if (optimization) {
                    optimized += `\n\nAGGRESSIVE OPTIMIZATION: ${optimization}`;
                }
            });

        // Add additional experimental optimizations
        if (editAnalysis.inferredFeedback.overallSatisfaction < 7) {
            optimized += '\n\nEXPERIMENTAL: Focus on user satisfaction and ease of use.';
        }

        return optimized;
    }

    // Update base prompts based on successful optimizations
    public updateBasePrompt(
        promptId: string,
        performanceData: {
            editCount: number;
            editTime: number;
            satisfaction: number;
            usageCount: number;
        }
    ): void {
        const prompt = this.basePrompts.get(promptId);
        if (prompt) {
            prompt.performanceMetrics = {
                averageEditCount: performanceData.editCount,
                averageEditTime: performanceData.editTime,
                userSatisfactionScore: performanceData.satisfaction,
                usageCount: performanceData.usageCount
            };
            this.basePrompts.set(promptId, prompt);
        }
    }
}

// Export singleton instance
export const promptOptimizationService = new PromptOptimizationService();