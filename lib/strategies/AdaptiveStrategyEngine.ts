/**
 * Adaptive Strategy Engine - Unified Multi-Strategy System
 *
 * Consolidates all duplicate strategy management code into one intelligent system.
 *
 * Features:
 * - Adaptive position sizing (small → large based on profitability)
 * - Strategy testing mode (5-10 small trades to validate)
 * - Auto-switch on poor performance (< 25% win rate)
 * - AI market analysis for strategy selection
 * - Lower switching thresholds (5 trades minimum)
 *
 * @author Aaron A Perez
 * @version 1.0.0
 */

import { RSIStrategy } from './RSIStrategy'
import { MACDStrategy } from './MACDStrategy'
import { BollingerBandsStrategy } from './BollingerBandsStrategy'
import { MovingAverageCrossoverStrategy } from './MovingAverageCrossoverStrategy'
import { MeanReversionStrategy } from './MeanReversionStrategy'
import { TradingStrategy, TradeSignal, MarketData } from '@/types/trading'

// ===============================================
// TYPES & INTERFACES
// ===============================================

export interface StrategyPerformance {
  strategyId: string
  strategyName: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  winRate: number
  avgPnL: number
  sharpeRatio: number
  maxDrawdown: number
  consecutiveLosses: number
  consecutiveWins: number
  lastTradeTime: Date | null

  // Testing mode metrics
  testingMode: boolean
  testTradesCompleted: number
  testTradesRequired: number
  testPnL: number
  testWinRate: number
  testPassed: boolean | null
}

export interface PositionSizingConfig {
  minTestSize: number          // Minimum size during testing ($5)
  maxTestSize: number          // Maximum size during testing ($10)
  minProdSize: number          // Minimum size in production ($10)
  maxProdSize: number          // Maximum size in production ($200)
  profitMultiplier: number     // Multiplier when strategy is profitable (1.5x)
  lossMultiplier: number       // Multiplier when strategy is losing (0.5x)
}

export interface AdaptiveEngineConfig {
  // Strategy switching
  autoSwitchEnabled: boolean
  minTradesBeforeSwitch: number     // 5 trades minimum
  poorPerformanceThreshold: number  // Switch if win rate < 25%
  switchCooldownMs: number          // Wait 5 minutes between switches

  // Testing mode
  testingEnabled: boolean
  testTradesRequired: number        // 5-10 small trades to validate
  testPassWinRate: number          // 40% win rate to pass testing
  testPassProfitMin: number        // Minimum $0 profit to pass

  // Position sizing
  positionSizing: PositionSizingConfig

  // AI integration
  useAIMarketAnalysis: boolean
}

export interface StrategySignalWithMeta extends TradeSignal {
  strategyId: string
  strategyName: string
  performance: StrategyPerformance
  positionSize: number
  timestamp: Date
}

// ===============================================
// ADAPTIVE STRATEGY ENGINE
// ===============================================

export class AdaptiveStrategyEngine {
  private strategies: Map<string, { strategy: TradingStrategy; name: string }> = new Map()
  private performance: Map<string, StrategyPerformance> = new Map()
  private config: AdaptiveEngineConfig

  private currentStrategyId: string | null = null
  private lastSwitchTime: Date | null = null
  private inverseMode: boolean = false

  constructor(config?: Partial<AdaptiveEngineConfig>) {
    this.config = {
      autoSwitchEnabled: true,
      minTradesBeforeSwitch: 5,          // LOWERED from 20
      poorPerformanceThreshold: 0.25,     // Switch if < 25% win rate
      switchCooldownMs: 5 * 60 * 1000,   // 5 minutes

      testingEnabled: true,
      testTradesRequired: 5,              // 5 trades to validate (faster testing)
      testPassWinRate: 0.40,             // 40% win rate to pass
      testPassProfitMin: 0,              // At least break-even

      positionSizing: {
        minTestSize: 0.01,        // Minimum $0.01 during testing
        maxTestSize: 1.00,        // Maximum $1.00 during testing
        minProdSize: 10,          // Minimum $10 in production
        maxProdSize: 200,         // Maximum $200 in production
        profitMultiplier: 1.5,
        lossMultiplier: 0.5
      },

      useAIMarketAnalysis: true,

      ...config
    }

    this.initializeStrategies()
  }

