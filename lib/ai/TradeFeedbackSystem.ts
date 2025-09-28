import { supabaseService } from '@/lib/database/supabase-utils'
import { newsApiService } from '@/lib/sentiment/newsApiService'
import { MarketData } from '@/types/trading'

interface TradeResult {
  tradeId: string
  symbol: string
  entryPrice: number
  exitPrice: number
  quantity: number
  side: 'buy' | 'sell'
  entryTime: Date
  exitTime: Date
  pnl: number
  strategy: string
  aiConfidence: number
  marketConditionsAtEntry: Record<string, any>
  marketConditionsAtExit: Record<string, any>
}

interface LearningMetrics {
  accuracy: number
  profitFactor: number
  avgWinRate: number
  avgLossRate: number
  sharpeRatio: number
  maxDrawdown: number
}

export class TradeFeedbackSystem {
  private learningHistory: Map<string, any[]> = new Map()

  async recordTradeOutcome(tradeResult: TradeResult, userId: string): Promise<void> {
    try {
      // Determine outcome
      const outcome = tradeResult.pnl > 0 ? 'profit' : tradeResult.pnl < 0 ? 'loss' : 'breakeven'

      // Get sentiment data from entry time
      const sentimentAtEntry = await this.getSentimentAtTime(tradeResult.symbol, tradeResult.entryTime)

      // Calculate technical indicators at entry
      const technicalIndicators = this.calculateTechnicalIndicators(tradeResult.marketConditionsAtEntry)

      // Store learning data
      await supabaseService.saveAILearningData({
        user_id: userId,
        trade_id: tradeResult.tradeId,
        symbol: tradeResult.symbol,
        outcome,
        profit_loss: tradeResult.pnl,
        confidence_score: tradeResult.aiConfidence,
        market_conditions: {
          entry: tradeResult.marketConditionsAtEntry,
          exit: tradeResult.marketConditionsAtExit,
          sentiment_at_entry: sentimentAtEntry,
          trade_duration_hours: this.calculateTradeDuration(tradeResult.entryTime, tradeResult.exitTime)
        },
        sentiment_score: sentimentAtEntry?.sentimentScore || 0,
        technical_indicators: technicalIndicators,
        strategy_used: tradeResult.strategy,
        learned_patterns: await this.extractLearningPatterns(tradeResult)
      })

      // Update learning models
      await this.updateLearningModels(tradeResult, outcome, userId)

    } catch (error) {
      console.error('Error recording trade outcome:', error)
    }
  }

