// src/components/feedback/NoteFeedbackForm.tsx - CREATE THIS FILE (SIMPLIFIED VERSION)

'use client';

import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { createNoteFeedback } from '@/lib/firebase/feedback';
import { NoteFeedback, QUALITY_ISSUES } from '@/lib/firebase/schema';
import { toast } from 'sonner';

interface NoteFeedbackFormProps {
    noteId: string;
    noteContent: string;
    aiProvider: 'gemini' | 'claude';
    patientId: string;
    templateUsed: string;
    userId: string;
    onFeedbackSubmitted?: () => void;
    className?: string;
}

export default function NoteFeedbackForm({
    noteId,
    noteContent,
    aiProvider,
    patientId,
    templateUsed,
    userId,
    onFeedbackSubmitted,
    className = ''
}: NoteFeedbackFormProps) {
    const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
    const [hoveredRating, setHoveredRating] = useState<number | null>(null);
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
    const [freeformFeedback, setFreeformFeedback] = useState('');
    const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null);
    const [startTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const noteLength = noteContent.length;
    const estimatedReadTime = Math.ceil(noteContent.split(' ').length / 200);

    const handleRatingClick = (newRating: 1 | 2 | 3 | 4 | 5) => {
        setRating(newRating);
        if (newRating <= 3) {
            setShowAdvanced(true);
        }
    };

    const handleIssueToggle = (issue: string) => {
        setSelectedIssues(prev =>
            prev.includes(issue)
                ? prev.filter(i => i !== issue)
                : [...prev, issue]
        );
    };

    const handleSubmit = async () => {
        if (!rating) {
            toast.error('Please provide a rating before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            const timeToReview = Math.round((Date.now() - startTime) / 1000);

            const feedbackData: Omit<NoteFeedback, 'id' | 'createdAt'> = {
                noteId,
                userId,
                patientId,
                aiProvider,
                rating,
                qualityIssues: selectedIssues as any,
                freeformFeedback,
                timeToReview,
                templateUsed,
                noteLength,
                wouldUseAgain: wouldUseAgain ?? true,
            };

            await createNoteFeedback(feedbackData);

            toast.success('Thank you for your feedback! This helps improve AI note generation.');

            onFeedbackSubmitted?.();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRatingDescription = (rating: number) => {
        const descriptions = {
            1: 'Poor - Major issues, unusable',
            2: 'Below Average - Significant improvements needed',
            3: 'Average - Acceptable with minor edits',
            4: 'Good - Minor improvements would help',
            5: 'Excellent - Ready to use as-is',
        };
        return descriptions[rating as keyof typeof descriptions];
    };

    const currentRatingDescription = hoveredRating
        ? getRatingDescription(hoveredRating)
        : rating
            ? getRatingDescription(rating)
            : 'Click to rate this note';

    return (
        <div className={`w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Rate This AI-Generated Note</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        ~{estimatedReadTime} min read
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium capitalize">
                        {aiProvider}
                    </span>
                    <span>{noteLength.toLocaleString()} characters</span>
                    <span>Template: {templateUsed}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Rating Section */}
                <div className="space-y-3">
                    <label className="text-base font-medium text-gray-900">
                        How would you rate this note overall?
                    </label>

                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => handleRatingClick(star as 1 | 2 | 3 | 4 | 5)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(null)}
                                className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                disabled={isSubmitting}
                            >
                                <Star
                                    className={`h-8 w-8 ${star <= (hoveredRating || rating || 0)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                />
                            </button>
                        ))}

                        <span className="ml-3 text-sm text-gray-600 font-medium">
                            {currentRatingDescription}
                        </span>
                    </div>
                </div>

                {/* Quick Actions for High Ratings */}
                {rating && rating >= 4 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <ThumbsUp className="h-5 w-5 text-green-600" />
                            <span className="text-green-800 font-medium">
                                Great! Would you use this AI provider again for similar notes?
                            </span>
                        </div>
                        <div className="flex gap-3 mt-3">
                            <button
                                className={`px-4 py-2 rounded text-sm font-medium ${wouldUseAgain === true
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => setWouldUseAgain(true)}
                                disabled={isSubmitting}
                            >
                                Yes, definitely
                            </button>
                            <button
                                className={`px-4 py-2 rounded text-sm font-medium ${wouldUseAgain === false
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => setWouldUseAgain(false)}
                                disabled={isSubmitting}
                            >
                                Not sure
                            </button>
                        </div>
                    </div>
                )}

                {/* Issues Section for Lower Ratings */}
                {rating && rating <= 3 && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <ThumbsDown className="h-5 w-5 text-amber-600" />
                                <span className="text-amber-800 font-medium">
                                    Help us improve! What issues did you notice?
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {QUALITY_ISSUES.map((issue) => (
                                    <div
                                        key={issue.value}
                                        className="flex items-start space-x-3 p-2 rounded hover:bg-amber-100 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            id={issue.value}
                                            checked={selectedIssues.includes(issue.value)}
                                            onChange={() => handleIssueToggle(issue.value)}
                                            disabled={isSubmitting}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <label
                                                htmlFor={issue.value}
                                                className="text-sm font-medium cursor-pointer"
                                            >
                                                {issue.label}
                                            </label>
                                            <p className="text-xs text-gray-600">
                                                {issue.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Advanced Feedback Section */}
                {(showAdvanced || rating && rating <= 3) && (
                    <div className="space-y-4 border-t pt-4">
                        <div className="space-y-3">
                            <label htmlFor="freeform" className="text-base font-medium text-gray-900">
                                Additional Comments (Optional)
                            </label>
                            <textarea
                                id="freeform"
                                placeholder="Share any specific feedback about this note. What would make it better?"
                                value={freeformFeedback}
                                onChange={(e) => setFreeformFeedback(e.target.value)}
                                disabled={isSubmitting}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Toggle Advanced Options */}
                {!showAdvanced && rating && rating > 3 && (
                    <button
                        onClick={() => setShowAdvanced(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Add detailed feedback
                    </button>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!rating || isSubmitting}
                        className="px-6 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Feedback'
                        )}
                    </button>
                </div>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 text-center">
                    Your feedback is used to improve AI note generation and is stored securely in compliance with HIPAA.
                </p>
            </div>
        </div>
    );
}