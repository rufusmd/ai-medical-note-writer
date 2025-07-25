'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    Upload,
    FileText,
    Clipboard,
    CheckCircle2,
    AlertTriangle,
    Info,
    Eye,
    Settings,
    Zap,
    FileUp,
    Type,
    Brain,
    ArrowRight
} from 'lucide-react';

// Mock the section detector (in real implementation, import from the actual file)
const mockSectionDetector = {
    parseNote: (content: string) => ({
        originalContent: content,
        detectedFormat: content.includes('SUBJECTIVE:') ? 'SOAP' : 'NARRATIVE',
        emrType: content.includes('@') ? 'epic' : 'credible',
        sections: [
            { type: 'SUBJECTIVE', title: 'SUBJECTIVE:', content: 'Patient reports...', startIndex: 0, endIndex: 100, confidence: 0.9, metadata: { hasEpicSyntax: content.includes('@'), wordCount: 20, isEmpty: false, clinicalTerms: ['anxiety'] } },
            { type: 'OBJECTIVE', title: 'OBJECTIVE:', content: 'Mental status exam...', startIndex: 101, endIndex: 200, confidence: 0.9, metadata: { hasEpicSyntax: content.includes('@'), wordCount: 25, isEmpty: false, clinicalTerms: ['mental status'] } },
            { type: 'ASSESSMENT', title: 'ASSESSMENT:', content: 'GAD, moderate severity', startIndex: 201, endIndex: 250, confidence: 0.8, metadata: { hasEpicSyntax: false, wordCount: 10, isEmpty: false, clinicalTerms: ['GAD'] } },
            { type: 'PLAN', title: 'PLAN:', content: 'CBT referral, follow-up', startIndex: 251, endIndex: 300, confidence: 0.8, metadata: { hasEpicSyntax: false, wordCount: 12, isEmpty: false, clinicalTerms: ['CBT'] } }
        ],
        parseMetadata: {
            totalSections: 4,
            confidence: 0.85,
            processingTime: 45,
            errors: [],
            warnings: []
        }
    })
};

interface PreviousNoteUploaderProps {
    onNoteProcessed: (parsedNote: any) => void;
    onError: (error: string) => void;
}

