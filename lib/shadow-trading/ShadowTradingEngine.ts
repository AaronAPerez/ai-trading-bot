/**
 * Shadow Trading Engine
 *
 * Implements hedge fund-style shadow trading where:
 * 1. Real trades execute on live/paper account
 * 2. Shadow trades track what WOULD have happened with alternative strategies
 * 3. Performance comparison validates strategy effectiveness
 *
 * Use cases:
 * - Test new strategies without risking capital
 * - Validate AI recommendations in real market conditions
 * - Compare multiple strategy variants simultaneously
 * - Track opportunity cost of not taking certain trades
 */

import { alpacaClient } from '../alpaca/unified-client'

export interface ShadowTrade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  qty: number
  entryPrice: number
  entryTime: Date
  exitPrice?: number
  exitTime?: Date
  strategyName: string
  strategyVariant: string
  status: 'open' | 'closed'
  pnl?: number
  pnlPercent?: number
  reason: string
  confidence: number
  metadata: Record<string, any>
}

export interface ShadowPortfolio {
  id: string
  name: string
  strategyVariant: string
  initialCapital: number
  currentCapital: number
  positions: Map<string, ShadowTrade>
  closedTrades: ShadowTrade[]
  totalPnL: number
  totalPnLPercent: number
  winRate: number
  tradesCount: number
  metadata: Record<string, any>
}

export class ShadowTradingEngine {
  private shadowPortfolios: Map<string, ShadowPortfolio> = new Map()
  private realTradeLog: Map<string, any> = new Map()
  private priceCache: Map<string, number> = new Map()

  constructor() {
    console.log('🌑 Shadow Trading Engine initialized')
  }

  /**
   * Create a new shadow portfolio to track alternative strategy
   */
  createShadowPortfolio(config: {
    name: string
    strategyVariant: string
    initialCapital: number
    metadata?: Record<string, any>
  }): ShadowPortfolio {
    const portfolio: ShadowPortfolio = {
      id: `shadow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      strategyVariant: config.strategyVariant,
      initialCapital: config.initialCapital,
      currentCapital: config.initialCapital,
      positions: new Map(),
      closedTrades: [],
      totalPnL: 0,
      totalPnLPercent: 0,
      winRate: 0,
      tradesCount: 0,
      metadata: config.metadata || {}
    }

    this.shadowPortfolios.set(portfolio.id, portfolio)
    console.log(`🌑 Shadow portfolio created: ${portfolio.name} (${portfolio.strategyVariant})`)

    return portfolio
  }

  /**
   * Log a real trade for comparison
   */
  async logRealTrade(trade: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    price: number
    timestamp: Date
    strategyName: string
    reason: string
  }): Promise<void> {
    const tradeId = `real_${Date.now()}_${trade.symbol}`
    this.realTradeLog.set(tradeId, {
      ...trade,
      id: tradeId,
      type: 'real'
    })

    console.log(`💰 Real trade logged: ${trade.side.toUpperCase()} ${trade.qty} ${trade.symbol} @ $${trade.price}`)
  }

  /**
   * Execute a shadow trade (virtual) based on signal
   */
  async executeShadowTrade(
    portfolioId: string,
    signal: {
      symbol: string
      side: 'buy' | 'sell'
      qty: number
      strategyName: string
      reason: string
      confidence: number
      metadata?: Record<string, any>
    }
  ): Promise<ShadowTrade | null> {
    const portfolio = this.shadowPortfolios.get(portfolioId)
    if (!portfolio) {
      console.error(`Shadow portfolio ${portfolioId} not found`)
      return null
    }

    // Get current market price
    const currentPrice = await this.getCurrentPrice(signal.symbol)
    if (!currentPrice) {
      console.error(`Cannot get price for ${signal.symbol}`)
      return null
    }

    // Check if we have an existing position
    const existingPosition = portfolio.positions.get(signal.symbol)

    if (signal.side === 'buy' && !existingPosition) {
      // Open new shadow position
      const cost = currentPrice * signal.qty

      if (portfolio.currentCapital < cost) {
        console.warn(`Insufficient shadow capital: ${portfolio.currentCapital} < ${cost}`)
        return null
      }

      const shadowTrade: ShadowTrade = {
        id: `shadow_${Date.now()}_${signal.symbol}`,
        symbol: signal.symbol,
        side: 'buy',
        qty: signal.qty,
        entryPrice: currentPrice,
        entryTime: new Date(),
        strategyName: signal.strategyName,
        strategyVariant: portfolio.strategyVariant,
        status: 'open',
        reason: signal.reason,
        confidence: signal.confidence,
        metadata: signal.metadata || {}
      }

      portfolio.positions.set(signal.symbol, shadowTrade)
      portfolio.currentCapital -= cost
      portfolio.tradesCount++

      console.log(`🌑 Shadow BUY: ${signal.qty} ${signal.symbol} @ $${currentPrice} (${portfolio.name})`)

      return shadowTrade

    } else if (signal.side === 'sell' && existingPosition) {
      // Close shadow position
      const proceeds = currentPrice * existingPosition.qty
      const cost = existingPosition.entryPrice * existingPosition.qty
      const pnl = proceeds - cost
      const pnlPercent = (pnl / cost) * 100

      existingPosition.exitPrice = currentPrice
      existingPosition.exitTime = new Date()
      existingPosition.status = 'closed'
      existingPosition.pnl = pnl
      existingPosition.pnlPercent = pnlPercent

      portfolio.positions.delete(signal.symbol)
      portfolio.closedTrades.push(existingPosition)
      portfolio.currentCapital += proceeds
      portfolio.totalPnL += pnl
      portfolio.totalPnLPercent = ((portfolio.currentCapital - portfolio.initialCapital) / portfolio.initialCapital) * 100

      // Update win rate
      const winningTrades = portfolio.closedTrades.filter(t => (t.pnl || 0) > 0).length
      portfolio.winRate = (winningTrades / portfolio.closedTrades.length) * 100

      console.log(`🌑 Shadow SELL: ${existingPosition.qty} ${signal.symbol} @ $${currentPrice} | PnL: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)

      return existingPosition
    }

