"use client"

import React, { useState, useEffect } from 'react'
import { Brain, Target, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'

interface LearningStats {
  totalTrades: number
  accuracy: number
  learningProgress: number
  lastUpdate: Date | null
  isActive: boolean
  patternCount: number
}

interface OptimizedAILearningProps {
  botIsActive?: boolean
  compact?: boolean
}

export default function OptimizedAILearning({
  botIsActive = false,
  compact = false
}: OptimizedAILearningProps) {
  const [stats, setStats] = useState<LearningStats>({
    totalTrades: 0,
    accuracy: 0,
    learningProgress: 0,
    lastUpdate: null,
    isActive: false,
    patternCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date>(new Date(0))

  // Fetch data only when bot becomes active or on manual refresh
  const fetchLearningStats = async () => {
    try {
      const userId = getCurrentUserId()

      // Get trade history count and recent data
      const trades = await supabaseService.getTradeHistory(userId, 100)
      const completedTrades = trades.filter(trade =>
        trade.status === 'FILLED' && trade.pnl !== null
      )

      // Calculate basic stats
      const profitable = completedTrades.filter(trade => trade.pnl > 0)
      const accuracy = completedTrades.length > 0 ? (profitable.length / completedTrades.length) : 0
      const progress = Math.min(100, (completedTrades.length / 50) * 100) // 50 trades = 100%

      // Get AI learning data
      const learningData = await supabaseService.getAILearningData(userId)
      const patternCount = learningData.length

      setStats({
        totalTrades: completedTrades.length,
        accuracy: accuracy,
        learningProgress: progress,
        lastUpdate: learningData.length > 0 ? new Date(learningData[0].created_at) : null,
        isActive: botIsActive,
        patternCount: patternCount
      })

      setLastFetch(new Date())
    } catch (error) {
      console.error('Failed to fetch learning stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Only fetch on mount and when bot becomes active (not continuous)
  useEffect(() => {
    // Only fetch if we haven't fetched recently (5 minutes) or bot just became active
    const shouldFetch = (Date.now() - lastFetch.getTime()) > 300000 || botIsActive

    if (shouldFetch) {
      fetchLearningStats()
    }
  }, [botIsActive]) // Only depend on botIsActive, not continuous polling

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.75) return 'text-green-400'
    if (accuracy >= 0.65) return 'text-blue-400'
    if (accuracy >= 0.55) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-400'
    if (progress >= 70) return 'bg-blue-400'
    if (progress >= 50) return 'bg-yellow-400'
    return 'bg-orange-400'
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900/40 rounded-lg border border-gray-700/50 p-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-sm text-gray-300">Loading AI learning data...</span>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-700/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-white">AI Learning</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${botIsActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-400">Accuracy</div>
            <div className={`font-bold ${getAccuracyColor(stats.accuracy)}`}>
              {formatPercent(stats.accuracy)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Trades</div>
            <div className="text-white font-bold">{stats.totalTrades}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-700/50 shadow-2xl">
      <div className="p-4 border-b border-purple-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h4 className="text-lg font-semibold text-white">🧠 AI Learning System</h4>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${botIsActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-xs text-gray-300">
              {botIsActive ? 'Active Learning' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Learning Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Learning Progress</span>
            <span className="text-sm font-medium text-white">{stats.learningProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(stats.learningProgress)}`}
              style={{ width: `${stats.learningProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {stats.totalTrades}/50 trades analyzed
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Accuracy</span>
            </div>
            <div className={`text-lg font-bold ${getAccuracyColor(stats.accuracy)}`}>
              {formatPercent(stats.accuracy)}
            </div>
            <div className="text-xs text-gray-500">
              {stats.totalTrades > 0 ? `${Math.round(stats.accuracy * stats.totalTrades)} profitable` : 'No trades yet'}
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Patterns</span>
            </div>
            <div className="text-lg font-bold text-blue-400">{stats.patternCount}</div>
            <div className="text-xs text-gray-500">Identified</div>
          </div>
        </div>

        {/* Status */}
        <div className="border-t border-purple-700/30 pt-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                Last update: {stats.lastUpdate ?
                  stats.lastUpdate.toLocaleTimeString() :
                  'Never'
                }
              </span>
            </div>
            <button
              onClick={fetchLearningStats}
              className="flex items-center space-x-1 px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded text-purple-300 hover:text-white transition-colors"
            >
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Recommendations */}
        {stats.totalTrades < 10 && (
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-orange-200 font-medium">Need More Data</div>
                <div className="text-orange-300/80">
                  Execute {10 - stats.totalTrades} more trades for meaningful learning insights
                </div>
              </div>
            </div>
          </div>
        )}

        {stats.accuracy > 0.75 && stats.totalTrades >= 20 && (
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-green-200 font-medium">Excellent Performance</div>
                <div className="text-green-300/80">
                  AI is performing well with {formatPercent(stats.accuracy)} accuracy
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}