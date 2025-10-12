import { supabaseService } from '@/lib/database/supabase-utils'
import { SignalResult } from './SignalEngine'
import { ExecutionResult } from './ExecutionRouter'
import { RiskCheck } from './RiskEngine'

export interface LearningContext {
  userId: string
  strategy: string
  sessionId?: string
  marketConditions?: {
    volatility: number
    trend: 'BULL' | 'BEAR' | 'SIDEWAYS'
    volume: number
  }
}

export interface LearningData {
  userId: string
  symbol: string
  strategy: string
  signalConfidence: number
  signalAction: 'BUY' | 'SELL' | 'HOLD'
  executionSuccess: boolean
  riskScore: number
  predictedOutcome: number
  actualOutcome: number
  pnl?: number
  accuracy: number
  timestamp: string
  metadata: {
    marketConditions?: any
    technicalIndicators?: any
    sentimentScore?: number
    riskMetrics?: any
    executionQuality?: string
  }
}

export interface StrategyLearning {
  strategyId: string
  strategyName: string
  totalSignals: number
  successfulSignals: number
  accuracy: number
  averageConfidence: number
  averagePnL: number
  bestConditions: {
    volatility: string
    trend: string
    volume: string
  }
  worstConditions: {
    volatility: string
    trend: string
    volume: string
  }
  recommendations: string[]
}

export class LearningEngine {
  private learningHistory: Map<string, LearningData[]> = new Map()
  private strategyPerformance: Map<string, StrategyLearning> = new Map()

  async update(
    signal: SignalResult,
    execution: ExecutionResult,
    context: LearningContext
  ): Promise<LearningData | null> {
    try {
      if (typeof window !== 'undefined') {
        console.warn('⚠️ LearningEngine.update should only be called server-side')
        return null
      }

      const { userId, strategy, sessionId, marketConditions } = context

      // Calculate actual outcome based on execution
      const predictedOutcome = this.calculatePredictedOutcome(signal)
      const actualOutcome = this.calculateActualOutcome(execution)

      // Calculate accuracy of the signal
      const accuracy = this.calculateAccuracy(predictedOutcome, actualOutcome)

      // Estimate P&L (would be updated later with actual P&L)
      const pnl = execution.price && execution.quantity
        ? execution.price * execution.quantity * (signal.action === 'BUY' ? 1 : -1)
        : undefined

      // Prepare learning data
      const learningData: LearningData = {
        userId,
        symbol: signal.symbol,
        strategy,
        signalConfidence: signal.confidence,
        signalAction: signal.action,
        executionSuccess: execution.success,
        riskScore: signal.riskScore,
        predictedOutcome,
        actualOutcome,
        pnl,
        accuracy,
        timestamp: new Date().toISOString(),
        metadata: {
          marketConditions,
          technicalIndicators: signal.metadata?.technicalIndicators,
          sentimentScore: signal.metadata?.sentimentScore,
          riskMetrics: execution.metadata.riskCheck.metrics,
          executionQuality: execution.metadata.orderResponse?.details
        }
      }

      // Save to Supabase
      await this.saveLearningData(learningData)

      // Update in-memory learning history
      this.updateLearningHistory(strategy, learningData)

      // Update strategy performance
      await this.updateStrategyPerformance(strategy, learningData)

      return learningData

    } catch (error: any) {
      console.error('❌ Learning update failed:', error)
      return null
    }
  }

  private async saveLearningData(data: LearningData): Promise<void> {
    try {
      await supabaseService.saveAILearningData({
        user_id: data.userId,
        symbol: data.symbol,
        strategy: data.strategy,
        confidence: data.signalConfidence,
        action: data.signalAction,
        success: data.executionSuccess,
        pnl: data.pnl,
        metadata: data.metadata,
        timestamp: data.timestamp
      })
    } catch (error: any) {
      console.error('Failed to save learning data:', error)
      throw error
    }
  }

  private updateLearningHistory(strategy: string, data: LearningData): void {
    const history = this.learningHistory.get(strategy) || []
    history.push(data)

    // Keep only last 1000 entries per strategy
    if (history.length > 1000) {
      history.shift()
    }

    this.learningHistory.set(strategy, history)
  }

  private async updateStrategyPerformance(
    strategy: string,
    data: LearningData
  ): Promise<void> {
    const current = this.strategyPerformance.get(strategy)

    const totalSignals = (current?.totalSignals || 0) + 1
    const successfulSignals = (current?.successfulSignals || 0) + (data.executionSuccess ? 1 : 0)
    const accuracy = (successfulSignals / totalSignals) * 100

    const averageConfidence = current
      ? (current.averageConfidence * current.totalSignals + data.signalConfidence) / totalSignals
      : data.signalConfidence

    const averagePnL = current && data.pnl
      ? (current.averagePnL * current.totalSignals + data.pnl) / totalSignals
      : data.pnl || 0

    const strategyLearning: StrategyLearning = {
      strategyId: strategy,
      strategyName: strategy,
      totalSignals,
      successfulSignals,
      accuracy,
      averageConfidence,
      averagePnL,
      bestConditions: current?.bestConditions || {
        volatility: 'unknown',
        trend: 'unknown',
        volume: 'unknown'
      },
      worstConditions: current?.worstConditions || {
        volatility: 'unknown',
        trend: 'unknown',
        volume: 'unknown'
      },
      recommendations: this.generateRecommendations(accuracy, averageConfidence, averagePnL)
    }

    this.strategyPerformance.set(strategy, strategyLearning)
  }

