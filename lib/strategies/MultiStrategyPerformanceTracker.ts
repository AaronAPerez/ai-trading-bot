import { supabase } from '@/lib/supabase/client'

export interface StrategyPerformance {
  strategyId: string
  strategyName: string
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  winRate: number
  totalPnL: number
  averagePnL: number
  sharpeRatio: number
  maxDrawdown: number
  currentDrawdown: number
  volatility: number
  riskAdjustedReturn: number
  consistency: number
  lastUpdated: Date
  isActive: boolean
  trades: StrategyTrade[]
}

export interface StrategyTrade {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  entryPrice: number
  exitPrice?: number
  pnl?: number
  timestamp: Date
  exitTimestamp?: Date
  isOpen: boolean
}

export interface StrategyComparison {
  topStrategy: StrategyPerformance
  allStrategies: StrategyPerformance[]
  ranking: Array<{
    rank: number
    strategyId: string
    score: number
    performance: StrategyPerformance
  }>
  recommendation: string
}

export class MultiStrategyPerformanceTracker {
  private strategies: Map<string, StrategyPerformance> = new Map()
  private readonly PERFORMANCE_WINDOW = 100 // Last 100 trades
  private userId: string | null = null

  constructor(userId?: string) {
    this.userId = userId || null
  }

  /**
   * Initialize a strategy for tracking
   */
  initializeStrategy(strategyId: string, strategyName: string): void {
    if (!this.strategies.has(strategyId)) {
      this.strategies.set(strategyId, {
        strategyId,
        strategyName,
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averagePnL: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        volatility: 0,
        riskAdjustedReturn: 0,
        consistency: 0,
        lastUpdated: new Date(),
        isActive: true,
        trades: []
      })
    }
  }

  /**
   * Record a trade for a specific strategy
   */
  async recordTrade(
    strategyId: string,
    trade: Omit<StrategyTrade, 'timestamp' | 'isOpen'>
  ): Promise<void> {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) {
      console.warn(`Strategy ${strategyId} not initialized`)
      return
    }

    const fullTrade: StrategyTrade = {
      ...trade,
      timestamp: new Date(),
      isOpen: !trade.exitPrice
    }

    strategy.trades.push(fullTrade)

    // Keep only recent trades in memory
    if (strategy.trades.length > this.PERFORMANCE_WINDOW) {
      strategy.trades = strategy.trades.slice(-this.PERFORMANCE_WINDOW)
    }

    // Update performance metrics
    this.updateStrategyMetrics(strategyId)

