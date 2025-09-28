// import { TradeSignal, MarketData } from '@/types/trading'

// export interface TradeOutcome {
//   tradeId: string
//   symbol: string
//   action: 'BUY' | 'SELL'
//   entryPrice: number
//   exitPrice?: number
//   entryTime: Date
//   exitTime?: Date
//   predictedDirection: 'UP' | 'DOWN' | 'HOLD'
//   actualDirection?: 'UP' | 'DOWN' | 'FLAT'
//   confidence: number
//   aiScore: number
//   positionSize: number
//   realizedPnL?: number
//   unrealizedPnL?: number
//   isCorrectPrediction?: boolean
//   predictionAccuracy?: number
//   marketConditions: {
//     volatility: number
//     volume: number
//     momentum: number
//     trendStrength: number
//   }
//   technicalIndicators: {
//     rsi: number
//     macd: number
//     bollingerPosition: number
//     movingAverageSignal: number
//   }
//   learningMetrics: {
//     confidenceCalibration: number // How well-calibrated was the confidence
//     timingAccuracy: number // How accurate was the timing
//     magnitudeAccuracy: number // How accurate was the predicted magnitude
//   }
// }

// export interface LearningInsights {
//   overallAccuracy: number
//   confidenceCalibration: number
//   strongestPatterns: string[]
//   weakestPatterns: string[]
//   optimalConfidenceThreshold: number
//   bestPerformingConditions: {
//     volatilityRange: [number, number]
//     volumeRange: [number, number]
//     momentumRange: [number, number]
//   }
//   recommendedAdjustments: {
//     confidenceThresholds: {
//       minimum: number
//       conservative: number
//       aggressive: number
//     }
//     positionSizing: {
//       baseMultiplier: number
//       confidenceMultiplier: number
//     }
//   }
// }

// export class AILearningSystem {
//   private tradeOutcomes: TradeOutcome[] = []
//   private learningHistory: LearningInsights[] = []
//   private adaptationRate = 0.1 // How quickly to adapt to new data
//   private minSampleSize = 50 // Minimum trades before making adjustments

//   addTradeOutcome(outcome: TradeOutcome): void {
//     this.tradeOutcomes.push(outcome)

//     // Keep only last 1000 trades for memory efficiency
//     if (this.tradeOutcomes.length > 1000) {
//       this.tradeOutcomes = this.tradeOutcomes.slice(-1000)
//     }

//     console.log(`📚 Learning: Added trade outcome for ${outcome.symbol} - ${outcome.isCorrectPrediction ? '✅ Correct' : '❌ Incorrect'}`)
//   }

//   async trackTradeEntry(
//     tradeId: string,
//     signal: TradeSignal,
//     marketData: MarketData[],
//     entryPrice: number,
//     positionSize: number
//   ): Promise<void> {
//     const latestData = marketData[marketData.length - 1]

//     // Calculate technical indicators for learning
//     const technicalIndicators = this.calculateTechnicalIndicators(marketData)
//     const marketConditions = this.calculateMarketConditions(marketData)

//     const outcome: TradeOutcome = {
//       tradeId,
//       symbol: signal.symbol,
//       action: signal.action.toUpperCase() as 'BUY' | 'SELL',
//       entryPrice,
//       entryTime: new Date(),
//       predictedDirection: signal.action === 'buy' ? 'UP' : 'DOWN',
//       confidence: signal.confidence,
//       aiScore: 0, // Will be updated when trade is closed
//       positionSize,
//       marketConditions,
//       technicalIndicators,
//       learningMetrics: {
//         confidenceCalibration: 0,
//         timingAccuracy: 0,
//         magnitudeAccuracy: 0
//       }
//     }

//     this.addTradeOutcome(outcome)
//   }

//   async trackTradeExit(
//     tradeId: string,
//     exitPrice: number,
//     realizedPnL: number
//   ): Promise<void> {
//     const outcomeIndex = this.tradeOutcomes.findIndex(o => o.tradeId === tradeId)
//     if (outcomeIndex === -1) return

