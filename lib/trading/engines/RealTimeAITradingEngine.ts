// CORE BUSINESS LOGIC LAYER (Trading Engine)

import { AIRecommendationEngine } from './AIRecommendationEngine'
import { EnhancedAutoTradeExecutor } from '../executors/AutoTradeExecutor'
import { RiskManagementEngine } from './RiskManagementEngine'
import { AILearningSystem } from '../ml/AILearningSystem'

import { ExecutionResult, AIRecommendation, TradeSignal } from '@/types/trading'
import { AlpacaClient } from '@/lib/alpaca/client'

export interface TradingEngineConfig {
  execution: any
  ai: any
  risk: any
  market?: any
}

interface TradingCycleResult {
  cycleId: string
  duration: number
  recommendationsGenerated: number
  tradesExecuted: number
  riskScore: number
  success: boolean
  errors?: string[]
}

export class RealTimeAITradingEngine {
  initialize() {
    throw new Error('Method not implemented.')
  }
  shutdown() {
    throw new Error('Method not implemented.')
  }
  getCurrentRiskLevel(): string {
    throw new Error('Method not implemented.')
  }
  getTotalVolume(): number {
    throw new Error('Method not implemented.')
  }
  getSuccessRate(): number {
    throw new Error('Method not implemented.')
  }
  getTradeCount(): number {
    throw new Error('Method not implemented.')
  }
  getCycleCount(): number {
    throw new Error('Method not implemented.')
  }
  private recommendationEngine: AIRecommendationEngine
  private executionEngine: EnhancedAutoTradeExecutor
  private riskEngine: RiskManagementEngine
  private learningSystem: AILearningSystem
  private isRunning = false
  private sessionId: string
  private cycleInterval?: NodeJS.Timeout

  constructor(
    private alpacaClient: AlpacaClient,
    private config: TradingEngineConfig
  ) {
    this.sessionId = `trading_${Date.now()}`
    this.recommendationEngine = new AIRecommendationEngine(config.ai, alpacaClient)
    this.riskEngine = new RiskManagementEngine(config.risk)
    this.learningSystem = new AILearningSystem()
    this.executionEngine = new EnhancedAutoTradeExecutor(
      config.execution,
      this.riskEngine,
      this.learningSystem,
      alpacaClient
    )

    console.log(`🚀 RealTimeAITradingEngine initialized with session: ${this.sessionId}`)
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Trading engine is already running')
    }

    try {
      // Initialize all subsystems
      await this.recommendationEngine.initialize()
      await this.executionEngine.initialize()
      await this.riskEngine.initialize()
      await this.learningSystem.initialize()

      this.isRunning = true
      
      // Start main trading cycle
      this.startTradingCycle()
      
      console.log(`✅ AI Trading Engine started successfully - Session: ${this.sessionId}`)
    } catch (error) {
      this.isRunning = false
      console.error('❌ Failed to start AI Trading Engine:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval)
      this.cycleInterval = undefined
    }

    // Gracefully stop all subsystems
    await this.executionEngine.shutdown()
    await this.recommendationEngine.shutdown()
    await this.riskEngine.shutdown()
    
    console.log(`🛑 AI Trading Engine stopped - Session: ${this.sessionId}`)
  }

  private startTradingCycle(): void {
    // Run trading cycle every 30 seconds
    this.cycleInterval = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.executeTradingCycle()
        } catch (error) {
          console.error('❌ Trading cycle error:', error)
        }
      }
    }, 30000)
  }