    // Save to database
    await this.saveToDatabase(strategyId, fullTrade)
  }

  /**
   * Update trade when it closes
   */
  updateTrade(
    strategyId: string,
    tradeIndex: number,
    exitPrice: number,
    pnl: number
  ): void {
    const strategy = this.strategies.get(strategyId)
    if (!strategy || !strategy.trades[tradeIndex]) return

    strategy.trades[tradeIndex].exitPrice = exitPrice
    strategy.trades[tradeIndex].pnl = pnl
    strategy.trades[tradeIndex].exitTimestamp = new Date()
    strategy.trades[tradeIndex].isOpen = false

    this.updateStrategyMetrics(strategyId)
  }

  /**
   * Calculate comprehensive performance metrics for a strategy
   */
  private updateStrategyMetrics(strategyId: string): void {
    const strategy = this.strategies.get(strategyId)
    if (!strategy) return

    const closedTrades = strategy.trades.filter(t => !t.isOpen)
    if (closedTrades.length === 0) return

    // Basic metrics
    strategy.totalTrades = closedTrades.length
    strategy.successfulTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length
    strategy.failedTrades = closedTrades.filter(t => (t.pnl || 0) <= 0).length
    strategy.winRate = (strategy.successfulTrades / strategy.totalTrades) * 100

    // P&L metrics
    const pnls = closedTrades.map(t => t.pnl || 0)
    strategy.totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0)
    strategy.averagePnL = strategy.totalPnL / strategy.totalTrades

    // Volatility and Sharpe Ratio
    strategy.volatility = this.calculateVolatility(pnls)
    strategy.sharpeRatio = this.calculateSharpeRatio(pnls)

    // Drawdown
    const { maxDrawdown, currentDrawdown } = this.calculateDrawdown(pnls)
    strategy.maxDrawdown = maxDrawdown
    strategy.currentDrawdown = currentDrawdown

    // Risk-adjusted return
    strategy.riskAdjustedReturn = strategy.volatility > 0
      ? (strategy.averagePnL / strategy.volatility) * 100
      : 0

    // Consistency (standard deviation of returns normalized)
    strategy.consistency = this.calculateConsistency(pnls)

    strategy.lastUpdated = new Date()
  }

  /**
   * Calculate Sharpe Ratio (annualized)
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const std = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    )

    // Assuming ~252 trading days, adjust for trade frequency
    const annualizationFactor = Math.sqrt(252 / returns.length)
    return std === 0 ? 0 : (mean / std) * annualizationFactor
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length

    return Math.sqrt(variance)
  }

  /**
   * Calculate maximum and current drawdown
   */
  private calculateDrawdown(returns: number[]): { maxDrawdown: number; currentDrawdown: number } {
    if (returns.length === 0) return { maxDrawdown: 0, currentDrawdown: 0 }

    let peak = 0
    let maxDrawdown = 0
    let cumulative = 0

    for (const ret of returns) {
      cumulative += ret
      if (cumulative > peak) peak = cumulative

      const drawdown = peak - cumulative
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    const currentDrawdown = peak - cumulative

    return { maxDrawdown, currentDrawdown }
  }

  /**
   * Calculate consistency score (0-1, higher is better)
   */
  private calculateConsistency(returns: number[]): number {
    if (returns.length === 0) return 0

    const positiveReturns = returns.filter(r => r > 0).length
    return positiveReturns / returns.length
  }

  /**
   * Get comprehensive performance comparison across all strategies
   */
  getStrategyComparison(): StrategyComparison {
    const allStrategies = Array.from(this.strategies.values())

    if (allStrategies.length === 0) {
      console.warn('No strategies initialized in performance tracker')
      return {
        topStrategy: {
          strategyId: '',
          strategyName: 'No Strategy',
          totalTrades: 0,
          successfulTrades: 0,
          failedTrades: 0,
          winRate: 0,
          totalPnL: 0,
          averagePnL: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          currentDrawdown: 0,
          volatility: 0,
          riskAdjustedReturn: 0,
          consistency: 0,
          lastUpdated: new Date(),
          isActive: false,
          trades: []
        },
        allStrategies: [],
        ranking: [],
        recommendation: 'No strategies initialized yet. Start trading to collect performance data.'
      }
    }

    // Calculate composite score for each strategy
    const ranked = allStrategies
      .map(strategy => ({
        strategy,
        score: this.calculateCompositeScore(strategy)
      }))
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        rank: index + 1,
        strategyId: item.strategy.strategyId,
        score: item.score,
        performance: item.strategy
      }))

    const topStrategy = ranked[0]?.performance || allStrategies[0]

    console.log('Strategy comparison generated:', {
      totalStrategies: allStrategies.length,
      rankedCount: ranked.length,
      topStrategy: topStrategy.strategyName
    })

    return {
      topStrategy,
      allStrategies,
      ranking: ranked,
      recommendation: this.generateRecommendation(ranked)
    }
  }

  /**
   * Calculate composite score for strategy ranking
   * Weighted combination of multiple performance metrics
   */
  private calculateCompositeScore(strategy: StrategyPerformance): number {
    if (strategy.totalTrades < 10) {
      // Not enough data, return low score
      return strategy.totalTrades * 5 // Encourage gathering more data
    }

    // Weighted scoring algorithm
    const winRateScore = (strategy.winRate / 100) * 25 // 25% weight
    const profitScore = Math.min((strategy.averagePnL / 10) * 20, 20) // 20% weight, capped
    const sharpeScore = Math.min(strategy.sharpeRatio * 10, 20) // 20% weight, capped at 2.0 Sharpe
    const consistencyScore = strategy.consistency * 15 // 15% weight
    const drawdownScore = Math.max(0, (1 - strategy.maxDrawdown / 1000) * 10) // 10% weight
    const volumeScore = Math.min(strategy.totalTrades / 10, 10) // 10% weight, encourages more trades

    return (
      winRateScore +
      profitScore +
      sharpeScore +
      consistencyScore +
      drawdownScore +
      volumeScore
    )
  }

  /**
   * Generate recommendation based on strategy rankings
   */
  private generateRecommendation(ranking: Array<any>): string {
    if (ranking.length === 0) {
      return 'No strategies initialized yet. Start trading to collect performance data.'
    }

    const top = ranking[0]
    const strategy = top.performance

    if (strategy.totalTrades < 10) {
      return `Collecting data for ${strategy.strategyName}. Need more trades for accurate comparison.`
    }

    if (top.score > 70) {
      return `${strategy.strategyName} is performing exceptionally well with ${strategy.winRate.toFixed(1)}% win rate and $${strategy.totalPnL.toFixed(2)} total P&L. Continue using this strategy.`
    } else if (top.score > 50) {
      return `${strategy.strategyName} is showing solid performance. Win rate: ${strategy.winRate.toFixed(1)}%. Monitor closely for optimization opportunities.`
    } else {
      return `${strategy.strategyName} is currently leading but performance is below optimal. Consider reviewing strategy parameters or market conditions.`
    }
  }

  /**
   * Get best performing strategy
   */
  getBestStrategy(): StrategyPerformance | null {
    const comparison = this.getStrategyComparison()
    return comparison.topStrategy
  }

  /**
   * Get specific strategy performance
   */
  getStrategyPerformance(strategyId: string): StrategyPerformance | null {
    return this.strategies.get(strategyId) || null
  }

  /**
   * Get all strategies performance
   */
  getAllStrategiesPerformance(): StrategyPerformance[] {
    return Array.from(this.strategies.values())
  }

  /**
   * Reset strategy performance (useful for testing)
   */
  resetStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId)
    if (strategy) {
      strategy.totalTrades = 0
      strategy.successfulTrades = 0
      strategy.failedTrades = 0
      strategy.winRate = 0
      strategy.totalPnL = 0
      strategy.averagePnL = 0
      strategy.sharpeRatio = 0
      strategy.maxDrawdown = 0
      strategy.currentDrawdown = 0
      strategy.volatility = 0
      strategy.riskAdjustedReturn = 0
      strategy.consistency = 0
      strategy.trades = []
      strategy.lastUpdated = new Date()
    }
  }

  /**
   * Save strategy performance to database
   */
  private async saveToDatabase(strategyId: string, trade: StrategyTrade): Promise<void> {
    try {
      const strategy = this.strategies.get(strategyId)
      if (!strategy) return

      // Save trade to database
      await supabase.from('strategy_trades').insert({
        user_id: this.userId,
        strategy_id: strategyId,
        strategy_name: strategy.strategyName,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        pnl: trade.pnl,
        timestamp: trade.timestamp.toISOString(),
        exit_timestamp: trade.exitTimestamp?.toISOString(),
        is_open: trade.isOpen
      })

      // Update strategy performance summary
      await supabase.from('strategy_performance').upsert({
        user_id: this.userId,
        strategy_id: strategyId,
        strategy_name: strategy.strategyName,
        total_trades: strategy.totalTrades,
        successful_trades: strategy.successfulTrades,
        failed_trades: strategy.failedTrades,
        win_rate: strategy.winRate,
        total_pnl: strategy.totalPnL,
        average_pnl: strategy.averagePnL,
        sharpe_ratio: strategy.sharpeRatio,
        max_drawdown: strategy.maxDrawdown,
        current_drawdown: strategy.currentDrawdown,
        volatility: strategy.volatility,
        risk_adjusted_return: strategy.riskAdjustedReturn,
        consistency: strategy.consistency,
        last_updated: strategy.lastUpdated.toISOString(),
        is_active: strategy.isActive
      })

    } catch (error) {
      console.error('Error saving strategy performance to database:', error)
    }
  }

  /**
   * Load strategy performance from database
   */
  async loadFromDatabase(): Promise<void> {
    try {
      // Query without user_id filter since we're in demo mode without auth
      const { data: performances, error } = await supabase
        .from('strategy_performance')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Error loading strategy performance:', error)
        throw error
      }

      if (performances) {
        for (const perf of performances) {
          this.strategies.set(perf.strategy_id, {
            strategyId: perf.strategy_id,
            strategyName: perf.strategy_name,
            totalTrades: perf.total_trades || 0,
            successfulTrades: perf.successful_trades || 0,
            failedTrades: perf.failed_trades || 0,
            winRate: perf.win_rate || 0,
            totalPnL: perf.total_pnl || 0,
            averagePnL: perf.average_pnl || 0,
            sharpeRatio: perf.sharpe_ratio || 0,
            maxDrawdown: perf.max_drawdown || 0,
            currentDrawdown: perf.current_drawdown || 0,
            volatility: perf.volatility || 0,
            riskAdjustedReturn: perf.risk_adjusted_return || 0,
            consistency: perf.consistency || 0,
            lastUpdated: new Date(perf.last_updated),
            isActive: perf.is_active,
            trades: []
          })
        }
      }

    } catch (error) {
      console.error('Error loading strategy performance from database:', error)
    }
  }
}
