'use client';

import { useState } from 'react';
import { testEnhancedDetection } from '../test-enhanced-detector';

export default function TestDetectorPage() {
    const [results, setResults] = useState<string>('');

    const runTest = () => {
        // Capture console output
        const originalLog = console.log;
        let output = '';
        console.log = (...args) => {
            output += args.join(' ') + '\n';
            originalLog(...args);
        };

        testEnhancedDetection();

        console.log = originalLog;
        setResults(output);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Test Enhanced Section Detector</h1>
            <button
                onClick={runTest}
                className="px-4 py-2 bg-blue-600 text-white rounded"
            >
                Run Test
            </button>
            <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
                {results}
            </pre>
        </div>
    );
}