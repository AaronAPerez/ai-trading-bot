/**
 * Trade Persistence Service
 * Handles saving trade executions to Supabase database
 * Separates business logic from data persistence
 */

import { supabaseService } from '@/lib/database/supabase-utils'
import { getCurrentUserId } from '@/lib/auth/demo-user'
import { getWebSocketServerManager } from '@/lib/websocket/WebSocketServer'

export interface TradeExecutionData {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  notionalValue: number
  orderId: string
  status: 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
  confidence?: number
  aiScore?: number
  strategy?: string
  riskScore?: number
  executionTime?: number
  slippage?: number
  fees?: number
  metadata?: {
    sessionId?: string
    signalType?: string
    targetPrice?: number
    stopLoss?: number
    [key: string]: any
  }
}

export interface ExecutionMetrics {
  tradesExecuted: number
  tradesRejected: number
  totalVolume: number
  totalPnL: number
  successRate: number
}

export class TradePersistenceService {
  /**
   * Save a completed trade execution to Supabase
   */
  static async saveTrade(tradeData: TradeExecutionData): Promise<boolean> {
    try {
      const userId = getCurrentUserId()

      // Calculate PnL (simplified - would need actual exit price for real PnL)
      const pnl = 0 // Will be updated when position closes

      // Save to trade_history table
      await supabaseService.client
        .from('trade_history')
        .insert({
          user_id: userId,
          symbol: tradeData.symbol,
          side: tradeData.side,
          quantity: tradeData.quantity,
          price: tradeData.price,
          value: tradeData.notionalValue,
          timestamp: new Date().toISOString(),
          status: tradeData.status,
          strategy: tradeData.strategy || 'AI_REALTIME',
          pnl,
          fees: tradeData.fees || 0,
          order_id: tradeData.orderId,
          ai_confidence: tradeData.confidence || 0
        })

      console.log(`💾 Trade saved to Supabase: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity}`)
      return true

    } catch (error) {
      console.error('❌ Failed to save trade to Supabase:', error)
      return false
    }
  }

  /**
   * Log trade execution activity
   */
  static async logTradeActivity(
    tradeData: TradeExecutionData,
    activityType: 'trade' | 'recommendation' | 'error',
    message: string
  ): Promise<void> {
    try {
      const userId = getCurrentUserId()

      await supabaseService.logBotActivity(userId, {
        type: activityType,
        symbol: tradeData.symbol,
        message,
        status: tradeData.status === 'FILLED' ? 'completed' :
                tradeData.status === 'REJECTED' ? 'failed' : 'pending',
        execution_time: tradeData.executionTime,
        details: JSON.stringify({
          orderId: tradeData.orderId,
          quantity: tradeData.quantity,
          price: tradeData.price,
          confidence: tradeData.confidence,
          aiScore: tradeData.aiScore,
          strategy: tradeData.strategy
        }),
        metadata: tradeData.metadata || {}
      })

      console.log(`📝 Trade activity logged: ${message}`)

    } catch (error) {
      console.error('❌ Failed to log trade activity:', error)
    }
  }

  /**
   * Update bot metrics after trade execution
   */
  static async updateBotMetrics(metrics: {
    tradesExecuted?: number
    successRate?: number
    totalPnL?: number
    riskScore?: number
  }): Promise<void> {
    try {
      const userId = getCurrentUserId()

      // Get current metrics
      const currentMetrics = await supabaseService.getBotMetrics(userId)

      if (!currentMetrics) {
        console.warn('No existing bot metrics found')
        return
      }

      // Update metrics
      await supabaseService.upsertBotMetrics(userId, {
        trades_executed: (currentMetrics.trades_executed || 0) + (metrics.tradesExecuted || 0),
        success_rate: metrics.successRate !== undefined ? metrics.successRate : currentMetrics.success_rate,
        total_pnl: (currentMetrics.total_pnl || 0) + (metrics.totalPnL || 0),
        risk_score: metrics.riskScore !== undefined ? metrics.riskScore : currentMetrics.risk_score,
        last_activity: new Date().toISOString()
      })

      console.log(`📊 Bot metrics updated`)

    } catch (error) {
      console.error('❌ Failed to update bot metrics:', error)
    }
  }

