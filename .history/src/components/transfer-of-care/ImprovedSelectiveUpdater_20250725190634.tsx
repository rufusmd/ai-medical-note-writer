// src/components/transfer-of-care/ImprovedSelectiveUpdater.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Eye,
    EyeOff,
    Settings,
    Sparkles,
    RotateCcw,
    Zap,
    User,
    Pill,
    Brain,
    FileText,
    Shield,
    Calendar,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

// Import your enhanced types
import { StandardizedSectionType, EnhancedParsedNote, StandardizedSection } from '@/lib/note-processing/enhanced-section-detector';

interface SectionUpdateConfig {
    sectionType: StandardizedSectionType;
    shouldUpdate: boolean;
    updateReason: string;
    preserveOriginal: boolean;
    mergeStrategy: 'replace' | 'append' | 'merge';
}

interface ImprovedSelectiveUpdaterProps {
    parsedNote: EnhancedParsedNote;
    newTranscript: string;
    clinicalContext: {
        clinic: string;
        emr: 'epic' | 'credible';
        visitType: string;
    };
    onUpdateConfigChange: (config: SectionUpdateConfig[]) => void;
    onGenerateUpdate: () => void;
}

// Grouped section definitions with your standardized sections
const SECTION_GROUPS = {
    'PATIENT_INFO': {
        title: 'Patient Information',
        icon: User,
        color: 'blue',
        sections: [
            { id: 'BASIC_DEMO_INFO' as StandardizedSectionType, title: 'Basic Demo Information', description: 'Name, MRN, date of birth', defaultSelected: false },
            { id: 'DIAGNOSIS' as StandardizedSectionType, title: 'Diagnosis', description: 'Pulled from chart', defaultSelected: false },
            { id: 'IDENTIFYING_INFO' as StandardizedSectionType, title: 'Identifying Information', description: 'Occupation, demographics', defaultSelected: false }
        ]
    },
    'MEDICATIONS': {
        title: 'Medications',
        icon: Pill,
        color: 'green',
        sections: [
            { id: 'CURRENT_MEDICATIONS' as StandardizedSectionType, title: 'Current Medications', description: 'Current medication list', defaultSelected: true },
            { id: 'BH_PRIOR_MEDS_TRIED' as StandardizedSectionType, title: 'Behavioral Health Prior Meds', description: 'Previously tried medications', defaultSelected: false },
            { id: 'MEDICATIONS_PLAN' as StandardizedSectionType, title: 'Medication Changes', description: 'New prescriptions and adjustments', defaultSelected: true }
        ]
    },
    'CLINICAL_ASSESSMENT': {
        title: 'Clinical Assessment',
        icon: Brain,
        color: 'purple',
        sections: [
            { id: 'HPI' as StandardizedSectionType, title: 'HPI', description: 'History of Present Illness', defaultSelected: true },
            { id: 'REVIEW_OF_SYSTEMS' as StandardizedSectionType, title: 'Review of Systems', description: 'Systematic symptom review', defaultSelected: true },
            { id: 'PSYCHIATRIC_EXAM' as StandardizedSectionType, title: 'Psychiatric Exam', description: 'Mental status examination', defaultSelected: true },
            { id: 'QUESTIONNAIRES_SURVEYS' as StandardizedSectionType, title: 'Questionnaires/Surveys', description: 'PHQ-9, GAD-7, etc', defaultSelected: true }
        ]
    },
    'EXAMINATION': {
        title: 'Examination',
        icon: FileText,
        color: 'orange',
        sections: [
            { id: 'MEDICAL' as StandardizedSectionType, title: 'Medical', description: 'Medical history updates', defaultSelected: true },
            { id: 'PHYSICAL_EXAM' as StandardizedSectionType, title: 'Physical Exam', description: 'Physical examination findings', defaultSelected: false }
        ]
    },
    'PLAN_AND_SAFETY': {
        title: 'Plan & Safety',
        icon: Shield,
        color: 'red',
        sections: [
            { id: 'RISKS' as StandardizedSectionType, title: 'Risks', description: 'Safety and risk assessment', defaultSelected: true },
            { id: 'ASSESSMENT_AND_PLAN' as StandardizedSectionType, title: 'Assessment and Plan', description: 'Clinical assessment and treatment plan', defaultSelected: true },
            { id: 'PSYCHOSOCIAL' as StandardizedSectionType, title: 'Psychosocial', description: 'Therapy and psychosocial interventions', defaultSelected: true },
            { id: 'SAFETY_PLAN' as StandardizedSectionType, title: 'Safety Plan', description: 'Safety planning and crisis intervention', defaultSelected: true }
        ]
    },
    'FOLLOW_UP': {
        title: 'Follow-up & Prognosis',
        icon: Calendar,
        color: 'indigo',
        sections: [
            { id: 'PROGNOSIS' as StandardizedSectionType, title: 'Prognosis', description: 'Clinical prognosis assessment', defaultSelected: false },
            { id: 'FOLLOW_UP' as StandardizedSectionType, title: 'Follow-Up', description: 'Next appointment and follow-up plans', defaultSelected: true }
        ]
    }
};

