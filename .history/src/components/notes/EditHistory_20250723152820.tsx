// src/components/notes/EditHistory.tsx
// ✨ NEW COMPONENT: Edit history sidebar

'use client';

import React, { useState, useEffect } from 'react';

// Simplified types for now to avoid circular imports
interface NoteVersion {
    id: string;
    content: string;
    timestamp: Date;
    changes: any[];
    userId: string;
    analytics: {
        totalChanges: number;
        editTime: number;
        keystrokesPerMinute: number;
        changesBySection: Record<string, number>;
    };
}

interface EditHistoryProps {
    noteId: string;
    editHistory: NoteVersion[];
    onRevertToVersion: (version: NoteVersion) => void;
}

export function EditHistory({
    noteId,
    editHistory: initialHistory,
    onRevertToVersion
}: EditHistoryProps) {
    const [history, setHistory] = useState<NoteVersion[]>(initialHistory);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

    // Load edit history from API
    useEffect(() => {
        loadEditHistory();
    }, [noteId]);

    const loadEditHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/notes/${noteId}`);
            const data = await response.json();

            if (response.ok && data.note.versions) {
                setHistory(data.note.versions);
            }
        } catch (error) {
            console.error('Error loading edit history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: Date) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const getChangesSummary = (version: NoteVersion) => {
        const { analytics } = version;
        return {
            total: analytics.totalChanges,
            sections: Object.keys(analytics.changesBySection).length,
            topSection: Object.entries(analytics.changesBySection)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown'
        };
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Edit History</h3>
                <p className="text-sm text-gray-500">{history.length} versions</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {history.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No edit history yet
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {history.map((version, index) => {
                            const summary = getChangesSummary(version);
                            const isSelected = selectedVersion === version.id;

                            return (
                                <div
                                    key={version.id}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                                        }`}
                                    onClick={() => setSelectedVersion(isSelected ? null : version.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <span className="text-sm font-medium text-gray-900">
                                                    Version {history.length - index}
                                                </span>
                                                {index === 0 && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-1 text-sm text-gray-500">
                                                {formatTimestamp(version.timestamp)}
                                            </div>

                                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                                <span>{summary.total} changes</span>
                                                <span>{summary.sections} sections</span>
                                                <span>Focus: {summary.topSection}</span>
                                            </div>
                                        </div>

                                        <div className="ml-2 flex items-center space-x-2">
                                            {index > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRevertToVersion(version);
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                    title="Revert to this version"
                                                >
                                                    Revert
                                                </button>
                                            )}

                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'transform rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Analytics</h4>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-gray-50 p-2 rounded">
                                                            <div className="font-medium">Edit Time</div>
                                                            <div className="text-gray-600">
                                                                {Math.round(version.analytics.editTime / 1000)}s
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 p-2 rounded">
                                                            <div className="font-medium">Keystrokes/min</div>
                                                            <div className="text-gray-600">
                                                                {Math.round(version.analytics.keystrokesPerMinute)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Changes by Section</h4>
                                                    <div className="space-y-1">
                                                        {Object.entries(version.analytics.changesBySection)
                                                            .sort(([, a], [, b]) => b - a)
                                                            .slice(0, 3)
                                                            .map(([section, count]) => (
                                                                <div key={section} className="flex justify-between text-xs">
                                                                    <span className="text-gray-600">{section}</span>
                                                                    <span className="font-medium">{count}</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>

                                                {version.changes.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Changes</h4>
                                                        <div className="space-y-1 max-h-20 overflow-y-auto">
                                                            {version.changes.slice(0, 3).map((change: any, idx: number) => (
                                                                <div key={idx} className="text-xs">
                                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${change.type === 'addition' ? 'bg-green-400' :
                                                                            change.type === 'deletion' ? 'bg-red-400' : 'bg-yellow-400'
                                                                        }`}></span>
                                                                    <span className="text-gray-600">
                                                                        {change.type} in {change.section || 'Unknown'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}