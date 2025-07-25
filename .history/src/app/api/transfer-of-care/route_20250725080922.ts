// src/app/api/transfer-of-care/route.ts
// 🔄 TRANSFER OF CARE API - Intelligent Note Updating

import { NextRequest, NextResponse } from 'next/server';
import { ClinicalPromptGenerator } from '@/lib/ai-providers/clinical-prompts';
import { NoteValidationUtility } from '@/lib/ai-providers/validation-utility';
import { IntelligentSectionDetector, ParsedNote, DetectedSection } from '@/lib/note-processing/section-detector';
import { getProviderManager } from '@/lib/ai-providers/provider-manager';

interface SectionUpdateConfig {
    sectionType: string;
    shouldUpdate: boolean;
    updateReason: string;
    preserveOriginal: boolean;
    mergeStrategy: 'replace' | 'append' | 'merge';
}

interface TransferOfCareRequest {
    previousNote: string;
    newTranscript: string;
    clinicalContext: any;
    updateConfigs: SectionUpdateConfig[];
    patientContext?: any;
    preferences?: any;
}

interface TransferOfCareResponse {
    success: boolean;
    originalNote?: {
        content: string;
        parsedSections: DetectedSection[];
        parseMetadata: any;
    };
    updatedNote?: {
        content: string;
        sectionsUpdated: string[];
        sectionsPreserved: string[];
        changes: SectionChange[];
    };
    validation?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        score: number;
    };
    performance?: {
        parseTime: number;
        generationTime: number;
        totalTime: number;
    };
    error?: string;
}

interface SectionChange {
    sectionType: string;
    action: 'updated' | 'preserved' | 'merged' | 'added';
    originalContent: string;
    newContent: string;
    changeReason: string;
    confidence: number;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        console.log('🔄 Transfer of Care API: Starting note update process');

        const body: TransferOfCareRequest = await request.json();

        // Validate request
        const validation = validateRequest(body);
        if (!validation.isValid) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request',
                    details: validation.errors
                },
                { status: 400 }
            );
        }

        const { previousNote, newTranscript, clinicalContext, updateConfigs, patientContext, preferences } = body;

        // Step 1: Parse the previous note
        console.log('📖 Parsing previous note...');
        const parseStartTime = Date.now();

        const parsedNote = IntelligentSectionDetector.parseNote(previousNote);

        const parseTime = Date.now() - parseStartTime;
        console.log(`✅ Note parsed: ${parsedNote.sections.length} sections detected (${parseTime}ms)`);

        // Step 2: Generate selective updates
        console.log('🤖 Generating selective updates...');
        const generationStartTime = Date.now();

        const updateResult = await generateSelectiveUpdate(
            parsedNote,
            newTranscript,
            updateConfigs,
            clinicalContext,
            patientContext
        );

        const generationTime = Date.now() - generationStartTime;
        console.log(`✅ Selective update complete (${generationTime}ms)`);

        // Step 3: Validate the updated note
        console.log('🔍 Validating updated note...');
        const noteValidation = NoteValidationUtility.validateNote(updateResult.content, clinicalContext);

        // Step 4: Prepare response
        const response: TransferOfCareResponse = {
            success: true,
            originalNote: {
                content: previousNote,
                parsedSections: parsedNote.sections,
                parseMetadata: parsedNote.parseMetadata
            },
            updatedNote: {
                content: updateResult.content,
                sectionsUpdated: updateResult.sectionsUpdated,
                sectionsPreserved: updateResult.sectionsPreserved,
                changes: updateResult.changes
            },
            validation: noteValidation,
            performance: {
                parseTime,
                generationTime,
                totalTime: Date.now() - startTime
            }
        };

        console.log('🎉 Transfer of Care completed successfully');
        return NextResponse.json(response);

    } catch (error) {
        console.error('❌ Transfer of Care API Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Transfer of Care processing failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                performance: {
                    parseTime: 0,
                    generationTime: 0,
                    totalTime: Date.now() - startTime
                }
            },
            { status: 500 }
        );
    }
}

/**
 * Validate the Transfer of Care request
 */
