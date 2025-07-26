// src/app/test-selective-updater-fixed/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { EnhancedSectionDetector } from '@/lib/note-processing/section-detector';
import type { EnhancedParsedNote } from '@/lib/note-processing/section-detector';

// The same sample note from our successful test
const sampleNote = `
Name: John Smith
MRN: 12345
Date of Birth: 01/15/1990

Diagnosis:
GAD, Cannabis Use Disorder, moderate, Panic Attacks

Identifying Information:
Full-time cook

Current Medications:
Venlafaxine 75 mg daily
Gabapentin 800 mg BID PRN for anxiety

Behavioral Health Prior Meds Tried:
Duloxetine 20 mg daily (discontinued due to increased irritability)
Escitalopram 10 mg daily (discontinued due to sexual side effects)

HPI:
Reason for visit: Medication Management
Patient reports: Nicholas "Nick" Azen is a 27 year old man with a history of GAD, Cannabis Use Disorder, moderate, Panic Attacks, who presents for follow up for worsening anxiety.

At his last appointment, the plan included:
- continue individual psychotherapy for anxiety
- stop duloxetine 20 mg daily (seemed to increase irritability and anxiety, not help mood)
- start venlafaxine 37.5 mg daily for 2 weeks then increase to 75 mg daily
- continue gabapentin 800 mg BID PRN for anxiety, with emphasis on patient-driven reduction in frequency

Review of Systems:
Mood: anxious, most of the time and even
Mood swings: some
Anhedonia: none
Energy level: normal
Anxiety: improved and some
Substance use: current or recent use

Psychiatric Exam:
General appearance: Appropriately dressed, appropriately groomed and age appropriate
Behavior/Cooperation: interactive
Eye Contact: good
Affect: appropriate and congruent with mood
Speech: normal rate, rhythm, volume, and prosody

Questionnaires/Surveys:
PHQ-9: 8 (mild depression)
GAD-7: 12 (moderate anxiety)

Medical:
None new to report

Physical Exam:
No new changes or medical conditions

Risks:
Suicide risk factors: family hx of psychiatric dx resulting in inpatient tx
Suicide protective factors: no active psychosis, good support system, engaged in treatment

Assessment and Plan:
Nicholas "Nick" Azen is a 27 year old man with a history of GAD, Cannabis Use Disorder, moderate, Panic Attacks, who presents for 3-month follow up for worsening anxiety.

Medications:
Risks and benefits discussed: Insomnia, vomiting, nausea, diarrhea and headache
Medication comments: 
- continue individual psychotherapy for anxiety
- start venlafaxine 37.5 mg daily for 2 weeks then increase to 75 mg daily
- continue gabapentin 800 mg BID PRN for anxiety

Psychosocial:
Continue: individual therapy
Recommended: individual therapy
Discussed the importance of mindfulness meditation, Cognitive Behavioral Therapy

Safety Plan:
Patient/caregiver expresses no suicidal plan

Prognosis:
Excellent and with treatment

Follow-Up:
Appointment with this provider in 2 months
`;

// Sample new transcript for testing
const sampleTranscript = `
Patient reports significant improvement in anxiety since starting venlafaxine. Sleep has improved and he's feeling more motivated at work. No side effects from current medications. 

Mood appears brighter today compared to last visit. Still some anxiety but much more manageable. Wants to continue current medication regimen.

PHQ-9 today: 5 (down from 8)
GAD-7 today: 8 (down from 12)

Plan: Continue current medications, follow up in 2 months, consider therapy referral for ongoing anxiety management.
`;

