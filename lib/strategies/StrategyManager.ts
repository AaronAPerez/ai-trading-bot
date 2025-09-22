import React from 'react'
import { RSIStrategy } from './RSIStrategy'
import { MACDStrategy } from './MACDStrategy'
import { BollingerBandsStrategy } from './BollingerBandsStrategy'
import { MovingAverageCrossoverStrategy } from './MovingAverageCrossoverStrategy'
import { MeanReversionStrategy } from './MeanReversionStrategy'
import { EnsembleData, StrategyMetrics, StrategySignal } from '@/types/dashboard'
import { EnhancedStrategyMetrics, StrategyRecommendation, TopStrategyAnalysis, TradeSignal } from '@/types/trading'

// STEP 2: Enhanced Strategy Manager
export class StrategyManager {
  private educationalContent: Map<string, any> = new Map()
  private performanceHistory: Map<string, EnhancedStrategyMetrics[]> = new Map()
  private strategies: Map<string, any> = new Map()

  constructor() {
    this.initializeEducationalContent()
    this.initializeStrategies()
  }

  private initializeStrategies() {
    this.strategies.set('rsi', new RSIStrategy())
    this.strategies.set('macd', new MACDStrategy())
    this.strategies.set('bollinger', new BollingerBandsStrategy())
    this.strategies.set('ma_crossover', new MovingAverageCrossoverStrategy())
    this.strategies.set('mean_reversion', new MeanReversionStrategy())
  }

  getStrategyIds(): string[] {
    return Array.from(this.strategies.keys())
  }

  getStrategy(id: string) {
    return this.strategies.get(id)
  }

  /**
   * Get ensemble signal from all strategies
   * Implements voting mechanism with confidence weighting
   */
  async getEnsembleSignal(symbol: string, marketData: any[]): Promise<EnsembleData> {
    const signals: Record<string, StrategySignal> = {}
    const votes = { BUY: 0, SELL: 0, HOLD: 0 }
    let totalConfidence = 0

    // Collect signals from all strategies
    for (const [id, strategy] of this.strategies.entries()) {
      try {
        const signal = await strategy.analyze(marketData)
        signals[id] = signal
        
        // Weight votes by confidence
        if (signal.action in votes) {
          votes[signal.action as keyof typeof votes] += signal.confidence
        }
        totalConfidence += signal.confidence
      } catch (error) {
        console.error(`Strategy ${id} analysis failed:`, error)
      }
    }

    // Determine ensemble action
    let ensembleAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    let maxVote = Math.max(votes.BUY, votes.SELL, votes.HOLD)
    
    if (maxVote === votes.BUY) ensembleAction = 'BUY'
    else if (maxVote === votes.SELL) ensembleAction = 'SELL'

    // Calculate consensus (agreement level)
    const consensus = maxVote / totalConfidence
    
    // Determine risk level
    const riskLevel = consensus > 0.8 ? 'LOW' : consensus > 0.6 ? 'MEDIUM' : 'HIGH'
    
    return {
      signal: {
        action: ensembleAction,
        confidence: totalConfidence / this.strategies.size,
        reason: `Ensemble decision: ${ensembleAction} with ${consensus.toFixed(2)} consensus`,
        timestamp: new Date(),
        price: marketData[marketData.length - 1]?.close
      },
      consensus,
      individualSignals: signals,
      riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH'
    }
  }

