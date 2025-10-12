import { RSIStrategy } from './RSIStrategy'
import { MACDStrategy } from './MACDStrategy'
import { BollingerBandsStrategy } from './BollingerBandsStrategy'
import { MovingAverageCrossoverStrategy } from './MovingAverageCrossoverStrategy'
import { MeanReversionStrategy } from './MeanReversionStrategy'
import { MultiStrategyPerformanceTracker, StrategyPerformance } from './MultiStrategyPerformanceTracker'
import { TradingStrategy, TradeSignal, MarketData } from '@/types/trading'

export interface StrategySignalWithMeta extends TradeSignal {
  strategyId: string
  strategyName: string
  performance?: StrategyPerformance
  timestamp: Date
}

export interface MultiStrategySignal {
  // Best performing strategy signal
  recommendedSignal: StrategySignalWithMeta

  // All strategy signals for comparison
  allSignals: StrategySignalWithMeta[]

  // Consensus analysis
  consensus: {
    buyVotes: number
    sellVotes: number
    holdVotes: number
    averageConfidence: number
    agreement: number // 0-1, higher means more strategies agree
  }

  // Performance-based weighting
  weightedSignal: {
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning: string
  }

  // Best strategy info
  bestStrategy: {
    id: string
    name: string
    performance: StrategyPerformance
    currentScore: number
  }
}

export interface StrategyConfig {
  id: string
  enabled: boolean
  weight?: number // Optional manual weight override
}

export class MultiStrategyEngine {
  private strategies: Map<string, { strategy: TradingStrategy; name: string }> = new Map()
  private performanceTracker: MultiStrategyPerformanceTracker
  private strategyConfigs: Map<string, StrategyConfig> = new Map()
  private autoSelectBest: boolean = true
  private currentActiveStrategy: string | null = null
  private autoSwitchEnabled: boolean = true
  private switchThreshold: number = 10 // Switch if new strategy scores 10+ points better
  private minTradesBeforeSwitch: number = 20 // Need at least 20 trades before considering switch

  constructor(userId?: string, autoSelectBest: boolean = true) {
    this.performanceTracker = new MultiStrategyPerformanceTracker(userId)
    this.autoSelectBest = autoSelectBest
    this.initializeStrategies()
  }

  /**
   * Initialize all available strategies
   */
  private initializeStrategies(): void {
    // Register all strategies
    this.registerStrategy('rsi', new RSIStrategy(), 'RSI Momentum')
    this.registerStrategy('macd', new MACDStrategy(), 'MACD Trend Following')
    this.registerStrategy('bollinger', new BollingerBandsStrategy(), 'Bollinger Bands')
    this.registerStrategy('ma_crossover', new MovingAverageCrossoverStrategy(), 'MA Crossover')
    this.registerStrategy('mean_reversion', new MeanReversionStrategy(), 'Mean Reversion')

    // Enable all strategies by default
    for (const [id, _] of this.strategies) {
      this.strategyConfigs.set(id, { id, enabled: true })
      this.performanceTracker.initializeStrategy(id, this.strategies.get(id)!.name)
    }
  }

  /**
   * Register a new strategy
   */
  registerStrategy(id: string, strategy: TradingStrategy, name: string): void {
    this.strategies.set(id, { strategy, name })
    this.performanceTracker.initializeStrategy(id, name)
  }

  /**
   * Enable or disable a strategy
   */
  setStrategyEnabled(strategyId: string, enabled: boolean): void {
    const config = this.strategyConfigs.get(strategyId)
    if (config) {
      config.enabled = enabled
    }
  }

  /**
   * Set manual weight for a strategy (overrides performance-based weighting)
   */
  setStrategyWeight(strategyId: string, weight: number): void {
    const config = this.strategyConfigs.get(strategyId)
    if (config) {
      config.weight = Math.max(0, Math.min(1, weight)) // Clamp between 0 and 1
    }
  }

