import { MarketData } from '@/types/trading'
import { tradingStorage } from '@/lib/database/tradingStorage'
import { MarketRegime } from './MarketRegimeDetector'

interface TradingState {
  marketConditions: {
    price: number
    volume: number
    volatility: number
    momentum: number
    rsi: number
    macd: number
    sentiment: number
    regime: MarketRegime
  }
  portfolio: {
    cash: number
    position: number
    unrealizedPnL: number
    dayTrades: number
  }
  timeContext: {
    hour: number
    dayOfWeek: number
    marketSession: 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER'
  }
}

interface TradingAction {
  type: 'BUY' | 'SELL' | 'HOLD'
  quantity: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  confidence: number
}

interface QState {
  stateHash: string
  actionValues: Map<string, number> // Q(s,a) values
  visitCount: number
  lastUpdated: Date
}

interface RewardSignal {
  immediate: number    // Immediate reward from the action
  delayed: number      // Delayed reward from trade outcome
  risk: number         // Risk penalty
  opportunity: number  // Opportunity cost
  total: number        // Combined reward
}

interface Episode {
  states: TradingState[]
  actions: TradingAction[]
  rewards: RewardSignal[]
  finalReturn: number
  duration: number
  metadata: {
    symbol: string
    startTime: Date
    endTime: Date
    regime: MarketRegime
  }
}

export class ReinforcementLearningAgent {
  private qTable: Map<string, QState> = new Map()
  private epsilon = 0.1 // Exploration rate
  private alpha = 0.1   // Learning rate
  private gamma = 0.95  // Discount factor
  private episodeHistory: Episode[] = []
  private currentEpisode: Episode | null = null

  constructor() {
    this.initializeQTable()
  }

  async selectAction(state: TradingState): Promise<TradingAction> {
    try {
      const stateHash = this.hashState(state)

      // ε-greedy action selection
      if (Math.random() < this.epsilon) {
        return this.exploreAction(state)
      } else {
        return this.exploitAction(stateHash, state)
      }
    } catch (error) {
      console.error('Error selecting action:', error)
      return { type: 'HOLD', quantity: 0, confidence: 0.5 }
    }
  }

  async updateQValues(
    state: TradingState,
    action: TradingAction,
    reward: RewardSignal,
    nextState: TradingState
  ): Promise<void> {
    try {
      const stateHash = this.hashState(state)
      const actionKey = this.getActionKey(action)
      const nextStateHash = this.hashState(nextState)

      // Get or create Q-state
      let qState = this.qTable.get(stateHash)
      if (!qState) {
        qState = {
          stateHash,
          actionValues: new Map(),
          visitCount: 0,
          lastUpdated: new Date()
        }
        this.qTable.set(stateHash, qState)
      }

      // Get current Q-value
      const currentQ = qState.actionValues.get(actionKey) || 0

      // Get max Q-value for next state
      const nextQState = this.qTable.get(nextStateHash)
      const maxNextQ = nextQState
        ? Math.max(...Array.from(nextQState.actionValues.values()))
        : 0

      // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
      const newQ = currentQ + this.alpha * (reward.total + this.gamma * maxNextQ - currentQ)

      // Update Q-value
      qState.actionValues.set(actionKey, newQ)
      qState.visitCount++
      qState.lastUpdated = new Date()

      // Decay exploration rate
      this.epsilon = Math.max(0.01, this.epsilon * 0.999)

    } catch (error) {
      console.error('Error updating Q-values:', error)
    }
  }

  async startEpisode(symbol: string, regime: MarketRegime): Promise<void> {
    this.currentEpisode = {
      states: [],
      actions: [],
      rewards: [],
      finalReturn: 0,
      duration: 0,
      metadata: {
        symbol,
        startTime: new Date(),
        endTime: new Date(),
        regime
      }
    }
  }

  async endEpisode(finalReturn: number): Promise<void> {
    if (!this.currentEpisode) return

    this.currentEpisode.finalReturn = finalReturn
    this.currentEpisode.metadata.endTime = new Date()
    this.currentEpisode.duration =
      this.currentEpisode.metadata.endTime.getTime() -
      this.currentEpisode.metadata.startTime.getTime()

    // Perform temporal difference learning across the episode
    await this.updateEpisodeRewards()

    // Store episode
    this.episodeHistory.push(this.currentEpisode)

    // Limit episode history
    if (this.episodeHistory.length > 1000) {
      this.episodeHistory = this.episodeHistory.slice(-500)
    }

    this.currentEpisode = null
  }

