import React, { useState, useEffect } from 'react';
import {
    Eye,
    EyeOff,
    Download,
    Copy,
    CheckCircle2,
    ArrowRightLeft,
    FileText,
    Zap,
    Info,
    Clock,
    User,
    Sparkles,
    ChevronDown,
    ChevronUp,
    AlertTriangle
} from 'lucide-react';

interface SectionChange {
    sectionType: string;
    action: 'updated' | 'preserved' | 'merged' | 'added';
    originalContent: string;
    newContent: string;
    changeReason: string;
    confidence: number;
}

interface ChangeHighlighterProps {
    originalNote: {
        content: string;
        parsedSections: any[];
        parseMetadata: any;
    };
    updatedNote: {
        content: string;
        sectionsUpdated: string[];
        sectionsPreserved: string[];
        changes: SectionChange[];
    };
    validation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        score: number;
    };
    performance: {
        parseTime: number;
        generationTime: number;
        totalTime: number;
    };
    clinicalContext: any;
}

export default function ChangeHighlighter({
    originalNote,
    updatedNote,
    validation,
    performance,
    clinicalContext
}: ChangeHighlighterProps) {
    const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'changes-only'>('side-by-side');
    const [showMetadata, setShowMetadata] = useState(true);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
    const [copiedContent, setCopiedContent] = useState<string | null>(null);

    // Auto-expand sections with changes
    useEffect(() => {
        const changedSections = updatedNote.changes
            .filter(change => change.action !== 'preserved')
            .reduce((acc, change) => {
                acc[change.sectionType] = true;
                return acc;
            }, {} as { [key: string]: boolean });

        setExpandedSections(changedSections);
    }, [updatedNote.changes]);

    // Copy content to clipboard
    const copyToClipboard = async (content: string, label: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedContent(label);
            setTimeout(() => setCopiedContent(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // Toggle section expansion
    const toggleSection = (sectionType: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionType]: !prev[sectionType]
        }));
    };

    // Get action color
    const getActionColor = (action: string) => {
        switch (action) {
            case 'updated': return 'text-blue-600 bg-blue-50';
            case 'preserved': return 'text-gray-600 bg-gray-50';
            case 'merged': return 'text-purple-600 bg-purple-50';
            case 'added': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    // Get action icon
    const getActionIcon = (action: string) => {
        switch (action) {
            case 'updated': return <Sparkles className="h-4 w-4" />;
            case 'preserved': return <Eye className="h-4 w-4" />;
            case 'merged': return <ArrowRightLeft className="h-4 w-4" />;
            case 'added': return <CheckCircle2 className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    // Calculate statistics
    const stats = {
        totalSections: updatedNote.changes.length,
        updatedSections: updatedNote.changes.filter(c => c.action === 'updated').length,
        preservedSections: updatedNote.changes.filter(c => c.action === 'preserved').length,
        mergedSections: updatedNote.changes.filter(c => c.action === 'merged').length,
        avgConfidence: updatedNote.changes.reduce((sum, c) => sum + c.confidence, 0) / updatedNote.changes.length
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <ArrowRightLeft className="h-6 w-6" />
                        <div>
                            <h3 className="text-lg font-semibold">Transfer of Care - Change Analysis</h3>
                            <p className="text-emerald-100 text-sm">
                                Review changes between original and updated note
                            </p>
                        </div>
                    </div>
                    <div className="text-white text-right">
                        <p className="text-sm opacity-90">Processing Time</p>
                        <p className="font-semibold">{performance.totalTime}ms</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.updatedSections}</p>
                        <p className="text-sm text-blue-700">Updated</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-600">{stats.preservedSections}</p>
                        <p className="text-sm text-gray-700">Preserved</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-600">{stats.mergedSections}</p>
                        <p className="text-sm text-purple-700">Merged</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-emerald-600">{Math.round(stats.avgConfidence * 100)}%</p>
                        <p className="text-sm text-emerald-700">Avg. Confidence</p>
                    </div>
                </div>

                {/* Validation Status */}
                {(!validation.isValid || validation.warnings.length > 0) && (
                    <div className="space-y-3">
                        {!validation.isValid && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <span className="font-medium text-red-900">Validation Issues</span>
                                </div>
                                <ul className="text-red-700 text-sm space-y-1">
                                    {validation.errors.map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {validation.warnings.length > 0 && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="h-4 w-4 text-yellow-600" />
                                    <span className="font-medium text-yellow-900">Warnings</span>
                                </div>
                                <ul className="text-yellow-700 text-sm space-y-1">
                                    {validation.warnings.map((warning, index) => (
                                        <li key={index}>• {warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* View Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h4 className="font-medium text-gray-900">View Mode:</h4>
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                            {[
                                { key: 'side-by-side', label: 'Side by Side' },
                                { key: 'unified', label: 'Unified' },
                                { key: 'changes-only', label: 'Changes Only' }
                            ].map((mode) => (
                                <button
                                    key={mode.key}
                                    onClick={() => setViewMode(mode.key as any)}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === mode.key
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMetadata(!showMetadata)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            {showMetadata ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {showMetadata ? 'Hide' : 'Show'} Metadata
                        </button>

                        <button
                            onClick={() => copyToClipboard(updatedNote.content, 'Updated Note')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            {copiedContent === 'Updated Note' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                            {copiedContent === 'Updated Note' ? 'Copied!' : 'Copy Updated Note'}
                        </button>
                    </div>
                </div>

                {/* Section-by-Section Changes */}
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Section Changes
                    </h4>

                    {updatedNote.changes.map((change, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div
                                className={`p-4 cursor-pointer transition-colors ${getActionColor(change.action)}`}
                                onClick={() => toggleSection(change.sectionType)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getActionIcon(change.action)}
                                        <div>
                                            <h5 className="font-medium">{change.sectionType}</h5>
                                            <p className="text-sm opacity-80">{change.changeReason}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {showMetadata && (
                                            <div className="text-xs text-right">
                                                <div className="font-medium">{Math.round(change.confidence * 100)}% confidence</div>
                                                <div className="opacity-75">{change.action}</div>
                                            </div>
                                        )}
                                        {expandedSections[change.sectionType] ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {expandedSections[change.sectionType] && (
                                <div className="border-t border-gray-200">
                                    {/* Side by Side View */}
                                    {viewMode === 'side-by-side' && change.action !== 'preserved' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
                                            <div className="p-4 bg-red-50">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">ORIGINAL</span>
                                                </div>
                                                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                    {change.originalContent || 'No previous content'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-green-50">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">UPDATED</span>
                                                </div>
                                                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                    {change.newContent}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unified View */}
                                    {viewMode === 'unified' && (
                                        <div className="p-4">
                                            {change.action === 'preserved' ? (
                                                <div className="bg-gray-50 p-3 rounded">
                                                    <div className="text-xs font-medium text-gray-600 mb-2">PRESERVED CONTENT</div>
                                                    <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                        {change.originalContent}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {change.originalContent && (
                                                        <div className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                                                            <div className="text-xs font-medium text-red-700 mb-2">- REMOVED</div>
                                                            <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono line-through opacity-75">
                                                                {change.originalContent}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                                                        <div className="text-xs font-medium text-green-700 mb-2">+ ADDED</div>
                                                        <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                            {change.newContent}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Changes Only View */}
                                    {viewMode === 'changes-only' && change.action !== 'preserved' && (
                                        <div className="p-4">
                                            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                                                <div className="text-xs font-medium text-blue-700 mb-2">
                                                    {change.action.toUpperCase()} CONTENT
                                                </div>
                                                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                    {change.newContent}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Preserved Section View */}
                                    {change.action === 'preserved' && (
                                        <div className="p-4 bg-gray-50">
                                            <div className="text-center text-gray-600 py-4">
                                                <Eye className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Section preserved - no changes made</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Performance Metadata */}
                {showMetadata && (
                    <div className="border-t border-gray-200 pt-6">
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-600" />
                            Processing Metadata
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h5 className="font-medium text-gray-900 mb-2">Performance</h5>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div>Parse Time: {performance.parseTime}ms</div>
                                    <div>Generation: {performance.generationTime}ms</div>
                                    <div>Total: {performance.totalTime}ms</div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h5 className="font-medium text-gray-900 mb-2">Clinical Context</h5>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div>Clinic: {clinicalContext.clinic}</div>
                                    <div>Visit Type: {clinicalContext.visitType}</div>
                                    <div>EMR: {clinicalContext.emr}</div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h5 className="font-medium text-gray-900 mb-2">Quality Metrics</h5>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div>Validation Score: {validation.score}/100</div>
                                    <div>Status: {validation.isValid ? 'Valid' : 'Issues Found'}</div>
                                    <div>Warnings: {validation.warnings.length}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        Transfer of Care completed successfully with {stats.updatedSections} section updates
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => copyToClipboard(originalNote.content, 'Original Note')}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {copiedContent === 'Original Note' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                            {copiedContent === 'Original Note' ? 'Copied!' : 'Copy Original'}
                        </button>

                        <button
                            onClick={() => {
                                const changesSummary = updatedNote.changes
                                    .filter(c => c.action !== 'preserved')
                                    .map(c => `${c.sectionType}: ${c.action}`)
                                    .join('\n');
                                copyToClipboard(changesSummary, 'Changes Summary');
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                            {copiedContent === 'Changes Summary' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {copiedContent === 'Changes Summary' ? 'Copied!' : 'Export Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}