// Smart presets based on visit type
const SMART_PRESETS = {
    'transfer-standard': {
        name: 'Standard Transfer',
        description: 'Typical transfer of care updates',
        icon: Zap,
        selections: ['CURRENT_MEDICATIONS', 'HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'MEDICAL', 'RISKS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN', 'FOLLOW_UP']
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
        selections: Object.values(SECTION_GROUPS).flatMap(group => group.sections.map(s => s.id))
    },
    'minimal': {
        name: 'Minimal Update',
        description: 'Only essential changes',
        icon: RotateCcw,
        selections: ['HPI', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP']
    }
};

export default function ImprovedSelectiveUpdater({
    parsedNote,
    newTranscript,
    clinicalContext,
    onUpdateConfigChange,
    onGenerateUpdate
}: ImprovedSelectiveUpdaterProps) {
    const [updateConfigs, setUpdateConfigs] = useState<SectionUpdateConfig[]>([]);
    const [selectedSections, setSelectedSections] = useState<Set<StandardizedSectionType>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(SECTION_GROUPS)));
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [showSectionContent, setShowSectionContent] = useState<Set<StandardizedSectionType>>(new Set());

    // Initialize with smart defaults based on visit type
    useEffect(() => {
        const defaultSelections = getDefaultSelections(clinicalContext.visitType);
        const newSelectedSections = new Set(defaultSelections);
        setSelectedSections(newSelectedSections);

        // Create update configs
        const initialConfigs: SectionUpdateConfig[] = parsedNote.sections.map(section => ({
            sectionType: section.type,
            shouldUpdate: newSelectedSections.has(section.type),
            updateReason: getUpdateReason(section.type, clinicalContext.visitType),
            preserveOriginal: false,
            mergeStrategy: 'replace' as const
        }));

        setUpdateConfigs(initialConfigs);
        onUpdateConfigChange(initialConfigs);
    }, [parsedNote, clinicalContext, onUpdateConfigChange]);

    // Get default selections based on visit type
    const getDefaultSelections = (visitType: string): StandardizedSectionType[] => {
        switch (visitType) {
            case 'transfer-of-care':
                return SMART_PRESETS['transfer-standard'].selections as StandardizedSectionType[];
            case 'follow-up':
                return ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS',
                    'RISKS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'SAFETY_PLAN', 'FOLLOW_UP'];
            case 'intake':
                return Object.values(SECTION_GROUPS).flatMap(group => group.sections.map(s => s.id));
            default:
                return ['HPI', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP'];
        }
    };

    // Get update reason for section
    const getUpdateReason = (sectionType: StandardizedSectionType, visitType: string): string => {
        const reasonMap: Record<StandardizedSectionType, string> = {
            HPI: 'Current visit findings and patient reports',
            REVIEW_OF_SYSTEMS: 'Current symptom assessment',
            PSYCHIATRIC_EXAM: 'Current mental status findings',
            ASSESSMENT_AND_PLAN: 'Updated clinical assessment and treatment plan',
            MEDICATIONS_PLAN: 'Medication changes and adjustments',
            CURRENT_MEDICATIONS: 'Updated medication list',
            RISKS: 'Current risk assessment',
            SAFETY_PLAN: 'Updated safety planning',
            FOLLOW_UP: 'Next appointment and follow-up instructions',
            // Add more as needed
        } as Record<StandardizedSectionType, string>;

        return reasonMap[sectionType] || 'Standard update for this visit type';
    };

    // Toggle section selection
    const toggleSection = (sectionType: StandardizedSectionType) => {
        const newSelected = new Set(selectedSections);
        if (newSelected.has(sectionType)) {
            newSelected.delete(sectionType);
        } else {
            newSelected.add(sectionType);
        }
        setSelectedSections(newSelected);

        // Update configs
        const newConfigs = updateConfigs.map(config =>
            config.sectionType === sectionType
                ? { ...config, shouldUpdate: newSelected.has(sectionType) }
                : config
        );
        setUpdateConfigs(newConfigs);
        onUpdateConfigChange(newConfigs);
        setSelectedPreset(''); // Clear preset when manually changing
    };

    // Apply preset
    const applyPreset = (presetId: string) => {
        const preset = SMART_PRESETS[presetId as keyof typeof SMART_PRESETS];
        if (preset) {
            const newSelected = new Set(preset.selections as StandardizedSectionType[]);
            setSelectedSections(newSelected);
            setSelectedPreset(presetId);

            const newConfigs = updateConfigs.map(config => ({
                ...config,
                shouldUpdate: newSelected.has(config.sectionType)
            }));
            setUpdateConfigs(newConfigs);
            onUpdateConfigChange(newConfigs);
        }
    };

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
    const toggleSectionContent = (sectionType: StandardizedSectionType) => {
        const newShowContent = new Set(showSectionContent);
        if (newShowContent.has(sectionType)) {
            newShowContent.delete(sectionType);
        } else {
            newShowContent.add(sectionType);
        }
        setShowSectionContent(newShowContent);
    };

    // Get section from parsed note
    const getSection = (sectionType: StandardizedSectionType): StandardizedSection | undefined => {
        return parsedNote.sections.find(s => s.type === sectionType);
    };

    // Clear all selections
    const clearAll = () => {
        setSelectedSections(new Set());
        const newConfigs = updateConfigs.map(config => ({ ...config, shouldUpdate: false }));
        setUpdateConfigs(newConfigs);
        onUpdateConfigChange(newConfigs);
        setSelectedPreset('');
    };

    // Select all sections
    const selectAll = () => {
        const allSections = parsedNote.sections.map(s => s.type);
        const newSelected = new Set(allSections);
        setSelectedSections(newSelected);
        const newConfigs = updateConfigs.map(config => ({ ...config, shouldUpdate: true }));
        setUpdateConfigs(newConfigs);
        onUpdateConfigChange(newConfigs);
        setSelectedPreset('');
    };

    // Calculate summary
    const updateSummary = {
        totalSections: parsedNote.sections.length,
        sectionsToUpdate: selectedSections.size,
        sectionsToPreserve: parsedNote.sections.length - selectedSections.size
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <Settings className="h-6 w-6" />
                        <div>
                            <h3 className="text-lg font-semibold">Transfer of Care Section Selector</h3>
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
                {/* Quick Presets */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600" />
                        Smart Presets for {clinicalContext.visitType?.replace('-', ' ')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(SMART_PRESETS).map(([key, preset]) => {
                            const Icon = preset.icon;
                            const isSelected = selectedPreset === key;

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
                                    <p className="text-xs text-gray-600">{preset.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Warning for missing sections */}
                {parsedNote.parseMetadata.warnings.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium text-yellow-900">Parsing Warnings</span>
                        </div>
                        <ul className="text-yellow-700 text-sm space-y-1">
                            {parsedNote.parseMetadata.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Section Groups */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        Note Sections ({parsedNote.sections.length} detected)
                    </h4>

                    <div className="space-y-4">
                        {Object.entries(SECTION_GROUPS).map(([groupId, group]) => {
                            const GroupIcon = group.icon;
                            const isExpanded = expandedGroups.has(groupId);
                            const availableSections = group.sections.filter(s => getSection(s.id));
                            const selectedInGroup = availableSections.filter(s => selectedSections.has(s.id)).length;

                            if (availableSections.length === 0) return null; // Skip groups with no detected sections

                            return (
                                <div key={groupId} className="border border-gray-200 rounded-lg">
                                    {/* Group Header */}
                                    <button
                                        onClick={() => toggleGroup(groupId)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <GroupIcon className={`h-5 w-5 text-${group.color}-600`} />
                                            <span className="font-medium text-gray-900">{group.title}</span>
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

                                    {/* Group Sections */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 bg-gray-25">
                                            {availableSections.map((sectionDef) => {
                                                const section = getSection(sectionDef.id);
                                                if (!section) return null;

                                                const isSelected = selectedSections.has(sectionDef.id);
                                                const showContent = showSectionContent.has(sectionDef.id);

                                                return (
                                                    <div
                                                        key={sectionDef.id}
                                                        className={`border-b border-gray-100 last:border-b-0 transition-all ${isSelected ? 'bg-green-50' : 'bg-white'
                                                            }`}
                                                    >
                                                        <div className="px-6 py-3">
                                                            <div className="flex items-center justify-between">
                                                                <button
                                                                    onClick={() => toggleSection(sectionDef.id)}
                                                                    className="flex items-center gap-3 text-left flex-1"
                                                                >
                                                                    {isSelected ? (
                                                                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                                    ) : (
                                                                        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                                    )}
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'
                                                                            }`}>
                                                                            {sectionDef.title}
                                                                        </p>
                                                                        <p className={`text-sm ${isSelected ? 'text-green-600' : 'text-gray-500'
                                                                            }`}>
                                                                            {sectionDef.description} • {section.metadata.wordCount} words
                                                                        </p>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    onClick={() => toggleSectionContent(sectionDef.id)}
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

                                                            {/* Section content preview */}
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
                            <p className="font-medium text-gray-900">{clinicalContext.emr.toUpperCase()}</p>
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