  /**
   * Get comprehensive multi-strategy analysis
   * This is the main method that runs all strategies and compares them
   */
  async analyzeAllStrategies(symbol: string, marketData: MarketData[]): Promise<MultiStrategySignal> {
    const signals: StrategySignalWithMeta[] = []
    const enabledStrategies = Array.from(this.strategies.entries())
      .filter(([id, _]) => this.strategyConfigs.get(id)?.enabled)

    // Run all enabled strategies in parallel
    await Promise.all(
      enabledStrategies.map(async ([id, { strategy, name }]) => {
        try {
          const signal = await strategy.analyze(marketData)
          const performance = this.performanceTracker.getStrategyPerformance(id)

          signals.push({
            ...signal,
            strategyId: id,
            strategyName: name,
            performance: performance || undefined,
            timestamp: new Date()
          })
        } catch (error) {
          console.error(`Strategy ${id} (${name}) analysis failed:`, error)
        }
      })
    )

    // Calculate consensus
    const consensus = this.calculateConsensus(signals)

    // Get performance-weighted signal
    const weightedSignal = this.calculateWeightedSignal(signals)

    // Get best performing strategy
    const bestStrategy = this.getBestStrategyInfo()

    // Get recommended signal (from best strategy if auto-select is on)
    const recommendedSignal = this.autoSelectBest && bestStrategy
      ? signals.find(s => s.strategyId === bestStrategy.id) || signals[0]
      : weightedSignal.action !== 'HOLD'
        ? signals.find(s => s.action === weightedSignal.action) || signals[0]
        : signals[0]

    return {
      recommendedSignal,
      allSignals: signals,
      consensus,
      weightedSignal,
      bestStrategy
    }
  }

  /**
   * Calculate consensus across all strategies
   */
  private calculateConsensus(signals: StrategySignalWithMeta[]): MultiStrategySignal['consensus'] {
    if (signals.length === 0) {
      return {
        buyVotes: 0,
        sellVotes: 0,
        holdVotes: 0,
        averageConfidence: 0,
        agreement: 0
      }
    }

    const buyVotes = signals.filter(s => s.action === 'BUY').length
    const sellVotes = signals.filter(s => s.action === 'SELL').length
    const holdVotes = signals.filter(s => s.action === 'HOLD').length

    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0)
    const averageConfidence = totalConfidence / signals.length

    // Agreement is the percentage of strategies that agree with the majority
    const maxVotes = Math.max(buyVotes, sellVotes, holdVotes)
    const agreement = maxVotes / signals.length

