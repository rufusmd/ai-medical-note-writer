// src/components/clinical/ClinicalContextSelector.tsx - Optimized Spacing Version
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Cog6ToothIcon className="h-7 w-7" />
                        <div>
                            <h3 className="text-xl font-semibold">Clinical Context Configuration</h3>
                            <p className="text-blue-100 text-sm mt-1">
                                Configure AI generation for your specific clinical workflow
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center space-x-2 text-blue-100 hover:text-white transition-colors text-sm font-medium bg-blue-700 hover:bg-blue-800 px-4 py-3 rounded-lg"
                    >
                        <span>{showAdvanced ? 'Hide Advanced' : 'Advanced Settings'}</span>
                        {showAdvanced ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="p-10 space-y-12">
                {/* Primary Configuration - Optimized Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    {/* Clinic Selection */}
                    <div className="space-y-6">
                        <label className="block text-lg font-semibold text-gray-900 mb-6 flex items-center">
                            <span className="text-2xl mr-4">🏥</span>
                            Clinical Setting
                        </label>
                        <div className="space-y-6">
                            <label className={`flex items-start p-7 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${context.clinic === 'hmhi-downtown'
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="hmhi-downtown"
                                    checked={context.clinic === 'hmhi-downtown'}
                                    onChange={(e) => handlePresetSelection(e.target.value as ClinicalContext['clinic'], context.visitType)}
                                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 mt-1.5"
                                />
                                <div className="ml-5 flex-1">
                                    <div className="font-semibold text-gray-900 text-lg mb-2">HMHI Downtown</div>
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        Epic EMR • SmartPhrases enabled
                                    </div>
                                </div>
                            </label>
                            <label className={`flex items-start p-7 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${context.clinic === 'dbh'
                                ? 'border-green-500 bg-green-50 shadow-md'
                                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="clinic"
                                    value="dbh"
                                    checked={context.clinic === 'dbh'}
                                    onChange={(e) => handlePresetSelection(e.target.value as ClinicalContext['clinic'], context.visitType)}
                                    className="h-5 w-5 text-green-600 focus:ring-green-500 mt-1.5"
                                />
                                <div className="ml-5 flex-1">
                                    <div className="font-semibold text-gray-900 text-lg mb-2">Davis Behavioral Health</div>
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        Credible EMR • Plain text format
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Visit Type Selection */}
                    <div className="space-y-6">
                        <label className="block text-lg font-semibold text-gray-900 mb-6 flex items-center">
                            <span className="text-2xl mr-4">📋</span>
                            Visit Type
                        </label>
                        <div className="space-y-6">
                            <label className={`flex items-start p-7 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${context.visitType === 'transfer-of-care'
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="transfer-of-care"
                                    checked={context.visitType === 'transfer-of-care'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 mt-1.5"
                                />
                                <div className="ml-5 flex-1">
                                    <div className="font-semibold text-gray-900 text-lg mb-2">Transfer of Care</div>
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        Taking over from resident or colleague
                                    </div>
                                </div>
                            </label>
                            <label className={`flex items-start p-7 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${context.visitType === 'psychiatric-intake'
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="psychiatric-intake"
                                    checked={context.visitType === 'psychiatric-intake'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 mt-1.5"
                                />
                                <div className="ml-5 flex-1">
                                    <div className="font-semibold text-gray-900 text-lg mb-2">Psychiatric Intake</div>
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        Comprehensive new patient evaluation
                                    </div>
                                </div>
                            </label>
                            <label className={`flex items-start p-7 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${context.visitType === 'follow-up'
                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="visitType"
                                    value="follow-up"
                                    checked={context.visitType === 'follow-up'}
                                    onChange={(e) => handlePresetSelection(context.clinic, e.target.value as ClinicalContext['visitType'])}
                                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 mt-1.5"
                                />
                                <div className="ml-5 flex-1">
                                    <div className="font-semibold text-gray-900 text-lg mb-2">Follow-up Visit</div>
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        Routine follow-up or medication check
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* EMR System Display */}
                    <div className="space-y-6">
                        <label className="block text-lg font-semibold text-gray-900 mb-6 flex items-center">
                            <span className="text-2xl mr-4">💻</span>
                            EMR System
                        </label>
                        <div className="space-y-6">
                            <div className={`p-7 border-2 rounded-xl ${context.emr === 'epic'
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-green-400 bg-green-50'
                                }`}>
                                <div className="flex items-center mb-3">
                                    <div className={`w-4 h-4 rounded-full mr-4 ${context.emr === 'epic' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}></div>
                                    <div className="font-semibold text-gray-900 text-lg">
                                        {context.emr === 'epic' ? 'Epic EMR' : 'Credible EMR'}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 leading-relaxed pl-8">
                                    {context.emr === 'epic'
                                        ? 'SmartPhrases and DotPhrases supported'
                                        : 'Plain text formatting only'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Settings Panel */}
                {showAdvanced && (
                    <div className="space-y-8">
                        <div className="border-t border-gray-200 pt-10">
                            <h4 className="font-semibold text-gray-900 mb-8 flex items-center text-xl">
                                <span className="text-2xl mr-4">⚙️</span>
                                Advanced Generation Settings
                            </h4>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h5 className="font-medium text-gray-800 text-lg mb-6">Documentation Scope</h5>
                                    <div className="space-y-6">
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.updateHPI}
                                                onChange={(e) => updateGenerationSettings({ updateHPI: e.target.checked })}
                                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Update HPI</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Include history of present illness updates</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.generateAssessment}
                                                onChange={(e) => updateGenerationSettings({ generateAssessment: e.target.checked })}
                                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Generate Assessment</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Create clinical assessment and impression</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.addIntervalUpdate}
                                                onChange={(e) => updateGenerationSettings({ addIntervalUpdate: e.target.checked })}
                                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Add interval update</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Include changes since last visit</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.updatePlan}
                                                onChange={(e) => updateGenerationSettings({ updatePlan: e.target.checked })}
                                                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Update plan</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Modify treatment plan based on visit</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h5 className="font-medium text-gray-800 text-lg mb-6">Clinical Features</h5>
                                    <div className="space-y-6">
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.modifyPsychExam}
                                                onChange={(e) => updateGenerationSettings({ modifyPsychExam: e.target.checked })}
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Modify psych exam</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Update mental status examination findings</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.comprehensiveIntake}
                                                onChange={(e) => updateGenerationSettings({ comprehensiveIntake: e.target.checked })}
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Comprehensive intake</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Generate full psychiatric intake documentation</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.includeEpicSyntax}
                                                onChange={(e) => updateGenerationSettings({ includeEpicSyntax: e.target.checked })}
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Epic SmartPhrases</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Include Epic-specific formatting and shortcuts</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start">
                                            <input
                                                type="checkbox"
                                                checked={context.generationSettings.referencePreviousVisits}
                                                onChange={(e) => updateGenerationSettings({ referencePreviousVisits: e.target.checked })}
                                                className="h-5 w-5 text-purple-600 focus:ring-purple-500 rounded mt-1"
                                            />
                                            <div className="ml-5">
                                                <span className="text-base font-medium text-gray-900">Reference previous visits</span>
                                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">Include historical context and continuity</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Context Summary */}
                <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-10 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-8 flex items-center text-xl">
                        <span className="text-2xl mr-4">📊</span>
                        Configuration Summary
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-base">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
                                <span className="font-medium text-gray-700">Clinical Setting:</span>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${context.clinic === 'hmhi-downtown'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                    }`}>
                                    {context.clinic === 'hmhi-downtown' ? 'HMHI Downtown' : 'Davis Behavioral Health'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
                                <span className="font-medium text-gray-700">Visit Type:</span>
                                <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                                    {context.visitType.split('-').map(word =>
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
                                <span className="font-medium text-gray-700">EMR System:</span>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${context.emr === 'epic'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                    }`}>
                                    {context.emr.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
                                <span className="font-medium text-gray-700">Active Features:</span>
                                <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                                    {Object.values(context.generationSettings).filter(Boolean).length} of {Object.keys(context.generationSettings).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}