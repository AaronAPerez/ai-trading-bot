import { SignalEngine, SignalContext } from './SignalEngine'
import { RiskEngine, RiskContext, RiskConfig } from './RiskEngine'
import { ExecutionRouter, ExecutionContext } from './ExecutionRouter'
import { AnalyticsEngine, AnalyticsContext } from './AnalyticsEngine'
import { LearningEngine, LearningContext } from './LearningEngine'
import { supabaseService } from '@/lib/database/supabase-utils'

export interface HedgeFundEngineConfig {
  userId: string
  mode?: 'paper' | 'live'
  riskConfig?: Partial<RiskConfig>
  sessionId?: string
}

export interface CycleContext {
  symbol: string
  strategy?: string
  userId: string
  mode?: 'paper' | 'live'
  positionSize?: number
  useNotional?: boolean
  notionalAmount?: number
  dryRun?: boolean
  orderType?: 'market' | 'limit' | 'stop' | 'stop_limit'
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok'
  stopLoss?: boolean
  takeProfit?: boolean
  sessionId?: string
  metadata?: Record<string, any>
}

export interface CycleResult {
  status: 'executed' | 'rejected' | 'hold' | 'error'
  reason: string
  signal?: any
  riskCheck?: any
  executionResult?: any
  analyticsResult?: any
  learningResult?: any
  timestamp: Date
  cycleTimeMs: number
  error?: string
}

/**
 * HedgeFundEngine - Professional trading engine with integrated signal generation,
 * risk management, execution routing, analytics, and AI learning.
 *
 * This engine orchestrates the complete trading cycle:
 * 1. Signal Generation (via multiple strategies with Alpaca market data)
 * 2. Risk Evaluation (comprehensive risk checks)
 * 3. Trade Execution (real Alpaca order placement)
 * 4. Analytics Recording (Supabase trade history)
 * 5. AI Learning (continuous strategy improvement)
 */
export class HedgeFundEngine {
  private signal: SignalEngine
  private risk: RiskEngine
  private execution: ExecutionRouter
  private analytics: AnalyticsEngine
  private learning: LearningEngine
  private config: HedgeFundEngineConfig

  constructor(config: HedgeFundEngineConfig) {
    this.config = config

    // Initialize all engines with configuration
    this.signal = new SignalEngine(config.userId)
    this.risk = new RiskEngine(config.riskConfig)
    this.execution = new ExecutionRouter(config.mode || 'paper')
    this.analytics = new AnalyticsEngine()
    this.learning = new LearningEngine()

    console.log(`🏦 HedgeFundEngine initialized for user ${config.userId} in ${config.mode || 'paper'} mode`)
  }

