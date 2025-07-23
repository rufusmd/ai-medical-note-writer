// src/components/clinical/ClinicalContextSelector.tsx
// 🎨 ENHANCED VERSION: Beautiful clinical context selector with proper EMR differentiation

'use client';

import { useState } from 'react';
import {
    Building2,
    Monitor,
    Stethoscope,
    Settings,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle2,
    Info,
    Zap
} from 'lucide-react';

export interface ClinicalContext {
    clinic: 'HMHI Downtown' | 'Davis Behavioral Health' | 'Other';
    visitType: 'transfer-of-care' | 'psychiatric-intake' | 'follow-up' | 'emergency';
    emr: 'epic' | 'credible' | 'other';
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
    const [showPresets, setShowPresets] = useState(false);

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
        let emr: ClinicalContext['emr'] = clinic === 'HMHI Downtown' ? 'epic' : 'credible';

        switch (`${clinic}-${visitType}`) {
            case 'HMHI Downtown-transfer-of-care':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: false,
                    addIntervalUpdate: true,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: true,
                    comprehensiveIntake: false,
                    referencePreviousVisits: true
                };
                break;

            case 'Davis Behavioral Health-psychiatric-intake':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: true,
                    addIntervalUpdate: false,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: false,  // CRITICAL: No Epic syntax for DBH
                    comprehensiveIntake: true,
                    referencePreviousVisits: false
                };
                break;

            case 'HMHI Downtown-follow-up':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: true,
                    addIntervalUpdate: true,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: true,
                    comprehensiveIntake: false,
                    referencePreviousVisits: true
                };
                break;

            case 'Davis Behavioral Health-follow-up':
                presetSettings = {
                    updateHPI: true,
                    generateAssessment: true,
                    addIntervalUpdate: true,
                    updatePlan: true,
                    modifyPsychExam: true,
                    includeEpicSyntax: false,  // CRITICAL: No Epic syntax for DBH
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

    // Get EMR formatting info
    const getEMRInfo = () => {
        if (context.clinic === 'Davis Behavioral Health') {
            return {
                type: 'Credible EMR',
                format: 'Plain Text Only',
                color: 'green',
                icon: '📝',
                warning: 'No Epic SmartPhrases - Plain text format only'
            };
        } else if (context.clinic === 'HMHI Downtown') {
            return {
                type: 'Epic EMR',
                format: 'Epic SmartPhrases',
                color: 'blue',
                icon: '⚡',
                warning: 'Includes @SMARTPHRASE@ and .dotphrase formatting'
            };
        } else {
            return {
                type: 'Other EMR',
                format: 'Standard Format',
                color: 'gray',
                icon: '💻',
                warning: 'Standard clinical documentation format'
            };
        }
    };

    const emrInfo = getEMRInfo();

    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Settings className="h-6 w-6" />
                        <div>
                            <h3 className="text-xl font-semibold">Clinical Context Configuration</h3>
                            <p className="text-indigo-100 text-sm">
                                Configure AI generation for your specific clinical workflow
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        {showAdvanced ? 'Simple View' : 'Advanced'}
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Quick Presets */}
                <div>
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors mb-3"
                    >
                        <Zap className="h-4 w-4" />
                        Quick Clinical Presets
                        {showPresets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showPresets && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                            {[
                                { clinic: 'HMHI Downtown', visitType: 'transfer-of-care', label: 'HMHI Transfer', color: 'blue' },
                                { clinic: 'HMHI Downtown', visitType: 'follow-up', label: 'HMHI Follow-up', color: 'blue' },
                                { clinic: 'Davis Behavioral Health', visitType: 'psychiatric-intake', label: 'DBH Intake', color: 'green' },
                                { clinic: 'Davis Behavioral Health', visitType: 'follow-up', label: 'DBH Follow-up', color: 'green' },
                            ].map((preset) => (
                                <button
                                    key={`${preset.clinic}-${preset.visitType}`}
                                    onClick={() => handlePresetSelection(
                                        preset.clinic as ClinicalContext['clinic'],
                                        preset.visitType as ClinicalContext['visitType']
                                    )}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all hover:shadow-md ${preset.color === 'blue'
                                            ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Primary Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Clinic Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                            Clinical Site
                        </label>
                        <select
                            value={context.clinic}
                            onChange={(e) => {
                                const newClinic = e.target.value as ClinicalContext['clinic'];
                                const newEmr = newClinic === 'HMHI Downtown' ? 'epic' : 'credible';
                                updateContext({
                                    clinic: newClinic,
                                    emr: newEmr,
                                    generationSettings: {
                                        ...context.generationSettings,
                                        includeEpicSyntax: newClinic === 'HMHI Downtown'
                                    }
                                });
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
                        >
                            <option value="HMHI Downtown">HMHI Downtown</option>
                            <option value="Davis Behavioral Health">Davis Behavioral Health</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Visit Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-indigo-600" />
                            Visit Type
                        </label>
                        <select
                            value={context.visitType}
                            onChange={(e) => updateContext({ visitType: e.target.value as ClinicalContext['visitType'] })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
                        >
                            <option value="transfer-of-care">Transfer of Care</option>
                            <option value="psychiatric-intake">Psychiatric Intake</option>
                            <option value="follow-up">Follow-up Visit</option>
                            <option value="emergency">Emergency Consult</option>
                        </select>
                    </div>

                    {/* EMR Display */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-indigo-600" />
                            EMR System
                        </label>
                        <div className={`w-full px-4 py-3 rounded-lg border-2 ${emrInfo.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                                emrInfo.color === 'green' ? 'border-green-200 bg-green-50' :
                                    'border-gray-200 bg-gray-50'
                            }`}>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{emrInfo.icon}</span>
                                <div>
                                    <p className={`font-semibold ${emrInfo.color === 'blue' ? 'text-blue-700' :
                                            emrInfo.color === 'green' ? 'text-green-700' :
                                                'text-gray-700'
                                        }`}>
                                        {emrInfo.type}
                                    </p>
                                    <p className={`text-xs ${emrInfo.color === 'blue' ? 'text-blue-600' :
                                            emrInfo.color === 'green' ? 'text-green-600' :
                                                'text-gray-600'
                                        }`}>
                                        {emrInfo.format}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EMR Format Warning */}
                <div className={`p-4 rounded-xl border-l-4 ${emrInfo.color === 'blue' ? 'border-blue-400 bg-blue-50' :
                        emrInfo.color === 'green' ? 'border-green-400 bg-green-50' :
                            'border-gray-400 bg-gray-50'
                    }`}>
                    <div className="flex items-start gap-3">
                        <Info className={`h-5 w-5 mt-0.5 ${emrInfo.color === 'blue' ? 'text-blue-600' :
                                emrInfo.color === 'green' ? 'text-green-600' :
                                    'text-gray-600'
                            }`} />
                        <div>
                            <p className={`font-medium ${emrInfo.color === 'blue' ? 'text-blue-800' :
                                    emrInfo.color === 'green' ? 'text-green-800' :
                                        'text-gray-800'
                                }`}>
                                EMR Formatting Notice
                            </p>
                            <p className={`text-sm ${emrInfo.color === 'blue' ? 'text-blue-700' :
                                    emrInfo.color === 'green' ? 'text-green-700' :
                                        'text-gray-700'
                                }`}>
                                {emrInfo.warning}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Advanced Generation Settings
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries({
                                updateHPI: 'Update History of Present Illness',
                                generateAssessment: 'Generate New Assessment',
                                addIntervalUpdate: 'Add Interval Update',
                                updatePlan: 'Update Treatment Plan',
                                modifyPsychExam: 'Modify Psychiatric Exam',
                                comprehensiveIntake: 'Comprehensive Intake Format',
                                referencePreviousVisits: 'Reference Previous Visits'
                            }).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-white transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={context.generationSettings[key as keyof typeof context.generationSettings]}
                                        onChange={(e) => updateGenerationSettings({ [key]: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Epic Syntax Setting with Warning */}
                        <div className={`p-4 rounded-lg border-2 ${context.clinic === 'Davis Behavioral Health'
                                ? 'border-red-200 bg-red-50'
                                : 'border-blue-200 bg-blue-50'
                            }`}>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={context.generationSettings.includeEpicSyntax}
                                    onChange={(e) => updateGenerationSettings({ includeEpicSyntax: e.target.checked })}
                                    disabled={context.clinic === 'Davis Behavioral Health'}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-700">
                                        Include Epic SmartPhrase Syntax
                                    </span>
                                    {context.clinic === 'Davis Behavioral Health' && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <span className="text-xs text-red-600 font-medium">
                                                Disabled for Davis Behavioral Health (Credible EMR)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="font-semibold text-indigo-800">Configuration Summary</p>
                            <p className="text-sm text-indigo-700">
                                {context.clinic} • {context.visitType} • {emrInfo.type} • {emrInfo.format}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}