  async recordStep(state: TradingState, action: TradingAction, reward: RewardSignal): Promise<void> {
    if (!this.currentEpisode) return

    this.currentEpisode.states.push(state)
    this.currentEpisode.actions.push(action)
    this.currentEpisode.rewards.push(reward)
  }

  calculateReward(
    action: TradingAction,
    priceChange: number,
    marketState: TradingState,
    tradeOutcome?: { pnl: number; duration: number }
  ): RewardSignal {
    try {
      let immediate = 0
      let delayed = 0
      let risk = 0
      let opportunity = 0

      // Immediate reward based on action appropriateness
      if (action.type === 'BUY' && priceChange > 0) {
        immediate = priceChange * action.quantity * action.confidence
      } else if (action.type === 'SELL' && priceChange < 0) {
        immediate = Math.abs(priceChange) * action.quantity * action.confidence
      } else if (action.type === 'HOLD') {
        immediate = 0.001 // Small positive reward for conservative play
      } else {
        immediate = -Math.abs(priceChange) * 0.1 // Penalty for wrong direction
      }

      // Delayed reward from actual trade outcome
      if (tradeOutcome) {
        delayed = tradeOutcome.pnl * 0.1 // Scale down for reward signal

        // Duration penalty for holding too long
        const durationPenalty = Math.max(0, (tradeOutcome.duration - 24) * 0.001)
        delayed -= durationPenalty
      }

      // Risk penalty
      const volatility = marketState.marketConditions.volatility
      const positionSize = Math.abs(action.quantity)
      risk = -positionSize * volatility * 0.01

      // Opportunity cost (missed profits)
      if (action.type === 'HOLD' && Math.abs(priceChange) > 0.02) {
        opportunity = -Math.abs(priceChange) * 0.5
      }

      const total = immediate + delayed + risk + opportunity

      return { immediate, delayed, risk, opportunity, total }

    } catch (error) {
      console.error('Error calculating reward:', error)
      return { immediate: 0, delayed: 0, risk: 0, opportunity: 0, total: 0 }
    }
  }

  async getOptimalStrategy(userId: string, symbol: string, regime: MarketRegime): Promise<{
    recommendedActions: TradingAction[]
    confidenceScore: number
    expectedReturn: number
    riskLevel: number
    explorationAdvice: string[]
  }> {
    try {
      // Analyze learned strategies for this regime
      const regimeEpisodes = this.episodeHistory.filter(e =>
        e.metadata.symbol === symbol && e.metadata.regime === regime
      )

      if (regimeEpisodes.length === 0) {
        return {
          recommendedActions: [{ type: 'HOLD', quantity: 0, confidence: 0.5 }],
          confidenceScore: 0.3,
          expectedReturn: 0,
          riskLevel: 0.5,
          explorationAdvice: ['Insufficient data for this regime', 'Consider manual trading to gather experience']
        }
      }

      // Find best performing strategies
      const successfulEpisodes = regimeEpisodes
        .filter(e => e.finalReturn > 0)
        .sort((a, b) => b.finalReturn - a.finalReturn)
        .slice(0, 10)

      const recommendedActions = this.extractCommonActions(successfulEpisodes)
      const avgReturn = regimeEpisodes.reduce((sum, e) => sum + e.finalReturn, 0) / regimeEpisodes.length
      const winRate = successfulEpisodes.length / regimeEpisodes.length

      const confidenceScore = Math.min(0.95, winRate + (regimeEpisodes.length / 100))
      const riskLevel = this.calculateRiskLevel(successfulEpisodes)

      const explorationAdvice = this.generateExplorationAdvice(regimeEpisodes, regime)

      return {
        recommendedActions,
        confidenceScore,
        expectedReturn: avgReturn,
        riskLevel,
        explorationAdvice
      }

    } catch (error) {
      console.error('Error getting optimal strategy:', error)
      return {
        recommendedActions: [{ type: 'HOLD', quantity: 0, confidence: 0.5 }],
        confidenceScore: 0.3,
        expectedReturn: 0,
        riskLevel: 0.5,
        explorationAdvice: ['Error in strategy analysis']
      }
    }
  }