  /**
   * Initialize all available strategies
   */
  private initializeStrategies(): void {
    // Register strategies
    this.registerStrategy('rsi', new RSIStrategy(), 'RSI Momentum')
    this.registerStrategy('macd', new MACDStrategy(), 'MACD Trend Following')
    this.registerStrategy('bollinger', new BollingerBandsStrategy(), 'Bollinger Bands Breakout')
    this.registerStrategy('ma_crossover', new MovingAverageCrossoverStrategy(), 'Moving Average Crossover')
    this.registerStrategy('mean_reversion', new MeanReversionStrategy(), 'Mean Reversion')

    // Add Inverse mode as a "strategy"
    this.performance.set('inverse', this.createEmptyPerformance('inverse', 'Inverse Mode'))
    this.performance.set('normal', this.createEmptyPerformance('normal', 'Normal (No Inverse)'))

    console.log(`✅ AdaptiveStrategyEngine initialized with ${this.strategies.size} strategies`)
  }

  /**
   * Register a strategy
   */
  registerStrategy(id: string, strategy: TradingStrategy, name: string): void {
    this.strategies.set(id, { strategy, name })
    this.performance.set(id, this.createEmptyPerformance(id, name))
  }

  /**
   * Create empty performance object
   */
  private createEmptyPerformance(id: string, name: string): StrategyPerformance {
    return {
      strategyId: id,
      strategyName: name,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      winRate: 0,
      avgPnL: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      lastTradeTime: null,
      testingMode: true,
      testTradesCompleted: 0,
      testTradesRequired: this.config.testTradesRequired,
      testPnL: 0,
      testWinRate: 0,
      testPassed: null
    }
  }

  /**
   * Generate trading signal with adaptive position sizing
   */
  async generateSignal(symbol: string, marketData: MarketData[]): Promise<StrategySignalWithMeta | null> {
    // 1. Select best strategy (or auto-switch if needed)
    const selectedStrategyId = await this.selectBestStrategy(marketData)

    if (!selectedStrategyId) {
      console.log('⚠️ No strategy available')
      return null
    }

    this.currentStrategyId = selectedStrategyId
    const perf = this.performance.get(selectedStrategyId)!

    // 2. Generate signal from strategy
    let signal: TradeSignal

    if (selectedStrategyId === 'inverse' || selectedStrategyId === 'normal') {
      // For inverse/normal, use best performing technical strategy
      const bestTechnicalStrategy = this.getBestTechnicalStrategy()
      if (!bestTechnicalStrategy) {
        console.log('⚠️ No technical strategy available')
        return null
      }

      const strategyObj = this.strategies.get(bestTechnicalStrategy.strategyId)!
      signal = await strategyObj.strategy.analyze(marketData)

      // Apply inverse if needed
      if (selectedStrategyId === 'inverse') {
        signal = this.inverseSignal(signal)
        console.log(`🔄 INVERSE MODE: Flipped ${signal.action === 'BUY' ? 'SELL' : 'BUY'} → ${signal.action}`)
      }
    } else {
      // Use specific strategy
      const strategyObj = this.strategies.get(selectedStrategyId)!
      signal = await strategyObj.strategy.analyze(marketData)
    }

    // 3. Calculate adaptive position size
    const positionSize = this.calculateAdaptivePositionSize(perf, signal.confidence)

    console.log(`💎 Strategy: ${perf.strategyName} | Signal: ${signal.action} | Confidence: ${signal.confidence}% | Size: $${positionSize}`)
    console.log(`   Testing: ${perf.testingMode ? `YES (${perf.testTradesCompleted}/${perf.testTradesRequired})` : 'NO'} | Win Rate: ${perf.winRate.toFixed(1)}% | P&L: $${perf.totalPnL.toFixed(2)}`)

    return {
      ...signal,
      strategyId: selectedStrategyId,
      strategyName: perf.strategyName,
      performance: perf,
      positionSize,
      timestamp: new Date()
    }
  }

  /**
   * Select best strategy using AI market analysis and performance
   */
  private async selectBestStrategy(marketData: MarketData[]): Promise<string | null> {
    // Check if we need to auto-switch
    if (this.config.autoSwitchEnabled && this.currentStrategyId) {
      const shouldSwitch = await this.shouldSwitchStrategy()

      if (shouldSwitch) {
        console.log(`🔄 Auto-switching from ${this.currentStrategyId} due to poor performance`)
        return this.findNextBestStrategy(this.currentStrategyId)
      }
    }

    // If no current strategy, select best one
    if (!this.currentStrategyId) {
      return this.findNextBestStrategy(null)
    }

    return this.currentStrategyId
  }