  /**
   * Main method to get comprehensive analysis with recommendations
   * Builds on your existing getEnsembleSignal method
   */
  async getComprehensiveAnalysis(symbol: string, marketData: any[]) {
    // Use existing ensemble method as base
    const ensembleData = await this.getEnsembleSignal(symbol, marketData)
    
    const analysis = {
      ensemble: ensembleData,
      topStrategy: null as TopStrategyAnalysis | null,
      strategyPerformance: new Map(),
      recommendations: [] as StrategyRecommendation[],
      riskAssessment: null as any,
      marketConditions: null as any,
      optimizationTips: [] as any[],
      educationalTips: [] as any[]
    }

    // Enhance existing strategy analysis
    for (const strategyId of this.getStrategyIds()) {
      try {
        const strategy = this.getStrategy(strategyId)
        const signal = await strategy.analyze(marketData)
        const enhancedMetrics = this.calculateEnhancedMetrics(strategyId, signal, marketData)
        const recommendations = this.generateStrategyRecommendations(strategyId, enhancedMetrics)

        analysis.strategyPerformance.set(strategyId, {
          signal,
          metrics: enhancedMetrics,
          recommendations,
          educationalContent: this.getEducationalContent(strategyId)
        })
      } catch (error) {
        console.error(`Enhanced analysis failed for ${strategyId}:`, error)
      }
    }

    // Identify top performing strategy
    analysis.topStrategy = this.identifyTopStrategy(analysis.strategyPerformance)
    
    // Generate market condition assessment
    analysis.marketConditions = this.assessMarketConditions(marketData)
    
    // Generate risk assessment
    analysis.riskAssessment = this.calculateRiskAssessment(analysis.strategyPerformance)
    
    // Generate optimization recommendations
    analysis.optimizationTips = this.generateOptimizationTips(analysis.strategyPerformance, analysis.marketConditions)
    
    // Add educational content
    analysis.educationalTips = this.getContextualEducation(analysis.topStrategy, analysis.marketConditions)

    return analysis
  }

  private calculateEnhancedMetrics(strategyId: string, signal: TradeSignal, marketData: any[]): EnhancedStrategyMetrics {
    // Get base metrics from your existing system
    const baseMetrics = this.calculatePerformanceMetrics(signal) // Your existing method
    
    // Add enhanced metrics
    const prices = marketData.slice(-50).map(d => d.close)
    const returns = this.calculateReturns(prices)
    
    return {
      ...baseMetrics,
      sharpeRatio: this.calculateSharpeRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(prices),
      volatility: this.calculateVolatility(returns),
      consistency: this.calculateConsistency(returns),
      riskScore: signal.riskScore || 0.5
    }
  }

  private identifyTopStrategy(strategyPerformance: Map<string, any>): TopStrategyAnalysis | null {
    let topStrategy = null
    let bestScore = -Infinity

    for (const [strategyId, performance] of strategyPerformance.entries()) {
      const metrics = performance.metrics
      // Composite scoring algorithm
      const score = (
        metrics.winRate * 0.25 +
        metrics.profitability * 0.2 +
        metrics.sharpeRatio * 15 * 0.2 +
        metrics.consistency * 100 * 0.15 +
        (100 - metrics.riskScore * 100) * 0.1 +
        (100 - metrics.maxDrawdown) * 0.1
      )

      if (score > bestScore) {
        bestScore = score
        topStrategy = {
          strategyId,
          name: this.getStrategyDisplayName(strategyId),
          score: parseFloat(score.toFixed(2)),
          metrics,
          signal: performance.signal,
          strengths: this.getStrategyStrengths(strategyId, metrics),
          improvements: this.getImprovementAreas(strategyId, metrics),
          recommendations: performance.recommendations.slice(0, 3) // Top 3 recommendations
        }
      }
    }

    return topStrategy
  }

