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

  // Real-time Alpaca Portfolio Data
  portfolioValue: number
  equity: number
  buyingPower: number
  cash: number
  investedAmount: number
  unrealizedPnL: number

  // Activity Stats
  recentActivities: number
  isLearningActive: boolean
  lastActivity: string | null
  positionCount: number
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

// Fetch comprehensive bot metrics with Alpaca API integration
async function fetchBotMetrics(): Promise<any> {
  const userId = getCurrentUserId()
  const response = await fetch(`/api/bot/metrics?userId=${userId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch bot metrics')
  }

  const data = await response.json()
  return data
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
    portfolioValue: 0,
    equity: 0,
    buyingPower: 0,
    cash: 0,
    investedAmount: 0,
    unrealizedPnL: 0,
    recentActivities: 0,
    isLearningActive: false,
    lastActivity: null,
    positionCount: 0
  })

  // Query comprehensive bot metrics with Alpaca API integration
  const metricsQuery = useQuery({
    queryKey: ['bot-metrics-alpaca'],
    queryFn: fetchBotMetrics,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time data
    staleTime: 2000,
  })

  // Update metrics when data changes
  useEffect(() => {
    const data = metricsQuery.data

    if (data) {
      setMetrics({
        // AI Learning Progress (from Supabase)
        accuracy: data.accuracy || 0,
        patternsIdentified: data.patternsIdentified || 0,
        dataPointsProcessed: data.dataPointsProcessed || 0,

        // Trading Performance (from Alpaca + Supabase)
        successRate: data.successRate || 0,
        tradesExecuted: data.tradesExecuted || 0,
        recommendationsGenerated: data.recommendationsGenerated || 0,
        riskScore: data.riskScore || 0,
        totalPnL: data.totalPnL || 0,
        dailyPnL: data.dailyPnL || 0,

        // Real-time Alpaca Portfolio Data
        portfolioValue: data.portfolioValue || 0,
        equity: data.equity || 0,
        buyingPower: data.buyingPower || 0,
        cash: data.cash || 0,
        investedAmount: data.investedAmount || 0,
        unrealizedPnL: data.unrealizedPnL || 0,

        // Activity Stats
        recentActivities: data.todayTrades || 0,
        isLearningActive: data.isLearningActive || data.isRunning || false,
        lastActivity: data.lastActivity || data.lastTradeTime || null,
        positionCount: data.positionCount || 0
      })
    }
  }, [metricsQuery.data])

  return {
    metrics,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    refetch: () => {
      metricsQuery.refetch()
    },
    dataSources: metricsQuery.data?.dataSources || { alpaca: false, supabase: false, positions: 0, orders: 0 }
  }
}