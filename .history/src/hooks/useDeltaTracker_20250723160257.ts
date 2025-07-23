// src/hooks/useDeltaTracker.ts
// ✨ NEW HOOK: Simplified delta tracking hook

import { useEffect, useRef } from 'react';
import { DeltaTracker, DeltaChange } from '../lib/notes/delta-tracker';

interface UseDeltaTrackerProps {
    editor: any;
    noteId: string;
    initialContent: string;
    onDeltaDetected: (delta: DeltaChange) => void;
    enabled?: boolean;
}

export function useDeltaTracker({
    editor,
    noteId,
    initialContent,
    onDeltaDetected,
    enabled = true
}: UseDeltaTrackerProps) {
    const trackerRef = useRef<DeltaTracker | null>(null);

    useEffect(() => {
        if (editor && !trackerRef.current && enabled) {
            trackerRef.current = new DeltaTracker({
                editor,
                noteId,
                initialContent,
                onDeltaDetected
            });
        }

        return () => {
            if (trackerRef.current) {
                trackerRef.current.destroy();
                trackerRef.current = null;
            }
        };
    }, [editor, noteId, initialContent, onDeltaDetected, enabled]);

    return {
        getChanges: () => trackerRef.current?.getChanges() || [],
        getEditSession: () => trackerRef.current?.getEditSession(),
        resetBaseline: (content: string) => trackerRef.current?.resetBaseline(content),
        getAnalytics: () => trackerRef.current?.getAnalytics()
    };
}