  /**
   * Run a complete trading cycle
   *
   * This orchestrates:
   * 1. Signal generation from strategies
   * 2. Risk evaluation and checks
   * 3. Order execution if approved
   * 4. Analytics recording
   * 5. AI learning updates
   */
  async runCycle(context: CycleContext): Promise<CycleResult> {
    const cycleStartTime = Date.now()

    try {
      console.log(`\n🔄 Starting HedgeFund Trading Cycle for ${context.symbol}`)
      console.log(`   Strategy: ${context.strategy || 'Multi-Strategy Auto-Select'}`)
      console.log(`   Mode: ${context.mode || this.config.mode}`)

      // 1. SIGNAL GENERATION
      console.log(`\n1️⃣ Generating Signal...`)
      const signalContext: SignalContext = {
        symbol: context.symbol,
        strategy: context.strategy,
        userId: context.userId,
        timeframe: '1Day'
      }

      const signal = await this.signal.generate(signalContext)
      console.log(`   ✅ Signal: ${signal.action} (${(signal.confidence * 100).toFixed(0)}% confidence)`)
      console.log(`   Strategy: ${signal.strategy}`)
      console.log(`   Reason: ${signal.reason}`)

      // 2. RISK EVALUATION
      console.log(`\n2️⃣ Evaluating Risk...`)
      const riskContext: RiskContext = {
        userId: context.userId,
        config: this.config.riskConfig as RiskConfig // RiskEngine merges with defaults
      }

      const riskCheck = await this.risk.evaluate(signal, riskContext)
      console.log(`   Risk Level: ${riskCheck.riskLevel}`)
      console.log(`   Approved: ${riskCheck.approved ? '✅' : '❌'}`)
      console.log(`   Reason: ${riskCheck.reason}`)

      if (riskCheck.warnings.length > 0) {
        console.log(`   ⚠️ Warnings:`)
        riskCheck.warnings.forEach(w => console.log(`      - ${w}`))
      }

      // If not approved, return early
      if (!riskCheck.approved) {
        const cycleTimeMs = Date.now() - cycleStartTime
        return {
          status: 'rejected',
          reason: riskCheck.reason,
          signal,
          riskCheck,
          timestamp: new Date(),
          cycleTimeMs
        }
      }

      // If signal is HOLD, return early
      if (signal.action === 'HOLD') {
        const cycleTimeMs = Date.now() - cycleStartTime
        return {
          status: 'hold',
          reason: 'Signal recommends HOLD',
          signal,
          riskCheck,
          timestamp: new Date(),
          cycleTimeMs
        }
      }

      // 3. EXECUTION
      console.log(`\n3️⃣ Executing Trade...`)
      const executionContext: ExecutionContext = {
        userId: context.userId,
        mode: context.mode || this.config.mode,
        orderType: context.orderType,
        timeInForce: context.timeInForce,
        positionSize: context.positionSize,
        useNotional: context.useNotional,
        notionalAmount: context.notionalAmount,
        dryRun: context.dryRun,
        stopLoss: context.stopLoss,
        takeProfit: context.takeProfit
      }

      const executionResult = await this.execution.execute(signal, riskCheck, executionContext)

      if (executionResult.success) {
        console.log(`   ✅ Execution Successful`)
        console.log(`   Order ID: ${executionResult.orderId}`)
        console.log(`   Price: $${executionResult.price?.toFixed(2) || 'N/A'}`)
        console.log(`   Quantity: ${executionResult.quantity || executionResult.notional}`)
        console.log(`   Latency: ${executionResult.latencyMs}ms`)
      } else {
        console.log(`   ❌ Execution Failed: ${executionResult.error}`)
      }

      // 4. ANALYTICS
      console.log(`\n4️⃣ Recording Analytics...`)
      const analyticsContext: AnalyticsContext = {
        userId: context.userId,
        strategy: signal.strategy,
        sessionId: context.sessionId || this.config.sessionId,
        metadata: context.metadata
      }

      const analyticsResult = await this.analytics.record(executionResult, analyticsContext)
      console.log(`   ✅ Analytics Recorded`)

      // 5. LEARNING
      console.log(`\n5️⃣ Updating AI Learning...`)
      const learningContext: LearningContext = {
        userId: context.userId,
        strategy: signal.strategy,
        sessionId: context.sessionId || this.config.sessionId
      }

      const learningResult = await this.learning.update(signal, executionResult, learningContext)
      console.log(`   ✅ Learning Updated`)

      const cycleTimeMs = Date.now() - cycleStartTime
      console.log(`\n✅ Cycle Complete (${cycleTimeMs}ms)`)

      return {
        status: executionResult.success ? 'executed' : 'error',
        reason: executionResult.success
          ? `Trade executed successfully`
          : executionResult.error || 'Execution failed',
        signal,
        riskCheck,
        executionResult,
        analyticsResult,
        learningResult,
        timestamp: new Date(),
        cycleTimeMs
      }

    } catch (error: any) {
      const cycleTimeMs = Date.now() - cycleStartTime
      console.error(`\n❌ Cycle Error:`, error)

      return {
        status: 'error',
        reason: `Cycle error: ${error.message}`,
        timestamp: new Date(),
        cycleTimeMs,
        error: error.message
      }
    }
  }

  /**
   * Get signal engine for advanced signal analysis
   */
  getSignalEngine(): SignalEngine {
    return this.signal
  }

  /**
   * Get risk engine for risk configuration
   */
  getRiskEngine(): RiskEngine {
    return this.risk
  }

  /**
   * Get execution router for order management
   */
  getExecutionRouter(): ExecutionRouter {
    return this.execution
  }

  /**
   * Get analytics engine for performance metrics
   */
  getAnalyticsEngine(): AnalyticsEngine {
    return this.analytics
  }

  /**
   * Get learning engine for AI insights
   */
  getLearningEngine(): LearningEngine {
    return this.learning
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<HedgeFundEngineConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.mode) {
      this.execution.setMode(config.mode)
    }

    if (config.riskConfig) {
      this.risk.updateConfig(config.riskConfig)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): HedgeFundEngineConfig {
    return { ...this.config }
  }

  /**
   * Test all engine connections
   */
  async testConnections(): Promise<{
    alpaca: boolean
    supabase: boolean
    overallStatus: 'healthy' | 'degraded' | 'offline'
  }> {
    try {
      const alpacaTest = await this.execution.testConnection()
      const supabaseTest = await supabaseService.testConnection()

      const alpacaHealthy = alpacaTest.connected && alpacaTest.authenticated
      const supabaseHealthy = supabaseTest

      let overallStatus: 'healthy' | 'degraded' | 'offline'
      if (alpacaHealthy && supabaseHealthy) {
        overallStatus = 'healthy'
      } else if (alpacaHealthy || supabaseHealthy) {
        overallStatus = 'degraded'
      } else {
        overallStatus = 'offline'
      }

      return {
        alpaca: alpacaHealthy,
        supabase: supabaseHealthy,
        overallStatus
      }
    } catch (error) {
      return {
        alpaca: false,
        supabase: false,
        overallStatus: 'offline'
      }
    }
  }
}