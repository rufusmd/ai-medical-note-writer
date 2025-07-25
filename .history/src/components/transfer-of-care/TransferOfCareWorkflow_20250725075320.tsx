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
    Share2
} from 'lucide-react';

// Import our Transfer of Care components (these would be actual imports in real implementation)
// import PreviousNoteUploader from '@/components/transfer-of-care/PreviousNoteUploader';
// import SelectiveUpdater from '@/components/transfer-of-care/SelectiveUpdater';
// import ChangeHighlighter from '@/components/transfer-of-care/ChangeHighlighter';

// Mock components for demonstration
const PreviousNoteUploader = ({ onNoteProcessed, onError }: any) => (
    <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Previous Note Uploader Component</p>
        <button
            onClick={() => onNoteProcessed({ mockData: true })}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
            Simulate Upload
        </button>
    </div>
);

const SelectiveUpdater = ({ onUpdateConfigChange, onGenerateUpdate }: any) => (
    <div className="p-8 border-2 border-dashed border-purple-300 rounded-lg text-center">
        <Settings className="h-12 w-12 text-purple-400 mx-auto mb-4" />
        <p className="text-gray-600">Selective Updater Component</p>
        <button
            onClick={onGenerateUpdate}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
            Simulate Generation
        </button>
    </div>
);

const ChangeHighlighter = ({ updatedNote }: any) => (
    <div className="p-8 border-2 border-dashed border-emerald-300 rounded-lg text-center">
        <Sparkles className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <p className="text-gray-600">Change Highlighter Component</p>
        <p className="text-sm text-emerald-600 mt-2">Showing changes for Transfer of Care</p>
    </div>
);

type WorkflowStep = 'upload' | 'configure' | 'generate' | 'review' | 'complete';

interface TransferOfCareWorkflowProps {
    initialContext?: any;
    onComplete?: (result: any) => void;
    onCancel?: () => void;
}

