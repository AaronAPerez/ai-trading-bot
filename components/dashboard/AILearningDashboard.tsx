'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp, TrendingDown, Target, BookOpen, BarChart3, Clock, Settings } from 'lucide-react'

interface LearningInsights {
  overallAccuracy: number
  confidenceCalibration: number
  strongestPatterns: string[]
  weakestPatterns: string[]
  optimalConfidenceThreshold: number
  bestPerformingConditions: {
    volatilityRange: [number, number]
    volumeRange: [number, number]
    momentumRange: [number, number]
  }
  recommendedAdjustments: {
    confidenceThresholds: {
      minimum: number
      conservative: number
      aggressive: number
    }
    positionSizing: {
      baseMultiplier: number
      confidenceMultiplier: number
    }
  }
}

interface LearningData {
  insights: LearningInsights | null
  accuracyTrend: number[]
  tradeHistoryCount: number
}

export default function AILearningDashboard() {
  const [learningData, setLearningData] = useState<LearningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchLearningData()
    const interval = setInterval(fetchLearningData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchLearningData = async () => {
    try {
      const response = await fetch('/api/ai-trading?action=status')
      const data = await response.json()

      if (data.learning) {
        setLearningData(data.learning)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.75) return 'text-green-600 bg-green-50 border-green-200'
    if (accuracy >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getCalibrationColor = (calibration: number) => {
    if (calibration >= 0.8) return 'text-green-600'
    if (calibration >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-spin text-purple-500" />
            <span>Loading AI learning data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!learningData?.insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Learning System
          </CardTitle>
          <CardDescription>
            AI learning insights will appear after sufficient trading data is collected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">
              Collecting training data...
            </div>
            <div className="text-sm text-gray-400">
              Trades processed: {learningData?.tradeHistoryCount || 0}
              <br />
              Need 50+ completed trades for initial analysis
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const insights = learningData.insights

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Learning Dashboard
              </CardTitle>
              <CardDescription>
                Real-time AI performance analysis and self-improvement metrics
              </CardDescription>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Prediction Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <Badge className={getAccuracyColor(insights.overallAccuracy)}>
                {formatPercent(insights.overallAccuracy)}
              </Badge>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Based on {learningData.tradeHistoryCount} completed trades
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Confidence Calibration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getCalibrationColor(insights.confidenceCalibration)}`}>
              {formatPercent(insights.confidenceCalibration)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              How well AI confidence matches actual outcomes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              Optimal Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatPercent(insights.optimalConfidenceThreshold)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              AI-determined optimal confidence threshold
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patterns & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Strongest Patterns
            </CardTitle>
            <CardDescription>AI-identified high-success patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.strongestPatterns.length > 0 ? (
              <div className="space-y-2">
                {insights.strongestPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{pattern}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No strong patterns identified yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Areas for Improvement
            </CardTitle>
            <CardDescription>Patterns with lower success rates</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.weakestPatterns.length > 0 ? (
              <div className="space-y-2">
                {insights.weakestPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">{pattern}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No weak patterns identified
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            AI-Recommended Configuration
          </CardTitle>
          <CardDescription>
            Automatically adjusted thresholds based on performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-gray-700">Confidence Thresholds</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Minimum:</span>
                  <Badge variant="outline">
                    {formatPercent(insights.recommendedAdjustments.confidenceThresholds.minimum)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conservative:</span>
                  <Badge variant="outline">
                    {formatPercent(insights.recommendedAdjustments.confidenceThresholds.conservative)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Aggressive:</span>
                  <Badge variant="outline">
                    {formatPercent(insights.recommendedAdjustments.confidenceThresholds.aggressive)}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-gray-700">Position Sizing</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Base Multiplier:</span>
                  <Badge variant="outline">
                    {insights.recommendedAdjustments.positionSizing.baseMultiplier.toFixed(1)}x
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Confidence Multiplier:</span>
                  <Badge variant="outline">
                    {insights.recommendedAdjustments.positionSizing.confidenceMultiplier.toFixed(1)}x
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Accuracy Trend (30 Days)
          </CardTitle>
          <CardDescription>
            Daily prediction accuracy over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learningData.accuracyTrend.length > 0 ? (
            <div className="h-32 flex items-end justify-between gap-1">
              {learningData.accuracyTrend.map((accuracy, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-sm"
                  style={{
                    height: `${Math.max(4, accuracy * 100)}%`,
                    opacity: 0.6 + (accuracy * 0.4)
                  }}
                  title={`Day ${index + 1}: ${formatPercent(accuracy)}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <div className="text-sm">Collecting accuracy trend data...</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Performing Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Optimal Market Conditions
          </CardTitle>
          <CardDescription>
            Market conditions where AI performs best
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-lg font-semibold text-emerald-700">Volatility</div>
              <div className="text-sm text-emerald-600">
                {(insights.bestPerformingConditions.volatilityRange[0] * 100).toFixed(1)}% -
                {' '}{(insights.bestPerformingConditions.volatilityRange[1] * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-700">Volume</div>
              <div className="text-sm text-blue-600">
                {(insights.bestPerformingConditions.volumeRange[0] / 1000).toFixed(0)}K -
                {' '}{(insights.bestPerformingConditions.volumeRange[1] / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-700">Momentum</div>
              <div className="text-sm text-purple-600">
                {(insights.bestPerformingConditions.momentumRange[0] * 100).toFixed(1)}% -
                {' '}{(insights.bestPerformingConditions.momentumRange[1] * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}