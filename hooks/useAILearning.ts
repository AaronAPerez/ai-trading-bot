"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabaseService } from '@/lib/database/supabase-utils'

export interface LearningInsights {
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

export interface LearningData {
  insights: LearningInsights | null
  accuracyTrend: number[]
  tradeHistoryCount: number
  learningProgress: number // 0-100% based on trades collected
  isLearning: boolean
  lastAnalysisTime: Date | null
}

interface UseAILearningProps {
  refreshInterval?: number
  userId?: string
}

export default function useAILearning({
  refreshInterval = 30000,
  userId = 'demo-user'
}: UseAILearningProps = {}) {
  const [learningData, setLearningData] = useState<LearningData>({
    insights: null,
    accuracyTrend: [],
    tradeHistoryCount: 0,
    learningProgress: 0,
    isLearning: false,
    lastAnalysisTime: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLearningData = useCallback(async () => {
    try {
      setError(null)

      // Fetch real AI learning data from Supabase
      const [learningData, tradeHistory, botMetrics] = await Promise.all([
        supabaseService.getAILearningData(userId),
        supabaseService.getTradeHistory(userId, 100), // Get last 100 trades for analysis
        supabaseService.getBotMetrics(userId)
      ])

      // Calculate learning insights from real data
      const insights = calculateRealLearningInsights(learningData, tradeHistory)
      const accuracyTrend = calculateAccuracyTrend(tradeHistory)

      const calculatedData: LearningData = {
        insights,
        accuracyTrend,
        tradeHistoryCount: tradeHistory.length,
        learningProgress: Math.min(100, (tradeHistory.length / 50) * 100), // 50 trades = 100%
        isLearning: tradeHistory.length > 0,
        lastAnalysisTime: learningData.length > 0 ? new Date(learningData[0].created_at) : null
      }

      setLearningData(calculatedData)
    } catch (err) {
      console.error('Failed to fetch AI learning data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch learning data')

      // Set empty data instead of fallback simulation
      setLearningData({
        insights: null,
        accuracyTrend: [],
        tradeHistoryCount: 0,
        learningProgress: 0,
        isLearning: false,
        lastAnalysisTime: null
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Calculate real learning insights from Supabase data
  const calculateRealLearningInsights = (learningData: any[], tradeHistory: any[]): LearningInsights | null => {
    if (tradeHistory.length < 50) return null // Need minimum 50 trades for insights

    const completedTrades = tradeHistory.filter(trade =>
      trade.status === 'FILLED' && trade.pnl !== null && trade.pnl !== undefined
    )

    if (completedTrades.length < 25) return null

    // Calculate overall accuracy
    const profitableTrades = completedTrades.filter(trade => trade.pnl > 0)
    const overallAccuracy = profitableTrades.length / completedTrades.length

    // Calculate confidence calibration (if confidence data exists)
    const tradesWithConfidence = completedTrades.filter(trade => trade.confidence)
    const confidenceCalibration = tradesWithConfidence.length > 0
      ? tradesWithConfidence.reduce((acc, trade) => {
          const wasCorrect = trade.pnl > 0 ? 1 : 0
          return acc + Math.abs(trade.confidence - wasCorrect)
        }, 0) / tradesWithConfidence.length
      : 0.5

    // Identify patterns from recent successful trades
    const recentSuccessfulTrades = completedTrades
      .filter(trade => trade.pnl > 0)
      .slice(0, 20)

    const strongestPatterns = identifyTradingPatterns(recentSuccessfulTrades)
    const weakestPatterns = identifyWeakPatterns(completedTrades.filter(trade => trade.pnl <= 0))

    // Calculate optimal confidence threshold
    const optimalThreshold = findOptimalThreshold(tradesWithConfidence)

    return {
      overallAccuracy,
      confidenceCalibration: 1 - confidenceCalibration, // Invert for better interpretation
      strongestPatterns,
      weakestPatterns,
      optimalConfidenceThreshold: optimalThreshold,
      bestPerformingConditions: {
        volatilityRange: [0.15, 0.35] as [number, number],
        volumeRange: [250000, 850000] as [number, number],
        momentumRange: [-0.03, 0.08] as [number, number]
      },
      recommendedAdjustments: {
        confidenceThresholds: {
          minimum: Math.max(0.6, optimalThreshold - 0.1),
          conservative: Math.max(0.7, optimalThreshold),
          aggressive: Math.min(0.9, optimalThreshold + 0.1)
        },
        positionSizing: {
          baseMultiplier: overallAccuracy > 0.6 ? 1.2 : 0.8,
          confidenceMultiplier: confidenceCalibration > 0.7 ? 2.0 : 1.5
        }
      }
    }
  }

  // Calculate accuracy trend from trade history
  const calculateAccuracyTrend = (tradeHistory: any[]): number[] => {
    const completedTrades = tradeHistory.filter(trade =>
      trade.status === 'FILLED' && trade.pnl !== null
    )

    if (completedTrades.length < 14) return []

    // Group trades by day for the last 14 days
    const dailyAccuracy: number[] = []
    const now = new Date()

    for (let i = 13; i >= 0; i--) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() - i)
      const dateStr = targetDate.toDateString()

      const dayTrades = completedTrades.filter(trade => {
        const tradeDate = new Date(trade.created_at || trade.filled_at)
        return tradeDate.toDateString() === dateStr
      })

      if (dayTrades.length > 0) {
        const profitableTrades = dayTrades.filter(trade => trade.pnl > 0)
        dailyAccuracy.push(profitableTrades.length / dayTrades.length)
      } else {
        // Use previous day's accuracy or overall accuracy as fallback
        dailyAccuracy.push(dailyAccuracy[dailyAccuracy.length - 1] || 0.5)
      }
    }

    return dailyAccuracy
  }

  // Helper functions for pattern identification
  const identifyTradingPatterns = (successfulTrades: any[]): string[] => {
    const patterns: string[] = []

    // Analyze trade timing patterns
    const morningTrades = successfulTrades.filter(trade => {
      const hour = new Date(trade.created_at).getHours()
      return hour >= 9 && hour <= 11
    })

    if (morningTrades.length > successfulTrades.length * 0.4) {
      patterns.push('Morning session momentum')
    }

    // Analyze symbols
    const symbolCounts = successfulTrades.reduce((acc, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topSymbol = Object.entries(symbolCounts)
      .sort(([,a], [,b]) => b - a)[0]

    if (topSymbol && topSymbol[1] > 3) {
      patterns.push(`${topSymbol[0]} technical breakouts`)
    }

    // Analyze trade sizes
    const avgValue = successfulTrades.reduce((sum, trade) => sum + trade.value, 0) / successfulTrades.length
    if (avgValue > 1000) {
      patterns.push('Large position high-confidence trades')
    }

    return patterns.slice(0, 3)
  }

  const identifyWeakPatterns = (unsuccessfulTrades: any[]): string[] => {
    const patterns: string[] = []

    if (unsuccessfulTrades.length === 0) return patterns

    // Look for timing patterns in losses
    const afterHoursTrades = unsuccessfulTrades.filter(trade => {
      const hour = new Date(trade.created_at).getHours()
      return hour < 9 || hour > 16
    })

    if (afterHoursTrades.length > unsuccessfulTrades.length * 0.3) {
      patterns.push('After-hours volatility')
    }

    return patterns.slice(0, 2)
  }

  const findOptimalThreshold = (tradesWithConfidence: any[]): number => {
    if (tradesWithConfidence.length < 10) return 0.65

    let bestThreshold = 0.65
    let bestScore = 0

    for (let threshold = 0.5; threshold <= 0.95; threshold += 0.05) {
      const validTrades = tradesWithConfidence.filter(trade => trade.confidence >= threshold)
      if (validTrades.length === 0) continue

      const accuracy = validTrades.filter(trade => trade.pnl > 0).length / validTrades.length
      const avgPnL = validTrades.reduce((sum, trade) => sum + trade.pnl, 0) / validTrades.length

      const score = accuracy * 0.7 + (avgPnL > 0 ? 0.3 : 0)

      if (score > bestScore) {
        bestScore = score
        bestThreshold = threshold
      }
    }

    return bestThreshold
  }

  // Generate simulated learning data for demo
  const generateSimulatedLearningData = (): LearningData => {
    const tradeCount = Math.floor(Math.random() * 150) + 25 // 25-175 trades
    const learningProgress = Math.min(100, (tradeCount / 50) * 100) // 50 trades = 100%
    const hasInsights = tradeCount >= 50

    const insights: LearningInsights | null = hasInsights ? {
      overallAccuracy: 0.62 + Math.random() * 0.25, // 62-87%
      confidenceCalibration: 0.65 + Math.random() * 0.30, // 65-95%
      strongestPatterns: [
        'High RSI momentum continuation',
        'Low volatility breakouts',
        'Volume spike reversals'
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      weakestPatterns: [
        'Flat market conditions',
        'High volatility whipsaws',
        'Weekend gap scenarios'
      ].slice(0, Math.floor(Math.random() * 2) + 1),
      optimalConfidenceThreshold: 0.68 + Math.random() * 0.15, // 68-83%
      bestPerformingConditions: {
        volatilityRange: [0.15, 0.35] as [number, number],
        volumeRange: [250000, 850000] as [number, number],
        momentumRange: [-0.03, 0.08] as [number, number]
      },
      recommendedAdjustments: {
        confidenceThresholds: {
          minimum: 0.65 + Math.random() * 0.05,
          conservative: 0.75 + Math.random() * 0.05,
          aggressive: 0.85 + Math.random() * 0.05
        },
        positionSizing: {
          baseMultiplier: 0.9 + Math.random() * 0.4, // 0.9-1.3
          confidenceMultiplier: 1.4 + Math.random() * 0.8 // 1.4-2.2
        }
      }
    } : null

    // Generate accuracy trend (last 14 days)
    const accuracyTrend = Array.from({ length: 14 }, (_, i) => {
      const baseAccuracy = insights?.overallAccuracy || 0.55
      const variation = (Math.random() - 0.5) * 0.2 // ±10%
      return Math.max(0.3, Math.min(0.95, baseAccuracy + variation))
    })

    return {
      insights,
      accuracyTrend,
      tradeHistoryCount: tradeCount,
      learningProgress,
      isLearning: tradeCount > 0,
      lastAnalysisTime: hasInsights ? new Date(Date.now() - Math.random() * 3600000) : null
    }
  }

  useEffect(() => {
    fetchLearningData()

    const interval = setInterval(fetchLearningData, refreshInterval)
    return () => clearInterval(interval)
  }, [userId, refreshInterval])

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 0.75) return { label: 'Excellent', color: 'green' }
    if (accuracy >= 0.65) return { label: 'Good', color: 'blue' }
    if (accuracy >= 0.55) return { label: 'Fair', color: 'yellow' }
    return { label: 'Learning', color: 'orange' }
  }

  const getLearningStatus = () => {
    if (learningData.tradeHistoryCount < 25) return 'Collecting Data'
    if (learningData.tradeHistoryCount < 50) return 'Initial Learning'
    if (learningData.insights && learningData.insights.overallAccuracy > 0.7) return 'Optimized'
    return 'Active Learning'
  }

  return {
    learningData,
    isLoading,
    error,
    formatPercent,
    getAccuracyStatus,
    getLearningStatus,
    refreshData: fetchLearningData
  }
}