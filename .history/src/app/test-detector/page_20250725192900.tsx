// src/app/test-detector/page.tsx
'use client';

import { useState } from 'react';

// Sample clinical note built right into the component
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

export default function TestDetectorPage() {
    const [results, setResults] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const runTest = async () => {
        setIsLoading(true);
        setResults('🚀 Starting enhanced detector test...\n\n');

        try {
            // Try to import the section detector
            const detectorModule = await import('@/lib/note-processing/section-detector');

            // Try different export names for compatibility
            const SectionDetector =
                detectorModule.EnhancedSectionDetector ||
                detectorModule.IntelligentSectionDetector ||
                detectorModule.default;

            if (!SectionDetector) {
                throw new Error('Could not find section detector in module');
            }

            setResults(prev => prev + '✅ Successfully imported section detector\n\n');

            // Test the detector
            setResults(prev => prev + '📋 Parsing sample clinical note...\n\n');

            const result = SectionDetector.parseNote(sampleNote);

            // Display results
            let output = '📊 DETECTION RESULTS:\n';
            output += `✅ Total sections detected: ${result.sections?.length || 0}\n`;
            output += `💻 EMR type: ${result.emrType || 'unknown'}\n`;
            output += `📋 Note format: ${result.detectedFormat || 'unknown'}\n`;

            // Check if this is the enhanced version
            if (result.parseMetadata?.standardizedSections !== undefined) {
                output += `🎯 Standardized sections: ${result.parseMetadata.standardizedSections}\n`;
                output += `📈 Overall confidence: ${result.parseMetadata.confidence?.toFixed(2) || 'N/A'}\n`;
                output += '\n🎉 ENHANCED DETECTOR IS WORKING!\n\n';
            } else {
                output += '\n⚠️ Using original detector (enhanced features not detected)\n\n';
            }

            if (result.sections && result.sections.length > 0) {
                output += '🎯 DETECTED SECTIONS:\n';
                result.sections.forEach((section, index) => {
                    const standardizedIcon = section.metadata?.isStandardized ? '✅' : '⚪';
                    output += `${index + 1}. ${standardizedIcon} ${section.type || 'UNKNOWN'}\n`;
                    output += `   📝 Title: "${section.title || 'No title'}"\n`;
                    output += `   🎯 Confidence: ${section.confidence?.toFixed(2) || 'N/A'}\n`;
                    output += `   📊 Words: ${section.metadata?.wordCount || 0}\n`;
                    if (section.metadata?.originalSectionName) {
                        output += `   🔍 Found as: "${section.metadata.originalSectionName}"\n`;
                    }
                    output += '\n';
                });

                // Show standardized sections summary
                const standardizedSections = result.sections.filter(s => s.metadata?.isStandardized);
                if (standardizedSections.length > 0) {
                    output += '\n🏗️ STANDARDIZED SECTIONS (Perfect for Transfer of Care):\n';
                    standardizedSections.forEach(section => {
                        output += `  ✅ ${section.type} (${section.metadata?.wordCount || 0} words)\n`;
                    });
                    output += `\nFound ${standardizedSections.length} standardized sections out of ${result.sections.length} total!\n`;
                } else {
                    output += '\n📝 Note: No standardized sections detected. You may need to update to the enhanced detector.\n';
                }
            } else {
                output += '❌ No sections detected. There might be an issue with the detector.\n';
            }

            if (result.parseMetadata?.warnings?.length > 0) {
                output += '\n⚠️ WARNINGS:\n';
                result.parseMetadata.warnings.forEach(warning => {
                    output += `  - ${warning}\n`;
                });
            }

            if (result.parseMetadata?.errors?.length > 0) {
                output += '\n❌ ERRORS:\n';
                result.parseMetadata.errors.forEach(error => {
                    output += `  - ${error}\n`;
                });
            }

            output += `\n⏱️ Processing time: ${result.parseMetadata?.processingTime || 'N/A'}ms\n`;

            setResults(prev => prev + output);

        } catch (error) {
            const errorMessage = `❌ TEST FAILED: ${error.message}\n\n`;
            const troubleshooting = `🔧 TROUBLESHOOTING:\n`;
            const steps = `1. Make sure you replaced src/lib/note-processing/section-detector.ts with the enhanced version\n`;
            const steps2 = `2. The enhanced detector should export 'EnhancedSectionDetector'\n`;
            const steps3 = `3. Try refreshing the page after making changes\n`;

            setResults(prev => prev + errorMessage + troubleshooting + steps + steps2 + steps3);
            console.error('Test error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Enhanced Section Detector Test
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Test the enhanced section detector to see how many standardized sections it can find.
                    </p>

                    <button
                        onClick={runTest}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-lg font-medium"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Running Test...
                            </>
                        ) : (
                            <>
                                🧪 Run Enhanced Detector Test
                            </>
                        )}
                    </button>

                    {results && (
                        <div className="mt-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">Test Results:</h2>
                            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto">
                                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                                    {results}
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">What to Expect:</h3>
                        <div className="text-blue-800 text-sm space-y-1">
                            <p>• <strong>Enhanced detector:</strong> Should find 14+ standardized sections</p>
                            <p>• <strong>Original detector:</strong> Will only find 4-6 SOAP sections</p>
                            <p>• <strong>Standardized sections:</strong> Perfect for transfer of care (HPI, Assessment & Plan, etc.)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}