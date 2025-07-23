// src/components/feedback/NoteFeedbackForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Clock, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { createNoteFeedback } from '@/lib/firebase/feedback';
import { NoteFeedback } from '@/lib/firebase/schema';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NoteFeedbackFormProps {
    noteId: string;
    noteContent: string;
    aiProvider: 'gemini' | 'claude';
    patientId: string;
    templateUsed: string;
    onFeedbackSubmitted?: () => void;
    className?: string;
}

type QualityIssue =
    | 'too_long'
    | 'too_brief'
    | 'missing_details'
    | 'wrong_tone'
    | 'poor_structure'
    | 'medical_inaccuracy'
    | 'epic_syntax_errors'
    | 'irrelevant_content'
    | 'formatting_issues';

const QUALITY_ISSUES: { value: QualityIssue; label: string; description: string }[] = [
    {
        value: 'too_long',
        label: 'Too Long',
        description: 'Note contains unnecessary information or is verbose'
    },
    {
        value: 'too_brief',
        label: 'Too Brief',
        description: 'Missing important clinical details'
    },
    {
        value: 'missing_details',
        label: 'Missing Details',
        description: 'Lacks specific clinical information'
    },
    {
        value: 'wrong_tone',
        label: 'Wrong Tone',
        description: 'Not appropriate for clinical documentation'
    },
    {
        value: 'poor_structure',
        label: 'Poor Structure',
        description: 'Disorganized or hard to follow'
    },
    {
        value: 'medical_inaccuracy',
        label: 'Medical Inaccuracy',
        description: 'Contains potential medical errors'
    },
    {
        value: 'epic_syntax_errors',
        label: 'Epic Syntax Errors',
        description: 'SmartPhrases or formatting issues'
    },
    {
        value: 'irrelevant_content',
        label: 'Irrelevant Content',
        description: 'Includes unrelated information'
    },
    {
        value: 'formatting_issues',
        label: 'Formatting Issues',
        description: 'Layout or presentation problems'
    },
];

const RATING_DESCRIPTIONS = {
    1: 'Poor - Major issues, unusable',
    2: 'Below Average - Significant improvements needed',
    3: 'Average - Acceptable with minor edits',
    4: 'Good - Minor improvements would help',
    5: 'Excellent - Ready to use as-is',
};

export default function NoteFeedbackForm({
    noteId,
    noteContent,
    aiProvider,
    patientId,
    templateUsed,
    onFeedbackSubmitted,
    className = ''
}: NoteFeedbackFormProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
    const [hoveredRating, setHoveredRating] = useState<number | null>(null);
    const [selectedIssues, setSelectedIssues] = useState<QualityIssue[]>([]);
    const [freeformFeedback, setFreeformFeedback] = useState('');
    const [suggestedPromptChanges, setSuggestedPromptChanges] = useState('');
    const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null);
    const [startTime] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const noteLength = noteContent.length;
    const estimatedReadTime = Math.ceil(noteContent.split(' ').length / 200); // words per minute

    const handleRatingClick = (newRating: 1 | 2 | 3 | 4 | 5) => {
        setRating(newRating);

        // Auto-show advanced options for lower ratings
        if (newRating <= 3) {
            setShowAdvanced(true);
        }
    };

    const handleIssueToggle = (issue: QualityIssue) => {
        setSelectedIssues(prev =>
            prev.includes(issue)
                ? prev.filter(i => i !== issue)
                : [...prev, issue]
        );
    };

    const handleSubmit = async () => {
        if (!rating || !user) {
            toast.error('Please provide a rating before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            const timeToReview = Math.round((Date.now() - startTime) / 1000);

            const feedbackData: Omit<NoteFeedback, 'id' | 'createdAt'> = {
                noteId,
                userId: user.uid,
                patientId,
                aiProvider,
                rating,
                qualityIssues: selectedIssues,
                freeformFeedback,
                timeToReview,
                templateUsed,
                noteLength,
                suggestedPromptChanges: suggestedPromptChanges || undefined,
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

    const currentRatingDescription = hoveredRating
        ? RATING_DESCRIPTIONS[hoveredRating as keyof typeof RATING_DESCRIPTIONS]
        : rating
            ? RATING_DESCRIPTIONS[rating]
            : 'Click to rate this note';

    return (
        <Card className={`w-full max-w-2xl mx-auto ${className}`}>
            <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        Rate This AI-Generated Note
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        ~{estimatedReadTime} min read
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <Badge variant="outline" className="capitalize">
                        {aiProvider}
                    </Badge>
                    <span>{noteLength.toLocaleString()} characters</span>
                    <span>Template: {templateUsed}</span>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Rating Section */}
                <div className="space-y-3">
                    <Label className="text-base font-medium">
                        How would you rate this note overall?
                    </Label>

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
                            <Button
                                variant={wouldUseAgain === true ? "default" : "outline"}
                                size="sm"
                                onClick={() => setWouldUseAgain(true)}
                                disabled={isSubmitting}
                            >
                                Yes, definitely
                            </Button>
                            <Button
                                variant={wouldUseAgain === false ? "default" : "outline"}
                                size="sm"
                                onClick={() => setWouldUseAgain(false)}
                                disabled={isSubmitting}
                            >
                                Not sure
                            </Button>
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
                                        <Checkbox
                                            id={issue.value}
                                            checked={selectedIssues.includes(issue.value)}
                                            onCheckedChange={() => handleIssueToggle(issue.value)}
                                            disabled={isSubmitting}
                                        />
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor={issue.value}
                                                className="text-sm font-medium cursor-pointer"
                                            >
                                                {issue.label}
                                            </Label>
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
                            <Label htmlFor="freeform" className="text-base font-medium">
                                Additional Comments (Optional)
                            </Label>
                            <Textarea
                                id="freeform"
                                placeholder="Share any specific feedback about this note. What would make it better?"
                                value={freeformFeedback}
                                onChange={(e) => setFreeformFeedback(e.target.value)}
                                disabled={isSubmitting}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="prompt-suggestions" className="text-base font-medium">
                                Prompt Improvement Suggestions (Optional)
                            </Label>
                            <Textarea
                                id="prompt-suggestions"
                                placeholder="If you have ideas on how to improve the AI prompt for better results, share them here..."
                                value={suggestedPromptChanges}
                                onChange={(e) => setSuggestedPromptChanges(e.target.value)}
                                disabled={isSubmitting}
                                rows={2}
                            />
                            <p className="text-xs text-gray-500">
                                These suggestions help our AI learn your preferences and improve over time.
                            </p>
                        </div>
                    </div>
                )}

                {/* Toggle Advanced Options */}
                {!showAdvanced && rating && rating > 3 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvanced(true)}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add detailed feedback
                    </Button>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={!rating || isSubmitting}
                        size="lg"
                        className="min-w-32"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Feedback'
                        )}
                    </Button>
                </div>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 text-center">
                    Your feedback is used to improve AI note generation and is stored securely in compliance with HIPAA.
                </p>
            </CardContent>
        </Card>
    );
}