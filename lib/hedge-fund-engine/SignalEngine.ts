import { StrategyRegistry } from './StrategyRegistry'
import { MultiStrategyEngine, MultiStrategySignal } from '../strategies/MultiStrategyEngine'
import { MarketData, TradeSignal } from '@/types/trading'
import alpaca from '../alpaca'

export interface SignalContext {
  symbol: string
  strategy?: string
  userId?: string
  marketData?: MarketData[]
  timeframe?: string
  parameters?: Record<string, any>
}

export interface SignalResult extends TradeSignal {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  strategy: string
  reason: string
  metadata?: {
    multiStrategyAnalysis?: MultiStrategySignal
    marketData?: MarketData[]
    currentPrice?: number
    [key: string]: any
  }
}

export class SignalEngine {
  private multiStrategyEngine: MultiStrategyEngine | null = null

  constructor(userId?: string) {
    if (userId) {
      this.multiStrategyEngine = new MultiStrategyEngine(userId, true)
    }
  }

  async generate(context: SignalContext): Promise<SignalResult> {
    try {
      const { symbol, strategy, userId, timeframe = '1Day', parameters } = context

      // Fetch market data from Alpaca
      const marketData = await this.fetchMarketData(symbol, timeframe)

      if (!marketData || marketData.length === 0) {
        throw new Error(`No market data available for ${symbol}`)
      }

      // If specific strategy requested, use that
      if (strategy && StrategyRegistry[strategy]) {
        return await this.executeStrategy(strategy, { ...context, marketData })
      }

      // Otherwise, use multi-strategy analysis
      if (this.multiStrategyEngine) {
        const multiStrategyAnalysis = await this.multiStrategyEngine.analyzeAllStrategies(
          symbol,
          marketData
        )

        const recommendedSignal = multiStrategyAnalysis.recommendedSignal

        const currentPrice = marketData[marketData.length - 1].close

        // Calculate stop loss and take profit if not provided
        const stopLoss = recommendedSignal.stopLoss || this.calculateStopLoss(currentPrice, recommendedSignal.action)
        const takeProfit = recommendedSignal.takeProfit || this.calculateTakeProfit(currentPrice, recommendedSignal.action)

        return {
          symbol,
          action: recommendedSignal.action,
          confidence: recommendedSignal.confidence,
          strategy: recommendedSignal.strategyName,
          reason: recommendedSignal.reason,
          timestamp: new Date(),
          riskScore: recommendedSignal.riskScore,
          stopLoss,
          takeProfit,
          metadata: {
            multiStrategyAnalysis,
            marketData,
            currentPrice,
            strategyId: recommendedSignal.strategyId,
            consensus: multiStrategyAnalysis.consensus,
            bestStrategy: multiStrategyAnalysis.bestStrategy
          }
        }
      }

      // Fallback to single strategy
      return await this.executeStrategy('momentum', { ...context, marketData })

    } catch (error: any) {
      console.error('❌ Signal generation failed:', error)
      throw new Error(`Signal generation failed: ${error.message}`)
    }
  }

  private async executeStrategy(
    strategyName: string,
    context: SignalContext & { marketData: MarketData[] }
  ): Promise<SignalResult> {
    const strategyFn = StrategyRegistry[strategyName]

    if (!strategyFn) {
      throw new Error(`Strategy ${strategyName} not found`)
    }

    const strategyContext = {
      symbol: context.symbol,
      priceHistory: context.marketData.map(d => d.close),
      marketData: context.marketData,
      ...context.parameters
    }

    const result = await strategyFn(strategyContext)
    const currentPrice = context.marketData[context.marketData.length - 1].close
    const action = result.action.toUpperCase() as 'BUY' | 'SELL' | 'HOLD'

    // Calculate stop loss and take profit if not provided
    const stopLoss = result.metadata?.stopLoss || this.calculateStopLoss(currentPrice, action)
    const takeProfit = result.metadata?.takeProfit || this.calculateTakeProfit(currentPrice, action)

    return {
      symbol: result.symbol,
      action,
      confidence: result.confidence,
      strategy: result.strategy,
      reason: `${strategyName} strategy signal`,
      timestamp: new Date(),
      riskScore: 1 - result.confidence,
      stopLoss,
      takeProfit,
      metadata: {
        ...result.metadata,
        marketData: context.marketData,
        currentPrice
      }
    }
  }

  /**
   * Calculate stop loss based on current price and action
   * Uses 2% stop loss for risk management
   */
  private calculateStopLoss(currentPrice: number, action: 'BUY' | 'SELL' | 'HOLD'): number {
    if (action === 'HOLD') return 0

    // 2% stop loss
    const stopLossPercent = 0.02

    if (action === 'BUY') {
      // For BUY orders, stop loss is below current price
      return currentPrice * (1 - stopLossPercent)
    } else {
      // For SELL orders, stop loss is above current price
      return currentPrice * (1 + stopLossPercent)
    }
  }