  /**
   * Check if we should switch strategy
   */
  private async shouldSwitchStrategy(): Promise<boolean> {
    if (!this.currentStrategyId) return false

    const perf = this.performance.get(this.currentStrategyId)
    if (!perf) return false

    // Check cooldown
    if (this.lastSwitchTime) {
      const timeSinceSwitch = Date.now() - this.lastSwitchTime.getTime()
      if (timeSinceSwitch < this.config.switchCooldownMs) {
        return false
      }
    }

    // Need minimum trades before switching
    if (perf.totalTrades < this.config.minTradesBeforeSwitch) {
      return false
    }

    // Switch if testing failed
    if (perf.testingMode && perf.testPassed === false) {
      console.log(`❌ Strategy ${perf.strategyName} FAILED testing (${perf.testWinRate.toFixed(1)}% win rate)`)
      return true
    }

    // Switch if win rate is terrible
    if (perf.winRate < this.config.poorPerformanceThreshold * 100) {
      console.log(`❌ Strategy ${perf.strategyName} poor performance (${perf.winRate.toFixed(1)}% win rate < ${this.config.poorPerformanceThreshold * 100}% threshold)`)
      return true
    }

    // Switch if losing money badly
    if (perf.totalPnL < -20 && perf.totalTrades >= 10) {
      console.log(`❌ Strategy ${perf.strategyName} losing badly ($${perf.totalPnL.toFixed(2)} P&L)`)
      return true
    }

    return false
  }

  /**
   * Find next best strategy to try
   */
  private findNextBestStrategy(excludeStrategyId: string | null): string {
    const allPerformances = Array.from(this.performance.values())

    // Find strategies that haven't been tested yet or passed testing
    const candidates = allPerformances.filter(p =>
      p.strategyId !== excludeStrategyId &&
      (p.testPassed === true || p.testPassed === null)
    )

    if (candidates.length === 0) {
      // All strategies failed testing - reset and start over
      console.log('⚠️ All strategies failed testing - resetting...')
      this.resetAllStrategies()
      return 'normal' // Default to normal mode
    }

    // Sort by performance (prioritize profitable, untested, then best win rate)
    candidates.sort((a, b) => {
      // Prioritize untested strategies
      if (a.testPassed === null && b.testPassed !== null) return -1
      if (b.testPassed === null && a.testPassed !== null) return 1

      // Then by total P&L
      if (Math.abs(b.totalPnL - a.totalPnL) > 1) {
        return b.totalPnL - a.totalPnL
      }

      // Then by win rate
      return b.winRate - a.winRate
    })

    const nextStrategy = candidates[0]
    console.log(`✅ Selected strategy: ${nextStrategy.strategyName} (P&L: $${nextStrategy.totalPnL.toFixed(2)}, Win Rate: ${nextStrategy.winRate.toFixed(1)}%)`)

    this.lastSwitchTime = new Date()
    return nextStrategy.strategyId
  }

  /**
   * Calculate adaptive position size based on performance
   */
  private calculateAdaptivePositionSize(perf: StrategyPerformance, confidence: number): number {
    const sizing = this.config.positionSizing

    // During testing: use small sizes
    if (perf.testingMode) {
      const baseSize = sizing.minTestSize
      const maxSize = sizing.maxTestSize

      // Scale by confidence (60% conf = $5, 100% conf = $10)
      const confidenceScale = Math.max(0.6, confidence / 100)
      return Math.min(maxSize, baseSize + (maxSize - baseSize) * confidenceScale)
    }

    // After testing: use adaptive sizing based on profitability
    let baseSize = sizing.minProdSize
    let maxSize = sizing.maxProdSize

    // Adjust based on profitability
    if (perf.totalPnL > 0 && perf.winRate > 50) {
      // Profitable strategy - increase size
      baseSize *= sizing.profitMultiplier
      maxSize *= sizing.profitMultiplier
      console.log(`📈 Profitable strategy - increasing position size by ${sizing.profitMultiplier}x`)
    } else if (perf.totalPnL < 0 || perf.winRate < 40) {
      // Losing strategy - decrease size
      baseSize *= sizing.lossMultiplier
      maxSize *= sizing.lossMultiplier
      console.log(`📉 Losing strategy - decreasing position size by ${sizing.lossMultiplier}x`)
    }

    // Scale by confidence
    const confidenceScale = Math.max(0.6, confidence / 100)
    const size = baseSize + (maxSize - baseSize) * confidenceScale

    // Apply hard limits
    return Math.max(sizing.minTestSize, Math.min(sizing.maxProdSize, size))
  }

