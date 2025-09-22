import { TradingStrategy, TradeSignal, MarketData, BacktestResult, BacktestTrade } from '@/types/trading'
import { calculateRSI, calculateSMA, calculateEMA } from '@/lib/utils/technicalIndicators'
import { logger } from '@/lib/utils/logger'

/**
 * Advanced RSI (Relative Strength Index) Trading Strategy
 * Enhanced with multiple confirmation signals and risk management
 */
export class RSIStrategy implements TradingStrategy {
  name = 'Advanced RSI Strategy'
  type = 'RSI'
  description = 'Multi-timeframe RSI with trend confirmation and dynamic thresholds'
  timeframe = '1h'
  
  parameters = {
    // Core RSI Parameters
    rsiPeriod: 14,
    oversoldThreshold: 30,
    overboughtThreshold: 70,
    
    // Advanced Parameters
    trendFilterPeriod: 50,        // SMA period for trend filter
    volumeConfirmation: true,     // Require volume confirmation
    divergenceDetection: true,    // Look for RSI divergences
    dynamicThresholds: true,      // Adjust thresholds based on volatility
    
    // Risk Management
    stopLossPercent: 2.0,
    takeProfitPercent: 4.0,
    maxPositionSize: 0.05,        // 5% of portfolio
    minDataPoints: 50,
    
    // Multi-timeframe
    confirmationTimeframes: ['4h', '1d'], // Higher timeframe confirmation
  }

  constructor(customParams?: Partial<typeof RSIStrategy.prototype.parameters>) {
    if (customParams) {
      this.parameters = { ...this.parameters, ...customParams }
    }
  }

  /**
   * Main analysis method with enhanced signal generation
   */
  async analyze(data: MarketData[]): Promise<TradeSignal> {
    try {
      if (data.length < this.parameters.minDataPoints) {
        return this.createHoldSignal(`Insufficient data: ${data.length}/${this.parameters.minDataPoints}`)
      }

      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const prices = sortedData.map(d => d.close)
      const volumes = sortedData.map(d => d.volume)
      const highs = sortedData.map(d => d.high)
      const lows = sortedData.map(d => d.low)

      // Calculate technical indicators
      const rsiValues = calculateRSI(prices, this.parameters.rsiPeriod)
      const smaValues = calculateSMA(prices, this.parameters.trendFilterPeriod)
      const emaValues = calculateEMA(prices, 20)
      
      if (rsiValues.length === 0) {
        return this.createHoldSignal('Unable to calculate RSI')
      }

      const currentRSI = rsiValues[rsiValues.length - 1]
      const currentPrice = prices[prices.length - 1]
      const currentSMA = smaValues[smaValues.length - 1]
      const currentEMA = emaValues[emaValues.length - 1]
      const currentVolume = volumes[volumes.length - 1]
      const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20

      // Determine dynamic thresholds based on volatility
      const { oversoldLevel, overboughtLevel } = this.calculateDynamicThresholds(prices, rsiValues)

      // Core RSI signals
      const rsiSignal = this.getRSISignal(currentRSI, oversoldLevel, overboughtLevel)
      
      if (rsiSignal.action === 'HOLD') {
        return rsiSignal
      }

      // Apply confirmation filters
      const confirmations = await this.getConfirmationSignals({
        rsiSignal,
        currentPrice,
        currentSMA,
        currentEMA,
        currentVolume,
        avgVolume,
        prices,
        rsiValues,
        highs,
        lows
      })

      // Calculate final confidence
      const finalConfidence = this.calculateFinalConfidence(rsiSignal, confirmations)
      
      // Generate enhanced signal
      const enhancedSignal: TradeSignal = {
        action: rsiSignal.action,
        confidence: finalConfidence,
        reason: this.buildReasonString(rsiSignal, confirmations),
        riskScore: this.calculateRiskScore(currentRSI, finalConfidence, confirmations),
        stopLoss: this.calculateStopLoss(currentPrice, rsiSignal.action),
        takeProfit: this.calculateTakeProfit(currentPrice, rsiSignal.action),
        suggestedQuantity: this.calculatePositionSize(finalConfidence)
      }

      logger.info(`RSI Strategy Signal for ${sortedData[0]?.symbol}: ${enhancedSignal.action} (${(enhancedSignal.confidence * 100).toFixed(1)}%)`)
      
      return enhancedSignal

    } catch (error) {
      logger.error(`RSI Strategy analysis error: ${error}`)
      return this.createHoldSignal(`Analysis error: ${error}`)
    }
  }

