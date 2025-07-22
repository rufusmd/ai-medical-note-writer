// src/components/clinical/ClinicalContextSelector.tsx - Advanced Clinical Workflow Configuration

'use client';

import { useState } from 'react';

export interface ClinicalContext {
    clinic: 'hmhi-downtown' | 'dbh';
    visitType: 'transfer-of-care' | 'psychiatric-intake' | 'follow-up';
    emr: 'epic' | 'credible';
    generationSettings: {
        updateHPI: boolean;
        generateAssessment: boolean;
        addIntervalUpdate: boolean;
        updatePlan: boolean;
        modifyPsychExam: boolean;
        includeEpicSyntax: boolean;
        comprehensiveIntake: boolean;
        referencePreviousVisits: boolean;
    };
    previousNote?: string;
    patientHistory?: {
        lastVisit?: string;
        treatmentResponse?: string;
        currentMedications?: string;
        ongoingConcerns?: string;
    };
}

interface ClinicalContextSelectorProps {
    context: ClinicalContext;
    onContextChange: (context: ClinicalContext) => void;
}

export default function ClinicalContextSelector({ context, onContextChange }: ClinicalContextSelectorProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateContext = (updates: Partial<ClinicalContext>) => {
        onContextChange({ ...context, ...updates });
    };

    const updateGenerationSettings = (updates: Partial<ClinicalContext['generationSettings']>) => {
        onContextChange({
            ...context,
            generationSettings: { ...context.generationSettings, ...updates }
        });
    };

    // Auto-configure based on clinic and visit type
    const handlePresetSelection = (clinic: ClinicalContext['clinic'], visitType: ClinicalContext['visitType']) => {
        let presetSettings: ClinicalContext['generationSettings'];
        let emr: ClinicalContext['emr'] = clinic === 'hmhi-downtown' ? 'epic' : 'credible';

        switch (`${clinic}-${visitType}`) {
            case 'hmhi-downtown-transfer-of-care':
                presetSettings = {
                    updateHPI: true,           // Update HPI as interval history
                    generateAssessment: false, // Preserve existing assessment
                    addIntervalUpdate: true,   // Add interval update to assessment
                    updatePlan: true,          // Update plan based on discussion
                    modifyPsychExam: true,     // Minor modifications to psych exam
                    includeEpicSyntax: true,   // Epic SmartPhrases
                    comprehensiveIntake: false,
                    referencePreviousVisits: true
                };
                break;

            case 'dbh-psychiatric-intake':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: true,
                    addIntervalUpdate: false,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: false,   // Credible = plain text only
                    comprehensiveIntake: true,  // Full psych intake
                    referencePreviousVisits: false
                };
                break;

            case 'hmhi-downtown-follow-up':
            case 'dbh-follow-up':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: true,
                    addIntervalUpdate: true,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: clinic === 'hmhi-downtown',
                    comprehensiveIntake: false,
                    referencePreviousVisits: true
                };
                break;

            default:
                presetSettings = context.generationSettings;
        }

        updateContext({
            clinic,
            visitType,
            emr,
            generationSettings: presetSettings
        });
    };

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Clinical Context Configuration</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Configure AI generation for your specific clinical workflow
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Primary Context Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Clinic Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Clinical Setting
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="hmhi-downtown"
                                    checked={context.clinic === 'hmhi-downtown'}
                                    onChange={(e) => handlePresetSelection('hmhi-downtown', context.visitType)}
                                    className="mr-2"
                                />
                                <div>
                                    <span className="font-medium">HMHI Downtown Clinic</span>
                                    <p className="text-xs text-gray-500">Epic EMR • SmartPhrases • Transfer of Care Focus</p>
                                </div>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="dbh"
                                    checked={context.clinic === 'dbh'}
                                    onChange={(e) => handlePresetSelection('dbh', context.visitType)}
                                    className="mr-2"
                                />
                                <div>
                                    <span className="font-medium">Davis Behavioral Health</span>
                                    <p className="text-xs text-gray-500">Credible EMR • Plain Text • Comprehensive Intakes</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Visit Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Visit Type
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="transfer-of-care"
                                    checked={context.visitType === 'transfer-of-care'}
                                    onChange={(e) => handlePresetSelection(context.clinic, 'transfer-of-care')}
                                    className="mr-2"
                                />
                                <div>
                                    <span className="font-medium">Transfer of Care</span>
                                    <p className="text-xs text-gray-500">Modify existing resident note</p>
                                </div>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="psychiatric-intake"
                                    checked={context.visitType === 'psychiatric-intake'}
                                    onChange={(e) => handlePresetSelection(context.clinic, 'psychiatric-intake')}
                                    className="mr-2"
                                />
                                <div>
                                    <span className="font-medium">Psychiatric Intake</span>
                                    <p className="text-xs text-gray-500">Comprehensive new patient evaluation</p>
                                </div>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="follow-up"
                                    checked={context.visitType === 'follow-up'}
                                    onChange={(e) => handlePresetSelection(context.clinic, 'follow-up')}
                                    className="mr-2"
                                />
                                <div>
                                    <span className="font-medium">Follow-up Visit</span>
                                    <p className="text-xs text-gray-500">Continuing care with previous visit reference</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Previous Note Input (for Transfer of Care) */}
                {context.visitType === 'transfer-of-care' && (
                    <div>
                        <label htmlFor="previousNote" className="block text-sm font-medium text-gray-700 mb-2">
                            Previous Note (from Resident)
                        </label>
                        <textarea
                            id="previousNote"
                            rows={6}
                            value={context.previousNote || ''}
                            onChange={(e) => updateContext({ previousNote: e.target.value })}
                            placeholder="Paste the resident's note here. AI will update HPI, add interval assessment, and modify plan while preserving structure..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            AI will identify note structure and update appropriate sections while preserving the resident's format
                        </p>
                    </div>
                )}

                {/* Patient History (for Follow-up) */}
                {context.visitType === 'follow-up' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3">Previous Visit Context</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">Last Visit Date</label>
                                <input
                                    type="text"
                                    value={context.patientHistory?.lastVisit || ''}
                                    onChange={(e) => updateContext({
                                        patientHistory: { ...context.patientHistory, lastVisit: e.target.value }
                                    })}
                                    placeholder="e.g., 2 weeks ago"
                                    className="w-full px-2 py-1 text-sm border border-blue-200 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-800 mb-1">Treatment Response</label>
                                <input
                                    type="text"
                                    value={context.patientHistory?.treatmentResponse || ''}
                                    onChange={(e) => updateContext({
                                        patientHistory: { ...context.patientHistory, treatmentResponse: e.target.value }
                                    })}
                                    placeholder="e.g., improved mood, stable"
                                    className="w-full px-2 py-1 text-sm border border-blue-200 rounded"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Advanced Settings */}
                {showAdvanced && (
                    <div className="border-t pt-6">
                        <h4 className="font-medium text-gray-900 mb-4">Advanced Generation Settings</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Note Section Controls */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-3">Note Sections</h5>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.updateHPI}
                                            onChange={(e) => updateGenerationSettings({ updateHPI: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Update HPI (interval history)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.generateAssessment}
                                            onChange={(e) => updateGenerationSettings({ generateAssessment: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Generate new assessment</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.addIntervalUpdate}
                                            onChange={(e) => updateGenerationSettings({ addIntervalUpdate: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Add interval update to assessment</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.updatePlan}
                                            onChange={(e) => updateGenerationSettings({ updatePlan: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Update treatment plan</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.modifyPsychExam}
                                            onChange={(e) => updateGenerationSettings({ modifyPsychExam: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Modify psychiatric exam</span>
                                    </label>
                                </div>
                            </div>

                            {/* Output Controls */}
                            <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-3">Output Format</h5>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.includeEpicSyntax}
                                            onChange={(e) => updateGenerationSettings({ includeEpicSyntax: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Include Epic SmartPhrases</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.comprehensiveIntake}
                                            onChange={(e) => updateGenerationSettings({ comprehensiveIntake: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Comprehensive intake format</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.referencePreviousVisits}
                                            onChange={(e) => updateGenerationSettings({ referencePreviousVisits: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Reference previous visits</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Context Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Configuration Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Setting:</span> {context.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'}</p>
                        <p><span className="font-medium">Visit:</span> {context.visitType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p><span className="font-medium">EMR:</span> {context.emr.toUpperCase()}</p>
                        <p><span className="font-medium">AI Focus:</span> {
                            context.visitType === 'transfer-of-care' ? 'Update existing note sections' :
                                context.visitType === 'psychiatric-intake' ? 'Generate comprehensive intake' :
                                    'Create follow-up with continuity'
                        }</p>
                    </div>
                </div>
            </div>
        </div>
    );
}