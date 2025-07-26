// src/components/transfer-of-care/CompleteTransferWorkflow.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    FileText,
    Settings,
    Sparkles,
    AlertTriangle,
    RefreshCw,
    ArrowLeft,
    Save,
    Copy,
    Download,
    Eye
} from 'lucide-react';

// Import our enhanced components
import { EnhancedSectionDetector, EnhancedParsedNote } from '@/lib/note-processing/enhanced-section-detector';
import { callTransferOfCareAPI } from '@/app/api/transfer-of-care-update/route';

interface CompleteTransferWorkflowProps {
    initialTranscript?: string;
    clinicalContext: {
        clinic: string;
        emr: 'epic' | 'credible';
        visitType: string;
    };
    userId: string;
    patientId: string;
    onComplete?: (result: any) => void;
    onCancel?: () => void;
}

type WorkflowStep = 'upload' | 'configure' | 'generate' | 'review' | 'complete';

export default function CompleteTransferWorkflow({
    initialTranscript = '',
    clinicalContext,
    userId,
    patientId,
    onComplete,
    onCancel
}: CompleteTransferWorkflowProps) {
    // State management
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [previousNote, setPreviousNote] = useState<string>('');
    const [newTranscript, setNewTranscript] = useState<string>(initialTranscript);
    const [parsedNote, setParsedNote] = useState<EnhancedParsedNote | null>(null);
    const [sectionsToUpdate, setSectionsToUpdate] = useState<string[]>([]);
    const [sectionsToPreserve, setSectionsToPreserve] = useState<string[]>([]);
    const [updatedNote, setUpdatedNote] = useState<string>('');
    const [updateMetadata, setUpdateMetadata] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Upload and parse previous note
    const handleNoteUpload = useCallback((noteContent: string) => {
        try {
            console.log('📋 Parsing uploaded note...');
            const parsed = EnhancedSectionDetector.parseNote(noteContent);

            if (parsed.sections.length === 0) {
                setError('Could not parse any sections from the uploaded note. Please check the format.');
                return;
            }

            setPreviousNote(noteContent);
            setParsedNote(parsed);
            setError(null);

            console.log(`✅ Successfully parsed ${parsed.sections.length} sections`);
            console.log('📊 Detected sections:', parsed.sections.map(s => s.type).join(', '));

            // Auto-advance to configuration
            setCurrentStep('configure');

        } catch (err) {
            console.error('❌ Error parsing note:', err);
            setError('Failed to parse the uploaded note. Please try again.');
        }
    }, []);

    // Step 2: Configure section updates
    const handleSectionConfiguration = useCallback((
        selectedSections: string[],
        allSections: string[]
    ) => {
        const toUpdate = selectedSections;
        const toPreserve = allSections.filter(s => !selectedSections.includes(s));

        setSectionsToUpdate(toUpdate);
        setSectionsToPreserve(toPreserve);

        console.log(`🔄 Configuration set: ${toUpdate.length} to update, ${toPreserve.length} to preserve`);
    }, []);

    // Step 3: Generate updated note
    const handleGenerateUpdate = useCallback(async () => {
        if (!parsedNote || !previousNote || !newTranscript.trim()) {
            setError('Missing required information for note generation');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('🚀 Generating updated note...');
            console.log(`📝 Updating sections: ${sectionsToUpdate.join(', ')}`);
            console.log(`🔒 Preserving sections: ${sectionsToPreserve.join(', ')}`);

            const result = await callTransferOfCareAPI(
                previousNote,
                newTranscript,
                sectionsToUpdate,
                sectionsToPreserve,
                clinicalContext,
                userId,
                patientId,
                'constrained' // Use constrained approach for reliability
            );

            if (result.success) {
                setUpdatedNote(result.updatedNote);
                setUpdateMetadata(result.metadata);
                setCurrentStep('review');

                console.log('✅ Note generation successful!');
                console.log(`📊 Validation score: ${result.metadata.validation.overall_quality}/10`);
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (err) {
            console.error('❌ Error generating note:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate updated note');
        } finally {
            setIsLoading(false);
        }
    }, [parsedNote, previousNote, newTranscript, sectionsToUpdate, sectionsToPreserve, clinicalContext, userId, patientId]);

    // Step 4: Complete workflow
    const handleComplete = useCallback(() => {
        const result = {
            updatedNote,
            metadata: updateMetadata,
            sectionsUpdated: sectionsToUpdate,
            sectionsPreserved: sectionsToPreserve,
            clinicalContext
        };

        setCurrentStep('complete');
        onComplete?.(result);
    }, [updatedNote, updateMetadata, sectionsToUpdate, sectionsToPreserve, clinicalContext, onComplete]);

    // Copy note to clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(updatedNote);
            // You could add a toast notification here
            console.log('📋 Note copied to clipboard');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    // Step indicator
    const steps = [
        { key: 'upload', title: 'Upload Note', icon: FileText },
        { key: 'configure', title: 'Configure Updates', icon: Settings },
        { key: 'generate', title: 'Generate', icon: Sparkles },
        { key: 'review', title: 'Review', icon: Eye },
        { key: 'complete', title: 'Complete', icon: CheckCircle2 }
    ];

    const currentStepIndex = steps.findIndex(step => step.key === currentStep);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header with progress */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Transfer of Care Note Update</h1>
                        <p className="text-gray-600">Update specific sections while preserving the rest</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Visit Type</p>
                        <p className="font-semibold text-gray-900">{clinicalContext.visitType}</p>
                        <p className="text-sm text-gray-500">{clinicalContext.clinic} • {clinicalContext.emr.toUpperCase()}</p>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStepIndex;
                        const isCompleted = index < currentStepIndex;

                        return (
                            <div key={step.key} className="flex items-center">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isActive
                                        ? 'bg-purple-100 text-purple-700'
                                        : isCompleted
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-400'
                                    }`}>
                                    <StepIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{step.title}</span>
                                </div>
                                {index < steps.length - 1 && (
                                    <ArrowRight className="h-4 w-4 text-gray-300 mx-2" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-900">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                </div>
            )}

            {/* Step content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Step 1: Upload Previous Note */}
                {currentStep === 'upload' && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Previous Note</h2>
                            <p className="text-gray-600">
                                Paste or upload the previous resident's note to begin the transfer of care process.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Previous Note Content
                                </label>
                                <textarea
                                    value={previousNote}
                                    onChange={(e) => setPreviousNote(e.target.value)}
                                    className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Paste the previous resident's note here..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Clinical Information
                                </label>
                                <textarea
                                    value={newTranscript}
                                    onChange={(e) => setNewTranscript(e.target.value)}
                                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter new clinical information from this visit..."
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    onClick={onCancel}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleNoteUpload(previousNote)}
                                    disabled={!previousNote.trim() || !newTranscript.trim()}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    Parse Note
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Configure Updates (Use your ImprovedSelectiveUpdater component here) */}
                {currentStep === 'configure' && parsedNote && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Configure Section Updates</h2>
                            <p className="text-gray-600">
                                Successfully parsed {parsedNote.sections.length} sections. Choose which sections to update.
                            </p>
                        </div>

                        {/* This would be your ImprovedSelectiveUpdater component */}
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">ImprovedSelectiveUpdater component would go here</p>
                            <p className="text-sm text-gray-500 mb-4">
                                Sections detected: {parsedNote.sections.map(s => s.type).join(', ')}
                            </p>

                            {/* Temporary controls for demo */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => {
                                        // Set some default selections for demo
                                        const allSectionTypes = parsedNote.sections.map(s => s.type);
                                        const defaultUpdates = ['HPI', 'ASSESSMENT_AND_PLAN', 'MEDICATIONS_PLAN', 'FOLLOW_UP'];
                                        handleSectionConfiguration(defaultUpdates, allSectionTypes);
                                        setCurrentStep('generate');
                                    }}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                                >
                                    Use Default Selection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Generate Updated Note */}
                {currentStep === 'generate' && (
                    <div className="p-6">
                        <div className="text-center py-12">
                            {isLoading ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Updated Note</h2>
                                    <p className="text-gray-600">
                                        AI is updating {sectionsToUpdate.length} sections while preserving {sectionsToPreserve.length} sections...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-16 w-16 text-purple-600 mx-auto mb-6" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate</h2>
                                    <p className="text-gray-600 mb-6">
                                        Will update: {sectionsToUpdate.join(', ')}
                                    </p>
                                    <p className="text-gray-600 mb-6">
                                        Will preserve: {sectionsToPreserve.join(', ')}
                                    </p>

                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            onClick={() => setCurrentStep('configure')}
                                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Back to Configure
                                        </button>
                                        <button
                                            onClick={handleGenerateUpdate}
                                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 text-lg"
                                        >
                                            <Sparkles className="h-5 w-5" />
                                            Generate Updated Note
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Review Updated Note */}
                {currentStep === 'review' && updatedNote && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Updated Note</h2>
                            <p className="text-gray-600">
                                Review the updated note and make any final adjustments.
                            </p>

                            {/* Validation results */}
                            {updateMetadata?.validation && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span className="font-medium text-green-900">
                                            Validation Score: {updateMetadata.validation.overall_quality}/10
                                        </span>
                                    </div>
                                    <p className="text-green-700 text-sm">
                                        Updated {updateMetadata.sectionsUpdated} sections, preserved {updateMetadata.sectionsPreserved} sections
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Updated Clinical Note
                                </label>
                                <textarea
                                    value={updatedNote}
                                    onChange={(e) => setUpdatedNote(e.target.value)}
                                    className="w-full h-96 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setCurrentStep('configure')}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Reconfigure
                                    </button>
                                    <button
                                        onClick={copyToClipboard}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </button>
                                </div>

                                <button
                                    onClick={handleComplete}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Complete Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Complete */}
                {currentStep === 'complete' && (
                    <div className="p-6 text-center py-12">
                        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Transfer of Care Complete!</h2>
                        <p className="text-gray-600 mb-6">
                            Your note has been successfully updated with the new clinical information.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setCurrentStep('review')}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Review Again
                            </button>
                            <button
                                onClick={onComplete}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}