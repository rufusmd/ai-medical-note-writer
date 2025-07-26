// src/components/transfer-of-care/SelectiveUpdater.tsx
// 🚀 Enhanced SelectiveUpdater - Drop-in replacement with backward compatibility

'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    Sparkles,
    User,
    Pill,
    Shield,
    Calendar,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

// Backward compatibility - support both old and new types
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
        standardizedSections?: number; // New enhanced field
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
        isStandardized?: boolean; // New enhanced field
        originalSectionName?: string; // New enhanced field
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
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(SECTION_GROUPS)));
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [showSectionContent, setShowSectionContent] = useState<Set<string>>(new Set());

    // Check if this is the enhanced detector
    const isEnhanced = parsedNote.parseMetadata?.standardizedSections !== undefined;

    // Initialize with smart defaults
    useEffect(() => {
        const getDefaultSelections = (visitType: string): string[] => {
            switch (visitType?.toLowerCase()) {
                case 'transfer-of-care':
                case 'transfer of care':
                    return ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'RISKS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN', 'FOLLOW_UP'];
                case 'follow-up':
                case 'followup':
                    return ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'RISKS', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP'];
                case 'intake':
                case 'initial':
                    return parsedNote.sections.map(s => s.type);
                default:
                    return ['HPI', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP'];
            }
        };

        const defaultSelections = getDefaultSelections(clinicalContext?.visitType || '');
        const availableSections = parsedNote.sections.map(s => s.type);
        const validSelections = defaultSelections.filter(selection =>
            availableSections.includes(selection)
        );

        const newSelectedSections = new Set(validSelections);
        setSelectedSections(newSelectedSections);

        // Update parent with backward-compatible format
        updateParentComponent(newSelectedSections, availableSections);
    }, [parsedNote.sections, clinicalContext?.visitType]);

    // Update parent component with SectionUpdateConfig format (backward compatibility)
    const updateParentComponent = useCallback((selected: Set<string>, allSections: string[]) => {
        const configs: SectionUpdateConfig[] = allSections.map(sectionType => ({
            sectionType,
            shouldUpdate: selected.has(sectionType),
            updateReason: getUpdateReason(sectionType, clinicalContext?.visitType),
            preserveOriginal: false,
            mergeStrategy: 'replace' as const
        }));

        onUpdateConfigChange(configs);
    }, [clinicalContext?.visitType, onUpdateConfigChange]);

    // Get update reason for section
    const getUpdateReason = (sectionType: string, visitType: string): string => {
        const reasonMap: Record<string, string> = {
            'HPI': 'Current visit findings and patient reports',
            'REVIEW_OF_SYSTEMS': 'Current symptom assessment',
            'PSYCHIATRIC_EXAM': 'Current mental status findings',
            'ASSESSMENT_AND_PLAN': 'Updated clinical assessment and treatment plan',
            'MEDICATIONS_PLAN': 'Medication changes and adjustments',
            'CURRENT_MEDICATIONS': 'Updated medication list',
            'RISKS': 'Current risk assessment',
            'SAFETY_PLAN': 'Updated safety planning',
            'FOLLOW_UP': 'Next appointment and follow-up instructions',
            'SUBJECTIVE': 'Current subjective findings and patient reports',
            'OBJECTIVE': 'Current objective findings and observations',
            'ASSESSMENT': 'Updated clinical assessment',
            'PLAN': 'Updated treatment plan'
        };
        return reasonMap[sectionType] || 'Standard update for this visit type';
    };

    // Toggle section selection
    const toggleSection = useCallback((sectionType: string) => {
        setSelectedSections(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(sectionType)) {
                newSelected.delete(sectionType);
            } else {
                newSelected.add(sectionType);
            }

            const allSections = parsedNote.sections.map(s => s.type);
            updateParentComponent(newSelected, allSections);
            return newSelected;
        });
        setSelectedPreset(''); // Clear preset when manually changing
    }, [parsedNote.sections, updateParentComponent]);

    // Apply preset
    const applyPreset = useCallback((presetId: string) => {
        const preset = ENHANCED_PRESETS[presetId as keyof typeof ENHANCED_PRESETS];
        if (preset) {
            const availableSections = parsedNote.sections.map(s => s.type);
            const validSelections = preset.selections.filter(selection =>
                availableSections.includes(selection)
            );

            const newSelected = new Set(validSelections);
            setSelectedSections(newSelected);
            setSelectedPreset(presetId);
            updateParentComponent(newSelected, availableSections);
        }
    }, [parsedNote.sections, updateParentComponent]);

    // Toggle group expansion
    const toggleGroup = (groupId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    // Toggle section content visibility
    const toggleSectionContent = (sectionType: string) => {
        const newShowContent = new Set(showSectionContent);
        if (newShowContent.has(sectionType)) {
            newShowContent.delete(sectionType);
        } else {
            newShowContent.add(sectionType);
        }
        setShowSectionContent(newShowContent);
    };

    // Get section from parsed note
    const getSection = (sectionType: string): DetectedSection | undefined => {
        return parsedNote.sections.find(s => s.type === sectionType);
    };

    // Clear all selections
    const clearAll = () => {
        setSelectedSections(new Set());
        setSelectedPreset('');
        const allSections = parsedNote.sections.map(s => s.type);
        updateParentComponent(new Set(), allSections);
    };

    // Select all sections
    const selectAll = () => {
        const allSections = parsedNote.sections.map(s => s.type);
        const newSelected = new Set(allSections);
        setSelectedSections(newSelected);
        setSelectedPreset('');
        updateParentComponent(newSelected, allSections);
    };

    // Calculate summary
    const updateSummary = {
        totalSections: parsedNote.sections.length,
        sectionsToUpdate: selectedSections.size,
        sectionsToPreserve: parsedNote.sections.length - selectedSections.size,
        standardizedSections: parsedNote.parseMetadata?.standardizedSections || 0
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Settings className="h-6 w-6" />
                        <div>
                            <h3 className="text-lg font-semibold">
                                {isEnhanced ? 'Enhanced Transfer of Care Selector' : 'Selective Section Updater'}
                            </h3>
                            <p className="text-purple-100 text-sm">
                                Choose which sections to update while preserving the rest
                            </p>
                        </div>
                    </div>
                    <div className="text-white text-right">
                        <p className="text-sm opacity-90">{updateSummary.sectionsToUpdate} of {updateSummary.totalSections} sections</p>
                        <p className="font-semibold">Selected for Update</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Enhanced detector indicator */}
                {isEnhanced && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-900">Enhanced Detector Active!</span>
                        </div>
                        <p className="text-green-700 text-sm">
                            Found {updateSummary.standardizedSections} standardized sections out of {updateSummary.totalSections} total.
                            Perfect for transfer of care! 🎉
                        </p>
                    </div>
                )}

                {/* Quick Presets */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600" />
                        Smart Presets for {clinicalContext?.visitType?.replace('-', ' ') || 'this visit'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(ENHANCED_PRESETS).map(([key, preset]) => {
                            const Icon = preset.icon;
                            const isSelected = selectedPreset === key;

                            // Count available sections for this preset
                            const availableCount = preset.selections.filter(s =>
                                parsedNote.sections.some(section => section.type === s)
                            ).length;

                            return (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className="h-4 w-4" />
                                        <span className="font-medium text-sm">{preset.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{preset.description}</p>
                                    <p className="text-xs text-green-600">{availableCount} sections available</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section Groups (Enhanced) or List (Legacy) */}
                {isEnhanced ? (
                    <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            Note Sections ({parsedNote.sections.length} detected)
                        </h4>

                        <div className="space-y-4">
                            {Object.entries(SECTION_GROUPS).map(([groupId, group]) => {
                                const GroupIcon = group.icon;
                                const isExpanded = expandedGroups.has(groupId);

                                // Get available sections in this group
                                const availableSections = group.sections
                                    .map(sectionType => getSection(sectionType))
                                    .filter(Boolean) as DetectedSection[];

                                const selectedInGroup = availableSections.filter(s => selectedSections.has(s.type)).length;

                                if (availableSections.length === 0) return null;

                                return (
                                    <div key={groupId} className="border border-gray-200 rounded-lg">
                                        <button
                                            onClick={() => toggleGroup(groupId)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <GroupIcon className={`h-5 w-5 text-${group.color}-600`} />
                                                <div className="text-left">
                                                    <span className="font-medium text-gray-900">{group.title}</span>
                                                    <p className="text-xs text-gray-500">{group.description}</p>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    ({selectedInGroup}/{availableSections.length} selected)
                                                </span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-gray-200 bg-gray-25">
                                                {availableSections.map((section) => {
                                                    const isSelected = selectedSections.has(section.type);
                                                    const showContent = showSectionContent.has(section.type);

                                                    return (
                                                        <div
                                                            key={section.type}
                                                            className={`border-b border-gray-100 last:border-b-0 transition-all ${isSelected ? 'bg-green-50' : 'bg-white'
                                                                }`}
                                                        >
                                                            <div className="px-6 py-3">
                                                                <div className="flex items-center justify-between">
                                                                    <button
                                                                        onClick={() => toggleSection(section.type)}
                                                                        className="flex items-center gap-3 text-left flex-1"
                                                                    >
                                                                        {isSelected ? (
                                                                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                                        ) : (
                                                                            <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'
                                                                                    }`}>
                                                                                    {section.title}
                                                                                </p>
                                                                                {section.metadata?.isStandardized && (
                                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                                        Standardized
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className={`text-sm ${isSelected ? 'text-green-600' : 'text-gray-500'
                                                                                }`}>
                                                                                {section.metadata.wordCount} words •
                                                                                Confidence: {section.confidence.toFixed(2)}
                                                                                {section.metadata?.originalSectionName &&
                                                                                    ` • Found as: "${section.metadata.originalSectionName}"`
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => toggleSectionContent(section.type)}
                                                                        className="ml-3 p-1 text-gray-400 hover:text-gray-600"
                                                                        title="Preview content"
                                                                    >
                                                                        {showContent ? (
                                                                            <EyeOff className="h-4 w-4" />
                                                                        ) : (
                                                                            <Eye className="h-4 w-4" />
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                {showContent && (
                                                                    <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                                                                        <p className="text-gray-600 mb-2">Current content:</p>
                                                                        <p className="text-gray-800 font-mono text-xs leading-relaxed">
                                                                            {section.content.length > 200
                                                                                ? section.content.substring(0, 200) + '...'
                                                                                : section.content
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // Legacy section list for backward compatibility
                    <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            Available Sections ({parsedNote.sections.length} detected)
                        </h4>
                        <div className="space-y-3">
                            {parsedNote.sections.map((section) => {
                                const isSelected = selectedSections.has(section.type);

                                return (
                                    <div
                                        key={section.type}
                                        className={`p-4 border-2 rounded-lg transition-all ${isSelected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => toggleSection(section.type)}
                                                className="flex items-center gap-3 text-left min-w-0 flex-1"
                                            >
                                                {isSelected ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'
                                                        }`}>
                                                        {section.title || section.type}
                                                    </p>
                                                    <p className={`text-sm ${isSelected ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                        {section.metadata.wordCount} words • Confidence: {section.confidence.toFixed(2)}
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Summary and Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h5 className="font-medium text-gray-900">Update Summary</h5>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium text-green-600">{updateSummary.sectionsToUpdate} sections</span> will be updated using new transcript, {' '}
                                <span className="font-medium text-blue-600">{updateSummary.sectionsToPreserve} sections</span> will be preserved exactly
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">EMR Format</p>
                            <p className="font-medium text-gray-900">{clinicalContext?.emr?.toUpperCase() || 'STANDARD'}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                            <button
                                onClick={clearAll}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear All
                            </button>
                            <button
                                onClick={selectAll}
                                className="px-4 py-2 text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Select All
                            </button>
                        </div>

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

// Enhanced section groups (only used if enhanced detector is detected)
const SECTION_GROUPS = {
    'PATIENT_INFO': {
        title: 'Patient Information',
        icon: User,
        color: 'blue',
        description: 'Basic demographic and identifying information',
        sections: ['BASIC_DEMO_INFO', 'DIAGNOSIS', 'IDENTIFYING_INFO']
    },
    'MEDICATIONS': {
        title: 'Medications',
        icon: Pill,
        color: 'green',
        description: 'Current medications and medication history',
        sections: ['CURRENT_MEDICATIONS', 'BH_PRIOR_MEDS_TRIED', 'MEDICATIONS_PLAN']
    },
    'CLINICAL_ASSESSMENT': {
        title: 'Clinical Assessment',
        icon: Brain,
        color: 'purple',
        description: 'Current symptoms, mental status, and clinical findings',
        sections: ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS']
    },
    'EXAMINATION': {
        title: 'Examination',
        icon: FileText,
        color: 'orange',
        description: 'Physical and medical examination findings',
        sections: ['MEDICAL', 'PHYSICAL_EXAM']
    },
    'PLAN_AND_SAFETY': {
        title: 'Plan & Safety',
        icon: Shield,
        color: 'red',
        description: 'Treatment planning, risk assessment, and safety',
        sections: ['RISKS', 'ASSESSMENT_AND_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN']
    },
    'FOLLOW_UP': {
        title: 'Follow-up & Prognosis',
        icon: Calendar,
        color: 'indigo',
        description: 'Future planning and prognosis',
        sections: ['PROGNOSIS', 'FOLLOW_UP']
    }
};

// Enhanced presets with backward compatibility
const ENHANCED_PRESETS = {
    'transfer-standard': {
        name: 'Standard Transfer',
        description: 'Typical transfer of care updates',
        icon: Zap,
        selections: ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'RISKS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN', 'FOLLOW_UP']
    },
    'medication-focused': {
        name: 'Medication Focus',
        description: 'Primarily medication management',
        icon: Pill,
        selections: ['CURRENT_MEDICATIONS', 'HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP']
    },
    'comprehensive': {
        name: 'Comprehensive',
        description: 'Update most sections',
        icon: FileText,
        selections: ['BASIC_DEMO_INFO', 'CURRENT_MEDICATIONS', 'BH_PRIOR_MEDS_TRIED', 'HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'MEDICAL', 'PHYSICAL_EXAM', 'RISKS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN', 'FOLLOW_UP']
    },
    'minimal': {
        name: 'Minimal Update',
        description: 'Only essential changes',
        icon: RotateCcw,
        selections: ['HPI', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP']
    },
    // Legacy presets for backward compatibility
    'standard-followup': {
        name: 'Standard Follow-up',
        description: 'Typical updates for follow-up visits',
        icon: ArrowRight,
        selections: ['SUBJECTIVE', 'OBJECTIVE', 'PLAN', 'HPI', 'MSE']
    },
    'update-plan-only': {
        name: 'Plan Updates Only',
        description: 'Only update treatment plan and recommendations',
        icon: Edit3,
        selections: ['PLAN', 'TREATMENT', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN']
    }
};