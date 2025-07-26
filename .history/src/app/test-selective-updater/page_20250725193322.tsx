// src/app/test-selective-updater/page.tsx
'use client';

import { useState, useEffect } from 'react';
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

// We'll create a mock component until we can integrate the real one
function MockImprovedSelectiveUpdater({
    parsedNote,
    newTranscript,
    clinicalContext,
    onUpdateConfigChange,
    onGenerateUpdate
}: {
    parsedNote: EnhancedParsedNote;
    newTranscript: string;
    clinicalContext: any;
    onUpdateConfigChange: (sectionsToUpdate: string[], sectionsToPreserve: string[]) => void;
    onGenerateUpdate: () => void;
}) {
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Default selections for transfer of care
        const defaultSelections = ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP'];
        const availableSections = parsedNote.sections.map(s => s.type);
        const validSelections = defaultSelections.filter(s => availableSections.includes(s as any));

        const newSelected = new Set(validSelections);
        setSelectedSections(newSelected);

        const sectionsToUpdate = Array.from(newSelected);
        const sectionsToPreserve = availableSections.filter(s => !newSelected.has(s));
        onUpdateConfigChange(sectionsToUpdate, sectionsToPreserve);
    }, [parsedNote, onUpdateConfigChange]);

    const toggleSection = (sectionType: string) => {
        const newSelected = new Set(selectedSections);
        if (newSelected.has(sectionType)) {
            newSelected.delete(sectionType);
        } else {
            newSelected.add(sectionType);
        }
        setSelectedSections(newSelected);

        const allSections = parsedNote.sections.map(s => s.type);
        const sectionsToUpdate = Array.from(newSelected);
        const sectionsToPreserve = allSections.filter(s => !newSelected.has(s));
        onUpdateConfigChange(sectionsToUpdate, sectionsToPreserve);
    };

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

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <h3 className="text-lg font-semibold">Transfer of Care Section Selector</h3>
                        <p className="text-purple-100 text-sm">
                            Choose which sections to update ({selectedSections.size} of {parsedNote.sections.length} selected)
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

                {/* Quick presets */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-3">Quick Presets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            onClick={() => {
                                const preset = ['HPI', 'REVIEW_OF_SYSTEMS', 'PSYCHIATRIC_EXAM', 'QUESTIONNAIRES_SURVEYS', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP'];
                                const available = parsedNote.sections.map(s => s.type);
                                const valid = preset.filter(s => available.includes(s as any));
                                setSelectedSections(new Set(valid));
                                onUpdateConfigChange(valid, available.filter(s => !valid.includes(s)));
                            }}
                            className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                        >
                            <span className="font-medium text-sm">Standard Transfer</span>
                            <p className="text-xs text-gray-600">Typical transfer of care updates</p>
                        </button>
                        <button
                            onClick={() => {
                                const preset = ['CURRENT_MEDICATIONS', 'HPI', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP'];
                                const available = parsedNote.sections.map(s => s.type);
                                const valid = preset.filter(s => available.includes(s as any));
                                setSelectedSections(new Set(valid));
                                onUpdateConfigChange(valid, available.filter(s => !valid.includes(s)));
                            }}
                            className="p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
                        >
                            <span className="font-medium text-sm">Medication Focus</span>
                            <p className="text-xs text-gray-600">Primarily medication management</p>
                        </button>
                        <button
                            onClick={() => {
                                const all = parsedNote.sections.map(s => s.type);
                                setSelectedSections(new Set(all));
                                onUpdateConfigChange(all, []);
                            }}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                        >
                            <span className="font-medium text-sm">Comprehensive</span>
                            <p className="text-xs text-gray-600">Update all sections</p>
                        </button>
                    </div>
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
                                                <div
                                                    key={section.type}
                                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                                            ? 'border-green-300 bg-green-50'
                                                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                                        }`}
                                                    onClick={() => toggleSection(section.type)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected
                                                                ? 'bg-green-600 text-white'
                                                                : 'border-2 border-gray-300'
                                                            }`}>
                                                            {isSelected && <span className="text-xs">✓</span>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-700'
                                                                    }`}>
                                                                    {section.title}
                                                                </p>
                                                                {section.metadata.isStandardized && (
                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
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
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Generate button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        <span className="font-medium text-green-600">{selectedSections.size} sections</span> will be updated, {' '}
                        <span className="font-medium text-blue-600">{parsedNote.sections.length - selectedSections.size} sections</span> will be preserved
                    </div>

                    <button
                        onClick={onGenerateUpdate}
                        disabled={selectedSections.size === 0}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <span className="text-lg">✨</span>
                        Generate Updated Note
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function TestSelectiveUpdaterPage() {
    const [parsedNote, setParsedNote] = useState<EnhancedParsedNote | null>(null);
    const [sectionsToUpdate, setSectionsToUpdate] = useState<string[]>([]);
    const [sectionsToPreserve, setSectionsToPreserve] = useState<string[]>([]);
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
        } catch (error) {
            console.error('Error parsing note:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateConfigChange = (toUpdate: string[], toPreserve: string[]) => {
        setSectionsToUpdate(toUpdate);
        setSectionsToPreserve(toPreserve);
    };

    const handleGenerateUpdate = () => {
        alert(`Ready to generate!\n\nSections to update: ${sectionsToUpdate.join(', ')}\n\nSections to preserve: ${sectionsToPreserve.join(', ')}\n\nThis is where we'd call the constrained prompt API!`);
    };

    useEffect(() => {
        parseNote();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Enhanced SelectiveUpdater Test
                    </h1>
                    <p className="text-gray-600 mb-4">
                        Test the new SelectiveUpdater with all {parsedNote?.parseMetadata.standardizedSections || 0} standardized sections detected!
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
                    <MockImprovedSelectiveUpdater
                        parsedNote={parsedNote}
                        newTranscript={sampleTranscript}
                        clinicalContext={clinicalContext}
                        onUpdateConfigChange={handleUpdateConfigChange}
                        onGenerateUpdate={handleGenerateUpdate}
                    />
                ) : (
                    <div className="text-center py-12">
                        <p className="text-red-600">Failed to parse note. Check console for errors.</p>
                    </div>
                )}

                {/* Current selections display */}
                {sectionsToUpdate.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Selection Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium text-green-900 mb-2">Sections to Update ({sectionsToUpdate.length})</h4>
                                <div className="space-y-1">
                                    {sectionsToUpdate.map(section => (
                                        <div key={section} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                                            {section}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-900 mb-2">Sections to Preserve ({sectionsToPreserve.length})</h4>
                                <div className="space-y-1">
                                    {sectionsToPreserve.map(section => (
                                        <div key={section} className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                            {section}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}