  async getQLearningMetrics(): Promise<{
    totalStates: number
    explorationRate: number
    averageReward: number
    episodeCount: number
    convergenceStatus: string
    topStrategies: Array<{ state: string; bestAction: string; qValue: number }>
  }> {
    try {
      const totalStates = this.qTable.size
      const episodeCount = this.episodeHistory.length

      const avgReward = episodeCount > 0
        ? this.episodeHistory.reduce((sum, e) => sum + e.finalReturn, 0) / episodeCount
        : 0

      // Find top strategies (highest Q-values)
      const topStrategies: Array<{ state: string; bestAction: string; qValue: number }> = []

      for (const [stateHash, qState] of this.qTable) {
        if (qState.actionValues.size > 0) {
          const bestAction = Array.from(qState.actionValues.entries())
            .reduce((best, current) => current[1] > best[1] ? current : best)

          topStrategies.push({
            state: this.summarizeState(stateHash),
            bestAction: bestAction[0],
            qValue: bestAction[1]
          })
        }
      }

      topStrategies.sort((a, b) => b.qValue - a.qValue)

      // Determine convergence status
      let convergenceStatus = 'EXPLORING'
      if (episodeCount > 100) {
        const recentEpisodes = this.episodeHistory.slice(-50)
        const variance = this.calculateVariance(recentEpisodes.map(e => e.finalReturn))
        if (variance < 0.01) {
          convergenceStatus = 'CONVERGED'
        } else if (this.epsilon < 0.05) {
          convergenceStatus = 'CONVERGING'
        }
      }

      return {
        totalStates,
        explorationRate: this.epsilon,
        averageReward: avgReward,
        episodeCount,
        convergenceStatus,
        topStrategies: topStrategies.slice(0, 10)
      }

    } catch (error) {
      console.error('Error getting Q-learning metrics:', error)
      return {
        totalStates: 0,
        explorationRate: this.epsilon,
        averageReward: 0,
        episodeCount: 0,
        convergenceStatus: 'ERROR',
        topStrategies: []
      }
    }
  }

  private initializeQTable(): void {
    // Pre-populate with some basic states and actions
    const basicStates = this.generateBasicStates()
    for (const state of basicStates) {
      const stateHash = this.hashState(state)
      this.qTable.set(stateHash, {
        stateHash,
        actionValues: new Map(),
        visitCount: 0,
        lastUpdated: new Date()
      })
    }
  }

  private hashState(state: TradingState): string {
    // Create a hash representing the state
    const market = state.marketConditions
    const portfolio = state.portfolio
    const time = state.timeContext

    return [
      this.discretize(market.rsi, 0, 100, 10),
      this.discretize(market.volatility, 0, 1, 5),
      this.discretize(market.momentum, -0.1, 0.1, 10),
      this.discretize(market.sentiment, -1, 1, 5),
      market.regime,
      this.discretize(portfolio.unrealizedPnL, -1000, 1000, 10),
      Math.floor(time.hour / 6), // 4 time periods
      time.marketSession
    ].join('|')
  }

  private discretize(value: number, min: number, max: number, buckets: number): number {
    const bucket = Math.floor(((value - min) / (max - min)) * buckets)
    return Math.max(0, Math.min(buckets - 1, bucket))
  }

  private getActionKey(action: TradingAction): string {
    return `${action.type}|${this.discretize(action.quantity, 0, 1000, 5)}|${this.discretize(action.confidence, 0, 1, 5)}`
  }

  private exploreAction(state: TradingState): TradingAction {
    const actions: TradingAction[] = [
      { type: 'BUY', quantity: 100, confidence: 0.6 },
      { type: 'BUY', quantity: 200, confidence: 0.7 },
      { type: 'SELL', quantity: 100, confidence: 0.6 },
      { type: 'SELL', quantity: 200, confidence: 0.7 },
      { type: 'HOLD', quantity: 0, confidence: 0.8 }
    ]

    return actions[Math.floor(Math.random() * actions.length)]
  }