export default function TransferOfCareWorkflow({
    initialContext,
    onComplete,
    onCancel
}: TransferOfCareWorkflowProps) {
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [parsedNote, setParsedNote] = useState<any>(null);
    const [updateConfigs, setUpdateConfigs] = useState<any[]>([]);
    const [generationResult, setGenerationResult] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Clinical context (could come from props or global state)
    const [clinicalContext] = useState(initialContext || {
        clinic: 'Davis Behavioral Health',
        visitType: 'transfer-of-care',
        emr: 'credible',
        generationSettings: {
            includeEpicSyntax: false,
            comprehensiveIntake: false,
            updateHPI: true,
            generateAssessment: true,
            updatePlan: true
        }
    });

    // Step definitions
    const steps = [
        { key: 'upload', title: 'Upload Previous Note', icon: FileText },
        { key: 'configure', title: 'Configure Updates', icon: Settings },
        { key: 'generate', title: 'Generate Updated Note', icon: Sparkles },
        { key: 'review', title: 'Review Changes', icon: CheckCircle2 },
        { key: 'complete', title: 'Complete', icon: Save }
    ];

    // Handle note upload and parsing
    const handleNoteProcessed = useCallback((parsed: any) => {
        console.log('📝 Note processed:', parsed);
        setParsedNote(parsed);
        setCurrentStep('configure');
        setError(null);
    }, []);

    // Handle upload errors
    const handleUploadError = useCallback((errorMessage: string) => {
        console.error('❌ Upload error:', errorMessage);
        setError(errorMessage);
    }, []);

    // Handle update configuration changes
    const handleUpdateConfigChange = useCallback((configs: any[]) => {
        console.log('⚙️ Update configs changed:', configs);
        setUpdateConfigs(configs);
    }, []);

    // Handle note generation
    const handleGenerateUpdate = useCallback(async () => {
        if (!parsedNote || updateConfigs.length === 0) {
            setError('Missing parsed note or update configuration');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            console.log('🤖 Starting Transfer of Care generation...');

            // Simulate API call to /api/transfer-of-care
            const response = await fetch('/api/transfer-of-care', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    previousNote: parsedNote.originalContent,
                    newTranscript: 'Mock transcript for demonstration',
                    clinicalContext,
                    updateConfigs,
                    patientContext: { age: 28, gender: 'female' }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Generation failed');
            }

            console.log('✅ Generation successful:', result);
            setGenerationResult(result);
            setCurrentStep('review');

        } catch (error) {
            console.error('❌ Generation error:', error);
            setError(error instanceof Error ? error.message : 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    }, [parsedNote, updateConfigs, clinicalContext]);

    // Handle workflow completion
    const handleComplete = useCallback(() => {
        if (generationResult && onComplete) {
            onComplete(generationResult);
        }
        setCurrentStep('complete');
    }, [generationResult, onComplete]);

    // Go to previous step
    const goToPreviousStep = () => {
        const stepIndex = steps.findIndex(s => s.key === currentStep);
        if (stepIndex > 0) {
            setCurrentStep(steps[stepIndex - 1].key as WorkflowStep);
        }
    };

    // Get step status
    const getStepStatus = (stepKey: string) => {
        const stepIndex = steps.findIndex(s => s.key === stepKey);
        const currentIndex = steps.findIndex(s => s.key === currentStep);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Transfer of Care Workflow</h1>
                        <p className="text-gray-600 mt-1">
                            Intelligently update existing notes while preserving important information
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Clinical Context</p>
                        <p className="font-medium text-gray-900">{clinicalContext.clinic}</p>
                        <p className="text-sm text-gray-600">{clinicalContext.visitType.replace('-', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const status = getStepStatus(step.key);
                        const StepIcon = step.icon;

                        return (
                            <div key={step.key} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                        ${status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                                            status === 'current' ? 'bg-indigo-600 border-indigo-600 text-white' :
                                                'bg-gray-100 border-gray-300 text-gray-400'}
                                    `}>
                                        {status === 'completed' ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <StepIcon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <p className={`
                                        text-xs mt-2 text-center max-w-20
                                        ${status === 'current' ? 'text-indigo-600 font-medium' : 'text-gray-600'}
                                    `}>
                                        {step.title}
                                    </p>
                                </div>

                                {index < steps.length - 1 && (
                                    <div className={`
                                        w-16 h-0.5 mx-4 
                                        ${getStepStatus(steps[index + 1].key) !== 'upcoming' ? 'bg-green-300' : 'bg-gray-300'}
                                    `} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-900">Error</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-96">
                {/* Step 1: Upload Previous Note */}
                {currentStep === 'upload' && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Previous Note</h2>
                            <p className="text-gray-600">
                                Provide the existing clinical note that you want to update for the Transfer of Care.
                            </p>
                        </div>
                        <PreviousNoteUploader
                            onNoteProcessed={handleNoteProcessed}
                            onError={handleUploadError}
                        />
                    </div>
                )}

                {/* Step 2: Configure Updates */}
                {currentStep === 'configure' && parsedNote && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Configure Section Updates</h2>
                            <p className="text-gray-600">
                                Choose which sections to update and which to preserve from the original note.
                            </p>
                        </div>
                        <SelectiveUpdater
                            parsedNote={parsedNote}
                            newTranscript="Mock transcript content"
                            clinicalContext={clinicalContext}
                            onUpdateConfigChange={handleUpdateConfigChange}
                            onGenerateUpdate={handleGenerateUpdate}
                        />
                    </div>
                )}

                {/* Step 3: Generate Updated Note */}
                {currentStep === 'generate' && (
                    <div className="p-6">
                        <div className="text-center py-12">
                            {isGenerating ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Updated Note</h2>
                                    <p className="text-gray-600">
                                        AI is processing your Transfer of Care updates...
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-16 w-16 text-indigo-600 mx-auto mb-6" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate</h2>
                                    <p className="text-gray-600 mb-6">
                                        Click the button below to generate your updated clinical note.
                                    </p>
                                    <button
                                        onClick={handleGenerateUpdate}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Generate Updated Note
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Review Changes */}
                {currentStep === 'review' && generationResult && (
                    <div className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Changes</h2>
                            <p className="text-gray-600">
                                Review the changes made to your clinical note and ensure accuracy.
                            </p>
                        </div>
                        <ChangeHighlighter
                            originalNote={generationResult.originalNote}
                            updatedNote={generationResult.updatedNote}
                            validation={generationResult.validation}
                            performance={generationResult.performance}
                            clinicalContext={clinicalContext}
                        />
                    </div>
                )}

                {/* Step 5: Complete */}
                {currentStep === 'complete' && (
                    <div className="p-6">
                        <div className="text-center py-12">
                            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Transfer of Care Complete!</h2>
                            <p className="text-gray-600 mb-6">
                                Your clinical note has been successfully updated. You can now use it in your clinical workflow.
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setCurrentStep('upload')}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Start New Transfer
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    Save & Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
                <div>
                    {currentStep !== 'upload' && currentStep !== 'complete' && (
                        <button
                            onClick={goToPreviousStep}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Previous Step
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}

                    {currentStep === 'review' && generationResult && (
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Accept Changes
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Debug Info (development only) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono">
                    <h3 className="font-bold mb-2">Debug Info:</h3>
                    <div>Current Step: {currentStep}</div>
                    <div>Parsed Note: {parsedNote ? '✅' : '❌'}</div>
                    <div>Update Configs: {updateConfigs.length}</div>
                    <div>Generation Result: {generationResult ? '✅' : '❌'}</div>
                </div>
            )}
        </div>
    );
}