  private initializeEducationalContent() {
    this.educationalContent.set('rsi', {
      description: 'RSI (Relative Strength Index) measures momentum by comparing recent gains to recent losses',
      keyPoints: [
        'Values above 70 typically indicate overbought conditions',
        'Values below 30 typically indicate oversold conditions',
        'Most effective in ranging markets',
        'Can generate false signals in strong trending markets'
      ],
      bestConditions: 'Sideways/ranging markets with moderate volatility',
      commonMistakes: [
        'Trading RSI signals in strong trends',
        'Ignoring volume confirmation',
        'Using default parameters without optimization'
      ],
      tips: [
        'Wait for RSI to return from extreme levels before entering',
        'Use divergence between price and RSI for stronger signals',
        'Combine with trend analysis for better results'
      ]
    })

    this.educationalContent.set('macd', {
      description: 'MACD tracks the relationship between two moving averages to identify momentum changes',
      keyPoints: [
        'Crossovers between MACD line and signal line indicate momentum shifts',
        'Histogram shows the strength of momentum',
        'Works best in trending markets',
        'Lagging indicator - confirms trends rather than predicting them'
      ],
      bestConditions: 'Trending markets with clear directional moves',
      commonMistakes: [
        'Taking every crossover signal without trend confirmation',
        'Ignoring divergences between MACD and price',
        'Using in choppy/sideways markets'
      ],
      tips: [
        'Wait for histogram to confirm crossover direction',
        'Look for MACD line above/below zero for trend context',
        'Use multiple timeframes for better signal quality'
      ]
    })

    // Add more educational content for other strategies...
  }

  private getEducationalContent(strategyId: string) {
    return this.educationalContent.get(strategyId) || {
      description: 'Advanced trading strategy with specific market applications',
      keyPoints: ['Systematic approach to market analysis'],
      bestConditions: 'Various market conditions',
      commonMistakes: ['Insufficient backtesting'],
      tips: ['Always use proper risk management']
    }
  }

  private getContextualEducation(topStrategy: TopStrategyAnalysis | null, marketConditions: any) {
    const tips = []

    if (topStrategy) {
      tips.push({
        category: 'Top Strategy Optimization',
        title: `Maximize ${topStrategy.name} Performance`,
        content: `Your top performing strategy (${topStrategy.name}) has a ${topStrategy.score} composite score. Focus on these areas:`,
        actionItems: topStrategy.improvements.length > 0 ? topStrategy.improvements : ['Continue current approach', 'Monitor for performance degradation'],
        educationalNote: this.getEducationalContent(topStrategy.strategyId).tips[0]
      })
    }

    if (marketConditions) {
      tips.push({
        category: 'Market Condition Awareness',
        title: `Trading in ${marketConditions.trend} Markets`,
        content: this.getMarketEducation(marketConditions.trend, marketConditions.volatility),
        actionItems: this.getMarketSpecificActions(marketConditions),
        educationalNote: 'Understanding market conditions is crucial for strategy selection'
      })
    }

    // Add risk management education
    tips.push({
      category: 'Risk Management',
      title: 'Professional Risk Management Practices',
      content: 'Proper risk management is more important than strategy selection for long-term success',
      actionItems: [
        'Never risk more than 1-2% of account per trade',
        'Use stop-losses on every position',
        'Diversify across multiple strategies and timeframes',
        'Keep detailed records of all trades'
      ],
      educationalNote: 'The best traders focus on preservation of capital first, profits second'
    })

    return tips
  }