  /**
   * Calculate dynamic RSI thresholds based on market volatility
   */
  private calculateDynamicThresholds(prices: number[], rsiValues: number[]) {
    if (!this.parameters.dynamicThresholds) {
      return {
        oversoldLevel: this.parameters.oversoldThreshold,
        overboughtLevel: this.parameters.overboughtThreshold
      }
    }

    // Calculate volatility (standard deviation of recent prices)
    const recentPrices = prices.slice(-20)
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    const volatility = Math.sqrt(
      recentPrices.reduce((acc, price) => acc + Math.pow(price - avgPrice, 2), 0) / recentPrices.length
    ) / avgPrice

    // Adjust thresholds based on volatility
    // High volatility = more extreme thresholds (less sensitive)
    // Low volatility = less extreme thresholds (more sensitive)
    const volatilityAdjustment = Math.min(10, volatility * 100)
    
    return {
      oversoldLevel: Math.max(20, this.parameters.oversoldThreshold - volatilityAdjustment),
      overboughtLevel: Math.min(80, this.parameters.overboughtThreshold + volatilityAdjustment)
    }
  }

  /**
   * Get core RSI signal
   */
  private getRSISignal(rsi: number, oversoldLevel: number, overboughtLevel: number): TradeSignal {
    if (rsi <= oversoldLevel) {
      const confidence = Math.min(1.0, (oversoldLevel - rsi) / 15 + 0.3)
      return {
        action: 'BUY',
        confidence,
        reason: `RSI oversold: ${rsi.toFixed(1)} <= ${oversoldLevel.toFixed(1)}`,
        riskScore: Math.max(0.1, Math.min(0.8, (oversoldLevel - rsi) / 20 + 0.2))
      }
    } else if (rsi >= overboughtLevel) {
      const confidence = Math.min(1.0, (rsi - overboughtLevel) / 15 + 0.3)
      return {
        action: 'SELL',
        confidence,
        reason: `RSI overbought: ${rsi.toFixed(1)} >= ${overboughtLevel.toFixed(1)}`,
        riskScore: Math.max(0.1, Math.min(0.8, (rsi - overboughtLevel) / 20 + 0.2))
      }
    } else {
      return {
        action: 'HOLD',
        confidence: 0.5,
        reason: `RSI neutral: ${rsi.toFixed(1)} (${oversoldLevel.toFixed(1)}-${overboughtLevel.toFixed(1)})`,
        riskScore: 0.4
      }
    }
  }

  /**
   * Get confirmation signals from multiple indicators
   */
  private async getConfirmationSignals(params: any) {
    const confirmations = {
      trend: this.getTrendConfirmation(params.currentPrice, params.currentSMA),
      volume: this.getVolumeConfirmation(params.currentVolume, params.avgVolume, params.rsiSignal.action),
      momentum: this.getMomentumConfirmation(params.currentPrice, params.currentEMA),
      divergence: this.getDivergenceSignal(params.prices, params.rsiValues),
      support_resistance: this.getSupportResistanceSignal(params.currentPrice, params.highs, params.lows)
    }

    return confirmations
  }

  /**
   * Trend confirmation using moving averages
   */
  private getTrendConfirmation(currentPrice: number, sma: number) {
    if (!sma) return { confirmed: false, strength: 0, reason: 'No SMA data' }
    
    const trendStrength = Math.abs(currentPrice - sma) / sma
    const isBullish = currentPrice > sma
    
    return {
      confirmed: trendStrength > 0.02, // 2% difference required
      strength: Math.min(1.0, trendStrength * 10),
      bullish: isBullish,
      reason: `Price ${isBullish ? 'above' : 'below'} SMA by ${(trendStrength * 100).toFixed(1)}%`
    }
  }