//     const outcome = this.tradeOutcomes[outcomeIndex]
//     const priceChange = exitPrice - outcome.entryPrice
//     const priceChangePercent = (priceChange / outcome.entryPrice) * 100

//     // Determine actual direction
//     let actualDirection: 'UP' | 'DOWN' | 'FLAT'
//     if (Math.abs(priceChangePercent) < 0.5) {
//       actualDirection = 'FLAT'
//     } else {
//       actualDirection = priceChangePercent > 0 ? 'UP' : 'DOWN'
//     }

//     // Calculate prediction accuracy
//     const isCorrectPrediction =
//       (outcome.predictedDirection === 'UP' && actualDirection === 'UP') ||
//       (outcome.predictedDirection === 'DOWN' && actualDirection === 'DOWN')

//     // Calculate learning metrics
//     const confidenceCalibration = this.calculateConfidenceCalibration(outcome.confidence, isCorrectPrediction)
//     const timingAccuracy = this.calculateTimingAccuracy(outcome.entryTime, new Date())
//     const magnitudeAccuracy = this.calculateMagnitudeAccuracy(outcome.confidence, Math.abs(priceChangePercent))

//     // Update outcome
//     this.tradeOutcomes[outcomeIndex] = {
//       ...outcome,
//       exitPrice,
//       exitTime: new Date(),
//       actualDirection,
//       realizedPnL,
//       isCorrectPrediction,
//       predictionAccuracy: isCorrectPrediction ? outcome.confidence : (1 - outcome.confidence),
//       learningMetrics: {
//         confidenceCalibration,
//         timingAccuracy,
//         magnitudeAccuracy
//       }
//     }

//     console.log(`🎯 Learning: Trade ${tradeId} completed - ${isCorrectPrediction ? 'CORRECT' : 'INCORRECT'} prediction`)

//     // Trigger learning analysis if we have enough samples
//     if (this.tradeOutcomes.length >= this.minSampleSize) {
//       await this.performLearningAnalysis()
//     }
//   }

//   private calculateTechnicalIndicators(marketData: MarketData[]) {
//     const closes = marketData.map(d => d.close)
//     const highs = marketData.map(d => d.high)
//     const lows = marketData.map(d => d.low)

//     return {
//       rsi: this.calculateRSI(closes, 14),
//       macd: this.calculateMACD(closes),
//       bollingerPosition: this.calculateBollingerPosition(closes, 20),
//       movingAverageSignal: this.calculateMASignal(closes)
//     }
//   }

//   private calculateMarketConditions(marketData: MarketData[]) {
//     const closes = marketData.map(d => d.close)
//     const volumes = marketData.map(d => d.volume)

//     return {
//       volatility: this.calculateVolatility(closes),
//       volume: volumes[volumes.length - 1] || 0,
//       momentum: this.calculateMomentum(closes),
//       trendStrength: this.calculateTrendStrength(closes)
//     }
//   }

//   private calculateRSI(prices: number[], period: number): number {
//     if (prices.length < period + 1) return 50

//     let gains = 0
//     let losses = 0

//     for (let i = 1; i <= period; i++) {
//       const change = prices[prices.length - i] - prices[prices.length - i - 1]
//       if (change > 0) gains += change
//       else losses += Math.abs(change)
//     }

//     const avgGain = gains / period
//     const avgLoss = losses / period

//     if (avgLoss === 0) return 100
//     const rs = avgGain / avgLoss
//     return 100 - (100 / (1 + rs))
//   }

//   private calculateMACD(prices: number[]) {
//     if (prices.length < 26) return 0

//     const ema12 = this.calculateEMA(prices, 12)
//     const ema26 = this.calculateEMA(prices, 26)
//     return ema12 - ema26
//   }

//   private calculateEMA(prices: number[], period: number): number {
//     if (prices.length === 0) return 0