export default function PreviousNoteUploader({ onNoteProcessed, onError }: PreviousNoteUploaderProps) {
    const [uploadMethod, setUploadMethod] = useState<'paste' | 'file' | null>(null);
    const [noteContent, setNoteContent] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedNote, setParsedNote] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [fileName, setFileName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Handle file upload
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setNoteContent(content);
                processNoteContent(content);
            };
            reader.readAsText(file);
        } else {
            onError('Please upload a text file (.txt). Other formats are not yet supported.');
        }
    }, [onError]);

    // Handle paste method
    const handlePasteMethod = () => {
        setUploadMethod('paste');
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
    };

    // Process note content using section detector
    const processNoteContent = async (content: string) => {
        if (!content.trim()) {
            onError('Please provide note content to process.');
            return;
        }

        setIsProcessing(true);

        try {
            // Simulate processing time for demo
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Use mock section detector (replace with real implementation)
            const parsed = mockSectionDetector.parseNote(content);

            setParsedNote(parsed);
            onNoteProcessed(parsed);

        } catch (error) {
            onError(`Failed to process note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle textarea content change
    const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const content = event.target.value;
        setNoteContent(content);

        // Auto-process if content is substantial
        if (content.length > 100 && !isProcessing) {
            const timeoutId = setTimeout(() => {
                processNoteContent(content);
            }, 2000); // Debounced processing

            return () => clearTimeout(timeoutId);
        }
    };

    // Get confidence color
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600';
        if (confidence >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Get EMR badge color
    const getEMRBadgeColor = (emrType: string) => {
        return emrType === 'epic' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center gap-3 text-white">
                    <FileUp className="h-6 w-6" />
                    <div>
                        <h3 className="text-lg font-semibold">Previous Note Upload</h3>
                        <p className="text-indigo-100 text-sm">
                            Upload or paste the existing note for Transfer of Care processing
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Upload Method Selection */}
                {!uploadMethod && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-gray-600 mb-6">
                                Choose how you'd like to provide the previous clinical note:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Paste Method */}
                            <button
                                onClick={handlePasteMethod}
                                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                        <Clipboard className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Paste Text</h4>
                                        <p className="text-gray-600 text-sm">
                                            Copy and paste the note content directly from your EMR or document
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-indigo-600 text-sm font-medium">
                                            <Type className="h-4 w-4" />
                                            Quick & Easy
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {/* File Upload Method */}
                            <button
                                onClick={() => {
                                    setUploadMethod('file');
                                    fileInputRef.current?.click();
                                }}
                                className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                        <Upload className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Upload File</h4>
                                        <p className="text-gray-600 text-sm">
                                            Upload a text file (.txt) containing the clinical note
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
                                            <FileText className="h-4 w-4" />
                                            From File System
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,text/plain"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Paste Interface */}
                {uploadMethod === 'paste' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">Paste Note Content</h4>
                            <button
                                onClick={() => {
                                    setUploadMethod(null);
                                    setNoteContent('');
                                    setParsedNote(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Change Method
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={noteContent}
                            onChange={handleTextareaChange}
                            placeholder="Paste the previous clinical note here...

Example:
SUBJECTIVE:
Patient is a 28-year-old presenting for...

OBJECTIVE: 
Mental Status Exam: Alert and oriented...

ASSESSMENT:
Generalized Anxiety Disorder...

PLAN:
1. Continue current medications..."
                            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical font-mono text-sm"
                        />

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => processNoteContent(noteContent)}
                                disabled={!noteContent.trim() || isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Brain className="h-4 w-4" />
                                        Analyze Note
                                    </>
                                )}
                            </button>

                            <span className="text-sm text-gray-500">
                                {noteContent.length} characters
                            </span>
                        </div>
                    </div>
                )}

                {/* File Upload Interface */}
                {uploadMethod === 'file' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">File Upload</h4>
                            <button
                                onClick={() => {
                                    setUploadMethod(null);
                                    setNoteContent('');
                                    setParsedNote(null);
                                    setFileName('');
                                }}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Change Method
                            </button>
                        </div>

                        {fileName ? (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-900">File uploaded successfully</p>
                                        <p className="text-green-700 text-sm">{fileName}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-2">Click to upload a text file</p>
                                <p className="text-gray-500 text-sm">Supported: .txt files</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Processing Status */}
                {isProcessing && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <div>
                                <p className="font-medium text-blue-900">Processing Note</p>
                                <p className="text-blue-700 text-sm">Analyzing structure and detecting sections...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Parsed Results */}
                {parsedNote && !isProcessing && (
                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">Analysis Results</h4>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                            >
                                <Eye className="h-4 w-4" />
                                {showPreview ? 'Hide' : 'Show'} Details
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Format Detection */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Format</span>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{parsedNote.detectedFormat}</p>
                                <p className="text-xs text-gray-500">{parsedNote.sections.length} sections detected</p>
                            </div>

                            {/* EMR Type */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">EMR Type</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEMRBadgeColor(parsedNote.emrType)}`}>
                                        {parsedNote.emrType.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {parsedNote.emrType === 'epic' ? 'Contains Epic syntax' : 'Plain text format'}
                                </p>
                            </div>

                            {/* Confidence */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Confidence</span>
                                </div>
                                <p className={`text-lg font-semibold ${getConfidenceColor(parsedNote.parseMetadata.confidence)}`}>
                                    {Math.round(parsedNote.parseMetadata.confidence * 100)}%
                                </p>
                                <p className="text-xs text-gray-500">
                                    {parsedNote.parseMetadata.processingTime}ms processing
                                </p>
                            </div>
                        </div>

                        {/* Section Preview */}
                        {showPreview && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Detected Sections</h5>
                                <div className="space-y-3">
                                    {parsedNote.sections.map((section: any, index: number) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-gray-900">{section.type}</span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`px-2 py-1 rounded ${getConfidenceColor(section.confidence)} bg-opacity-10`}>
                                                        {Math.round(section.confidence * 100)}%
                                                    </span>
                                                    {section.metadata.hasEpicSyntax && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Epic</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {section.content.substring(0, 150)}...
                                            </p>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                                <span>{section.metadata.wordCount} words</span>
                                                <span>{section.metadata.clinicalTerms.length} clinical terms</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success Message & Next Steps */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <p className="font-medium text-green-900">Note processed successfully!</p>
                            </div>
                            <p className="text-green-700 text-sm mb-3">
                                The note has been parsed into {parsedNote.sections.length} sections.
                                You can now proceed to selective updating.
                            </p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                                <ArrowRight className="h-4 w-4" />
                                Continue to Section Selection
                            </button>
                        </div>

                        {/* Warnings */}
                        {parsedNote.parseMetadata.warnings.length > 0 && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <span className="font-medium text-yellow-900">Warnings</span>
                                </div>
                                <ul className="text-yellow-700 text-sm space-y-1">
                                    {parsedNote.parseMetadata.warnings.map((warning: string, index: number) => (
                                        <li key={index}>• {warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}