// Fixed component with proper state management
function FixedSelectiveUpdater({
    parsedNote,
    newTranscript,
    clinicalContext
}: {
    parsedNote: EnhancedParsedNote;
    newTranscript: string;
    clinicalContext: any;
}) {
    // Simple state management - no complex effects
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [currentPreset, setCurrentPreset] = useState<string>('');

    // Define presets
    const presets = {
        'standard': {
            name: 'Standard Transfer',
            description: 'Typical transfer of care updates',
            sections: ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP']
        },
        'medication': {
            name: 'Medication Focus',
            description: 'Primarily medication management',
            sections: ['CURRENT_MEDICATIONS', 'HPI', 'PSYCHIATRIC_EXAM', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP']
        },
        'comprehensive': {
            name: 'Comprehensive',
            description: 'Update all sections',
            sections: parsedNote.sections.map(s => s.type)
        },
        'minimal': {
            name: 'Minimal Update',
            description: 'Only essential changes',
            sections: ['HPI', 'ASSESSMENT_AND_PLAN', 'FOLLOW_UP']
        }
    };

    // Simple toggle function
    const toggleSection = useCallback((sectionType: string) => {
        console.log('🔄 Toggling section:', sectionType);

        setSelectedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionType)) {
                newSet.delete(sectionType);
                console.log('❌ Removed:', sectionType);
            } else {
                newSet.add(sectionType);
                console.log('✅ Added:', sectionType);
            }
            console.log('📊 New selection:', Array.from(newSet));
            return newSet;
        });

        // Clear preset when manually changing
        setCurrentPreset('');
    }, []);

    // Apply preset function
    const applyPreset = useCallback((presetKey: string) => {
        console.log('🎯 Applying preset:', presetKey);

        const preset = presets[presetKey as keyof typeof presets];
        if (preset) {
            // Filter to only available sections
            const availableSections = parsedNote.sections.map(s => s.type);
            const validSections = preset.sections.filter(s => availableSections.includes(s));

            setSelectedSections(new Set(validSections));
            setCurrentPreset(presetKey);
            console.log('✅ Applied preset with sections:', validSections);
        }
    }, [parsedNote.sections]);

    // Clear all function
    const clearAll = useCallback(() => {
        console.log('🧹 Clearing all selections');
        setSelectedSections(new Set());
        setCurrentPreset('');
    }, []);

    // Group sections for better organization
    const groupedSections = {
        'Patient Info': parsedNote.sections.filter(s =>
            ['BASIC_DEMO_INFO', 'DIAGNOSIS', 'IDENTIFYING_INFO'].includes(s.type)
        ),
        'Medications': parsedNote.sections.filter(s =>
            ['CURRENT_MEDICATIONS', 'BH_PRIOR_MEDS_TRIED', 'MEDICATIONS_PLAN'].includes(s.type)
        ),
        'Clinical Assessment': parsedNote.sections.filter(s =>
            ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS'].includes(s.type)
        ),
        'Examination': parsedNote.sections.filter(s =>
            ['MEDICAL', 'PHYSICAL_EXAM'].includes(s.type)
        ),
        'Plan & Safety': parsedNote.sections.filter(s =>
            ['RISKS', 'ASSESSMENT_AND_PLAN', 'PSYCHOSOCIAL', 'SAFETY_PLAN'].includes(s.type)
        ),
        'Follow-up': parsedNote.sections.filter(s =>
            ['PROGNOSIS', 'FOLLOW_UP'].includes(s.type)
        )
    };

    const totalSections = parsedNote.sections.length;
    const selectedCount = selectedSections.size;
    const preservedCount = totalSections - selectedCount;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <h3 className="text-lg font-semibold">Transfer of Care Section Selector</h3>
                        <p className="text-purple-100 text-sm">
                            Choose which sections to update ({selectedCount} of {totalSections} selected)
                        </p>
                    </div>
                    <div className="text-white text-right">
                        <p className="text-sm opacity-90">Visit Type</p>
                        <p className="font-semibold">{clinicalContext.visitType}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Success indicator */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="font-medium text-green-900">Enhanced Detector Working!</span>
                    </div>
                    <p className="text-green-700 text-sm">
                        Found {parsedNote.parseMetadata.standardizedSections} standardized sections out of {parsedNote.sections.length} total. Perfect for transfer of care! 🎉
                    </p>
                </div>

                {/* Current selection info */}
                {currentPreset && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-900 font-medium">
                                Current preset: {presets[currentPreset as keyof typeof presets]?.name}
                            </span>
                            <button
                                onClick={clearAll}
                                className="text-blue-700 hover:text-blue-900 text-sm underline"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick presets */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-purple-600">⚡</span>
                        Quick Presets
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(presets).map(([key, preset]) => {
                            const isActive = currentPreset === key;
                            const availableCount = preset.sections.filter(s =>
                                parsedNote.sections.some(section => section.type === s)
                            ).length;

                            return (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className={`p-3 border-2 rounded-lg transition-all text-left ${isActive
                                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                        }`}
                                >
                                    <div className="font-medium text-sm mb-1">{preset.name}</div>
                                    <div className="text-xs text-gray-600 mb-1">{preset.description}</div>
                                    <div className="text-xs text-green-600">{availableCount} sections</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Manual controls */}
                <div className="flex gap-3">
                    <button
                        onClick={clearAll}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <span>🧹</span>
                        Clear All
                    </button>
                    <button
                        onClick={() => applyPreset('comprehensive')}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <span>✅</span>
                        Select All
                    </button>
                </div>

                {/* Grouped sections */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4">Note Sections by Category</h4>
                    <div className="space-y-4">
                        {Object.entries(groupedSections).map(([groupName, sections]) => {
                            if (sections.length === 0) return null;

                            const selectedInGroup = sections.filter(s => selectedSections.has(s.type)).length;

                            return (
                                <div key={groupName} className="border border-gray-200 rounded-lg">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-gray-900">{groupName}</h5>
                                            <span className="text-sm text-gray-500">
                                                {selectedInGroup}/{sections.length} selected
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {sections.map((section) => {
                                            const isSelected = selectedSections.has(section.type);

                                            return (
                                                <button
                                                    key={section.type}
                                                    onClick={() => toggleSection(section.type)}
                                                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                                            ? 'border-green-400 bg-green-50'
                                                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${isSelected
                                                                ? 'bg-green-600 border-green-600 text-white'
                                                                : 'border-gray-300 bg-white'
                                                            }`}>
                                                            {isSelected && <span className="text-xs font-bold">✓</span>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'
                                                                    }`}>
                                                                    {section.title}
                                                                </p>
                                                                {section.metadata.isStandardized && (
                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                                                        Standardized
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm ${isSelected ? 'text-green-600' : 'text-gray-500'
                                                                }`}>
                                                                {section.metadata.wordCount} words •
                                                                Confidence: {section.confidence.toFixed(2)} •
                                                                Found as: "{section.metadata.originalSectionName}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Generate section */}
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium text-green-600">{selectedCount} sections</span> will be updated, {' '}
                            <span className="font-medium text-blue-600">{preservedCount} sections</span> will be preserved exactly
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            EMR: {clinicalContext.emr.toUpperCase()}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Ready to generate constrained update for {clinicalContext.clinic}
                        </div>

                        <button
                            onClick={() => {
                                const toUpdate = Array.from(selectedSections);
                                const toPreserve = parsedNote.sections.map(s => s.type).filter(s => !selectedSections.has(s));

                                alert(`🚀 Ready to Generate!\n\n✅ Sections to UPDATE (${toUpdate.length}):\n${toUpdate.join(', ')}\n\n🔒 Sections to PRESERVE (${toPreserve.length}):\n${toPreserve.join(', ')}\n\n📝 This is where we'd call the constrained prompt API to prevent SOAP formatting issues!`);
                            }}
                            disabled={selectedCount === 0}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                        >
                            <span className="text-lg">✨</span>
                            Generate Updated Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FixedSelectiveUpdaterPage() {
    const [parsedNote, setParsedNote] = useState<EnhancedParsedNote | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const clinicalContext = {
        clinic: 'HMHI Downtown',
        emr: 'credible' as const,
        visitType: 'transfer-of-care'
    };

    const parseNote = () => {
        setIsLoading(true);
        try {
            const result = EnhancedSectionDetector.parseNote(sampleNote);
            setParsedNote(result);
            console.log('✅ Note parsed successfully:', result);
        } catch (error) {
            console.error('❌ Error parsing note:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Parse note on component mount
    useEffect(() => {
        parseNote();
    }, []); // Empty dependency array - only run once

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🛠️ Fixed SelectiveUpdater Test
                    </h1>
                    <p className="text-gray-600 mb-4">
                        All bugs fixed! Individual sections should now be clickable and presets should work properly.
                    </p>

                    {parsedNote && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="p-3 bg-green-50 rounded">
                                <span className="font-medium text-green-900">Total Sections:</span>
                                <span className="ml-2 text-green-700">{parsedNote.sections.length}</span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded">
                                <span className="font-medium text-blue-900">Standardized:</span>
                                <span className="ml-2 text-blue-700">{parsedNote.parseMetadata.standardizedSections}</span>
                            </div>
                            <div className="p-3 bg-purple-50 rounded">
                                <span className="font-medium text-purple-900">Confidence:</span>
                                <span className="ml-2 text-purple-700">{parsedNote.parseMetadata.confidence.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Parsing note...</p>
                    </div>
                ) : parsedNote ? (
                    <FixedSelectiveUpdater
                        parsedNote={parsedNote}
                        newTranscript={sampleTranscript}
                        clinicalContext={clinicalContext}
                    />
                ) : (
                    <div className="text-center py-12">
                        <p className="text-red-600">Failed to parse note. Check console for errors.</p>
                    </div>
                )}
            </div>
        </div>
    );
}