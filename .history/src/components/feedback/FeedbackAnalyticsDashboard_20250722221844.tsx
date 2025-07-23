// src/components/feedback/FeedbackAnalyticsDashboard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Star,
    Clock,
    Brain,
    Target,
    BarChart3,
    Sparkles,
    CheckCircle,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getFeedbackAnalytics, getUserPromptProfile, getNotesAwaitingFeedback } from '@/lib/firebase/feedback';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FeedbackAnalytics {
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    commonIssues: { issue: string; count: number; percentage: number }[];
    averageReviewTime: number;
    providerComparison: {
        gemini: { count: number; avgRating: number };
        claude: { count: number; avgRating: number };
    };
}

interface FeedbackDashboardProps {
    className?: string;
}

export default function FeedbackAnalyticsDashboard({ className = '' }: FeedbackDashboardProps) {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [awaitingFeedbackCount, setAwaitingFeedbackCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            const [analyticsData, profileData, awaitingNotes] = await Promise.all([
                getFeedbackAnalytics(user.uid),
                getUserPromptProfile(user.uid),
                getNotesAwaitingFeedback(user.uid),
            ]);

            setAnalytics(analyticsData);
            setUserProfile(profileData);
            setAwaitingFeedbackCount(awaitingNotes.length);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <Card className={className}>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                    <Brain className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Start Providing Feedback
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Generate some notes and provide feedback to see your learning analytics here.
                    </p>
                    {awaitingFeedbackCount > 0 && (
                        <Badge variant="default" className="mb-2">
                            {awaitingFeedbackCount} notes awaiting feedback
                        </Badge>
                    )}
                </CardContent>
            </Card>
        );
    }

    const getRatingTrend = () => {
        if (analytics.averageRating >= 4.0) return { icon: ArrowUp, color: 'text-green-600', text: 'Excellent' };
        if (analytics.averageRating >= 3.5) return { icon: ArrowUp, color: 'text-blue-600', text: 'Good' };
        if (analytics.averageRating >= 3.0) return { icon: Minus, color: 'text-yellow-600', text: 'Average' };
        return { icon: ArrowDown, color: 'text-red-600', text: 'Needs Improvement' };
    };

    const getProviderRecommendation = () => {
        const { gemini, claude } = analytics.providerComparison;
        if (gemini.count === 0 && claude.count === 0) return null;

        if (gemini.count > 0 && claude.count > 0) {
            return gemini.avgRating > claude.avgRating ? 'gemini' : 'claude';
        }

        return gemini.count > 0 ? 'gemini' : 'claude';
    };

    const ratingTrend = getRatingTrend();
    const recommendedProvider = getProviderRecommendation();

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.totalFeedback}</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-bold text-gray-900">
                                        {analytics.averageRating.toFixed(1)}
                                    </p>
                                    <ratingTrend.icon className={`h-5 w-5 ${ratingTrend.color}`} />
                                </div>
                                <p className={`text-xs ${ratingTrend.color} font-medium`}>
                                    {ratingTrend.text}
                                </p>
                            </div>
                            <Star className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg Review Time</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {Math.round(analytics.averageReviewTime)}s
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Awaiting Feedback</p>
                                <p className="text-2xl font-bold text-gray-900">{awaitingFeedbackCount}</p>
                                {awaitingFeedbackCount > 0 && (
                                    <Button variant="link" size="sm" className="p-0 h-auto text-blue-600">
                                        Provide feedback
                                    </Button>
                                )}
                            </div>
                            <Target className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="providers">AI Providers</TabsTrigger>
                    <TabsTrigger value="learning">Learning Progress</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rating Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="h-5 w-5" />
                                    Rating Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[5, 4, 3, 2, 1].map((rating) => {
                                    const count = analytics.ratingDistribution[rating] || 0;
                                    const percentage = analytics.totalFeedback > 0
                                        ? (count / analytics.totalFeedback) * 100
                                        : 0;

                                    return (
                                        <div key={rating} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                    <span>{rating} star{rating !== 1 ? 's' : ''}</span>
                                                </div>
                                                <span className="text-gray-500">
                                                    {count} ({percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <Progress value={percentage} className="h-2" />
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Common Issues */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Most Common Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analytics.commonIssues.length > 0 ? (
                                    <div className="space-y-3">
                                        {analytics.commonIssues.slice(0, 5).map((issue, index) => (
                                            <div key={issue.issue} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <span className="capitalize font-medium">
                                                        {issue.issue.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <Badge variant="secondary">
                                                    {issue.count} times ({issue.percentage.toFixed(1)}%)
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                        <p>No major issues reported! Your AI notes are performing well.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="providers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                AI Provider Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gemini Stats */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                            Google Gemini
                                            {recommendedProvider === 'gemini' && (
                                                <Badge variant="default" size="sm">Recommended</Badge>
                                            )}
                                        </h4>
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Notes Generated</span>
                                            <span className="font-medium">{analytics.providerComparison.gemini.count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Average Rating</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                <span className="font-medium">
                                                    {analytics.providerComparison.gemini.avgRating.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Claude Stats */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                            Anthropic Claude
                                            {recommendedProvider === 'claude' && (
                                                <Badge variant="default" size="sm">Recommended</Badge>
                                            )}
                                        </h4>
                                    </div>

                                    <div className="bg-orange-50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Notes Generated</span>
                                            <span className="font-medium">{analytics.providerComparison.claude.count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Average Rating</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                <span className="font-medium">
                                                    {analytics.providerComparison.claude.avgRating.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Recommendation */}
                            {recommendedProvider && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <div>
                                            <h4 className="font-medium text-green-800">
                                                Recommendation Based on Your Feedback
                                            </h4>
                                            <p className="text-sm text-green-700 mt-1">
                                                {recommendedProvider === 'gemini'
                                                    ? 'Google Gemini has been performing better for your use case based on your ratings.'
                                                    : 'Anthropic Claude has been performing better for your use case based on your ratings.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="learning" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                AI Learning Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {userProfile ? (
                                <div className="space-y-6">
                                    {/* Personalization Status */}
                                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-blue-900">Personalized AI Prompts</h4>
                                            <p className="text-sm text-blue-700">
                                                {userProfile.personalizedPromptPerformance?.totalNotes > 0
                                                    ? `Active with ${userProfile.personalizedPromptPerformance.improvementOverBaseline.toFixed(1)}% improvement`
                                                    : 'Building your profile...'
                                                }
                                            </p>
                                        </div>
                                        <Badge variant={userProfile.personalizedPromptPerformance?.totalNotes > 0 ? "default" : "secondary"}>
                                            {userProfile.personalizedPromptPerformance?.totalNotes > 0 ? 'Active' : 'Learning'}
                                        </Badge>
                                    </div>

                                    {/* Learning Insights */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium">What the AI Has Learned About You</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-600">Preferred Style</span>
                                                <p className="capitalize">{userProfile.preferredNoteStyle || 'Still learning...'}</p>
                                            </div>

                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-600">Preferred Tone</span>
                                                <p className="capitalize">{userProfile.preferredTone || 'Still learning...'}</p>
                                            </div>

                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-600">Note Length</span>
                                                <p className="capitalize">{userProfile.averageNoteLength || 'Still learning...'}</p>
                                            </div>

                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm font-medium text-gray-600">Specialty Focus</span>
                                                <p className="capitalize">{userProfile.specialtyFocus || 'General practice'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Metrics */}
                                    {userProfile.personalizedPromptPerformance?.totalNotes > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-medium">Personalization Impact</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Notes with Personalized Prompts</span>
                                                    <span>{userProfile.personalizedPromptPerformance.totalNotes}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Average Rating</span>
                                                    <span>{userProfile.personalizedPromptPerformance.averageRating.toFixed(1)}/5</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Improvement vs Baseline</span>
                                                    <span className="text-green-600 font-medium">
                                                        +{userProfile.personalizedPromptPerformance.improvementOverBaseline.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h4 className="font-medium text-gray-900 mb-2">Building Your AI Profile</h4>
                                    <p className="text-gray-500 mb-4">
                                        Continue providing feedback to help AI learn your preferences and improve note generation.
                                    </p>
                                    <p className="text-sm text-blue-600">
                                        Personalized prompts typically available after 10+ feedback submissions.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}