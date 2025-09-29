'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getCurrentUserId } from '@/lib/auth/demo-user'

interface AIMetrics {
  // Learning Progress
  accuracy: number
  patternsIdentified: number
  dataPointsProcessed: number

  // Performance Metrics
  successRate: number
  tradesExecuted: number
  recommendationsGenerated: number
  riskScore: number
  totalPnL: number
  dailyPnL: number

  // Activity Stats
  recentActivities: number
  isLearningActive: boolean
  lastActivity: string | null
}

interface AILearningData {
  id: string
  outcome: 'profit' | 'loss' | 'breakeven'
  profit_loss: number
  confidence_score: number
  strategy_used: string
  created_at: string
}

interface BotMetrics {
  trades_executed: number
  recommendations_generated: number
  success_rate: number
  total_pnl: number
  daily_pnl: number
  risk_score: number
  is_running: boolean
  last_activity: string | null
}

interface ActivityLog {
  id: string
  type: string
  message: string
  created_at: string
}

// Fetch AI learning data from Supabase
async function fetchAILearningData(): Promise<AILearningData[]> {
  const userId = getCurrentUserId()
  const response = await fetch(`/api/ai-learning?userId=${userId}&type=metrics`)

  if (!response.ok) {
    throw new Error('Failed to fetch AI learning data')
  }

  const data = await response.json()
  return data.metrics || []
}

// Fetch bot metrics from Supabase
async function fetchBotMetrics(): Promise<BotMetrics | null> {
  const userId = getCurrentUserId()
  const response = await fetch(`/api/ai-bot?userId=${userId}&action=metrics`)

  if (!response.ok) {
    throw new Error('Failed to fetch bot metrics')
  }

  const data = await response.json()
  return data.metrics || null
}

// Fetch recent activity logs
async function fetchActivityLogs(): Promise<ActivityLog[]> {
  const response = await fetch('/api/ai-bot-activity?limit=10')

  if (!response.ok) {
    throw new Error('Failed to fetch activity logs')
  }

  const data = await response.json()
  return data.activities || []
}

export function useRealTimeAIMetrics() {
  const [metrics, setMetrics] = useState<AIMetrics>({
    accuracy: 0,
    patternsIdentified: 0,
    dataPointsProcessed: 0,
    successRate: 0,
    tradesExecuted: 0,
    recommendationsGenerated: 0,
    riskScore: 0,
    totalPnL: 0,
    dailyPnL: 0,
    recentActivities: 0,
    isLearningActive: false,
    lastActivity: null
  })

  // Query AI learning data
  const learningQuery = useQuery({
    queryKey: ['ai-learning-data'],
    queryFn: fetchAILearningData,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  })

  // Query bot metrics
  const metricsQuery = useQuery({
    queryKey: ['bot-metrics'],
    queryFn: fetchBotMetrics,
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 1000,
  })

  // Query activity logs
  const activityQuery = useQuery({
    queryKey: ['activity-logs'],
    queryFn: fetchActivityLogs,
    refetchInterval: 2000, // Refetch every 2 seconds
    staleTime: 500,
  })

  // Calculate metrics when data changes
  useEffect(() => {
    const learningData = Array.isArray(learningQuery.data) ? learningQuery.data : []
    const botMetrics = metricsQuery.data
    const activities = Array.isArray(activityQuery.data) ? activityQuery.data : []

    // Calculate learning metrics
    const totalDataPoints = learningData.length
    const profitableTradesCount = learningData.filter(trade => trade.outcome === 'profit').length
    const accuracy = totalDataPoints > 0 ? (profitableTradesCount / totalDataPoints) : 0

    // Estimate patterns identified (simplified calculation)
    const uniqueStrategies = new Set(learningData.map(trade => trade.strategy_used)).size
    const patternsIdentified = uniqueStrategies * 3 + Math.floor(totalDataPoints / 10)

    // Get recent activity count (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentActivities = activities.filter(activity =>
      new Date(activity.created_at) > oneDayAgo
    ).length

    setMetrics({
      // Learning Progress
      accuracy,
      patternsIdentified,
      dataPointsProcessed: totalDataPoints,

      // Performance Metrics
      successRate: botMetrics?.success_rate || 0,
      tradesExecuted: botMetrics?.trades_executed || 0,
      recommendationsGenerated: botMetrics?.recommendations_generated || 0,
      riskScore: botMetrics?.risk_score || 0,
      totalPnL: botMetrics?.total_pnl || 0,
      dailyPnL: botMetrics?.daily_pnl || 0,

      // Activity Stats
      recentActivities,
      isLearningActive: botMetrics?.is_running || false,
      lastActivity: botMetrics?.last_activity || activities[0]?.created_at || null
    })
  }, [learningQuery.data, metricsQuery.data, activityQuery.data])

  return {
    metrics,
    isLoading: learningQuery.isLoading || metricsQuery.isLoading || activityQuery.isLoading,
    error: learningQuery.error || metricsQuery.error || activityQuery.error,
    refetch: () => {
      learningQuery.refetch()
      metricsQuery.refetch()
      activityQuery.refetch()
    }
  }
}