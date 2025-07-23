// src/components/notes/DeltaTracker.tsx
// ✨ NEW COMPONENT: React wrapper for delta tracking

'use client';

import React, { useEffect, useRef } from 'react';
import { DeltaTracker as DeltaTrackerCore, DeltaChange } from '../../lib/notes/delta-tracker';

interface DeltaTrackerProps {
    editor: any;
    noteId: string;
    initialContent: string;
    onDeltaDetected: (delta: DeltaChange) => void;
    children?: React.ReactNode;
}

export function DeltaTracker({
    editor,
    noteId,
    initialContent,
    onDeltaDetected,
    children
}: DeltaTrackerProps) {
    const trackerRef = useRef<DeltaTrackerCore | null>(null);

    useEffect(() => {
        if (editor && !trackerRef.current) {
            trackerRef.current = new DeltaTrackerCore({
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
    }, [editor, noteId, initialContent, onDeltaDetected]);

    // Expose tracker methods to parent components via ref
    React.useImperativeHandle(trackerRef, () => ({
        getChanges: () => trackerRef.current?.getChanges() || [],
        getEditSession: () => trackerRef.current?.getEditSession(),
        resetBaseline: (content: string) => trackerRef.current?.resetBaseline(content),
        getAnalytics: () => trackerRef.current?.getAnalytics()
    }));

    return <>{children}</>;
}