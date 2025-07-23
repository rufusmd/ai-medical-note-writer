// src/components/feedback/NoteFeedbackForm.tsx
'use client';

import React, { useState } from 'react';
import { Star, Clock, MessageSquare, Sparkles } from 'lucide-react';

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
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const noteLength = noteContent.length;
    const estimatedReadTime = Math.ceil(noteContent.split(' ').length / 200);

    const handleRatingClick = (newRating: 1 | 2 | 3 | 4 | 5) => {
        setRating(newRating);
    };

    const handleSubmit = async () => {
        if (!rating) {
            alert('Please provide a rating before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            // For now, just simulate the feedback submission
            // TODO: Replace with actual API call when feedback service is ready
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Feedback submitted:', {
                noteId,
                userId,
                rating,
                feedback,
                aiProvider
            });

            onFeedbackSubmitted?.();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
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
                                className={`p-1 transition-colors ${star <= (hoveredRating || rating || 0)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    } hover:text-yellow-400`}
                                disabled={isSubmitting}
                            >
                                <Star className="h-6 w-6 fill-current" />
                            </button>
                        ))}
                    </div>

                    <p className="text-sm text-gray-600 min-h-[20px]">
                        {currentRatingDescription}
                    </p>
                </div>

                {/* Feedback Text Area */}
                <div className="space-y-2">
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                        Additional Comments (Optional)
                    </label>
                    <textarea
                        id="feedback"
                        placeholder="What worked well? What could be improved? Any specific medical accuracy concerns?"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        disabled={isSubmitting}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

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
                    Your feedback helps improve AI note generation and is stored securely in compliance with HIPAA.
                </p>
            </div>
        </div>
    );
}