  // Helper methods for calculations
  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const std = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length)
    return std === 0 ? 0 : (mean / std) * Math.sqrt(252) // Annualized
  }

  private calculateMaxDrawdown(prices: number[]): number {
    let maxDrawdown = 0
    let peak = prices[0]
    
    for (const price of prices) {
      if (price > peak) peak = price
      const drawdown = ((peak - price) / peak) * 100
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }
    
    return maxDrawdown
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized percentage
  }

  private calculateConsistency(returns: number[]): number {
    if (returns.length === 0) return 0
    const positiveReturns = returns.filter(r => r > 0).length
    return positiveReturns / returns.length
  }

  private getStrategyDisplayName(strategyId: string): string {
    const names = {
      rsi: 'RSI Momentum Strategy',
      macd: 'MACD Trend Following',
      bollinger: 'Bollinger Bands Mean Reversion',
      ma_crossover: 'Moving Average Crossover',
      mean_reversion: 'Statistical Mean Reversion'
    }
    return names[strategyId] || strategyId.replace('_', ' ').toUpperCase()
  }

  private getStrategyStrengths(strategyId: string, metrics: EnhancedStrategyMetrics): string[] {
    const strengths = []
    
    // Performance-based strengths
    if (metrics.winRate > 65) strengths.push(`Excellent win rate (${metrics.winRate.toFixed(1)}%)`)
    if (metrics.sharpeRatio > 1.5) strengths.push(`Outstanding risk-adjusted returns (Sharpe: ${metrics.sharpeRatio.toFixed(2)})`)
    if (metrics.maxDrawdown < 8) strengths.push(`Low drawdown risk (${metrics.maxDrawdown.toFixed(1)}%)`)
    if (metrics.consistency > 0.7) strengths.push(`Highly consistent performance (${(metrics.consistency * 100).toFixed(1)}% positive periods)`)
    
    // Strategy-specific strengths
    const strategySpecific = {
      rsi: ['Excellent at catching market reversals', 'Works well in range-bound markets'],
      macd: ['Strong trend-following capability', 'Good momentum detection'],
      bollinger: ['Adapts well to changing volatility', 'Effective mean reversion signals'],
      ma_crossover: ['Simple and reliable approach', 'Clear entry/exit signals'],
      mean_reversion: ['Profitable in sideways markets', 'Quick profit realization']
    }
    
    if (strategySpecific[strategyId]) {
      strengths.push(...strategySpecific[strategyId])
    }
    
    return strengths.length > 0 ? strengths : ['Systematic approach to trading', 'Rule-based decision making']
  }

  private getImprovementAreas(strategyId: string, metrics: EnhancedStrategyMetrics): string[] {
    const improvements = []
    
    if (metrics.winRate < 50) improvements.push('Improve signal accuracy and filtering')
    if (metrics.maxDrawdown > 15) improvements.push('Implement stricter risk management')
    if (metrics.consistency < 0.6) improvements.push('Reduce performance volatility')
    if (metrics.riskScore > 0.7) improvements.push('Lower risk exposure per trade')
    if (metrics.sharpeRatio < 0.8) improvements.push('Optimize risk-adjusted returns')
    
    return improvements.length > 0 ? improvements : ['Monitor for changing market conditions', 'Regular performance review recommended']
  }

  private generateStrategyRecommendations(strategyId: string, metrics: EnhancedStrategyMetrics): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = []

    // Critical performance issues
    if (metrics.winRate < 45) {
      recommendations.push({
        type: 'IMPROVE',
        title: 'Critical: Low Win Rate',
        description: `Win rate of ${metrics.winRate.toFixed(1)}% is below acceptable threshold`,
        actionItems: [
          'Review and tighten entry criteria',
          'Add additional confirmation signals',
          'Consider different timeframe analysis',
          'Implement better market condition filters'
        ],
        impact: 'HIGH',
        timeframe: 'Immediate - within 1 week'
      })
    }

    // Risk management concerns
    if (metrics.maxDrawdown > 20) {
      recommendations.push({
        type: 'CAUTION',
        title: 'High Drawdown Alert',
        description: `Maximum drawdown of ${metrics.maxDrawdown.toFixed(1)}% exceeds safe limits`,
        actionItems: [
          'Reduce position sizes immediately',
          'Implement tighter stop-loss rules',
          'Review correlation with other strategies',
          'Consider temporary strategy pause'
        ],
        impact: 'HIGH',
        timeframe: 'Immediate'
      })
    }

    // Optimization opportunities
    if (metrics.sharpeRatio > 1.2 && metrics.consistency > 0.7) {
      recommendations.push({
        type: 'OPTIMIZE',
        title: 'Scale High-Performing Strategy',
        description: `Strong performance metrics suggest scaling opportunity`,
        actionItems: [
          'Consider increasing allocation to this strategy',
          'Document successful parameters',
          'Test with larger position sizes',
          'Monitor for capacity constraints'
        ],
        impact: 'MEDIUM',
        timeframe: '2-4 weeks'
      })
    }

    return recommendations
  }

  private getMarketEducation(trend: string, volatility: string): string {
    const educationMap = {
      'BULLISH-LOW': 'Ideal conditions for momentum strategies. Low volatility trending markets offer consistent directional moves.',
      'BULLISH-HIGH': 'Strong uptrend with high volatility. Use wider stops and smaller positions to manage whipsaws.',
      'BEARISH-LOW': 'Controlled decline. Good for short strategies and put options. Lower volatility makes timing more predictable.',
      'BEARISH-HIGH': 'Volatile bear market. Consider defensive positioning and avoid catching falling knives.',
      'SIDEWAYS-LOW': 'Perfect for mean reversion strategies. Range-bound markets with low volatility favor RSI and Bollinger strategies.',
      'SIDEWAYS-HIGH': 'Choppy, volatile sideways market. Most difficult condition - consider reducing activity.'
    }
    
    return educationMap[`${trend}-${volatility}`] || 'Mixed market conditions require careful strategy selection.'
  }

  private getMarketSpecificActions(marketConditions: any): string[] {
    const actions = []
    
    if (marketConditions.trend === 'BULLISH') {
      actions.push('Focus on momentum and trend-following strategies')
      actions.push('Avoid mean reversion strategies in strong trends')
    } else if (marketConditions.trend === 'BEARISH') {
      actions.push('Consider defensive positioning')
      actions.push('Use shorter timeframes for quicker exits')
    } else {
      actions.push('Favor mean reversion over momentum strategies')
      actions.push('Look for range breakouts for directional moves')
    }
    
    if (marketConditions.volatility === 'HIGH') {
      actions.push('Reduce position sizes by 25-50%')
      actions.push('Use wider stop-losses to avoid false stops')
    }
    
    return actions
  }

  assessMarketConditions(marketData: any[]) {
    // Simple market condition assessment
    if (marketData.length < 10) {
      return {
        trend: 'NEUTRAL',
        volatility: 'MEDIUM',
        volume: 'NORMAL'
      }
    }

    const prices = marketData.slice(-20).map(d => d.close)
    const recentPrice = prices[prices.length - 1]
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    
    return {
      trend: recentPrice > avgPrice * 1.02 ? 'BULLISH' : 
             recentPrice < avgPrice * 0.98 ? 'BEARISH' : 'NEUTRAL',
      volatility: 'MEDIUM', // Simplified
      volume: 'NORMAL' // Simplified
    }
  }

  calculateRiskAssessment(strategyPerformance: any) {
    return {
      overall: 'MODERATE',
      factors: ['Market volatility', 'Strategy diversification'],
      recommendations: ['Monitor position sizes', 'Review stop losses']
    }
  }

  generateOptimizationTips(strategyPerformance: any, marketConditions: any) {
    const tips = []
    
    if (marketConditions.volatility === 'HIGH') {
      tips.push('Consider reducing position sizes in high volatility')
    }
    
    if (marketConditions.trend === 'BEARISH') {
      tips.push('Focus on defensive strategies')
    }
    
    return tips
  }

  calculatePerformanceMetrics(signals: any) {
    // Simplified performance calculation
    return {
      winRate: 0.6,
      avgReturn: 0.02,
      sharpeRatio: 1.2,
      maxDrawdown: 0.08,
      totalTrades: 100
    }
  }

  private initializeEducationalContent() {
    this.educationalContent.set('rsi', {
      title: 'RSI Strategy Guide',
      description: 'Learn how to use RSI for momentum trading'
    })
    this.educationalContent.set('macd', {
      title: 'MACD Strategy Guide', 
      description: 'Master trend following with MACD'
    })
    // Add more educational content as needed
  }
}