//     const multiplier = 2 / (period + 1)
//     let ema = prices[prices.length - period]

//     for (let i = prices.length - period + 1; i < prices.length; i++) {
//       ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
//     }

//     return ema
//   }

//   private calculateBollingerPosition(prices: number[], period: number): number {
//     if (prices.length < period) return 0.5

//     const recentPrices = prices.slice(-period)
//     const sma = recentPrices.reduce((sum, p) => sum + p, 0) / period
//     const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period
//     const stdDev = Math.sqrt(variance)

//     const currentPrice = prices[prices.length - 1]
//     const upperBand = sma + (2 * stdDev)
//     const lowerBand = sma - (2 * stdDev)

//     return (currentPrice - lowerBand) / (upperBand - lowerBand)
//   }

//   private calculateMASignal(prices: number[]): number {
//     if (prices.length < 50) return 0

//     const ma20 = prices.slice(-20).reduce((sum, p) => sum + p, 0) / 20
//     const ma50 = prices.slice(-50).reduce((sum, p) => sum + p, 0) / 50

//     return (ma20 - ma50) / ma50
//   }

//   private calculateVolatility(prices: number[]): number {
//     if (prices.length < 2) return 0

//     const returns = []
//     for (let i = 1; i < prices.length; i++) {
//       returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
//     }

//     const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
//     const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length

//     return Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility
//   }

//   private calculateMomentum(prices: number[]): number {
//     if (prices.length < 10) return 0
//     return (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10]
//   }

//   private calculateTrendStrength(prices: number[]): number {
//     if (prices.length < 20) return 0

//     const recentPrices = prices.slice(-20)
//     let upDays = 0

//     for (let i = 1; i < recentPrices.length; i++) {
//       if (recentPrices[i] > recentPrices[i - 1]) upDays++
//     }

//     return upDays / (recentPrices.length - 1)
//   }

//   private calculateConfidenceCalibration(confidence: number, wasCorrect: boolean): number {
//     // Perfect calibration: confidence should match success rate
//     // Returns how far off the confidence was (0 = perfect, 1 = completely wrong)
//     return Math.abs(confidence - (wasCorrect ? 1 : 0))
//   }

//   private calculateTimingAccuracy(entryTime: Date, exitTime: Date): number {
//     // Simplified timing accuracy - could be enhanced with more sophisticated timing analysis
//     const duration = exitTime.getTime() - entryTime.getTime()
//     const hours = duration / (1000 * 60 * 60)

//     // Optimal holding period is 1-24 hours for this system
//     if (hours >= 1 && hours <= 24) return 1.0
//     if (hours < 1) return hours
//     return Math.max(0, 1 - (hours - 24) / 48)
//   }

//   private calculateMagnitudeAccuracy(confidence: number, actualMagnitude: number): number {
//     // Higher confidence should correlate with larger price moves
//     const expectedMagnitude = confidence * 5 // Expect up to 5% move for high confidence
//     return 1 - Math.abs(expectedMagnitude - actualMagnitude) / Math.max(expectedMagnitude, actualMagnitude)
//   }

//   async performLearningAnalysis(): Promise<LearningInsights> {
//     const completedTrades = this.tradeOutcomes.filter(t => t.exitTime && t.isCorrectPrediction !== undefined)

//     if (completedTrades.length < this.minSampleSize) {
//       console.log(`📚 Learning: Need ${this.minSampleSize - completedTrades.length} more completed trades for analysis`)
//       return this.getDefaultInsights()
//     }

//     const accuracy = completedTrades.filter(t => t.isCorrectPrediction).length / completedTrades.length
//     const avgConfidenceCalibration = completedTrades.reduce((sum, t) => sum + t.learningMetrics.confidenceCalibration, 0) / completedTrades.length

