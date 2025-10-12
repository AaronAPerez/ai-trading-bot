import { supabaseService } from '@/lib/database/supabase-utils'
import { ExecutionResult } from './ExecutionRouter'
import { SignalResult } from './SignalEngine'
import { RiskCheck } from './RiskEngine'

export interface AnalyticsContext {
  userId: string
  strategy?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface TradeAnalytics {
  tradeId?: string
  userId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  value: number
  timestamp: string
  status: string
  orderId?: string
  latencyMs: number
  slippage?: number
  strategy: string
  aiConfidence: number
  riskScore: number
  executionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  metadata: Record<string, any>
}

export interface PerformanceMetrics {
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  successRate: number
  totalVolume: number
  averageLatency: number
  averageSlippage: number
  strategyBreakdown: Record<string, { trades: number; success: number }>
  timeSeriesData: { timestamp: string; value: number }[]
}

export class AnalyticsEngine {
  private cache: Map<string, any> = new Map()
  private cacheExpiry: number = 60000 // 1 minute

  async record(
    execution: ExecutionResult,
    context: AnalyticsContext
  ): Promise<TradeAnalytics | null> {
    try {
      if (typeof window !== 'undefined') {
        console.warn('⚠️ AnalyticsEngine.record should only be called server-side')
        return null
      }

      const { userId, strategy, sessionId, metadata } = context

      // Calculate execution quality
      const executionQuality = this.calculateExecutionQuality(execution)

      // Calculate trade value
      const price = execution.price || execution.metadata.signal.metadata?.currentPrice || 0
      const quantity = execution.quantity || 0
      const value = price * quantity

      // Prepare trade analytics data
      const tradeAnalytics: TradeAnalytics = {
        userId,
        symbol: execution.symbol,
        side: execution.action.toLowerCase() as 'buy' | 'sell',
        quantity,
        price,
        value,
        timestamp: execution.timestamp.toISOString(),
        status: execution.success ? 'FILLED' : 'REJECTED',
        orderId: execution.orderId,
        latencyMs: execution.latencyMs,
        slippage: execution.slippage,
        strategy: strategy || execution.metadata.signal.strategy,
        aiConfidence: execution.metadata.signal.confidence,
        riskScore: execution.metadata.signal.riskScore,
        executionQuality,
        metadata: {
          ...metadata,
          riskMetrics: execution.metadata.riskCheck.metrics,
          riskWarnings: execution.metadata.riskCheck.warnings,
          orderStatus: execution.orderStatus,
          mode: execution.mode,
          broker: execution.broker,
          sessionId
        }
      }

      // Save to Supabase
      const savedTrade = await this.saveTradeHistory(tradeAnalytics)

      // Update aggregate metrics
      await this.updateAggregateMetrics(userId, execution)

      // Log activity
      await this.logActivity(userId, execution, context)

      return savedTrade

    } catch (error: any) {
      console.error('❌ Analytics recording failed:', error)
      return null
    }
  }

  private async saveTradeHistory(trade: TradeAnalytics) {
    try {
      const result = await supabaseService.saveTrade(trade.userId, {
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        value: trade.value,
        timestamp: trade.timestamp,
        status: trade.status,
        order_id: trade.orderId,
        ai_confidence: trade.aiConfidence
      })

      return result ? { ...trade, tradeId: result.id } : null

    } catch (error: any) {
      console.error('Failed to save trade history:', error)
      return null
    }
  }

