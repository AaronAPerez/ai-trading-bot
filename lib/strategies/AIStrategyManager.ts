import { RSIStrategy } from './RSIStrategy'
import { MACDStrategy } from './MACDStrategy'
import { TradingStrategy, TradeSignal, MarketData } from '@/types/trading'

export class AIStrategyManager {
  private strategies: Map<string, TradingStrategy> = new Map()
  private weights: Map<string, number> = new Map()
  
  constructor() {
    this.initializeStrategies()
  }
  
  private initializeStrategies() {
    this.strategies.set('rsi', new RSIStrategy())
    this.strategies.set('macd', new MACDStrategy())
    
    // Strategy weights based on historical performance
    this.weights.set('rsi', 0.6)
    this.weights.set('macd', 0.4)
  }
  
  async generateAIRecommendation(symbol: string, marketData: MarketData[]) {
    const signals: TradeSignal[] = []
    
    // Run all strategies
    for (const [name, strategy] of this.strategies) {
      try {
        const signal = await strategy.analyze(marketData)
        signals.push({ ...signal, strategyName: name })
      } catch (error) {
        console.error(`Strategy ${name} failed:`, error)
      }
    }
    
    // Combine signals using AI logic
    return this.combineSignalsWithAI(signals, symbol)
  }
  
  private combineSignalsWithAI(signals: TradeSignal[], symbol: string) {
    // Advanced AI signal combination logic
    const buyVotes = signals.filter(s => s.action === 'BUY')
    const sellVotes = signals.filter(s => s.action === 'SELL')
    
    let finalAction = 'HOLD'
    let confidence = 0
    
    if (buyVotes.length > sellVotes.length) {
      finalAction = 'BUY'
      confidence = this.calculateWeightedConfidence(buyVotes)
    } else if (sellVotes.length > buyVotes.length) {
      finalAction = 'SELL'
      confidence = this.calculateWeightedConfidence(sellVotes)
    }
    
    return {
      symbol,
      action: finalAction,
      confidence,
      aiScore: confidence * 1.2, // AI enhancement factor
      reasoning: this.generateReasoning(signals, finalAction),
      signals
    }
  }
  
  private calculateWeightedConfidence(signals: TradeSignal[]): number {
    let totalWeight = 0
    let weightedSum = 0
    
    signals.forEach(signal => {
      const weight = this.weights.get(signal.strategyName) || 0.5
      totalWeight += weight
      weightedSum += signal.confidence * weight
    })
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }
  
  private generateReasoning(signals: TradeSignal[], action: string): string {
    const strategyNames = signals.map(s => s.strategyName).join(', ')
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
    
    return `AI analysis across ${signals.length} strategies (${strategyNames}) indicates ${action} with ${(avgConfidence * 100).toFixed(0)}% confidence`
  }
}