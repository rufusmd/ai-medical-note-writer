'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Edit3,
    Lock,
    Eye,
    EyeOff,
    Brain,
    ArrowRight,
    RotateCcw,
    Zap,
    AlertTriangle,
    Info,
    FileText,
    Settings,
    RefreshCw,
    Sparkles
} from 'lucide-react';

interface ParsedNote {
    originalContent: string;
    detectedFormat: string;
    emrType: string;
    sections: DetectedSection[];
    parseMetadata: {
        totalSections: number;
        confidence: number;
        processingTime: number;
        errors: string[];
        warnings: string[];
    };
}

interface DetectedSection {
    type: string;
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
    };
}

interface SectionUpdateConfig {
    sectionType: string;
    shouldUpdate: boolean;
    updateReason: string;
    preserveOriginal: boolean;
    mergeStrategy: 'replace' | 'append' | 'merge';
}

interface SelectiveUpdaterProps {
    parsedNote: ParsedNote;
    newTranscript: string;
    clinicalContext: any;
    onUpdateConfigChange: (config: SectionUpdateConfig[]) => void;
    onGenerateUpdate: () => void;
}

export default function SelectiveUpdater({
    parsedNote,
    newTranscript,
    clinicalContext,
    onUpdateConfigChange,
    onGenerateUpdate
}: SelectiveUpdaterProps) {
    const [updateConfigs, setUpdateConfigs] = useState<SectionUpdateConfig[]>([]);
    const [showPreview, setShowPreview] = useState<{ [key: string]: boolean }>({});
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Initialize update configurations
    useEffect(() => {
        const initialConfigs: SectionUpdateConfig[] = parsedNote.sections.map(section => ({
            sectionType: section.type,
            shouldUpdate: getDefaultUpdateSetting(section.type, clinicalContext?.visitType),
            updateReason: getUpdateReason(section.type, clinicalContext?.visitType),
            preserveOriginal: false,
            mergeStrategy: 'replace' as const
        }));

        setUpdateConfigs(initialConfigs);
        onUpdateConfigChange(initialConfigs);
    }, [parsedNote, clinicalContext, onUpdateConfigChange]);

    // Get default update setting based on section type and visit type
    const getDefaultUpdateSetting = (sectionType: string, visitType: string): boolean => {
        const defaults: { [key: string]: { [key: string]: boolean } } = {
            'transfer-of-care': {
                'SUBJECTIVE': true,   // Update with new interval history
                'OBJECTIVE': true,    // Update with current findings
                'ASSESSMENT': true,   // Update diagnostic impression
                'PLAN': true,         // Update treatment plan
                'HPI': true,          // Update history
                'MSE': true           // Update mental status
            },
            'follow-up': {
                'SUBJECTIVE': true,
                'OBJECTIVE': true,
                'ASSESSMENT': false,  // Usually preserve existing assessment
                'PLAN': true,
                'HPI': true,
                'MSE': true
            },
            'psychiatric-intake': {
                'SUBJECTIVE': true,
                'OBJECTIVE': true,
                'ASSESSMENT': true,
                'PLAN': true,
                'HPI': true,
                'MSE': true
            }
        };

        return defaults[visitType]?.[sectionType] ?? true;
    };

    // Get update reason explanation
    const getUpdateReason = (sectionType: string, visitType: string): string => {
        const reasons: { [key: string]: { [key: string]: string } } = {
            'transfer-of-care': {
                'SUBJECTIVE': 'Update with interval history since last visit',
                'OBJECTIVE': 'Current mental status and clinical findings',
                'ASSESSMENT': 'Revised diagnostic impression and severity',
                'PLAN': 'Updated treatment plan and recommendations',
                'HPI': 'Recent developments in symptom presentation',
                'MSE': 'Current mental status examination findings'
            },
            'follow-up': {
                'SUBJECTIVE': 'Interval changes and treatment response',
                'OBJECTIVE': 'Current clinical presentation',
                'ASSESSMENT': 'Typically preserved from previous visit',
                'PLAN': 'Adjusted based on treatment response',
                'HPI': 'Recent symptom changes',
                'MSE': 'Current mental status'
            }
        };

        return reasons[visitType]?.[sectionType] || 'Standard update for this visit type';
    };

    // Preset configurations
    const presets = {
        'update-all': {
            name: 'Update All Sections',
            description: 'Update all sections with new information',
            icon: RefreshCw,
            config: (configs: SectionUpdateConfig[]) => configs.map(c => ({ ...c, shouldUpdate: true }))
        },
        'preserve-assessment': {
            name: 'Preserve Assessment',
            description: 'Update clinical findings but keep diagnostic assessment',
            icon: Lock,
            config: (configs: SectionUpdateConfig[]) => configs.map(c => ({
                ...c,
                shouldUpdate: !['ASSESSMENT', 'DIAGNOSIS'].includes(c.sectionType)
            }))
        },
        'update-plan-only': {
            name: 'Plan Updates Only',
            description: 'Only update treatment plan and recommendations',
            icon: Edit3,
            config: (configs: SectionUpdateConfig[]) => configs.map(c => ({
                ...c,
                shouldUpdate: ['PLAN', 'TREATMENT'].includes(c.sectionType)
            }))
        },
        'standard-followup': {
            name: 'Standard Follow-up',
            description: 'Typical updates for follow-up visits',
            icon: ArrowRight,
            config: (configs: SectionUpdateConfig[]) => configs.map(c => ({
                ...c,
                shouldUpdate: ['SUBJECTIVE', 'OBJECTIVE', 'PLAN', 'HPI', 'MSE'].includes(c.sectionType)
            }))
        }
    };

    // Apply preset configuration
    const applyPreset = (presetKey: string) => {
        const preset = presets[presetKey as keyof typeof presets];
        if (preset) {
            const newConfigs = preset.config(updateConfigs);
            setUpdateConfigs(newConfigs);
            onUpdateConfigChange(newConfigs);
            setSelectedPreset(presetKey);
        }
    };

    // Toggle section update
    const toggleSectionUpdate = (sectionType: string) => {
        const newConfigs = updateConfigs.map(config =>
            config.sectionType === sectionType
                ? { ...config, shouldUpdate: !config.shouldUpdate }
                : config
        );
        setUpdateConfigs(newConfigs);
        onUpdateConfigChange(newConfigs);
        setSelectedPreset(''); // Clear preset selection when manually changing
    };

    // Update merge strategy
    const updateMergeStrategy = (sectionType: string, strategy: 'replace' | 'append' | 'merge') => {
        const newConfigs = updateConfigs.map(config =>
            config.sectionType === sectionType
                ? { ...config, mergeStrategy: strategy }
                : config
        );
        setUpdateConfigs(newConfigs);
        onUpdateConfigChange(newConfigs);
    };

    // Toggle section preview
    const togglePreview = (sectionType: string) => {
        setShowPreview(prev => ({
            ...prev,
            [sectionType]: !prev[sectionType]
        }));
    };

    // Get section from parsed note
    const getSection = (sectionType: string) => {
        return parsedNote.sections.find(s => s.type === sectionType);
    };

    // Calculate update summary
    const updateSummary = {
        totalSections: parsedNote.sections.length,
        sectionsToUpdate: updateConfigs.filter(c => c.shouldUpdate).length,
        sectionsToPreserve: updateConfigs.filter(c => !c.shouldUpdate).length
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Settings className="h-6 w-6" />
                        <div>
                            <h3 className="text-lg font-semibold">Selective Section Updater</h3>
                            <p className="text-purple-100 text-sm">
                                Choose which sections to update for Transfer of Care
                            </p>
                        </div>
                    </div>
                    <div className="text-white text-right">
                        <p className="text-sm opacity-90">Visit Type</p>
                        <p className="font-semibold">{clinicalContext?.visitType?.replace('-', ' ') || 'Standard'}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Quick Presets */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600" />
                        Quick Presets
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(presets).map(([key, preset]) => {
                            const Icon = preset.icon;
                            const isSelected = selectedPreset === key;

                            return (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                            ? 'border-purple-300 bg-purple-50 shadow-md'
                                            : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`h-4 w-4 ${isSelected ? 'text-purple-600' : 'text-gray-600'}`} />
                                        <span className={`font-medium text-sm ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                                            {preset.name}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                        {preset.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Update Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{updateSummary.sectionsToUpdate}</p>
                        <p className="text-sm text-gray-600">To Update</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{updateSummary.sectionsToPreserve}</p>
                        <p className="text-sm text-gray-600">To Preserve</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{updateSummary.totalSections}</p>
                        <p className="text-sm text-gray-600">Total Sections</p>
                    </div>
                </div>

                {/* Section Controls */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            Section Configuration
                        </h4>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-purple-600 hover:text-purple-700 text-sm flex items-center gap-1"
                        >
                            <Settings className="h-4 w-4" />
                            {showAdvanced ? 'Simple View' : 'Advanced Options'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {parsedNote.sections.map((section) => {
                            const config = updateConfigs.find(c => c.sectionType === section.type);
                            const shouldUpdate = config?.shouldUpdate ?? false;

                            return (
                                <div key={section.type} className={`border-2 rounded-lg transition-all ${shouldUpdate ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                                    }`}>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleSectionUpdate(section.type)}
                                                    className="flex items-center gap-2 min-w-0"
                                                >
                                                    {shouldUpdate ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                    )}
                                                    <div className="text-left min-w-0">
                                                        <p className={`font-medium ${shouldUpdate ? 'text-green-900' : 'text-gray-700'}`}>
                                                            {section.type}
                                                        </p>
                                                        <p className={`text-sm ${shouldUpdate ? 'text-green-600' : 'text-gray-500'}`}>
                                                            {config?.updateReason || 'No specific reason'}
                                                        </p>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Section metadata */}
                                                <div className="text-xs text-gray-500 text-right">
                                                    <div>{section.metadata.wordCount} words</div>
                                                    <div className="flex items-center gap-1">
                                                        {section.metadata.hasEpicSyntax && (
                                                            <span className="px-1 bg-blue-100 text-blue-700 rounded">Epic</span>
                                                        )}
                                                        <span className={`px-1 rounded ${section.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                                                                section.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.round(section.confidence * 100)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Preview toggle */}
                                                <button
                                                    onClick={() => togglePreview(section.type)}
                                                    className="p-1 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPreview[section.type] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Advanced options */}
                                        {showAdvanced && shouldUpdate && (
                                            <div className="mt-3 p-3 bg-white rounded border border-green-200">
                                                <div className="flex items-center gap-4">
                                                    <label className="text-sm font-medium text-gray-700">Merge Strategy:</label>
                                                    <div className="flex gap-2">
                                                        {['replace', 'append', 'merge'].map((strategy) => (
                                                            <button
                                                                key={strategy}
                                                                onClick={() => updateMergeStrategy(section.type, strategy as any)}
                                                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${config?.mergeStrategy === strategy
                                                                        ? 'border-green-500 bg-green-100 text-green-700'
                                                                        : 'border-gray-300 text-gray-600 hover:border-green-300'
                                                                    }`}
                                                            >
                                                                {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-600">
                                                    <strong>Replace:</strong> Completely replace existing content |
                                                    <strong> Append:</strong> Add new content to existing |
                                                    <strong> Merge:</strong> Intelligently combine old and new
                                                </div>
                                            </div>
                                        )}

                                        {/* Section preview */}
                                        {showPreview[section.type] && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded border">
                                                <h6 className="font-medium text-gray-900 mb-2">Current Content:</h6>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {section.content.length > 300
                                                        ? section.content.substring(0, 300) + '...'
                                                        : section.content
                                                    }
                                                </p>
                                                {section.metadata.clinicalTerms.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-gray-600 mb-1">Clinical Terms:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {section.metadata.clinicalTerms.slice(0, 5).map((term, index) => (
                                                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                                    {term}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Warning Messages */}
                {updateSummary.sectionsToUpdate === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <p className="text-yellow-800 font-medium">No sections selected for update</p>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                            Select at least one section to update, or the generated note will be identical to the original.
                        </p>
                    </div>
                )}

                {parsedNote.emrType !== clinicalContext?.emr && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <p className="text-blue-800 font-medium">EMR Type Mismatch</p>
                        </div>
                        <p className="text-blue-700 text-sm mt-1">
                            Original note appears to be from {parsedNote.emrType} EMR, but current context is {clinicalContext?.emr}.
                            The updated note will be formatted for {clinicalContext?.emr}.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        Ready to generate updated note for {clinicalContext?.clinic || 'current clinical context'}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setUpdateConfigs(updateConfigs.map(c => ({ ...c, shouldUpdate: false })))}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Clear All
                        </button>

                        <button
                            onClick={onGenerateUpdate}
                            disabled={updateSummary.sectionsToUpdate === 0}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            Generate Updated Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}