  /**
   * Calculate take profit based on current price and action
   * Uses 4% take profit for 2:1 risk/reward ratio
   */
  private calculateTakeProfit(currentPrice: number, action: 'BUY' | 'SELL' | 'HOLD'): number {
    if (action === 'HOLD') return 0

    // 4% take profit (2:1 risk/reward)
    const takeProfitPercent = 0.04

    if (action === 'BUY') {
      // For BUY orders, take profit is above current price
      return currentPrice * (1 + takeProfitPercent)
    } else {
      // For SELL orders, take profit is below current price
      return currentPrice * (1 - takeProfitPercent)
    }
  }

  private async fetchMarketData(symbol: string, timeframe: string): Promise<MarketData[]> {
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 100) // Get last 100 days

      // Use REST API to fetch bars
      const apiKeyId = process.env.APCA_API_KEY_ID
      const apiSecretKey = process.env.APCA_API_SECRET_KEY

      if (!apiKeyId || !apiSecretKey) {
        throw new Error('Alpaca API credentials not configured')
      }

      // Try IEX feed first (free for all accounts)
      const baseUrl = 'https://data.alpaca.markets'

      const response = await fetch(
        `${baseUrl}/v2/stocks/${symbol}/bars?start=${start.toISOString()}&end=${end.toISOString()}&timeframe=${timeframe}&limit=100&feed=iex`,
        {
          headers: {
            'APCA-API-KEY-ID': apiKeyId,
            'APCA-API-SECRET-KEY': apiSecretKey
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))

        // If IEX also fails, fall back to simulated data
        if (response.status === 403 || response.status === 422) {
          console.warn(`⚠️ Alpaca API access limited. Using simulated market data for ${symbol}`)
          return this.generateSimulatedMarketData(symbol, 100)
        }

        throw new Error(`HTTP ${response.status}: ${errorData.message || 'Failed to fetch'}`)
      }

      const data = await response.json()

      if (!data.bars || data.bars.length === 0) {
        console.warn(`⚠️ No market data from Alpaca. Using simulated data for ${symbol}`)
        return this.generateSimulatedMarketData(symbol, 100)
      }

      const marketData: MarketData[] = data.bars.map((bar: any) => ({
        symbol,
        timestamp: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        vwap: bar.vw,
        trades: bar.n
      }))

      return marketData

    } catch (error: any) {
      console.error(`Failed to fetch market data for ${symbol}:`, error)

      // Final fallback to simulated data
      console.warn(`⚠️ Using simulated market data for ${symbol} due to API error`)
      return this.generateSimulatedMarketData(symbol, 100)
    }
  }

  /**
   * Generate realistic simulated market data for testing
   * This is used when Alpaca API is unavailable or subscription doesn't permit data access
   */
  private generateSimulatedMarketData(symbol: string, days: number): MarketData[] {
    const marketData: MarketData[] = []

    // Base price varies by symbol for realism
    const basePrices: Record<string, number> = {
      'AAPL': 180,
      'GOOGL': 140,
      'MSFT': 380,
      'TSLA': 250,
      'NVDA': 480,
      'AMZN': 150,
      'META': 320,
      'SPY': 450,
      'QQQ': 380,
      'DIA': 350
    }

    let currentPrice = basePrices[symbol] || 100 + Math.random() * 200

    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    for (let i = days - 1; i >= 0; i--) {
      // Create realistic price movement
      const dailyReturn = (Math.random() - 0.48) * 0.03 // -1.5% to +1.5% daily
      const volatility = 0.01 + Math.random() * 0.01 // 1-2% intraday volatility

      const open = currentPrice
      const close = open * (1 + dailyReturn)
      const high = Math.max(open, close) * (1 + volatility)
      const low = Math.min(open, close) * (1 - volatility)

      // Generate realistic volume
      const baseVolume = 50000000 // 50M shares
      const volume = Math.floor(baseVolume * (0.5 + Math.random()))

      // Calculate VWAP (approximation)
      const vwap = (open + high + low + close) / 4

      marketData.push({
        symbol,
        timestamp: new Date(now - (i * oneDayMs)),
        open,
        high,
        low,
        close,
        volume,
        vwap,
        trades: Math.floor(100000 + Math.random() * 200000)
      })

      currentPrice = close // Update for next day
    }

    console.log(`📊 Generated ${days} days of simulated market data for ${symbol}`)
    console.log(`   Price range: $${Math.min(...marketData.map(d => d.low)).toFixed(2)} - $${Math.max(...marketData.map(d => d.high)).toFixed(2)}`)

    return marketData
  }

  /**
   * Get multi-strategy engine instance for advanced analysis
   */
  getMultiStrategyEngine(): MultiStrategyEngine | null {
    return this.multiStrategyEngine
  }

  /**
   * Load historical performance data
   */
  async loadPerformanceHistory(): Promise<void> {
    if (this.multiStrategyEngine) {
      await this.multiStrategyEngine.loadPerformanceHistory()
    }
  }

  /**
   * Record trade for performance tracking
   */
  async recordTrade(
    strategyId: string,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    entryPrice: number,
    exitPrice?: number,
    pnl?: number
  ): Promise<void> {
    if (this.multiStrategyEngine) {
      await this.multiStrategyEngine.recordTradeExecution(
        strategyId,
        symbol,
        side,
        quantity,
        entryPrice,
        exitPrice,
        pnl
      )
    }
  }
}