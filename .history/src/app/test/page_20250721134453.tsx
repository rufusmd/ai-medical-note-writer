// src/app/test/page.tsx
'use client';

import { useState } from 'react';

export default function TestPage() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const testNoteGeneration = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: 'Patient reports feeling anxious about upcoming surgery. Has trouble sleeping and increased worry about procedure outcomes. No suicidal ideation. Appetite is decreased.',
                    template: 'Chief Complaint: ***\n\nHistory of Present Illness: ***\n\nAssessment: ***\n\nPlan: ***\n\n@VITALS@\n{Mood:1234}',
                    preferredProvider: 'gemini',
                    patientInfo: {
                        name: 'Test Patient',
                        age: 45,
                        gender: 'female'
                    }
                })
            });

            const data = await response.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (error) {
            setResult(`Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const testClaudeGeneration = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: 'Patient reports feeling anxious about upcoming surgery. Has trouble sleeping and increased worry about procedure outcomes. No suicidal ideation. Appetite is decreased.',
                    template: 'Chief Complaint: ***\n\nHistory of Present Illness: ***\n\nAssessment: ***\n\nPlan: ***\n\n@VITALS@\n{Mood:1234}',
                    preferredProvider: 'claude',
                    patientInfo: {
                        name: 'Test Patient',
                        age: 45,
                        gender: 'female'
                    }
                })
            });

            const data = await response.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (error) {
            setResult(`Error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">
                AI Medical Note Writer - Test Dashboard
            </h1>

            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Test Note Generation</h2>
                <p className="text-gray-600 mb-4">
                    Test the dual AI provider system with a sample transcript and template.
                    Notice how Epic SmartPhrases (@VITALS@) and SmartLists (Mood:1234) are preserved.
                </p>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={testNoteGeneration}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Test Gemini (Primary)'}
                    </button>

                    <button
                        onClick={testClaudeGeneration}
                        disabled={loading}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Test Claude (Fallback)'}
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Result:</h3>
                <pre className="bg-white p-4 rounded border text-sm overflow-auto h-96 whitespace-pre-wrap">
                    {result || 'Click a button above to test note generation...'}
                </pre>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🔧 Setup Status</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                    <li>✅ Next.js 15 with TypeScript</li>
                    <li>✅ Dual AI Provider System (Gemini + Claude)</li>
                    <li>✅ Epic SmartPhrase Preservation</li>
                    <li>✅ API Routes Configured</li>
                    <li>✅ Firebase Ready (pending API keys)</li>
                    <li>🔄 Environment Variables (add your API keys)</li>
                </ul>
            </div>
        </div>
    );
}