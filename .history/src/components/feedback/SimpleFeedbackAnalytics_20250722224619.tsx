// src/components/feedback/SimpleFeedbackAnalytics.tsx - REPLACE YOUR EXISTING FILE

'use client';

import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, BarChart3, CheckCircle } from 'lucide-react';
import { getFeedbackAnalytics, getNotesAwaitingFeedback } from '@/lib/firebase/feedback';

interface FeedbackAnalyticsProps {
  userId: string;
  className?: string;
}

export default function SimpleFeedbackAnalytics({ userId, className = '' }: FeedbackAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [awaitingFeedbackCount, setAwaitingFeedbackCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [analyticsData, awaitingNotes] = await Promise.all([
        getFeedbackAnalytics(userId),
        getNotesAwaitingFeedback(userId),
      ]);

      setAnalytics(analyticsData);
      setAwaitingFeedbackCount(awaitingNotes.length);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set empty analytics on error
      setAnalytics({
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        commonIssues: [],
        averageReviewTime: 0,
        providerComparison: {
          gemini: { count: 0, avgRating: 0 },
          claude: { count: 0, avgRating: 0 },
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalFeedback === 0) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start Building Your AI Learning Profile
          </h3>
          <p className="text-gray-500 mb-4">
            Generate notes and provide feedback to see your AI learning analytics.
          </p>
          {awaitingFeedbackCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 font-medium">
                🎯 {awaitingFeedbackCount} notes awaiting your feedback
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Provide feedback to start building your personalized AI profile!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          AI Learning Progress
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total Feedback */}
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalFeedback}</div>
            <div className="text-sm text-blue-800">Total Feedback</div>
          </div>

          {/* Average Rating */}
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">
                {analytics.averageRating.toFixed(1)}
              </span>
            </div>
            <div className="text-sm text-yellow-800">Avg Rating</div>
          </div>

          {/* Review Time */}
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(analytics.averageReviewTime)}s
            </div>
            <div className="text-sm text-green-800">Avg Review</div>
          </div>

          {/* Awaiting Feedback */}
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{awaitingFeedbackCount}</div>
            <div className="text-sm text-purple-800">Awaiting</div>
          </div>
        </div>

        {/* Rating Distribution */}
        {analytics.totalFeedback > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = analytics.ratingDistribution[rating] || 0;
                const percentage = analytics.totalFeedback > 0
                  ? (count / analytics.totalFeedback) * 100
                  : 0;

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm">{rating}</span>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-500 w-12">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Provider Comparison */}
        {(analytics.providerComparison.gemini.count > 0 || analytics.providerComparison.claude.count > 0) && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">AI Provider Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">Google Gemini</div>
                <div className="text-sm text-blue-700">
                  {analytics.providerComparison.gemini.count} notes
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">
                    {analytics.providerComparison.gemini.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="font-medium text-orange-900">Anthropic Claude</div>
                <div className="text-sm text-orange-700">
                  {analytics.providerComparison.claude.count} notes
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">
                    {analytics.providerComparison.claude.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <div className="font-medium text-green-800">
            AI Learning System Active
          </div>
          <div className="text-sm text-green-600">
            {analytics.totalFeedback > 0
              ? 'Your feedback is helping improve note generation quality'
              : 'Generate notes and provide feedback to start learning'
            }
          </div>
        </div>
      </div>
    </div>
  );
}