  private exploitAction(stateHash: string, state: TradingState): TradingAction {
    const qState = this.qTable.get(stateHash)

    if (!qState || qState.actionValues.size === 0) {
      return { type: 'HOLD', quantity: 0, confidence: 0.5 }
    }

    // Find action with highest Q-value
    const bestActionEntry = Array.from(qState.actionValues.entries())
      .reduce((best, current) => current[1] > best[1] ? current : best)

    return this.parseActionKey(bestActionEntry[0])
  }

  private parseActionKey(actionKey: string): TradingAction {
    const [type, quantityBucket, confidenceBucket] = actionKey.split('|')

    return {
      type: type as 'BUY' | 'SELL' | 'HOLD',
      quantity: parseInt(quantityBucket) * 50, // Scale back up
      confidence: parseFloat(confidenceBucket) / 5 // Scale back to 0-1
    }
  }

  private async updateEpisodeRewards(): Promise<void> {
    if (!this.currentEpisode) return

    const episode = this.currentEpisode

    // Update rewards using temporal difference learning
    for (let i = episode.rewards.length - 2; i >= 0; i--) {
      const currentReward = episode.rewards[i]
      const nextReward = episode.rewards[i + 1]

      // Propagate future rewards backward
      currentReward.total += this.gamma * nextReward.total
    }

    // Update Q-values for the entire episode
    for (let i = 0; i < episode.states.length - 1; i++) {
      await this.updateQValues(
        episode.states[i],
        episode.actions[i],
        episode.rewards[i],
        episode.states[i + 1]
      )
    }
  }

  private generateBasicStates(): TradingState[] {
    const states: TradingState[] = []
    const regimes: MarketRegime[] = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE']
    const sessions = ['PRE', 'OPEN', 'CLOSE', 'AFTER'] as const

    for (const regime of regimes) {
      for (const session of sessions) {
        states.push({
          marketConditions: {
            price: 100,
            volume: 1000000,
            volatility: 0.2,
            momentum: 0,
            rsi: 50,
            macd: 0,
            sentiment: 0,
            regime
          },
          portfolio: {
            cash: 10000,
            position: 0,
            unrealizedPnL: 0,
            dayTrades: 0
          },
          timeContext: {
            hour: 10,
            dayOfWeek: 3,
            marketSession: session
          }
        })
      }
    }

    return states
  }

  private extractCommonActions(episodes: Episode[]): TradingAction[] {
    const actionCounts = new Map<string, number>()

    for (const episode of episodes) {
      for (const action of episode.actions) {
        const key = this.getActionKey(action)
        actionCounts.set(key, (actionCounts.get(key) || 0) + 1)
      }
    }

    return Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => this.parseActionKey(key))
  }

  private calculateRiskLevel(episodes: Episode[]): number {
    if (episodes.length === 0) return 0.5

    const returns = episodes.map(e => e.finalReturn)
    const variance = this.calculateVariance(returns)
    return Math.min(0.9, Math.max(0.1, variance / 100))
  }

  private generateExplorationAdvice(episodes: Episode[], regime: MarketRegime): string[] {
    const advice: string[] = []

    if (episodes.length < 10) {
      advice.push('Limited experience in this regime - continue learning')
    }

    const winRate = episodes.filter(e => e.finalReturn > 0).length / episodes.length
    if (winRate < 0.4) {
      advice.push('Low success rate - consider different strategies')
    }

    if (this.epsilon > 0.2) {
      advice.push('Still in exploration phase - results may vary')
    }

    const avgDuration = episodes.reduce((sum, e) => sum + e.duration, 0) / episodes.length
    if (avgDuration > 24 * 60 * 60 * 1000) { // More than 24 hours
      advice.push('Consider shorter holding periods')
    }

    return advice
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  private summarizeState(stateHash: string): string {
    const parts = stateHash.split('|')
    return `RSI:${parts[0]} Vol:${parts[1]} Mom:${parts[2]} Regime:${parts[4]}`
  }

  // Public API methods
  getQTableSize(): number {
    return this.qTable.size
  }

  getEpisodeHistory(): Episode[] {
    return [...this.episodeHistory]
  }

  getCurrentExplorationRate(): number {
    return this.epsilon
  }

  setLearningParameters(alpha: number, gamma: number, epsilon: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha))
    this.gamma = Math.max(0, Math.min(1, gamma))
    this.epsilon = Math.max(0, Math.min(1, epsilon))
  }
}

export const reinforcementLearningAgent = new ReinforcementLearningAgent()