  /**
   * Volume confirmation
   */
  private getVolumeConfirmation(currentVolume: number, avgVolume: number, action: string) {
    if (!this.parameters.volumeConfirmation) {
      return { confirmed: true, strength: 0.5, reason: 'Volume confirmation disabled' }
    }

    const volumeRatio = currentVolume / avgVolume
    const isHighVolume = volumeRatio > 1.2 // 20% above average
    
    return {
      confirmed: isHighVolume,
      strength: Math.min(1.0, volumeRatio - 1),
      ratio: volumeRatio,
      reason: `Volume ${volumeRatio.toFixed(1)}x average ${isHighVolume ? '(confirmed)' : '(weak)'}`
    }
  }

  /**
   * Momentum confirmation using EMA
   */
  private getMomentumConfirmation(currentPrice: number, ema: number) {
    if (!ema) return { confirmed: false, strength: 0, reason: 'No EMA data' }
    
    const momentum = (currentPrice - ema) / ema
    const strongMomentum = Math.abs(momentum) > 0.01 // 1% momentum required
    
    return {
      confirmed: strongMomentum,
      strength: Math.min(1.0, Math.abs(momentum) * 50),
      bullish: momentum > 0,
      reason: `Momentum: ${(momentum * 100).toFixed(2)}%`
    }
  }

  /**
   * RSI Divergence detection
   */
  private getDivergenceSignal(prices: number[], rsiValues: number[]) {
    if (!this.parameters.divergenceDetection || prices.length < 20) {
      return { detected: false, type: null, strength: 0 }
    }

    const recentPrices = prices.slice(-20)
    const recentRSI = rsiValues.slice(-20)
    
    // Simple divergence detection (can be enhanced)
    const priceHigh = Math.max(...recentPrices.slice(-10))
    const priceHighIndex = recentPrices.lastIndexOf(priceHigh)
    const rsiAtPriceHigh = recentRSI[priceHighIndex]
    
    const priceLow = Math.min(...recentPrices.slice(-10))
    const priceLowIndex = recentPrices.lastIndexOf(priceLow)
    const rsiAtPriceLow = recentRSI[priceLowIndex]

    // Bullish divergence: price makes lower low, RSI makes higher low
    // Bearish divergence: price makes higher high, RSI makes lower high
    
    return {
      detected: false, // Simplified - implement full divergence logic
      type: null,
      strength: 0,
      reason: 'Divergence analysis pending'
    }
  }

  /**
   * Support/Resistance confirmation
   */
  private getSupportResistanceSignal(currentPrice: number, highs: number[], lows: number[]) {
    const recentHighs = highs.slice(-20)
    const recentLows = lows.slice(-20)
    
    const resistance = Math.max(...recentHighs)
    const support = Math.min(...recentLows)
    
    const nearResistance = Math.abs(currentPrice - resistance) / resistance < 0.02
    const nearSupport = Math.abs(currentPrice - support) / support < 0.02
    
    return {
      nearSupport,
      nearResistance,
      supportLevel: support,
      resistanceLevel: resistance,
      strength: nearSupport || nearResistance ? 0.8 : 0.2,
      reason: nearSupport ? 'Near support level' : nearResistance ? 'Near resistance level' : 'No significant S/R levels'
    }
  }

