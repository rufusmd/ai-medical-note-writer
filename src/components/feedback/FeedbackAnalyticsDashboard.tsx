// src/components/feedback/SimpleFeedbackAnalytics.tsx

'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface FeedbackAnalyticsProps {
    userId: string;
    className?: string;
}

export default function SimpleFeedbackAnalytics({ userId, className = '' }: FeedbackAnalyticsProps) {
    return (
        <div className={`bg-white rounded-lg border p-6 ${className}`}>
            <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    AI Learning System Ready
                </h3>
                <p className="text-gray-500 mb-4">
                    Generate notes and provide feedback to see your AI learning analytics here.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 font-medium">
                        🎯 Ready to start learning from your feedback
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        The AI will improve with every note you generate and rate!
                    </p>
                </div>
            </div>
        </div>
    );
}