    return {
      buyVotes,
      sellVotes,
      holdVotes,
      averageConfidence,
      agreement
    }
  }

  /**
   * Calculate performance-weighted signal
   * Better performing strategies get more weight in the decision
   */
  private calculateWeightedSignal(signals: StrategySignalWithMeta[]): MultiStrategySignal['weightedSignal'] {
    if (signals.length === 0) {
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'No strategies available'
      }
    }

    const weights = new Map<string, number>()
    let totalWeight = 0

    // Calculate weights for each strategy
    for (const signal of signals) {
      const config = this.strategyConfigs.get(signal.strategyId)
      let weight = 1 // Default equal weight

      // Use manual weight if set
      if (config?.weight !== undefined) {
        weight = config.weight
      }
      // Otherwise use performance-based weight
      else if (signal.performance && signal.performance.totalTrades >= 10) {
        // Weight based on composite performance score
        const perfScore = this.calculatePerformanceWeight(signal.performance)
        weight = perfScore
      }

      weights.set(signal.strategyId, weight)
      totalWeight += weight
    }

    // Calculate weighted votes
    let buyWeight = 0
    let sellWeight = 0
    let holdWeight = 0
    let totalConfidence = 0

    for (const signal of signals) {
      const weight = weights.get(signal.strategyId) || 1
      const normalizedWeight = totalWeight > 0 ? weight / totalWeight : 1 / signals.length

      if (signal.action === 'BUY') buyWeight += normalizedWeight
      else if (signal.action === 'SELL') sellWeight += normalizedWeight
      else holdWeight += normalizedWeight

      totalConfidence += signal.confidence * normalizedWeight
    }

    // Determine weighted action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    let maxWeight = Math.max(buyWeight, sellWeight, holdWeight)

    if (maxWeight === buyWeight) action = 'BUY'
    else if (maxWeight === sellWeight) action = 'SELL'

    const reasoning = this.generateWeightedReasoning(
      signals,
      weights,
      action,
      { buyWeight, sellWeight, holdWeight }
    )

    return {
      action,
      confidence: totalConfidence,
      reasoning
    }
  }

  /**
   * Calculate performance-based weight for a strategy
   */
  private calculatePerformanceWeight(performance: StrategyPerformance): number {
    // Composite weight based on multiple metrics
    const winRateWeight = performance.winRate / 100 // 0-1
    const sharpeWeight = Math.min(Math.max(performance.sharpeRatio / 2, 0), 1) // 0-1, normalized
    const consistencyWeight = performance.consistency // 0-1
    const profitWeight = performance.totalPnL > 0 ? 1 : 0.5 // Binary: profitable or not

    // Weighted average
    return (
      winRateWeight * 0.35 +
      sharpeWeight * 0.25 +
      consistencyWeight * 0.25 +
      profitWeight * 0.15
    )
  }

  /**
   * Generate reasoning for weighted signal
   */
  private generateWeightedReasoning(
    signals: StrategySignalWithMeta[],
    weights: Map<string, number>,
    action: string,
    votes: { buyWeight: number; sellWeight: number; holdWeight: number }
  ): string {
    const topStrategies = signals
      .map(s => ({
        name: s.strategyName,
        action: s.action,
        weight: weights.get(s.strategyId) || 0,
        confidence: s.confidence
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)

    const agreement = Math.max(votes.buyWeight, votes.sellWeight, votes.holdWeight) * 100

    return `Performance-weighted analysis: ${action} (${agreement.toFixed(0)}% agreement). Top strategies: ${topStrategies
      .map(s => `${s.name} (${s.action}, ${(s.confidence * 100).toFixed(0)}%)`)
      .join(', ')}`
  }

  /**
   * Get information about the best performing strategy
   */
  private getBestStrategyInfo(): MultiStrategySignal['bestStrategy'] {
    const bestPerformance = this.performanceTracker.getBestStrategy()

    if (!bestPerformance) {
      // Return first strategy as default
      const firstStrategy = Array.from(this.strategies.entries())[0]
      if (!firstStrategy) {
        throw new Error('No strategies available')
      }

      return {
        id: firstStrategy[0],
        name: firstStrategy[1].name,
        performance: this.performanceTracker.getStrategyPerformance(firstStrategy[0])!,
        currentScore: 0
      }
    }

    return {
      id: bestPerformance.strategyId,
      name: bestPerformance.strategyName,
      performance: bestPerformance,
      currentScore: this.calculateCompositeScore(bestPerformance)
    }
  }

  /**
   * Calculate composite performance score
   */
  private calculateCompositeScore(performance: StrategyPerformance): number {
    if (performance.totalTrades < 10) {
      return performance.totalTrades * 5
    }

    const winRateScore = (performance.winRate / 100) * 25
    const profitScore = Math.min((performance.averagePnL / 10) * 20, 20)
    const sharpeScore = Math.min(performance.sharpeRatio * 10, 20)
    const consistencyScore = performance.consistency * 15
    const drawdownScore = Math.max(0, (1 - performance.maxDrawdown / 1000) * 10)
    const volumeScore = Math.min(performance.totalTrades / 10, 10)

    return winRateScore + profitScore + sharpeScore + consistencyScore + drawdownScore + volumeScore
  }

  /**
   * Record trade execution for performance tracking
   */
  async recordTradeExecution(
    strategyId: string,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    entryPrice: number,
    exitPrice?: number,
    pnl?: number
  ): Promise<void> {
    await this.performanceTracker.recordTrade(strategyId, {
      symbol,
      side,
      quantity,
      entryPrice,
      exitPrice,
      pnl
    })
  }

  /**
   * Get strategy comparison for display
   */
  getStrategyComparison() {
    return this.performanceTracker.getStrategyComparison()
  }

  /**
   * Get all strategies performance
   */
  getAllStrategiesPerformance() {
    return this.performanceTracker.getAllStrategiesPerformance()
  }

  /**
   * Load historical performance from database
   */
  async loadPerformanceHistory(): Promise<void> {
    await this.performanceTracker.loadFromDatabase()
  }

  /**
   * Enable/disable automatic best strategy selection
   */
  setAutoSelectBest(enabled: boolean): void {
    this.autoSelectBest = enabled
  }

  /**
   * Enable/disable automatic strategy switching
   */
  setAutoSwitchEnabled(enabled: boolean): void {
    this.autoSwitchEnabled = enabled
    console.log(`🔄 Auto strategy switching ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

  /**
   * Set threshold for auto-switching (score difference required)
   */
  setSwitchThreshold(threshold: number): void {
    this.switchThreshold = Math.max(5, threshold) // Minimum 5 points
  }

  /**
   * Automatically switch to best performing strategy if enabled
   * Returns true if strategy was switched, false otherwise
   */
  autoSwitchToBestStrategy(): { switched: boolean; from?: string; to?: string; reason?: string } {
    if (!this.autoSwitchEnabled) {
      return { switched: false, reason: 'Auto-switching disabled' }
    }

    const bestStrategy = this.getBestStrategyInfo()
    const currentPerformance = this.currentActiveStrategy
      ? this.performanceTracker.getStrategyPerformance(this.currentActiveStrategy)
      : null

    // If no current strategy, switch to best
    if (!this.currentActiveStrategy || !currentPerformance) {
      this.currentActiveStrategy = bestStrategy.id
      console.log(`🎯 Initialized with best strategy: ${bestStrategy.name}`)
      return {
        switched: true,
        to: bestStrategy.id,
        reason: 'Initial strategy selection'
      }
    }

    // Don't switch if best strategy doesn't have enough trades
    if (bestStrategy.performance.totalTrades < this.minTradesBeforeSwitch) {
      return {
        switched: false,
        reason: `Best strategy needs more trades (${bestStrategy.performance.totalTrades}/${this.minTradesBeforeSwitch})`
      }
    }

    // Calculate score difference
    const currentScore = this.calculateCompositeScore(currentPerformance)
    const bestScore = bestStrategy.currentScore
    const scoreDiff = bestScore - currentScore

    // Switch if best strategy significantly outperforms current
    if (scoreDiff >= this.switchThreshold && bestStrategy.id !== this.currentActiveStrategy) {
      const previousStrategy = this.currentActiveStrategy
      this.currentActiveStrategy = bestStrategy.id

      console.log(`🔄 AUTO-SWITCHED STRATEGY!`)
      console.log(`   FROM: ${currentPerformance.strategyName} (Score: ${currentScore.toFixed(1)})`)
      console.log(`   TO: ${bestStrategy.name} (Score: ${bestScore.toFixed(1)})`)
      console.log(`   IMPROVEMENT: +${scoreDiff.toFixed(1)} points`)

      return {
        switched: true,
        from: previousStrategy,
        to: bestStrategy.id,
        reason: `Performance improvement: +${scoreDiff.toFixed(1)} points`
      }
    }

    return {
      switched: false,
      reason: `Current strategy still optimal (score diff: ${scoreDiff.toFixed(1)})`
    }
  }

  /**
   * Get current active strategy
   */
  getCurrentActiveStrategy(): { id: string; name: string; performance: StrategyPerformance } | null {
    if (!this.currentActiveStrategy) return null

    const strategyInfo = this.strategies.get(this.currentActiveStrategy)
    const performance = this.performanceTracker.getStrategyPerformance(this.currentActiveStrategy)

    if (!strategyInfo || !performance) return null

    return {
      id: this.currentActiveStrategy,
      name: strategyInfo.name,
      performance
    }
  }

  /**
   * Manually set active strategy
   */
  setActiveStrategy(strategyId: string): boolean {
    if (!this.strategies.has(strategyId)) {
      console.warn(`Strategy ${strategyId} not found`)
      return false
    }

    this.currentActiveStrategy = strategyId
    const strategyInfo = this.strategies.get(strategyId)
    console.log(`✅ Active strategy set to: ${strategyInfo?.name}`)
    return true
  }

  /**
   * Get strategy switching stats
   */
  getSwitchingStats(): {
    autoSwitchEnabled: boolean
    currentStrategy: string | null
    switchThreshold: number
    minTradesRequired: number
    canSwitchNow: boolean
  } {
    const bestStrategy = this.getBestStrategyInfo()
    const canSwitch = bestStrategy.performance.totalTrades >= this.minTradesBeforeSwitch

    return {
      autoSwitchEnabled: this.autoSwitchEnabled,
      currentStrategy: this.currentActiveStrategy,
      switchThreshold: this.switchThreshold,
      minTradesRequired: this.minTradesBeforeSwitch,
      canSwitchNow: canSwitch
    }
  }

  /**
   * Get performance tracker instance
   */
  getPerformanceTracker(): MultiStrategyPerformanceTracker {
    return this.performanceTracker
  }
}
