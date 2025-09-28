import { supabaseService } from './supabase-utils'
import { Database } from '../../types/supabase'

type TradeHistory = Database['public']['Tables']['trade_history']['Row']
type BotMetrics = Database['public']['Tables']['bot_metrics']['Row']

export class TradingDataManager {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async saveTrade(trade: {
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    orderId?: string
    strategy?: string
    aiConfidence?: number
  }) {
    try {
      const tradeData = {
        user_id: this.userId,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        price: trade.price,
        value: trade.quantity * trade.price,
        timestamp: new Date().toISOString(),
        status: 'FILLED' as const,
        strategy: trade.strategy || 'AI_AUTOMATED',
        order_id: trade.orderId,
        ai_confidence: trade.aiConfidence
      }

      const savedTrade = await supabaseService.saveTradeHistory(tradeData)

      await this.logActivity({
        type: 'trade',
        symbol: trade.symbol,
        message: `${trade.side.toUpperCase()} ${trade.quantity} shares of ${trade.symbol} at $${trade.price}`,
        status: 'completed'
      })

      await this.updateBotMetrics()

      return savedTrade
    } catch (error) {
      console.error('Error saving trade:', error)
      throw error
    }
  }

  async logActivity(activity: {
    type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
    symbol?: string
    message: string
    status: 'completed' | 'failed' | 'pending'
    details?: string
    executionTime?: number
  }) {
    try {
      const logData = {
        user_id: this.userId,
        timestamp: new Date().toISOString(),
        type: activity.type,
        symbol: activity.symbol,
        message: activity.message,
        status: activity.status,
        execution_time: activity.executionTime,
        details: activity.details
      }

      return await supabaseService.logBotActivity(logData)
    } catch (error) {
      console.error('Error logging activity:', error)
      throw error
    }
  }

  async updateBotMetrics(isRunning?: boolean) {
    try {
      const trades = await supabaseService.getTradeHistory(this.userId)
      const currentMetrics = await supabaseService.getBotMetrics(this.userId)

      const totalTrades = trades.length
      const successfulTrades = trades.filter(t => t.pnl && t.pnl > 0).length
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0
      const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0)

      const today = new Date().toDateString()
      const todaysTrades = trades.filter(t => new Date(t.created_at).toDateString() === today)
      const dailyPnL = todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

      const metricsData = {
        is_running: isRunning ?? currentMetrics?.is_running ?? false,
        uptime: currentMetrics?.uptime ?? 0,
        trades_executed: totalTrades,
        recommendations_generated: currentMetrics?.recommendations_generated ?? 0,
        success_rate: successRate,
        total_pnl: totalPnL,
        daily_pnl: dailyPnL,
        risk_score: this.calculateRiskScore(trades),
        last_activity: new Date().toISOString()
      }

      return await supabaseService.updateBotMetrics(this.userId, metricsData)
    } catch (error) {
      console.error('Error updating bot metrics:', error)
      throw error
    }
  }

  async saveAILearning(learning: {
    tradeId?: string
    symbol: string
    outcome: 'profit' | 'loss' | 'breakeven'
    profitLoss: number
    confidenceScore: number
    marketConditions: Record<string, any>
    technicalIndicators: Record<string, any>
    strategy: string
    sentimentScore?: number
  }) {
    try {
      const learningData = {
        user_id: this.userId,
        trade_id: learning.tradeId,
        symbol: learning.symbol,
        outcome: learning.outcome,
        profit_loss: learning.profitLoss,
        confidence_score: learning.confidenceScore,
        market_conditions: learning.marketConditions,
        sentiment_score: learning.sentimentScore,
        technical_indicators: learning.technicalIndicators,
        strategy_used: learning.strategy
      }

      return await supabaseService.saveAILearningData(learningData)
    } catch (error) {
      console.error('Error saving AI learning data:', error)
      throw error
    }
  }

  async getPortfolioSummary() {
    try {
      return await supabaseService.getPortfolioSummary(this.userId)
    } catch (error) {
      console.error('Error getting portfolio summary:', error)
      throw error
    }
  }

  async getRecentActivity(limit = 50) {
    try {
      return await supabaseService.getBotActivityLogs(this.userId, limit)
    } catch (error) {
      console.error('Error getting recent activity:', error)
      throw error
    }
  }

  private calculateRiskScore(trades: TradeHistory[]): number {
    if (trades.length === 0) return 0

    const recentTrades = trades.slice(0, 20) // Last 20 trades
    const losses = recentTrades.filter(t => t.pnl && t.pnl < 0)
    const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losses.length : 0
    const lossRate = losses.length / recentTrades.length

    // Risk score from 0-100 (higher = more risky)
    return Math.min(100, (lossRate * 50) + (avgLoss / 1000 * 50))
  }
}

export const createTradingDataManager = (userId: string) => new TradingDataManager(userId)