  /**
   * Record trade result to update performance
   */
  recordTrade(strategyId: string, pnl: number, symbol: string): void {
    const perf = this.performance.get(strategyId)
    if (!perf) return

    perf.totalTrades++
    perf.totalPnL += pnl
    perf.lastTradeTime = new Date()

    if (pnl > 0) {
      perf.winningTrades++
      perf.consecutiveWins++
      perf.consecutiveLosses = 0
    } else if (pnl < 0) {
      perf.losingTrades++
      perf.consecutiveLosses++
      perf.consecutiveWins = 0
    }

    // Update metrics
    const actualTrades = perf.winningTrades + perf.losingTrades
    perf.winRate = actualTrades > 0 ? (perf.winningTrades / actualTrades) * 100 : 0
    perf.avgPnL = perf.totalTrades > 0 ? perf.totalPnL / perf.totalTrades : 0

    // Update testing mode metrics
    if (perf.testingMode) {
      perf.testTradesCompleted++
      perf.testPnL += pnl

      if (pnl > 0) {
        perf.testWinRate = (perf.winningTrades / perf.testTradesCompleted) * 100
      }

      // Check if testing is complete
      if (perf.testTradesCompleted >= perf.testTradesRequired) {
        perf.testPassed = perf.testWinRate >= this.config.testPassWinRate * 100 && perf.testPnL >= this.config.testPassProfitMin
        perf.testingMode = false

        console.log(`🧪 Testing complete for ${perf.strategyName}: ${perf.testPassed ? 'PASSED ✅' : 'FAILED ❌'}`)
        console.log(`   Win Rate: ${perf.testWinRate.toFixed(1)}% (required: ${this.config.testPassWinRate * 100}%)`)
        console.log(`   P&L: $${perf.testPnL.toFixed(2)} (required: $${this.config.testPassProfitMin})`)
      }
    }

    console.log(`📊 Updated ${perf.strategyName}: ${perf.totalTrades} trades, ${perf.winRate.toFixed(1)}% win rate, $${perf.totalPnL.toFixed(2)} P&L`)

    // 💾 SAVE TO SUPABASE for persistence
    this.savePerformanceToStorage(perf)
  }

  /**
   * Save performance to Supabase (async, non-blocking)
   */
  private async savePerformanceToStorage(perf: StrategyPerformance): Promise<void> {
    try {
      const { saveStrategyPerformance } = await import('./StrategyPerformanceStorage')
      await saveStrategyPerformance(perf)
    } catch (error) {
      // Silent fail - don't break trading if storage fails
      console.error('⚠️ Failed to save to storage:', error)
    }
  }

  /**
   * Get best technical strategy (excluding inverse/normal)
   */
  private getBestTechnicalStrategy(): StrategyPerformance | null {
    const technicalStrategies = Array.from(this.performance.values()).filter(
      p => p.strategyId !== 'inverse' && p.strategyId !== 'normal'
    )

    if (technicalStrategies.length === 0) return null

    // Sort by P&L, then win rate
    technicalStrategies.sort((a, b) => {
      if (Math.abs(b.totalPnL - a.totalPnL) > 1) {
        return b.totalPnL - a.totalPnL
      }
      return b.winRate - a.winRate
    })

    return technicalStrategies[0]
  }

  /**
   * Inverse a trading signal
   */
  private inverseSignal(signal: TradeSignal): TradeSignal {
    return {
      ...signal,
      action: signal.action === 'BUY' ? 'SELL' : signal.action === 'SELL' ? 'BUY' : 'HOLD'
    }
  }

  /**
   * Reset all strategies for fresh testing
   */
  private resetAllStrategies(): void {
    for (const [id, perf] of this.performance.entries()) {
      perf.testingMode = true
      perf.testTradesCompleted = 0
      perf.testPassed = null
      perf.testPnL = 0
      perf.testWinRate = 0
    }
  }

  /**
   * Get all strategy performances
   */
  getAllPerformances(): StrategyPerformance[] {
    return Array.from(this.performance.values())
  }

  /**
   * Get current strategy
   */
  getCurrentStrategy(): StrategyPerformance | null {
    if (!this.currentStrategyId) return null
    return this.performance.get(this.currentStrategyId) || null
  }

  /**
   * Toggle inverse mode
   */
  toggleInverseMode(): void {
    this.inverseMode = !this.inverseMode
    this.currentStrategyId = this.inverseMode ? 'inverse' : 'normal'
    console.log(`🔄 Inverse Mode ${this.inverseMode ? 'ENABLED' : 'DISABLED'}`)
  }

  /**
   * Get current inverse mode state
   */
  getInverseMode(): boolean {
    return this.inverseMode
  }
}