  /**
   * Calculate final confidence based on all confirmations
   */
  private calculateFinalConfidence(rsiSignal: TradeSignal, confirmations: any): number {
    let confidence = rsiSignal.confidence || 0.5
    let multiplier = 1.0

    // Trend confirmation
    if (confirmations.trend.confirmed) {
      const trendAligned = (rsiSignal.action === 'BUY' && confirmations.trend.bullish) ||
                          (rsiSignal.action === 'SELL' && !confirmations.trend.bullish)
      multiplier *= trendAligned ? 1.2 : 0.8
    }

    // Volume confirmation
    if (confirmations.volume.confirmed) {
      multiplier *= 1.15
    } else {
      multiplier *= 0.9
    }

    // Momentum confirmation
    if (confirmations.momentum.confirmed) {
      const momentumAligned = (rsiSignal.action === 'BUY' && confirmations.momentum.bullish) ||
                             (rsiSignal.action === 'SELL' && !confirmations.momentum.bullish)
      multiplier *= momentumAligned ? 1.1 : 0.85
    }

    // Support/Resistance
    if (confirmations.support_resistance.nearSupport && rsiSignal.action === 'BUY') {
      multiplier *= 1.1
    } else if (confirmations.support_resistance.nearResistance && rsiSignal.action === 'SELL') {
      multiplier *= 1.1
    }

    return Math.min(1.0, Math.max(0.1, confidence * multiplier))
  }

  /**
   * Build comprehensive reason string
   */
  private buildReasonString(rsiSignal: TradeSignal, confirmations: any): string {
    let reasons = [rsiSignal.reason]
    
    if (confirmations.trend.confirmed) {
      reasons.push(`Trend: ${confirmations.trend.reason}`)
    }
    
    if (confirmations.volume.confirmed) {
      reasons.push(`Volume: ${confirmations.volume.reason}`)
    }
    
    if (confirmations.momentum.confirmed) {
      reasons.push(`Momentum: ${confirmations.momentum.reason}`)
    }

    return reasons.join(' | ')
  }

  /**
   * Calculate stop loss level
   */
  private calculateStopLoss(currentPrice: number, action: string): number {
    const stopLossMultiplier = this.parameters.stopLossPercent / 100
    
    if (action === 'BUY') {
      return currentPrice * (1 - stopLossMultiplier)
    } else {
      return currentPrice * (1 + stopLossMultiplier)
    }
  }

  /**
   * Calculate take profit level
   */
  private calculateTakeProfit(currentPrice: number, action: string): number {
    const takeProfitMultiplier = this.parameters.takeProfitPercent / 100
    
    if (action === 'BUY') {
      return currentPrice * (1 + takeProfitMultiplier)
    } else {
      return currentPrice * (1 - takeProfitMultiplier)
    }
  }

  /**
   * Calculate position size based on confidence
   */
  private calculatePositionSize(confidence: number): number {
    // Position size scales with confidence (0.1x to 1x of max position size)
    const scaleFactor = 0.1 + (confidence * 0.9)
    return this.parameters.maxPositionSize * scaleFactor
  }

  /**
   * Create hold signal helper
   */
  private createHoldSignal(reason: string): TradeSignal {
    return {
      action: 'HOLD',
      confidence: 0,
      reason,
      riskScore: 0.5
    }
  }

  /**
   * Comprehensive backtesting implementation
   */
  async backtest(historicalData: MarketData[]): Promise<BacktestResult> {
    const trades: BacktestTrade[] = []
    let position: { entry: MarketData; quantity: number } | null = null
    let totalReturn = 0
    let maxDrawdown = 0
    let peakValue = 10000 // Starting capital
    let currentValue = 10000

    for (let i = this.parameters.minDataPoints; i < historicalData.length; i++) {
      const dataSlice = historicalData.slice(0, i + 1)
      const signal = await this.analyze(dataSlice)
      const currentPrice = historicalData[i].close

      if (signal.action === 'BUY' && !position && signal.confidence > 0.6) {
        // Open long position
        const quantity = Math.floor((currentValue * (signal.suggestedQuantity || 0.05)) / currentPrice)
        position = { entry: historicalData[i], quantity }
        
      } else if (signal.action === 'SELL' && position) {
        // Close position
        const entryPrice = position.entry.close
        const exitPrice = currentPrice
        const pnl = (exitPrice - entryPrice) * position.quantity
        const holdingPeriod = Math.floor((historicalData[i].timestamp.getTime() - position.entry.timestamp.getTime()) / (1000 * 60 * 60 * 24))

        trades.push({
          entryDate: position.entry.timestamp,
          exitDate: historicalData[i].timestamp,
          symbol: historicalData[i].symbol,
          side: 'BUY',
          entryPrice,
          exitPrice,
          quantity: position.quantity,
          pnl,
          percentReturn: (pnl / (entryPrice * position.quantity)) * 100,
          holdingPeriod,
          commission: 0,
          slippage: 0
        })

        currentValue += pnl
        totalReturn += pnl
        
        // Update max drawdown
        if (currentValue > peakValue) {
          peakValue = currentValue
        }
        const drawdown = (peakValue - currentValue) / peakValue
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }

        position = null
      }
    }