//     // Analyze performance by confidence ranges
//     const highConfidenceTrades = completedTrades.filter(t => t.confidence > 0.8)
//     const mediumConfidenceTrades = completedTrades.filter(t => t.confidence > 0.6 && t.confidence <= 0.8)
//     const lowConfidenceTrades = completedTrades.filter(t => t.confidence <= 0.6)

//     const highConfidenceAccuracy = highConfidenceTrades.length > 0
//       ? highConfidenceTrades.filter(t => t.isCorrectPrediction).length / highConfidenceTrades.length
//       : 0

//     // Find optimal confidence threshold
//     const optimalThreshold = this.findOptimalConfidenceThreshold(completedTrades)

//     // Analyze best performing market conditions
//     const successfulTrades = completedTrades.filter(t => t.isCorrectPrediction && t.realizedPnL! > 0)
//     const bestConditions = this.analyzeBestConditions(successfulTrades)

//     const insights: LearningInsights = {
//       overallAccuracy: accuracy,
//       confidenceCalibration: 1 - avgConfidenceCalibration, // Invert for better interpretation
//       strongestPatterns: this.identifyStrongestPatterns(completedTrades),
//       weakestPatterns: this.identifyWeakestPatterns(completedTrades),
//       optimalConfidenceThreshold: optimalThreshold,
//       bestPerformingConditions: bestConditions,
//       recommendedAdjustments: {
//         confidenceThresholds: {
//           minimum: Math.max(0.6, optimalThreshold - 0.1),
//           conservative: Math.max(0.7, optimalThreshold),
//           aggressive: Math.min(0.9, optimalThreshold + 0.1)
//         },
//         positionSizing: {
//           baseMultiplier: accuracy > 0.6 ? 1.2 : 0.8, // Increase base if performing well
//           confidenceMultiplier: avgConfidenceCalibration < 0.3 ? 2.0 : 1.5 // Increase multiplier if well-calibrated
//         }
//       }
//     }

//     this.learningHistory.push(insights)

//     console.log(`🧠 AI Learning Analysis Complete:`)
//     console.log(`   Overall Accuracy: ${(accuracy * 100).toFixed(1)}%`)
//     console.log(`   Confidence Calibration: ${(insights.confidenceCalibration * 100).toFixed(1)}%`)
//     console.log(`   Optimal Threshold: ${(optimalThreshold * 100).toFixed(1)}%`)
//     console.log(`   Recommended Min Confidence: ${(insights.recommendedAdjustments.confidenceThresholds.minimum * 100).toFixed(1)}%`)

//     return insights
//   }

//   private findOptimalConfidenceThreshold(trades: TradeOutcome[]): number {
//     let bestThreshold = 0.65
//     let bestScore = 0

//     for (let threshold = 0.5; threshold <= 0.95; threshold += 0.05) {
//       const validTrades = trades.filter(t => t.confidence >= threshold)
//       if (validTrades.length === 0) continue

//       const accuracy = validTrades.filter(t => t.isCorrectPrediction).length / validTrades.length
//       const avgPnL = validTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0) / validTrades.length

//       // Score combines accuracy and profitability
//       const score = accuracy * 0.7 + (avgPnL > 0 ? 0.3 : 0)

//       if (score > bestScore) {
//         bestScore = score
//         bestThreshold = threshold
//       }
//     }

//     return bestThreshold
//   }

//   private analyzeBestConditions(successfulTrades: TradeOutcome[]) {
//     if (successfulTrades.length === 0) {
//       return {
//         volatilityRange: [0.1, 0.3],
//         volumeRange: [100000, 1000000],
//         momentumRange: [-0.05, 0.05]
//       }
//     }

//     const volatilities = successfulTrades.map(t => t.marketConditions.volatility)
//     const volumes = successfulTrades.map(t => t.marketConditions.volume)
//     const momentums = successfulTrades.map(t => t.marketConditions.momentum)