  private async updateAggregateMetrics(userId: string, execution: ExecutionResult) {
    try {
      // Get current metrics
      const currentMetrics = await supabaseService.getBotMetrics(userId)
      const metrics = Array.isArray(currentMetrics) ? currentMetrics[0] : currentMetrics

      const totalTrades = (metrics?.total_trades || 0) + 1
      const successfulTrades = (metrics?.successful_trades || 0) + (execution.success ? 1 : 0)
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0

      await supabaseService.upsertBotMetrics(userId, {
        total_trades: totalTrades,
        successful_trades: successfulTrades,
        success_rate: successRate,
        last_trade_at: execution.timestamp.toISOString(),
        updated_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Failed to update aggregate metrics:', error)
    }
  }

  private async logActivity(
    userId: string,
    execution: ExecutionResult,
    context: AnalyticsContext
  ) {
    try {
      const message = execution.success
        ? `${execution.action} ${execution.quantity || 'N/A'} ${execution.symbol} @ $${execution.price?.toFixed(2) || 'N/A'}`
        : `Failed to ${execution.action} ${execution.symbol}: ${execution.error}`

      await supabaseService.logBotActivity(userId, {
        type: 'trade',
        symbol: execution.symbol,
        message,
        status: execution.success ? 'completed' : 'failed',
        details: JSON.stringify({
          orderId: execution.orderId,
          latency: execution.latencyMs,
          strategy: context.strategy,
          confidence: execution.metadata.signal.confidence,
          riskScore: execution.metadata.signal.riskScore
        })
      })

    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  private calculateExecutionQuality(execution: ExecutionResult): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (!execution.success) return 'POOR'

    const latency = execution.latencyMs
    const slippage = execution.slippage || 0

    // Excellent: Low latency (<500ms) and minimal slippage (<0.5%)
    if (latency < 500 && slippage < 0.005) return 'EXCELLENT'

    // Good: Reasonable latency (<1000ms) and acceptable slippage (<1%)
    if (latency < 1000 && slippage < 0.01) return 'GOOD'

    // Fair: Higher latency or slippage but still acceptable
    if (latency < 2000 && slippage < 0.02) return 'FAIR'

    return 'POOR'
  }

  /**
   * Get performance metrics for a user
   */
  async getPerformanceMetrics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics | null> {
    try {
      const cacheKey = `metrics_${userId}_${timeRange?.start}_${timeRange?.end}`
      const cached = this.getCached(cacheKey)
      if (cached) return cached

      const trades = await supabaseService.getTradeHistory(
        userId,
        1000,
        timeRange?.start
      )

      if (!trades || trades.length === 0) {
        return null
      }

      const totalTrades = trades.length
      const successfulTrades = trades.filter(t => t.status === 'FILLED').length
      const failedTrades = totalTrades - successfulTrades
      const successRate = (successfulTrades / totalTrades) * 100

      const totalVolume = trades.reduce((sum, t) => sum + (t.value || 0), 0)
      const averageLatency = 0 // Would need to store this in trades
      const averageSlippage = 0 // Would need to store this in trades

      const strategyBreakdown: Record<string, { trades: number; success: number }> = {}
      trades.forEach(trade => {
        const strategy = trade.strategy || 'unknown'
        if (!strategyBreakdown[strategy]) {
          strategyBreakdown[strategy] = { trades: 0, success: 0 }
        }
        strategyBreakdown[strategy].trades++
        if (trade.status === 'FILLED') {
          strategyBreakdown[strategy].success++
        }
      })

      const timeSeriesData = trades
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(trade => ({
          timestamp: trade.timestamp,
          value: trade.value || 0
        }))

      const metrics: PerformanceMetrics = {
        totalTrades,
        successfulTrades,
        failedTrades,
        successRate,
        totalVolume,
        averageLatency,
        averageSlippage,
        strategyBreakdown,
        timeSeriesData
      }

      this.setCached(cacheKey, metrics)
      return metrics

    } catch (error: any) {
      console.error('Failed to get performance metrics:', error)
      return null
    }
  }

  /**
   * Get recent trades for a user
   */
  async getRecentTrades(userId: string, limit: number = 20) {
    try {
      return await supabaseService.getTradeHistory(userId, limit)
    } catch (error) {
      console.error('Failed to get recent trades:', error)
      return []
    }
  }

  /**
   * Get activity logs for a user
   */
  async getActivityLogs(userId: string, limit: number = 100) {
    try {
      return await supabaseService.getBotActivityLogs(userId, limit)
    } catch (error) {
      console.error('Failed to get activity logs:', error)
      return []
    }
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key)
    if (!cached) return null

    const { data, timestamp } = cached
    if (Date.now() - timestamp > this.cacheExpiry) {
      this.cache.delete(key)
      return null
    }

    return data
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })

    // Clean up old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}