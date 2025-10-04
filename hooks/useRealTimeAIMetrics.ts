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

export interface AILearningData {
  id: string
  outcome: 'profit' | 'loss' | 'breakeven'
  profit_loss: number
  confidence_score: number
  strategy_used: string
  created_at: string
}

export interface BotMetrics {
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

// Fetch comprehensive AI metrics from new endpoint
async function fetchAIMetrics(): Promise<any> {
  const response = await fetch('/api/ai/metrics')

  if (!response.ok) {
    throw new Error('Failed to fetch AI metrics')
  }

  const result = await response.json()
  return result.data
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

  // Query comprehensive AI metrics with Alpaca API + Supabase integration
  const metricsQuery = useQuery({
    queryKey: ['ai-metrics-real-time'],
    queryFn: fetchAIMetrics,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time data
    staleTime: 2000,
  })

  // Update metrics when data changes
  useEffect(() => {
    const data = metricsQuery.data

    if (data) {
      setMetrics({
        // AI Learning Progress (from Supabase)
        accuracy: data.learning?.accuracy || 0,
        patternsIdentified: data.learning?.patternsIdentified || 0,
        dataPointsProcessed: data.learning?.dataPointsProcessed || 0,

        // Trading Performance (from Alpaca + Supabase)
        successRate: data.performance?.successRate || 0,
        tradesExecuted: data.performance?.tradesExecuted || 0,
        recommendationsGenerated: data.performance?.recommendationsGenerated || 0,
        riskScore: data.performance?.riskScore || 0,
        totalPnL: data.portfolio?.totalPnL || 0,
        dailyPnL: data.portfolio?.dailyPnL || 0,

        // Real-time Alpaca Portfolio Data
        portfolioValue: data.portfolio?.investedAmount || 0,
        equity: data.portfolio?.investedAmount || 0,
        buyingPower: 0, // Will be added in future enhancement
        cash: 0, // Will be added in future enhancement
        investedAmount: data.portfolio?.investedAmount || 0,
        unrealizedPnL: data.portfolio?.totalPnL || 0,

        // Activity Stats
        recentActivities: data.performance?.tradesExecuted || 0,
        isLearningActive: data.learning?.isLearningActive || false,
        lastActivity: data.learning?.lastUpdate || null,
        positionCount: data.portfolio?.positionCount || 0
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