  private calculatePredictedOutcome(signal: SignalResult): number {
    // Predicted outcome based on signal confidence and action
    // Positive for BUY, negative for SELL, 0 for HOLD
    if (signal.action === 'HOLD') return 0
    return signal.action === 'BUY' ? signal.confidence : -signal.confidence
  }

  private calculateActualOutcome(execution: ExecutionResult): number {
    // Actual outcome based on execution success
    // Would be better with actual P&L, but this is a simplified version
    return execution.success ? 1 : -1
  }

  private calculateAccuracy(predicted: number, actual: number): number {
    // Simple accuracy calculation
    // If predicted and actual have same sign (both positive or both negative), it's accurate
    if (predicted === 0 && actual === 0) return 1
    if (predicted * actual > 0) return 1
    if (predicted * actual < 0) return 0
    return 0.5
  }

  private generateRecommendations(
    accuracy: number,
    confidence: number,
    averagePnL: number
  ): string[] {
    const recommendations: string[] = []

    if (accuracy < 50) {
      recommendations.push('Strategy accuracy is below 50% - consider reviewing parameters')
    }

    if (confidence < 0.6) {
      recommendations.push('Average confidence is low - consider stronger signal thresholds')
    }

    if (averagePnL < 0) {
      recommendations.push('Strategy is losing money on average - consider disabling or adjusting')
    } else if (averagePnL > 0) {
      recommendations.push('Strategy is profitable - consider increasing position sizes')
    }

    if (accuracy > 70 && averagePnL > 0) {
      recommendations.push('Excellent performance - this strategy is working well')
    }

    return recommendations
  }

  /**
   * Get learning insights for a specific strategy
   */
  async getStrategyInsights(
    userId: string,
    strategy: string
  ): Promise<StrategyLearning | null> {
    try {
      // Try to get from cache first
      const cached = this.strategyPerformance.get(strategy)
      if (cached) return cached

      // Otherwise, load from database
      const learningData = await supabaseService.getAILearningData(userId)
      const strategyData = learningData.filter(d => d.strategy === strategy)

      if (strategyData.length === 0) return null

      const totalSignals = strategyData.length
      const successfulSignals = strategyData.filter(d => d.success).length
      const accuracy = (successfulSignals / totalSignals) * 100

      const totalConfidence = strategyData.reduce((sum, d) => sum + (d.confidence || 0), 0)
      const averageConfidence = totalConfidence / totalSignals

      const totalPnL = strategyData.reduce((sum, d) => sum + (d.pnl || 0), 0)
      const averagePnL = totalPnL / totalSignals

      return {
        strategyId: strategy,
        strategyName: strategy,
        totalSignals,
        successfulSignals,
        accuracy,
        averageConfidence,
        averagePnL,
        bestConditions: {
          volatility: 'unknown',
          trend: 'unknown',
          volume: 'unknown'
        },
        worstConditions: {
          volatility: 'unknown',
          trend: 'unknown',
          volume: 'unknown'
        },
        recommendations: this.generateRecommendations(accuracy, averageConfidence, averagePnL)
      }

    } catch (error) {
      console.error('Failed to get strategy insights:', error)
      return null
    }
  }

  /**
   * Get all learning data for a user
   */
  async getAllLearningData(userId: string): Promise<LearningData[]> {
    try {
      const data = await supabaseService.getAILearningData(userId)

      return data.map(d => ({
        userId: d.user_id,
        symbol: d.symbol,
        strategy: d.strategy,
        signalConfidence: d.confidence || 0,
        signalAction: (d.action || 'HOLD') as 'BUY' | 'SELL' | 'HOLD',
        executionSuccess: d.success || false,
        riskScore: 0,
        predictedOutcome: 0,
        actualOutcome: d.success ? 1 : -1,
        pnl: d.pnl,
        accuracy: d.success ? 1 : 0,
        timestamp: d.timestamp || d.created_at,
        metadata: d.metadata || {}
      }))

    } catch (error) {
      console.error('Failed to get all learning data:', error)
      return []
    }
  }

  /**
   * Get performance comparison across all strategies
   */
  getStrategyComparison(): StrategyLearning[] {
    return Array.from(this.strategyPerformance.values())
      .sort((a, b) => b.accuracy - a.accuracy)
  }

  /**
   * Clear in-memory learning data
   */
  clearCache(): void {
    this.learningHistory.clear()
    this.strategyPerformance.clear()
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData(strategy?: string): LearningData[] {
    if (strategy) {
      return this.learningHistory.get(strategy) || []
    }

    const allData: LearningData[] = []
    this.learningHistory.forEach(data => {
      allData.push(...data)
    })

    return allData
  }
}