    return null
  }

  /**
   * Update all open shadow positions with current market prices
   */
  async updateShadowPositions(): Promise<void> {
    for (const portfolio of this.shadowPortfolios.values()) {
      for (const position of portfolio.positions.values()) {
        const currentPrice = await this.getCurrentPrice(position.symbol)
        if (currentPrice) {
          const unrealizedPnL = (currentPrice - position.entryPrice) * position.qty
          const unrealizedPnLPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100

          position.metadata.currentPrice = currentPrice
          position.metadata.unrealizedPnL = unrealizedPnL
          position.metadata.unrealizedPnLPercent = unrealizedPnLPercent
        }
      }

      // Calculate total portfolio value
      let totalUnrealizedPnL = 0
      for (const position of portfolio.positions.values()) {
        totalUnrealizedPnL += position.metadata.unrealizedPnL || 0
      }

      portfolio.metadata.totalUnrealizedPnL = totalUnrealizedPnL
      portfolio.metadata.totalPortfolioValue = portfolio.currentCapital + totalUnrealizedPnL
    }
  }

  /**
   * Get current market price with caching
   */
  private async getCurrentPrice(symbol: string): Promise<number | null> {
    // Check cache first (valid for 1 second)
    const cached = this.priceCache.get(symbol)
    if (cached) return cached

    try {
      const isCrypto = symbol.includes('/')

      if (isCrypto) {
        const quote = await alpacaClient.getCryptoQuote(symbol)
        const price = quote?.quotes?.[symbol]?.ap || null
        if (price) this.priceCache.set(symbol, price)
        setTimeout(() => this.priceCache.delete(symbol), 1000)
        return price
      } else {
        const quote = await alpacaClient.getLatestQuote(symbol)
        const price = quote?.ask || quote?.bid || null
        if (price) this.priceCache.set(symbol, price)
        setTimeout(() => this.priceCache.delete(symbol), 1000)
        return price
      }
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Compare shadow portfolio performance vs real trades
   */
  comparePerformance(portfolioId: string): {
    shadowPortfolio: ShadowPortfolio
    realTrades: any[]
    comparison: {
      shadowPnL: number
      shadowPnLPercent: number
      shadowWinRate: number
      shadowTradesCount: number
      realTradesCount: number
      opportunityCost: number
    }
  } | null {
    const portfolio = this.shadowPortfolios.get(portfolioId)
    if (!portfolio) return null

    const realTrades = Array.from(this.realTradeLog.values())

    return {
      shadowPortfolio: portfolio,
      realTrades,
      comparison: {
        shadowPnL: portfolio.totalPnL,
        shadowPnLPercent: portfolio.totalPnLPercent,
        shadowWinRate: portfolio.winRate,
        shadowTradesCount: portfolio.tradesCount,
        realTradesCount: realTrades.length,
        opportunityCost: portfolio.totalPnL // Simplified - would need real portfolio PnL
      }
    }
  }

  /**
   * Get all shadow portfolios
   */
  getShadowPortfolios(): ShadowPortfolio[] {
    return Array.from(this.shadowPortfolios.values())
  }

  /**
   * Get specific shadow portfolio
   */
  getShadowPortfolio(portfolioId: string): ShadowPortfolio | null {
    return this.shadowPortfolios.get(portfolioId) || null
  }

  /**
   * Export shadow trading data for analysis
   */
  exportData(): {
    portfolios: ShadowPortfolio[]
    realTrades: any[]
    timestamp: Date
  } {
    return {
      portfolios: this.getShadowPortfolios(),
      realTrades: Array.from(this.realTradeLog.values()),
      timestamp: new Date()
    }
  }
}

// Singleton instance
export const shadowTradingEngine = new ShadowTradingEngine()