  /**
   * Save trade execution with full logging and metrics update
   */
  static async saveTradeExecution(tradeData: TradeExecutionData): Promise<boolean> {
    try {
      // Save trade to database
      const saved = await this.saveTrade(tradeData)

      if (!saved) {
        return false
      }

      // Log activity
      const activityMessage = tradeData.status === 'FILLED'
        ? `Trade executed: ${tradeData.side.toUpperCase()} ${tradeData.quantity} ${tradeData.symbol} @ $${tradeData.price.toFixed(2)}`
        : `Trade ${tradeData.status.toLowerCase()}: ${tradeData.symbol}`

      await this.logTradeActivity(
        tradeData,
        tradeData.status === 'FILLED' ? 'trade' : 'error',
        activityMessage
      )

      // Update metrics (only for filled trades)
      if (tradeData.status === 'FILLED') {
        await this.updateBotMetrics({
          tradesExecuted: 1,
          totalPnL: 0 // Will be updated on position close
        })
      }

      // Broadcast via WebSocket for real-time updates
      try {
        const wsServer = getWebSocketServerManager().getServer()
        if (wsServer) {
          wsServer.broadcast({
            type: 'trade_executed',
            timestamp: new Date().toISOString(),
            data: {
              symbol: tradeData.symbol,
              side: tradeData.side,
              quantity: tradeData.quantity,
              price: tradeData.price,
              value: tradeData.notionalValue,
              orderId: tradeData.orderId,
              status: tradeData.status,
              confidence: tradeData.confidence,
              aiScore: tradeData.aiScore,
              strategy: tradeData.strategy
            }
          })
          console.log(`📡 WebSocket broadcast sent for ${tradeData.symbol} trade`)
        }
      } catch (wsError) {
        console.warn('⚠️ WebSocket broadcast failed:', wsError)
        // Don't fail the save operation if WebSocket fails
      }

      return true

    } catch (error) {
      console.error('❌ Failed to save trade execution:', error)
      return false
    }
  }

  /**
   * Save a rejected trade (for analytics)
   */
  static async saveRejectedTrade(
    symbol: string,
    reason: string,
    confidence: number,
    metadata?: any
  ): Promise<void> {
    try {
      const userId = getCurrentUserId()

      await supabaseService.logBotActivity(userId, {
        type: 'recommendation',
        symbol,
        message: `Trade rejected: ${reason}`,
        status: 'failed',
        details: JSON.stringify({
          reason,
          confidence,
          ...metadata
        })
      })

      console.log(`📊 Rejected trade logged: ${symbol} - ${reason}`)

    } catch (error) {
      console.error('❌ Failed to log rejected trade:', error)
    }
  }

  /**
   * Get execution statistics from database
   */
  static async getExecutionStats(): Promise<ExecutionMetrics | null> {
    try {
      const userId = getCurrentUserId()

      const metrics = await supabaseService.getBotMetrics(userId)

      if (!metrics) {
        return null
      }

      return {
        tradesExecuted: metrics.trades_executed || 0,
        tradesRejected: 0, // Would need to calculate from activity logs
        totalVolume: 0, // Would need to calculate from trade_history
        totalPnL: metrics.total_pnl || 0,
        successRate: metrics.success_rate || 0
      }

    } catch (error) {
      console.error('❌ Failed to get execution stats:', error)
      return null
    }
  }

  /**
   * Save position update (when position changes)
   */
  static async savePositionUpdate(
    symbol: string,
    quantity: number,
    avgPrice: number,
    currentValue: number,
    unrealizedPnL: number
  ): Promise<void> {
    try {
      const userId = getCurrentUserId()

      await supabaseService.logBotActivity(userId, {
        type: 'info',
        symbol,
        message: `Position update: ${quantity} shares @ $${avgPrice.toFixed(2)}`,
        status: 'completed',
        details: JSON.stringify({
          quantity,
          avgPrice,
          currentValue,
          unrealizedPnL,
          timestamp: new Date().toISOString()
        })
      })

    } catch (error) {
      console.error('❌ Failed to save position update:', error)
    }
  }
}

// Export singleton instance
export const tradePersistence = TradePersistenceService