//     return {
//       volatilityRange: [
//         Math.min(...volatilities),
//         Math.max(...volatilities)
//       ] as [number, number],
//       volumeRange: [
//         Math.min(...volumes),
//         Math.max(...volumes)
//       ] as [number, number],
//       momentumRange: [
//         Math.min(...momentums),
//         Math.max(...momentums)
//       ] as [number, number]
//     }
//   }

//   private identifyStrongestPatterns(trades: TradeOutcome[]): string[] {
//     const patterns: string[] = []

//     // Analyze RSI patterns
//     const highRSISuccess = trades.filter(t => t.technicalIndicators.rsi > 70 && t.isCorrectPrediction).length
//     const lowRSISuccess = trades.filter(t => t.technicalIndicators.rsi < 30 && t.isCorrectPrediction).length

//     if (highRSISuccess > lowRSISuccess) patterns.push('High RSI momentum continuation')
//     if (lowRSISuccess > highRSISuccess) patterns.push('Low RSI reversal signals')

//     // Analyze volatility patterns
//     const highVolSuccess = trades.filter(t => t.marketConditions.volatility > 0.3 && t.isCorrectPrediction).length
//     if (highVolSuccess / trades.length > 0.7) patterns.push('High volatility breakouts')

//     return patterns.slice(0, 3) // Return top 3 patterns
//   }

//   private identifyWeakestPatterns(trades: TradeOutcome[]): string[] {
//     const patterns: string[] = []

//     // Find patterns with low success rates
//     const flatMarketTrades = trades.filter(t => Math.abs(t.marketConditions.momentum) < 0.01)
//     if (flatMarketTrades.length > 0) {
//       const flatSuccessRate = flatMarketTrades.filter(t => t.isCorrectPrediction).length / flatMarketTrades.length
//       if (flatSuccessRate < 0.4) patterns.push('Flat market conditions')
//     }

//     return patterns.slice(0, 3)
//   }

//   private getDefaultInsights(): LearningInsights {
//     return {
//       overallAccuracy: 0.5,
//       confidenceCalibration: 0.5,
//       strongestPatterns: [],
//       weakestPatterns: [],
//       optimalConfidenceThreshold: 0.65,
//       bestPerformingConditions: {
//         volatilityRange: [0.1, 0.3],
//         volumeRange: [100000, 1000000],
//         momentumRange: [-0.05, 0.05]
//       },
//       recommendedAdjustments: {
//         confidenceThresholds: {
//           minimum: 0.65,
//           conservative: 0.75,
//           aggressive: 0.85
//         },
//         positionSizing: {
//           baseMultiplier: 1.0,
//           confidenceMultiplier: 1.5
//         }
//       }
//     }
//   }

//   getLatestInsights(): LearningInsights | null {
//     return this.learningHistory.length > 0
//       ? this.learningHistory[this.learningHistory.length - 1]
//       : null
//   }

//   getTradeHistory(): TradeOutcome[] {
//     return [...this.tradeOutcomes]
//   }

//   getAccuracyTrend(periodDays: number = 30): number[] {
//     const cutoffDate = new Date()
//     cutoffDate.setDate(cutoffDate.getDate() - periodDays)

//     const recentTrades = this.tradeOutcomes.filter(t =>
//       t.exitTime && t.exitTime >= cutoffDate && t.isCorrectPrediction !== undefined
//     )

//     // Group by day and calculate daily accuracy
//     const dailyAccuracy: number[] = []
//     const groupedByDay = new Map<string, TradeOutcome[]>()

//     recentTrades.forEach(trade => {
//       const day = trade.exitTime!.toDateString()
//       if (!groupedByDay.has(day)) {
//         groupedByDay.set(day, [])
//       }
//       groupedByDay.get(day)!.push(trade)
//     })

//     groupedByDay.forEach(dayTrades => {
//       const accuracy = dayTrades.filter(t => t.isCorrectPrediction).length / dayTrades.length
//       dailyAccuracy.push(accuracy)
//     })

//     return dailyAccuracy
//   }
// }