    const winningTrades = trades.filter(t => t.pnl > 0).length
    const losingTrades = trades.filter(t => t.pnl < 0).length
    const winRate = trades.length > 0 ? winningTrades / trades.length : 0
    const avgTrade = trades.length > 0 ? totalReturn / trades.length : 0
    
    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(t => t.pnl / 10000) // Percentage returns
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0
    const returnStdDev = Math.sqrt(returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length) || 1
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0

    const winningPnL = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
    const losingPnL = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
    const profitFactor = losingPnL > 0 ? winningPnL / losingPnL : winningPnL > 0 ? 999 : 0

    return {
      startDate: historicalData[0].timestamp,
      endDate: historicalData[historicalData.length - 1].timestamp,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate: winRate * 100, // Percentage
      totalReturn: (totalReturn / 10000) * 100, // Percentage
      annualizedReturn: 0, // TODO: Calculate annualized return
      maxDrawdown: maxDrawdown * 100, // Percentage
      sharpeRatio,
      sortinoRatio: 0, // TODO: Calculate Sortino ratio
      calmarRatio: 0, // TODO: Calculate Calmar ratio
      volatility: 0, // TODO: Calculate volatility
      profitFactor,
      avgTrade,
      avgWinningTrade: winningTrades > 0 ? winningPnL / winningTrades : 0,
      avgLosingTrade: losingTrades > 0 ? -losingPnL / losingTrades : 0,
      trades,
      equityCurve: [] // TODO: Calculate equity curve
    }
  }

  /**
   * Calculate risk score based on RSI value, confidence, and confirmations
   */
  private calculateRiskScore(rsi: number, confidence: number, confirmations: any): number {
    let riskScore = 0.5 // Base risk score
    
    // Risk based on RSI extremes (more extreme RSI can be riskier due to potential reversals)
    if (rsi <= 20 || rsi >= 80) {
      riskScore += 0.1 // Very extreme RSI increases risk slightly
    } else if (rsi <= 30 || rsi >= 70) {
      riskScore -= 0.1 // Moderate RSI extremes reduce risk (good entry points)
    }
    
    // Risk based on confirmations
    const confirmationCount = [
      confirmations.trend.confirmed,
      confirmations.volume.confirmed,
      confirmations.momentum.confirmed,
      confirmations.support_resistance.nearSupport || confirmations.support_resistance.nearResistance
    ].filter(Boolean).length
    
    riskScore -= confirmationCount * 0.1 // More confirmations reduce risk
    
    // Lower risk for higher confidence signals
    riskScore -= (confidence - 0.5) * 0.3
    
    // Ensure risk score stays within bounds
    return Math.max(0.1, Math.min(0.9, riskScore))
  }

  /**
   * Validate strategy parameters
   */
  validateParameters(params: Record<string, any>): boolean {
    const requiredParams = ['rsiPeriod', 'oversoldThreshold', 'overboughtThreshold']
    
    for (const param of requiredParams) {
      if (!(param in params) || typeof params[param] !== 'number') {
        return false
      }
    }
    
    // Validate ranges
    if (params.rsiPeriod < 2 || params.rsiPeriod > 50) return false
    if (params.oversoldThreshold < 10 || params.oversoldThreshold > 40) return false
    if (params.overboughtThreshold < 60 || params.overboughtThreshold > 90) return false
    if (params.oversoldThreshold >= params.overboughtThreshold) return false
    
    return true
  }
}
