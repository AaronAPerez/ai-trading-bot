"use client"

import React from 'react'
import { Brain, TrendingUp, Target, BarChart3, BookOpen } from 'lucide-react'
import useAILearning from '@/hooks/useAILearning'

interface AILearningProgressProps {
  compact?: boolean
  showDetails?: boolean
  botIsActive?: boolean
}

export default function AILearningProgress({
  compact = true,
  showDetails = false,
  botIsActive = false
}: AILearningProgressProps) {
  const {
    learningData,
    isLoading,
    formatPercent,
    getAccuracyStatus,
    getLearningStatus
  } = useAILearning({
    // Only poll when bot is active and learning, otherwise just load once
    refreshInterval: botIsActive ? 300000 : false // 5 minutes when active, never when inactive
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-sm text-gray-300">Loading AI learning data from Supabase...</span>
        </div>
      </div>
    )
  }

  const accuracyStatus = learningData.insights
    ? getAccuracyStatus(learningData.insights.overallAccuracy)
    : { label: 'Learning', color: 'gray' }

  const statusColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    gray: 'text-gray-400'
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Brain className="w-5 h-5 text-purple-400" />
              {learningData.isLearning && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-purple-300">AI Learning</div>
              <div className="text-xs text-gray-400">
                {getLearningStatus()} • {learningData.tradeHistoryCount} trades
              </div>
            </div>
          </div>

          <div className="text-right">
            {learningData.insights ? (
              <>
                <div className={`text-lg font-bold ${statusColors[accuracyStatus.color as keyof typeof statusColors]}`}>
                  {formatPercent(learningData.insights.overallAccuracy)}
                </div>
                <div className="text-xs text-gray-400">{accuracyStatus.label}</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-400">
                  {Math.round(learningData.learningProgress)}%
                </div>
                <div className="text-xs text-gray-400">Progress</div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar for learning */}
        {!learningData.insights && (
          <div className="mt-3">
            <div className="w-full bg-gray-700/50 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${learningData.learningProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {learningData.tradeHistoryCount < 50
                ? `${50 - learningData.tradeHistoryCount} trades until analysis`
                : 'Analysis ready'
              }
            </div>
          </div>
        )}

        {/* Mini accuracy trend */}
        {learningData.accuracyTrend.length > 0 && learningData.insights && (
          <div className="mt-3 flex items-end space-x-1 h-8">
            {learningData.accuracyTrend.slice(-7).map((accuracy, index) => (
              <div
                key={index}
                className="flex-1 bg-gradient-to-t from-purple-500/60 to-purple-300/60 rounded-sm min-h-[2px]"
                style={{
                  height: `${Math.max(8, accuracy * 100)}%`,
                }}
                title={`${formatPercent(accuracy)}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Expanded view for detailed learning progress
  return (
    <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">AI Learning Progress</h3>
            <p className="text-sm text-gray-400">Real-time AI improvement metrics</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
          learningData.isLearning
            ? 'bg-purple-900/50 border-purple-500/50 text-purple-300'
            : 'bg-gray-800/50 border-gray-600/50 text-gray-400'
        }`}>
          {getLearningStatus()}
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">Accuracy</span>
          </div>
          {learningData.insights ? (
            <>
              <div className={`text-2xl font-bold ${statusColors[accuracyStatus.color as keyof typeof statusColors]}`}>
                {formatPercent(learningData.insights.overallAccuracy)}
              </div>
              <div className="text-xs text-gray-500">{accuracyStatus.label}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-400">--</div>
              <div className="text-xs text-gray-500">Insufficient data</div>
            </>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Trades Analyzed</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {learningData.tradeHistoryCount}
          </div>
          <div className="text-xs text-gray-500">
            {learningData.tradeHistoryCount >= 50 ? 'Analysis active' : `${50 - learningData.tradeHistoryCount} more needed`}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">Learning Progress</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {Math.round(learningData.learningProgress)}%
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${learningData.learningProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Insights section */}
      {learningData.insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Strongest Patterns
            </h4>
            {learningData.insights.strongestPatterns.length > 0 ? (
              <div className="space-y-2">
                {learningData.insights.strongestPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-300">{pattern}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No patterns identified yet</div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-3">
              Optimal Threshold: {formatPercent(learningData.insights.optimalConfidenceThreshold)}
            </h4>
            <div className="text-xs text-gray-400">
              AI-recommended minimum confidence for trade execution
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Confidence Calibration</div>
              <div className="w-full bg-gray-700/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full"
                  style={{ width: `${learningData.insights.confidenceCalibration * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatPercent(learningData.insights.confidenceCalibration)} accuracy
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <div className="text-sm text-gray-400 mb-2">Collecting training data...</div>
          <div className="text-xs text-gray-500">
            AI learning requires at least 50 completed trades to begin analysis
          </div>
        </div>
      )}

      {/* Accuracy trend chart */}
      {learningData.accuracyTrend.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Accuracy Trend (14 days)</h4>
          <div className="h-16 flex items-end justify-between space-x-1">
            {learningData.accuracyTrend.map((accuracy, index) => (
              <div
                key={index}
                className="flex-1 bg-gradient-to-t from-blue-500/60 to-blue-300/60 rounded-sm min-h-[2px]"
                style={{
                  height: `${Math.max(8, accuracy * 100)}%`,
                }}
                title={`Day ${index + 1}: ${formatPercent(accuracy)}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}