private async executeTradingCycle(): Promise<TradingCycleResult> {
    const startTime = Date.now();
    const cycleId = `cycle_${startTime}`;
    console.log(`🔄 Starting enhanced trading cycle: ${cycleId}`)

    try {
      // 1. Get current portfolio state
      const portfolio = await this.alpacaClient.getAccount()
      const positions = await this.alpacaClient.getPositions()

      // 2. Enhanced risk assessment with all components
      const riskAssessment = await this.riskEngine.assessPortfolioRisk(portfolio, positions)
      if (!riskAssessment.canTrade) {
        console.log(`⏸️ Trading paused: ${riskAssessment.reason}`)
        return this.createCycleResult(cycleId, 0, 0, 0, [riskAssessment.reason], startTime)
      }

      // 3. Generate enhanced AI recommendations
      const recommendations = await this.recommendationEngine.generateRecommendations()
      console.log(`🧠 Generated ${recommendations.length} enhanced AI recommendations`)

      // 4. Apply machine learning insights
      const learningInsights = await this.learningSystem.getLatestInsights()
      if (learningInsights) {
        // Apply dynamic confidence threshold adjustment
        const dynamicThreshold = learningInsights.optimalConfidenceThreshold
        console.log(`🎓 Applying learned confidence threshold: ${(dynamicThreshold * 100).toFixed(1)}%`)
      }

      // 5. Enhanced filtering with all analyzers
      const qualifyingRecs = recommendations.filter(rec => {
        const confidence = learningInsights ? 
          rec.confidence >= learningInsights.optimalConfidenceThreshold :
          rec.confidence >= this.config.ai.confidenceThresholds.minimum

        return (
          confidence &&
          rec.safetyChecks.passedRiskCheck &&
          rec.safetyChecks.volumeCheck &&
          rec.safetyChecks.volatilityCheck
        )
      })

      console.log(`🎯 ${qualifyingRecs.length} recommendations passed enhanced filtering`)

      // 6. Execute with comprehensive validation
      const executionResults: ExecutionResult[] = []
      const errors: string[] = []

      for (const recommendation of qualifyingRecs.slice(0, 8)) {
        try {
          const signal = this.convertToTradeSignal(recommendation)
          
          // Enhanced risk validation before execution
          const marketData = await this.alpacaClient.getMarketData(recommendation.symbol)
          const tradeValidation = await this.riskEngine.validateTrade(
            signal, portfolio, positions, marketData
          )

          if (!tradeValidation.approved) {
            console.log(`🚫 Trade rejected: ${recommendation.symbol} - ${tradeValidation.reason}`)
            continue
          }

          // Execute with risk-adjusted sizing
          const result = await this.executionEngine.evaluateAndExecute(signal, portfolio)
          executionResults.push(result)
          
          if (result.success) {
            // Track for learning
            await this.learningSystem.trackTradeEntry(
              result.orderId!,
              signal,
              marketData[marketData.length - 1],
              result.executionPrice!,
              tradeValidation.adjustedSize ?? recommendation.maxSafeAmount ?? 0
            )
            
            console.log(`✅ Enhanced execution: ${recommendation.symbol} ${recommendation.action}`)
          }
        } catch (error) {
          const errorMsg = `Failed to execute ${recommendation.symbol}: ${error.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      }

      // 7. Update learning system with cycle results
      await this.learningSystem.updateFromCycle(recommendations, executionResults)

      // 8. Generate comprehensive cycle results
      const successfulExecutions = executionResults.filter(r => r.success).length
      const totalVolume = executionResults.reduce((sum, r) => sum + (r.quantity || 0), 0)
      const avgExecutionTime = (Date.now() - startTime) / executionResults.length

      console.log(`✅ Enhanced cycle ${cycleId} complete: ${successfulExecutions}/${executionResults.length} executions`)

      return this.createCycleResult(
        cycleId, 
        recommendations.length, 
        executionResults.length, 
        successfulExecutions, 
        errors, 
        startTime,
        totalVolume,
        avgExecutionTime
      )

    } catch (error) {
      console.error(`❌ Enhanced trading cycle ${cycleId} failed:`, error)
      return this.createCycleResult(cycleId, 0, 0, 0, [error.message], startTime)
    }
  }

  private convertToTradeSignal(recommendation: AIRecommendation): TradeSignal {
    return {
      symbol: recommendation.symbol,
      action: recommendation.action,
      confidence: recommendation.confidence,
      reason: recommendation.reasoning.join('; '),
      timestamp: recommendation.timestamp,
      riskScore: recommendation.riskScore,
      strategy: 'AI_ML_ENGINE',
      metadata: {
        aiScore: recommendation.aiScore,
        targetPrice: recommendation.targetPrice,
        stopLoss: recommendation.stopLoss
      }
    }
  }

  private createCycleResult(
    cycleId: string, 
    generated: number, 
    attempted: number, 
    successful: number, 
    errors: string[], 
    startTime: number,
    totalVolume = 0,
    avgExecutionTime = 0
  ): TradingCycleResult {
    return {
      cycleId,
      recommendationsGenerated: generated,
      executionsAttempted: attempted,
      executionsSuccessful: successful,
      totalVolume,
      avgExecutionTime,
      errors,
      timestamp: new Date()
    }
  }

  // Public getters for external monitoring
  getSessionId(): string { return this.sessionId }
  isEngineRunning(): boolean { return this.isRunning }
  
  async getExecutionStats() {
    return this.executionEngine.getStats()
  }
  
  async getLearningInsights() {
    return this.learningSystem.getLatestInsights()
  }
}