  async getLearningMetrics(userId: string, symbol?: string): Promise<LearningMetrics> {
    try {
      const learningData = await supabaseService.getAILearningData(userId, symbol)

      if (learningData.length === 0) {
        return {
          accuracy: 0,
          profitFactor: 0,
          avgWinRate: 0,
          avgLossRate: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      }

      const totalTrades = learningData.length
      const profitableTrades = learningData.filter(t => t.outcome === 'profit').length
      const accuracy = profitableTrades / totalTrades

      const profits = learningData.filter(t => t.outcome === 'profit').map(t => t.profit_loss)
      const losses = learningData.filter(t => t.outcome === 'loss').map(t => Math.abs(t.profit_loss))

      const totalProfits = profits.reduce((sum, p) => sum + p, 0)
      const totalLosses = losses.reduce((sum, l) => sum + l, 0)
      const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits

      const avgWinRate = profits.length > 0 ? totalProfits / profits.length : 0
      const avgLossRate = losses.length > 0 ? totalLosses / losses.length : 0

      const returns = learningData.map(t => t.profit_loss)
      const sharpeRatio = this.calculateSharpeRatio(returns)
      const maxDrawdown = this.calculateMaxDrawdown(returns)

      return {
        accuracy,
        profitFactor,
        avgWinRate,
        avgLossRate,
        sharpeRatio,
        maxDrawdown
      }
    } catch (error) {
      console.error('Error getting learning metrics:', error)
      return {
        accuracy: 0,
        profitFactor: 0,
        avgWinRate: 0,
        avgLossRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    }
  }

  async getStrategyPerformance(userId: string): Promise<Record<string, LearningMetrics>> {
    try {
      const learningData = await supabaseService.getAILearningData(userId)
      const strategies = [...new Set(learningData.map(d => d.strategy_used))]

      const performance: Record<string, LearningMetrics> = {}

      for (const strategy of strategies) {
        const strategyData = learningData.filter(d => d.strategy_used === strategy)
        performance[strategy] = await this.calculateMetricsForData(strategyData)
      }

      return performance
    } catch (error) {
      console.error('Error getting strategy performance:', error)
      return {}
    }
  }

  async getImprovedConfidenceThresholds(userId: string, symbol: string): Promise<{
    buyThreshold: number
    sellThreshold: number
    recommendedAdjustment: string
  }> {
    try {
      const learningData = await supabaseService.getAILearningData(userId, symbol)

      if (learningData.length < 10) {
        return {
          buyThreshold: 0.7,
          sellThreshold: 0.7,
          recommendedAdjustment: 'Insufficient data for optimization'
        }
      }

      // Analyze confidence vs outcome correlation
      const confidenceRanges = [
        { min: 0.9, max: 1.0, label: 'Very High' },
        { min: 0.8, max: 0.9, label: 'High' },
        { min: 0.7, max: 0.8, label: 'Medium' },
        { min: 0.6, max: 0.7, label: 'Low' }
      ]

      let bestBuyThreshold = 0.7
      let bestSellThreshold = 0.7
      let bestAccuracy = 0

      for (const range of confidenceRanges) {
        const tradesInRange = learningData.filter(t =>
          t.confidence_score >= range.min && t.confidence_score < range.max
        )

        if (tradesInRange.length >= 5) {
          const profitable = tradesInRange.filter(t => t.outcome === 'profit').length
          const accuracy = profitable / tradesInRange.length

          if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy
            bestBuyThreshold = range.min
            bestSellThreshold = range.min
          }
        }
      }

      const recommendation = bestAccuracy > 0.6
        ? `Confidence threshold optimized. Current accuracy: ${(bestAccuracy * 100).toFixed(1)}%`
        : 'Consider increasing confidence thresholds or reviewing strategy'

      return {
        buyThreshold: bestBuyThreshold,
        sellThreshold: bestSellThreshold,
        recommendedAdjustment: recommendation
      }
    } catch (error) {
      console.error('Error optimizing confidence thresholds:', error)
      return {
        buyThreshold: 0.7,
        sellThreshold: 0.7,
        recommendedAdjustment: 'Error in optimization'
      }
    }
  }

  private async getSentimentAtTime(symbol: string, time: Date) {
    try {
      // For historical sentiment, we'd typically query our database
      // For now, return current sentiment as approximation
      return await newsApiService.getCachedSentiment(symbol, 60)
    } catch (error) {
      console.error('Error getting historical sentiment:', error)
      return null
    }
  }

  private calculateTechnicalIndicators(marketConditions: Record<string, any>): Record<string, any> {
    return {
      rsi: marketConditions.rsi || 50,
      macd: marketConditions.macd || 0,
      bollinger_position: marketConditions.bollinger_position || 0.5,
      volume_sma_ratio: marketConditions.volume_sma_ratio || 1,
      price_sma_ratio: marketConditions.price_sma_ratio || 1
    }
  }

  private calculateTradeDuration(entryTime: Date, exitTime: Date): number {
    return (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60) // hours
  }

  private async extractLearningPatterns(tradeResult: TradeResult): Promise<Record<string, any>> {
    return {
      confidence_vs_outcome: {
        confidence: tradeResult.aiConfidence,
        outcome: tradeResult.pnl > 0 ? 'profit' : 'loss',
        correlation: tradeResult.aiConfidence > 0.8 && tradeResult.pnl > 0 ? 'positive' : 'negative'
      },
      market_regime: {
        entry_trend: this.classifyTrend(tradeResult.marketConditionsAtEntry),
        exit_trend: this.classifyTrend(tradeResult.marketConditionsAtExit)
      },
      timing_analysis: {
        trade_duration_hours: this.calculateTradeDuration(tradeResult.entryTime, tradeResult.exitTime),
        entry_hour: tradeResult.entryTime.getHours(),
        exit_hour: tradeResult.exitTime.getHours()
      }
    }
  }

  private classifyTrend(marketConditions: Record<string, any>): string {
    const momentum = marketConditions.price_momentum || 0
    if (momentum > 0.02) return 'bullish'
    if (momentum < -0.02) return 'bearish'
    return 'sideways'
  }

  private async updateLearningModels(tradeResult: TradeResult, outcome: string, userId: string): Promise<void> {
    // This would update ML model weights based on trade outcomes
    // For now, we'll store the patterns for future model training
    const symbol = tradeResult.symbol
    if (!this.learningHistory.has(symbol)) {
      this.learningHistory.set(symbol, [])
    }

    this.learningHistory.get(symbol)?.push({
      outcome,
      confidence: tradeResult.aiConfidence,
      pnl: tradeResult.pnl,
      timestamp: new Date(),
      userId
    })
  }

  private async calculateMetricsForData(data: any[]): Promise<LearningMetrics> {
    if (data.length === 0) {
      return {
        accuracy: 0,
        profitFactor: 0,
        avgWinRate: 0,
        avgLossRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    }

    const totalTrades = data.length
    const profitableTrades = data.filter(t => t.outcome === 'profit').length
    const accuracy = profitableTrades / totalTrades

    const profits = data.filter(t => t.outcome === 'profit').map(t => t.profit_loss)
    const losses = data.filter(t => t.outcome === 'loss').map(t => Math.abs(t.profit_loss))

    const totalProfits = profits.reduce((sum, p) => sum + p, 0)
    const totalLosses = losses.reduce((sum, l) => sum + l, 0)
    const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits

    const avgWinRate = profits.length > 0 ? totalProfits / profits.length : 0
    const avgLossRate = losses.length > 0 ? totalLosses / losses.length : 0

    const returns = data.map(t => t.profit_loss)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    const maxDrawdown = this.calculateMaxDrawdown(returns)

    return {
      accuracy,
      profitFactor,
      avgWinRate,
      avgLossRate,
      sharpeRatio,
      maxDrawdown
    }
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    return stdDev > 0 ? avgReturn / stdDev : 0
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0

    let maxDrawdown = 0
    let peak = 0
    let cumulative = 0

    for (const ret of returns) {
      cumulative += ret
      if (cumulative > peak) {
        peak = cumulative
      }
      const drawdown = peak - cumulative
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return maxDrawdown
  }
}

export const tradeFeedbackSystem = new TradeFeedbackSystem()