function validateRequest(body: TransferOfCareRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.previousNote || body.previousNote.trim().length === 0) {
        errors.push('Previous note content is required');
    }

    if (!body.newTranscript || body.newTranscript.trim().length === 0) {
        errors.push('New transcript content is required');
    }

    if (!body.clinicalContext) {
        errors.push('Clinical context is required');
    }

    if (!body.updateConfigs || !Array.isArray(body.updateConfigs)) {
        errors.push('Update configurations are required');
    }

    if (body.updateConfigs && body.updateConfigs.length === 0) {
        errors.push('At least one section update configuration is required');
    }

    // Validate clinical context
    if (body.clinicalContext) {
        if (!body.clinicalContext.clinic) {
            errors.push('Clinical context must include clinic');
        }
        if (!body.clinicalContext.visitType) {
            errors.push('Clinical context must include visit type');
        }
        if (!body.clinicalContext.emr) {
            errors.push('Clinical context must include EMR type');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate selective update based on parsed note and configurations
 */
async function generateSelectiveUpdate(
    parsedNote: ParsedNote,
    newTranscript: string,
    updateConfigs: SectionUpdateConfig[],
    clinicalContext: any,
    patientContext?: any
): Promise<{
    content: string;
    sectionsUpdated: string[];
    sectionsPreserved: string[];
    changes: SectionChange[];
}> {
    const sectionsToUpdate = updateConfigs.filter(config => config.shouldUpdate);
    const sectionsToPreserve = updateConfigs.filter(config => !config.shouldUpdate);

    console.log(`📝 Updating ${sectionsToUpdate.length} sections, preserving ${sectionsToPreserve.length}`);

    // Generate new content for sections that should be updated
    const updatedSections: { [key: string]: string } = {};
    const changes: SectionChange[] = [];

    for (const config of sectionsToUpdate) {
        const originalSection = parsedNote.sections.find(s => s.type === config.sectionType);

        if (originalSection) {
            console.log(`🔄 Updating section: ${config.sectionType}`);

            // Generate new content for this specific section
            const newSectionContent = await generateSectionContent(
                config.sectionType,
                newTranscript,
                originalSection,
                config,
                clinicalContext,
                patientContext
            );

            // Apply merge strategy
            const finalContent = applySectionMergeStrategy(
                originalSection.content,
                newSectionContent,
                config.mergeStrategy
            );

            updatedSections[config.sectionType] = finalContent;

            // Track changes
            changes.push({
                sectionType: config.sectionType,
                action: config.mergeStrategy === 'replace' ? 'updated' :
                    config.mergeStrategy === 'append' ? 'merged' : 'merged',
                originalContent: originalSection.content,
                newContent: finalContent,
                changeReason: config.updateReason,
                confidence: 0.85 // TODO: Calculate actual confidence
            });
        }
    }

    // Preserve sections that should not be updated
    for (const config of sectionsToPreserve) {
        const originalSection = parsedNote.sections.find(s => s.type === config.sectionType);

        if (originalSection) {
            updatedSections[config.sectionType] = originalSection.content;

            changes.push({
                sectionType: config.sectionType,
                action: 'preserved',
                originalContent: originalSection.content,
                newContent: originalSection.content,
                changeReason: 'Section preserved as requested',
                confidence: 1.0
            });
        }
    }

    // Reconstruct the note with updated sections
    const reconstructedNote = reconstructNoteWithUpdatedSections(
        parsedNote,
        updatedSections,
        clinicalContext
    );

    return {
        content: reconstructedNote,
        sectionsUpdated: sectionsToUpdate.map(c => c.sectionType),
        sectionsPreserved: sectionsToPreserve.map(c => c.sectionType),
        changes
    };
}

/**
 * Generate new content for a specific section
 */
async function generateSectionContent(
    sectionType: string,
    transcript: string,
    originalSection: DetectedSection,
    config: SectionUpdateConfig,
    clinicalContext: any,
    patientContext?: any
): Promise<string> {
    // Create section-specific prompt
    const sectionPrompt = createSectionPrompt(
        sectionType,
        transcript,
        originalSection,
        config,
        clinicalContext,
        patientContext
    );

    // Get AI provider
    const manager = getProviderManager();

    // Generate content using the provider manager
    const result = await manager.generateText(sectionPrompt, {
        maxTokens: 500,
        temperature: 0.7
    });

    if (!result.success || !result.text) {
        throw new Error(`Failed to generate content for section ${sectionType}: ${result.error}`);
    }

    return result.text.trim();
}

/**
 * Create section-specific prompt for targeted generation
 */
function createSectionPrompt(
    sectionType: string,
    transcript: string,
    originalSection: DetectedSection,
    config: SectionUpdateConfig,
    clinicalContext: any,
    patientContext?: any
): string {
    const emrInstructions = clinicalContext.clinic === 'Davis Behavioral Health'
        ? 'Generate PLAIN TEXT ONLY - no Epic SmartPhrases, DotPhrases, or special syntax.'
        : 'Include appropriate Epic SmartPhrases and DotPhrases where beneficial.';

    const basePrompt = `You are updating the ${sectionType} section of a psychiatric note for ${clinicalContext.clinic}.

${emrInstructions}

ORIGINAL ${sectionType} SECTION:
${originalSection.content}

NEW TRANSCRIPT:
${transcript}

UPDATE INSTRUCTION: ${config.updateReason}

Generate an updated ${sectionType} section that incorporates relevant information from the new transcript while maintaining clinical accuracy and appropriate documentation standards.`;

    // Add section-specific instructions
    const sectionInstructions = getSectionSpecificInstructions(sectionType, clinicalContext.visitType);

    return `${basePrompt}

${sectionInstructions}

Generate only the ${sectionType} section content without the section header.`;
}

/**
 * Get section-specific generation instructions
 */
function getSectionSpecificInstructions(sectionType: string, visitType: string): string {
    const instructions: { [key: string]: { [key: string]: string } } = {
        'SUBJECTIVE': {
            'transfer-of-care': 'Focus on interval history since the last visit and current symptom presentation.',
            'follow-up': 'Document interval changes, treatment response, and current symptom status.',
            'psychiatric-intake': 'Provide comprehensive history of present illness and symptom development.'
        },
        'OBJECTIVE': {
            'transfer-of-care': 'Update mental status exam and current clinical observations.',
            'follow-up': 'Document current mental status and any observable changes.',
            'psychiatric-intake': 'Comprehensive mental status examination and objective findings.'
        },
        'ASSESSMENT': {
            'transfer-of-care': 'Update diagnostic impressions and severity assessments.',
            'follow-up': 'Revise diagnosis and assess treatment response.',
            'psychiatric-intake': 'Initial diagnostic impression with supporting rationale.'
        },
        'PLAN': {
            'transfer-of-care': 'Update treatment plan based on current status and care transition.',
            'follow-up': 'Adjust treatment plan based on response and current needs.',
            'psychiatric-intake': 'Comprehensive initial treatment plan with specific interventions.'
        }
    };

    return instructions[sectionType]?.[visitType] || 'Update section content based on new clinical information.';
}

/**
 * Apply merge strategy to combine original and new content
 */
function applySectionMergeStrategy(
    originalContent: string,
    newContent: string,
    strategy: 'replace' | 'append' | 'merge'
): string {
    switch (strategy) {
        case 'replace':
            return newContent;

        case 'append':
            return `${originalContent}\n\nUpdate: ${newContent}`;

        case 'merge':
            // Intelligent merge - combine key information
            // For now, use a simple merge strategy
            // TODO: Implement more sophisticated merging logic
            return `${originalContent}\n\n${newContent}`;

        default:
            return newContent;
    }
}

/**
 * Reconstruct the full note with updated sections
 */
function reconstructNoteWithUpdatedSections(
    parsedNote: ParsedNote,
    updatedSections: { [key: string]: string },
    clinicalContext: any
): string {
    let reconstructedNote = '';

    // If the original note had a clear SOAP structure, maintain it
    if (parsedNote.detectedFormat === 'SOAP') {
        const soapOrder = ['SUBJECTIVE', 'OBJECTIVE', 'ASSESSMENT', 'PLAN'];

        soapOrder.forEach(sectionType => {
            if (updatedSections[sectionType]) {
                reconstructedNote += `${sectionType}:\n${updatedSections[sectionType]}\n\n`;
            }
        });

        // Add any additional sections not in SOAP
        parsedNote.sections.forEach(section => {
            if (!soapOrder.includes(section.type) && updatedSections[section.type]) {
                reconstructedNote += `${section.type}:\n${updatedSections[section.type]}\n\n`;
            }
        });
    } else {
        // For non-SOAP notes, maintain original section order
        parsedNote.sections.forEach(section => {
            if (updatedSections[section.type]) {
                reconstructedNote += `${section.title}\n${updatedSections[section.type]}\n\n`;
            }
        });
    }

    return reconstructedNote.trim();
}

export async function GET() {
    return NextResponse.json({
        message: 'Transfer of Care API',
        version: '1.0.0',
        endpoints: {
            POST: 'Process Transfer of Care note updates',
        },
        documentation: 'Handles intelligent updating of clinical notes based on section-specific configurations'
    });
}