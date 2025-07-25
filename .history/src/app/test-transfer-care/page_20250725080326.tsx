'use client';

import React from 'react';
import { FileUp, Brain, Zap } from 'lucide-react';

// This is a simple test page you can add to your app to test Transfer of Care
export default function TransferOfCareTestPage() {
    const [step, setStep] = React.useState(1);
    const [noteContent, setNoteContent] = React.useState('');
    const [parseResult, setParseResult] = React.useState(null);

    // Simple note parser for testing
    const parseNote = (content) => {
        const sections = [];
        const soapHeaders = ['SUBJECTIVE:', 'OBJECTIVE:', 'ASSESSMENT:', 'PLAN:'];

        soapHeaders.forEach((header, index) => {
            const startIndex = content.toUpperCase().indexOf(header);
            if (startIndex !== -1) {
                const nextHeader = soapHeaders[index + 1];
                const endIndex = nextHeader ?
                    content.toUpperCase().indexOf(nextHeader, startIndex + 1) :
                    content.length;

                const sectionContent = content.substring(
                    startIndex + header.length,
                    endIndex > 0 ? endIndex : content.length
                ).trim();

                sections.push({
                    type: header.replace(':', ''),
                    content: sectionContent,
                    wordCount: sectionContent.split(/\s+/).length,
                    hasEpicSyntax: /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(sectionContent)
                });
            }
        });

        return {
            format: sections.length >= 3 ? 'SOAP' : 'NARRATIVE',
            emrType: /@[A-Z]|\.[-a-z]|\{[A-Za-z]|\*\*\*/.test(content) ? 'epic' : 'credible',
            sections: sections,
            confidence: sections.length >= 3 ? 0.9 : 0.6
        };
    };

    const handleAnalyze = () => {
        if (noteContent.trim()) {
            const result = parseNote(noteContent);
            setParseResult(result);
            setStep(2);
        }
    };

    const handleUploadFile = (event) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setNoteContent(content);
            };
            reader.readAsText(file);
        } else {
            alert('Please select a .txt file');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-6">
                <h1 className="text-2xl font-bold mb-2">🧪 Transfer of Care - Test Interface</h1>
                <p className="text-indigo-100">Test the note upload and parsing system with real clinical notes</p>
            </div>

            {/* Step 1: Upload/Paste Note */}
            {step === 1 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-indigo-600" />
                        Step 1: Upload or Paste Previous Note
                    </h2>

                    <div className="space-y-4">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Option 1: Upload Text File
                            </label>
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleUploadFile}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>

                        <div className="text-center text-gray-500 font-medium">OR</div>

                        {/* Paste Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Option 2: Paste Note Content
                            </label>
                            <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Paste your clinical note here...

Example:
SUBJECTIVE:
Patient is a 28-year-old female presenting for...

OBJECTIVE:
Mental Status Exam: Alert and oriented...

ASSESSMENT:
Generalized Anxiety Disorder...

PLAN:
1. Continue therapy..."
                                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {noteContent.length} characters
                            </span>
                            <button
                                onClick={handleAnalyze}
                                disabled={!noteContent.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Brain className="h-4 w-4" />
                                Analyze Note
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Analysis Results */}
            {step === 2 && parseResult && (
                <div className="space-y-6">
                    {/* Results Summary */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Brain className="h-5 w-5 text-green-600" />
                            Analysis Results
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-medium text-blue-900">Format Detected</h3>
                                <p className="text-2xl font-bold text-blue-600">{parseResult.format}</p>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg">
                                <h3 className="font-medium text-green-900">EMR Type</h3>
                                <p className="text-2xl font-bold text-green-600">{parseResult.emrType.toUpperCase()}</p>
                            </div>

                            <div className="p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-medium text-purple-900">Sections Found</h3>
                                <p className="text-2xl font-bold text-purple-600">{parseResult.sections.length}</p>
                            </div>
                        </div>

                        {/* Section Details */}
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Detected Sections:</h3>
                            <div className="space-y-3">
                                {parseResult.sections.map((section, index) => (
                                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">{section.type}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">{section.wordCount} words</span>
                                                {section.hasEpicSyntax && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Epic Syntax</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {section.content.substring(0, 150)}...
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Test Status */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <Zap className="h-6 w-6 text-green-600" />
                            <div>
                                <h3 className="font-semibold text-green-900">🎉 Test Successful!</h3>
                                <p className="text-green-700">
                                    The note was successfully parsed. In the full Transfer of Care workflow,
                                    you would now configure which sections to update and generate the updated note.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Test Again */}
                    <div className="flex justify-center">
                        <button
                            onClick={() => {
                                setStep(1);
                                setNoteContent('');
                                setParseResult(null);
                            }}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            Test Another Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}