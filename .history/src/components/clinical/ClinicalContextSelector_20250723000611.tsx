// src/components/clinical/ClinicalContextSelector.tsx - Advanced Clinical Workflow Configuration
'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

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
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Cog6ToothIcon className="h-6 w-6" />
                        <div>
                            <h3 className="text-lg font-semibold">Clinical Context Configuration</h3>
                            <p className="text-blue-100 text-sm">
                                Configure AI generation for your specific clinical workflow
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-lg"
                    >
                        <span>{showAdvanced ? 'Hide Advanced' : 'Advanced Settings'}</span>
                        {showAdvanced ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Primary Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Clinic Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                            🏥 Clinical Setting
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="hmhi-downtown"
                                    checked={context.clinic === 'hmhi-downtown'}
                                    onChange={(e) => handlePresetSelection(e.target.value as ClinicalContext['clinic'], context.visitType)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">HMHI Downtown</div>
                                    <div className="text-sm text-gray-500">Epic EMR • SmartPhrases</div>
                                </div>
                            </label>
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="dbh"
                                    checked={context.clinic === 'dbh'}
                                    onChange={(e) => handlePresetSelection(e.target.value as ClinicalContext['clinic'], context.visitType)}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">Davis Behavioral Health</div>
                                    <div className="text-sm text-gray-500">Credible EMR • Plain Text</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Visit Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                            📋 Visit Type
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="follow-up"
                                    checked={context.visitType === 'follow-up'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">Follow-Up Visit</div>
                                    <div className="text-sm text-gray-500">Routine care • Interval updates</div>
                                </div>
                            </label>
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="psychiatric-intake"
                                    checked={context.visitType === 'psychiatric-intake'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">Psychiatric Intake</div>
                                    <div className="text-sm text-gray-500">New patient • Comprehensive</div>
                                </div>
                            </label>
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="transfer-of-care"
                                    checked={context.visitType === 'transfer-of-care'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-gray-900">Transfer of Care</div>
                                    <div className="text-sm text-gray-500">From resident • Update note</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* EMR System */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                            💻 EMR System
                        </label>
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {context.emr === 'epic' ? 'Epic' : 'Credible'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {context.emr === 'epic' ? 'SmartPhrases supported' : 'Plain text output'}
                                    </div>
                                </div>
                                <div className={`h-3 w-3 rounded-full ${context.emr === 'epic' ? 'bg-blue-500' : 'bg-green-500'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                    <div className="border-t pt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Advanced Generation Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Note Sections</h5>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.updateHPI}
                                            onChange={(e) => updateGenerationSettings({ updateHPI: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Update HPI section</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.generateAssessment}
                                            onChange={(e) => updateGenerationSettings({ generateAssessment: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Generate Assessment</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.addIntervalUpdate}
                                            onChange={(e) => updateGenerationSettings({ addIntervalUpdate: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Add interval update</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.updatePlan}
                                            onChange={(e) => updateGenerationSettings({ updatePlan: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Update treatment plan</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h5 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Clinical Features</h5>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.modifyPsychExam}
                                            onChange={(e) => updateGenerationSettings({ modifyPsychExam: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Modify psych exam</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.includeEpicSyntax}
                                            onChange={(e) => updateGenerationSettings({ includeEpicSyntax: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Include Epic SmartPhrases</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.comprehensiveIntake}
                                            onChange={(e) => updateGenerationSettings({ comprehensiveIntake: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Comprehensive intake format</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={context.generationSettings.referencePreviousVisits}
                                            onChange={(e) => updateGenerationSettings({ referencePreviousVisits: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700">Reference previous visits</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Context Summary */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        Configuration Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <p><span className="font-medium text-gray-700">Setting:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${context.clinic === 'hmhi-downtown'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                    {context.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'}
                                </span>
                            </p>
                            <p><span className="font-medium text-gray-700">Visit:</span>
                                <span className="ml-2 text-gray-600">
                                    {context.visitType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p><span className="font-medium text-gray-700">EMR:</span>
                                <span className="ml-2 text-gray-600">{context.emr.toUpperCase()}</span>
                            </p>
                            <p><span className="font-medium text-gray-700">AI Focus:</span>
                                <span className="ml-2 text-gray-600">
                                    {context.visitType === 'transfer-of-care' ? 'Update existing note sections' :
                                        context.visitType === 'psychiatric-intake' ? 'Generate comprehensive intake' :
                                            'Create follow-up with continuity'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}