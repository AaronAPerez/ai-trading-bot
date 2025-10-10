
// import { UnifiedAlpacaClient } from '@/lib/alpaca/unified-client'
// import { TradeSignal, Portfolio, MarketData, Position } from '../../../types/trading'
// import { RiskManagementEngine } from '../engines/RiskManagementEngine'
// import { AILearningSystem } from '../ml/AILearningSystem'
// import { tradePersistence } from '@/lib/services/TradePersistenceService'


// interface ExecutionConfig {
//   autoExecuteEnabled: boolean
//   confidenceThresholds: {
//     minimum: number
//     conservative: number
//     aggressive: number
//     maximum: number
//   }
//   positionSizing: {
//     baseSize: number
//     maxSize: number
//     confidenceMultiplier: number
//     riskAdjustmentEnabled: boolean
//     kellyEnabled: boolean // Kelly Criterion for optimal sizing
//   }
//   riskControls: {
//     maxDailyTrades: number
//     maxOpenPositions: number
//     maxDailyLoss: number
//     cooldownPeriod: number
//     maxConcurrentExecutions: number
//   }
//   executionRules: {
//     marketHoursOnly: boolean
//     avoidEarnings: boolean
//     volumeThreshold: number
//     spreadThreshold: number
//     cryptoTradingEnabled: boolean
//     afterHoursTrading: boolean
//     weekendTrading: boolean
//     slippageProtection: boolean
//     partialFillHandling: boolean
//   }
//   learningIntegration: {
//     enabled: boolean
//     adaptiveThresholds: boolean
//     patternAwareness: boolean
//     performanceFeedback: boolean
//   }
// }

// interface ExecutionDecision {
//   success: any
//   orderId: string
//   executionPrice: number
//   shouldExecute: boolean
//   positionSize: number
//   adjustedSize?: number
//   reason: string
//   confidence: number
//   riskScore: number
//   executionPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
//   riskAdjustments: {
//     sizeReduction?: number
//     reasonCode?: string
//     alternativeAction?: 'REDUCE' | 'DELAY' | 'CANCEL'
//   }
//   safetyOverrides: string[]
//   estimatedSlippage: number
//   estimatedFees: number
//   expectedReturn: number
//   riskRewardRatio: number
// }

// interface TradeExecution {
//   tradeId: string
//   symbol: string
//   action: 'BUY' | 'SELL'
//   notional: number
//   notionalValue: number
//   executionPrice: number
//   orderId: string
//   timestamp: Date
//   confidence: number
//   aiScore: number
//   executionTime: number // milliseconds
//   slippage: number
//   fees: number
//   fillStatus: 'FILLED' | 'PARTIAL' | 'PENDING' | 'REJECTED'
//   riskMetrics: {
//     portfolioImpact: number
//     positionSizePercent: number
//     correlationRisk: number
//     volatilityRisk: number
//   }
//   metadata: {
//     originalSignal: TradeSignal
//     riskAssessment: any
//     executionReason: string
//     marketConditions: any
//   }
// }

// interface ExecutionMetrics {
//   session: {
//     tradesAttempted: number
//     tradesExecuted: number
//     tradesRejected: number
//     successRate: number
//     avgExecutionTime: number
//     totalVolume: number
//   }
//   daily: {
//     tradeCount: number
//     remainingTrades: number
//     dailyPnL: number
//     dailyLossLimit: number
//     executionEnabled: boolean
//   }
//   risk: {
//     currentDrawdown: number
//     riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
//     openPositions: number
//     totalExposure: number
//     concentrationRisk: number
//   }
//   performance: {
//     winRate: number
//     avgReturn: number
//     sharpeRatio: number
//     maxDrawdown: number
//     profitFactor: number
//     totalPnL: number
//   }
//   learning: {
//     adaptationsApplied: number
//     thresholdAdjustments: number
//     patternMatchCount: number
//     lastLearningUpdate: Date
//   }
// }

// export class AutoTradeExecutor {
//   getStats() {
//     throw new Error('Method not implemented.')
//   }
//   private config: ExecutionConfig
//   private riskEngine: RiskManagementEngine
//   private learningSystem: AILearningSystem
//   private alpacaClient: UnifiedAlpacaClient
  
//   // Execution tracking
//   private executionHistory: TradeExecution[] = []
//   private activeExecutions = new Map<string, TradeExecution>()
//   private lastTradeTime = new Map<string, Date>()
//   private dailyTradeCount = 0
//   private dailyPnL = 0
//   private sessionStartTime = new Date()
//   private isExecutionEnabled = true
//   private lastExecutorResetDate: string = ''
  
//   // Risk and learning integration
//   private lastRiskAssessment: any = null
//   private adaptiveThresholds = new Map<string, number>()
//   private executionQueue: Array<{ signal: TradeSignal; portfolio: Portfolio; priority: number }> = []
//   private concurrentExecutions = 0

//   constructor(
//     config: ExecutionConfig,
//     riskEngine: RiskManagementEngine,
//     learningSystem: AILearningSystem,
//     alpacaClient: UnifiedAlpacaClient
//   ) {
//     this.config = config
//     this.riskEngine = riskEngine
//     this.learningSystem = learningSystem
//     this.alpacaClient = alpacaClient
    
//     this.resetDailyCounters()
//     console.log('🚀 Enhanced AutoTradeExecutor initialized with risk integration')
//   }

//   async initialize(): Promise<void> {
//     console.log('⚡ Initializing Enhanced AutoTradeExecutor...')
    
//     try {
//       // Ensure dependencies are initialized
//       if (!this.riskEngine.isReady()) {
//         await this.riskEngine.initialize()
//       }
      
//       if (!this.learningSystem.isReady()) {
//         await this.learningSystem.initialize()
//       }
      
//       // Load adaptive thresholds from learning system
//       await this.loadAdaptiveThresholds()
      
//       // Start execution monitoring
//       this.startExecutionMonitoring()
      
//       console.log('✅ Enhanced AutoTradeExecutor initialized successfully')
//     } catch (error) {
//       console.error('❌ Failed to initialize Enhanced AutoTradeExecutor:', error)
//       throw error
//     }
//   }

//   async shutdown(): Promise<void> {
//     console.log('🛑 Shutting down Enhanced AutoTradeExecutor...')
    
//     try {
//       // Wait for pending executions to complete
//       await this.waitForPendingExecutions()
      
//       // Save execution metrics
//       await this.saveExecutionMetrics()
      
//       this.isExecutionEnabled = false
//       console.log('✅ Enhanced AutoTradeExecutor shut down successfully')
//     } catch (error) {
//       console.error('❌ Error shutting down Enhanced AutoTradeExecutor:', error)
//     }
//   }

//   async evaluateAndExecute(
//     signal: TradeSignal,
//     portfolio: Portfolio,
//     aiScore?: number
//   ): Promise<ExecutionDecision> {
    
//     if (!this.isExecutionEnabled) {
//       return this.createRejectionDecision('Execution disabled', signal)
//     }

//     // Check concurrent execution limits
//     if (this.concurrentExecutions >= this.config.riskControls.maxConcurrentExecutions) {
//       return this.createRejectionDecision('Concurrent execution limit reached', signal)
//     }

//     const startTime = Date.now()
    
//     try {
//       console.log(`🔍 Evaluating trade: ${signal.symbol} ${signal.action} - ${(signal.confidence * 100).toFixed(1)}% confidence`)
      
//       // Step 1: Get market data and positions
//       const [barsResponse, positions] = await Promise.all([
//         this.alpacaClient.getBarsV2(signal.symbol, { timeframe: '1Hour', limit: 50 }),
//         this.alpacaClient.getPositions()
//       ])

//       // Convert bars to MarketData format
//       const marketData: MarketData[] = Array.isArray(barsResponse)
//         ? barsResponse.map((bar: any) => ({
//             symbol: signal.symbol,
//             timestamp: new Date(bar.t || bar.timestamp),
//             timeframe: '1Hour',
//             open: bar.o || bar.open || 0,
//             high: bar.h || bar.high || 0,
//             low: bar.l || bar.low || 0,
//             close: bar.c || bar.close || 0,
//             volume: bar.v || bar.volume || 0,
//             source: 'alpaca'
//           }))
//         : []

//       // Step 2: Comprehensive risk assessment
//       const riskAssessment = await this.performComprehensiveRiskAssessment(
//         signal, marketData, portfolio, positions, aiScore || 0
//       )

//       if (!riskAssessment.shouldExecute) {
//         return riskAssessment
//       }

//       // Step 3: Execute the trade with risk controls
//       const executionResult = await this.executeTradeWithRiskControls(
//         signal, riskAssessment, marketData, portfolio
//       )

//       // Step 4: Post-execution processing
//       await this.postExecutionProcessing(executionResult, signal, riskAssessment)

//       const executionTime = Date.now() - startTime
//       console.log(`⚡ Trade evaluation completed in ${executionTime}ms: ${executionResult.shouldExecute ? 'EXECUTED' : 'REJECTED'}`)

//       return executionResult

//     } catch (error) {
//       console.error(`❌ Trade evaluation failed for ${signal.symbol}:`, error.message)
//       return this.createRejectionDecision(`Execution error: ${error.message}`, signal)
//     }
//   }

//   private async performComprehensiveRiskAssessment(
//     signal: TradeSignal,
//     marketData: MarketData[],
//     portfolio: Portfolio,
//     positions: Position[],
//     aiScore: number
//   ): Promise<ExecutionDecision> {

//     const symbol = signal.symbol
//     const confidence = signal.confidence
//     const currentPrice = marketData[marketData.length - 1]?.close || 0

//     console.log(`🛡️ Comprehensive risk assessment for ${symbol}...`)

//     // Initialize decision
//     const decision: ExecutionDecision = {
//       shouldExecute: false,
//       positionSize: 0,
//       reason: 'Risk assessment in progress',
//       confidence,
//       riskScore: signal.riskScore || 0.5,
//       executionPriority: 'LOW',
//       riskAdjustments: {},
//       safetyOverrides: [],
//       estimatedSlippage: 0,
//       estimatedFees: 0,
//       expectedReturn: 0,
//       riskRewardRatio: 0,
//       success: undefined,
//       orderId: '',
//       executionPrice: 0
//     }

//     // 1. Portfolio-level risk check
//     const portfolioRisk = await this.riskEngine.assessPortfolioRisk(portfolio, positions)
//     this.lastRiskAssessment = portfolioRisk
    
//     if (!portfolioRisk.canTrade) {
//       decision.reason = `Portfolio risk prevents trading: ${portfolioRisk.reason}`
//       decision.riskScore = 1.0
//       return decision
//     }

//     // 2. Trade-specific risk validation
//     const tradeValidation = await this.riskEngine.validateTrade(signal, portfolio, positions, marketData)
//     if (!tradeValidation.approved) {
//       if (tradeValidation.adjustedSize && tradeValidation.adjustedSize > 0) {
//         decision.adjustedSize = tradeValidation.adjustedSize
//         decision.riskAdjustments.sizeReduction = (tradeValidation.adjustedSize / (portfolio.totalValue * this.config.positionSizing.baseSize)) * 100
//         decision.riskAdjustments.reasonCode = 'SIZE_ADJUSTMENT'
//         decision.safetyOverrides.push('Position size adjusted for risk compliance')
//       } else {
//         decision.reason = tradeValidation.reason
//         return decision
//       }
//     }

//     // 3. Dynamic confidence threshold check with learning integration
//     const effectiveThreshold = await this.getEffectiveConfidenceThreshold(symbol, signal.strategy)
//     if (confidence < effectiveThreshold) {
//       decision.reason = `Confidence ${(confidence * 100).toFixed(1)}% below adaptive threshold ${(effectiveThreshold * 100).toFixed(1)}%`
//       return decision
//     }

//     // 4. Enhanced position sizing with multiple models
//     const optimalPositionSize = await this.calculateOptimalPositionSize(
//       signal, portfolio, marketData, aiScore, portfolioRisk
//     )

//     if (optimalPositionSize <= 0) {
//       decision.reason = 'Optimal position size calculation resulted in zero or negative size'
//       return decision
//     }

//     // 5. Market condition and timing checks
//     const marketConditions = await this.assessMarketConditions(marketData, symbol)
//     if (!marketConditions.suitable) {
//       decision.reason = `Market conditions unsuitable: ${marketConditions.reason}`
//       return decision
//     }

//     // 6. Liquidity and slippage estimation
//     const liquidityAssessment = this.assessLiquidityAndSlippage(marketData, optimalPositionSize, currentPrice)
//     if (liquidityAssessment.excessiveSlippage) {
//       decision.reason = `Expected slippage too high: ${(liquidityAssessment.estimatedSlippage * 100).toFixed(2)}%`
//       return decision
//     }

//     // 7. Risk-reward calculation
//     const riskReward = this.calculateRiskReward(signal, currentPrice, optimalPositionSize)
//     if (riskReward.ratio < 1.5) {
//       decision.reason = `Risk-reward ratio too low: ${riskReward.ratio.toFixed(2)} (minimum 1.5)`
//       return decision
//     }

//     // 8. Learning system pattern check
//     if (this.config.learningIntegration.patternAwareness) {
//       const patternAnalysis = await this.analyzeTradePatterns(signal, marketData, portfolio)
//       if (patternAnalysis.negativePattern) {
//         decision.reason = `Negative pattern detected: ${patternAnalysis.pattern}`
//         return decision
//       }
//     }

//     // All checks passed - approve execution
//     decision.shouldExecute = true
//     decision.positionSize = tradeValidation.adjustedSize || optimalPositionSize
//     decision.executionPriority = this.determineExecutionPriority(confidence, aiScore, decision.positionSize, portfolioRisk)
//     decision.estimatedSlippage = liquidityAssessment.estimatedSlippage
//     decision.estimatedFees = liquidityAssessment.estimatedFees
//     decision.expectedReturn = riskReward.expectedReturn
//     decision.riskRewardRatio = riskReward.ratio
//     decision.reason = `APPROVED: ${(confidence * 100).toFixed(1)}% confidence, ${decision.executionPriority} priority, ${(decision.positionSize / portfolio.totalValue * 100).toFixed(2)}% position`

//     console.log(`✅ Risk assessment passed: ${decision.reason}`)
//     return decision
//   }

//   private async executeTradeWithRiskControls(
//     signal: TradeSignal,
//     decision: ExecutionDecision,
//     marketData: MarketData[],
//     portfolio: Portfolio
//   ): Promise<ExecutionDecision> {

//     if (!decision.shouldExecute) return decision

//     this.concurrentExecutions++
//     const startTime = Date.now()
//     const symbol = signal.symbol
//     const currentPrice = marketData[marketData.length - 1].close

//     try {
//       console.log(`🚀 Executing trade: ${symbol} ${signal.action} - Position: ${(decision.positionSize / portfolio.totalValue * 100).toFixed(2)}%`)

//       // Calculate notional value for order
//       const notionalValue = Math.max(1, Math.round(decision.positionSize * portfolio.totalValue))
      
//       // Create order with enhanced parameters
//       const orderRequest = {
//         symbol,
//         notional: notionalValue,
//         side: signal.action.toLowerCase() as 'buy' | 'sell',
//         type: 'market' as const,
//         time_in_force: 'day' as const,
//         client_order_id: `ai_auto_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//         extended_hours: this.config.executionRules.afterHoursTrading,
//         // Add stop loss if required and available
//         ...(this.config.riskControls.maxDailyLoss && signal.metadata?.stopLoss && {
//           stop_loss: {
//             stop_price: signal.metadata.stopLoss.toString()
//           }
//         })
//       }

//       // Execute through Alpaca client
//       const order = await this.alpacaClient.createOrder({
//         symbol: orderRequest.symbol,
//         qty: orderRequest.notional,
//         side: orderRequest.side,
//         type: orderRequest.type || 'market',
//         time_in_force: orderRequest.time_in_force || 'day'
//       })

//       if (!order) {
//         decision.shouldExecute = false
//         decision.reason = `Order execution failed: Order creation returned null`
//         return decision
//       }

//       const executionTime = Date.now() - startTime
//       const actualPrice = order.filled_avg_price || currentPrice
//       const actualnotional = order.filled_qty || (notionalValue / actualPrice)
//       const actualSlippage = Math.abs(actualPrice - currentPrice) / currentPrice

//       // Create execution record
//       const execution: TradeExecution = {
//         tradeId: order.client_order_id || `trade_${Date.now()}`,
//         symbol,
//         action: signal.action,
//         notional: actualnotional,
//         notionalValue,
//         executionPrice: actualPrice,
//         orderId: order.id || `order_${Date.now()}`,
//         timestamp: new Date(),
//         confidence: signal.confidence,
//         aiScore: signal.metadata?.aiScore || 0,
//         executionTime,
//         slippage: actualSlippage,
//         fees: this.estimateTradingFees(notionalValue),
//         fillStatus: order.status === 'filled' ? 'FILLED' : 'PARTIAL',
//         riskMetrics: {
//           portfolioImpact: notionalValue / portfolio.totalValue,
//           positionSizePercent: decision.positionSize / portfolio.totalValue,
//           correlationRisk: decision.riskScore,
//           volatilityRisk: this.calculateVolatility(marketData.slice(-14))
//         },
//         metadata: {
//           originalSignal: signal,
//           riskAssessment: this.lastRiskAssessment,
//           executionReason: decision.reason,
//           marketConditions: {
//             price: currentPrice,
//             volume: marketData[marketData.length - 1].volume,
//             timestamp: new Date()
//           }
//         }
//       }

//       // Store execution
//       this.executionHistory.push(execution)
//       this.activeExecutions.set(execution.tradeId, execution)
      
//       // Update counters
//       this.dailyTradeCount++
//       this.lastTradeTime.set(symbol, new Date())
      
//       // Track with learning system
//       if (this.config.learningIntegration.enabled) {
//         await this.learningSystem.trackTradeEntry(
//           execution.tradeId,
//           signal,
//           marketData[marketData.length - 1],
//           actualPrice,
//           notionalValue
//         )
//       }

//       // Save to Supabase database
//       await tradePersistence.saveTradeExecution({
//         symbol,
//         side: signal.action.toLowerCase() as 'buy' | 'sell',
//         notional: actualnotional,
//         price: actualPrice,
//         notionalValue,
//         orderId: execution.orderId,
//         status: execution.fillStatus,
//         confidence: signal.confidence,
//         aiScore: signal.metadata?.aiScore || 0,
//         strategy: signal.strategy,
//         riskScore: decision.riskScore,
//         executionTime,
//         slippage: actualSlippage,
//         fees: execution.fees,
//         metadata: {
//           sessionId: order.client_order_id,
//           signalType: signal.metadata?.signalType,
//           targetPrice: signal.metadata?.targetPrice,
//           stopLoss: signal.metadata?.stopLoss
//         }
//       })

//       console.log(`✅ TRADE EXECUTED: ${symbol} ${signal.action} - $${notionalValue.toLocaleString()} @ $${actualPrice.toFixed(4)}`)
//       console.log(`   📊 Execution Time: ${executionTime}ms | Slippage: ${(actualSlippage * 100).toFixed(3)}% | Fill: ${execution.fillStatus}`)

//       // Update decision with execution results
//       decision.estimatedSlippage = actualSlippage
//       decision.reason = `EXECUTED: ${symbol} ${signal.action} - Order ID: ${execution.orderId}`

//       return decision

//     } catch (error) {
//       console.error(`❌ Trade execution failed for ${symbol}:`, error.message)
//       decision.shouldExecute = false
//       decision.reason = `Execution failed: ${error.message}`
//       return decision
      
//     } finally {
//       this.concurrentExecutions = Math.max(0, this.concurrentExecutions - 1)
//     }
//   }

//   private async calculateOptimalPositionSize(
//     signal: TradeSignal,
//     portfolio: Portfolio,
//     marketData: MarketData[],
//     aiScore: number,
//     portfolioRisk: any
//   ): Promise<number> {

//     // Start with base position size
//     let baseSize = this.config.positionSizing.baseSize * portfolio.totalValue
    
//     // 1. Confidence-based adjustment
//     const confidenceMultiplier = Math.pow(signal.confidence / 0.6, this.config.positionSizing.confidenceMultiplier)
//     baseSize *= confidenceMultiplier

//     // 2. AI score enhancement
//     if (aiScore > 0) {
//       const aiMultiplier = 0.8 + (aiScore / 100) * 0.4 // 0.8x to 1.2x based on AI score
//       baseSize *= aiMultiplier
//     }

//     // 3. Risk adjustment
//     const riskAdjustment = 1 - ((signal.riskScore || 0.5) * 0.4) // Max 40% reduction for high risk
//     baseSize *= riskAdjustment

//     // 4. Portfolio risk adjustment
//     if (portfolioRisk.riskLevel === 'HIGH') {
//       baseSize *= 0.7 // 30% reduction for high portfolio risk
//     } else if (portfolioRisk.riskLevel === 'CRITICAL') {
//       baseSize *= 0.4 // 60% reduction for critical portfolio risk
//     }

//     // 5. Volatility adjustment
//     const volatility = this.calculateVolatility(marketData.slice(-14))
//     if (volatility > 0.05) { // High volatility
//       baseSize *= (1 - Math.min(volatility - 0.05, 0.3)) // Reduce size for high volatility
//     }

//     // 6. Kelly Criterion (if enabled)
//     if (this.config.positionSizing.kellyEnabled) {
//       const kellySize = await this.calculateKellyOptimalSize(signal, marketData, portfolio)
//       baseSize = Math.min(baseSize, kellySize)
//     }

//     // 7. Learning system adjustment
//     if (this.config.learningIntegration.enabled) {
//       const learningAdjustment = await this.getLearningBasedSizeAdjustment(signal.symbol, signal.strategy)
//       baseSize *= learningAdjustment
//     }

//     // Apply bounds
//     const minSize = portfolio.totalValue * 0.005 // 0.5% minimum
//     const maxSize = portfolio.totalValue * this.config.positionSizing.maxSize

//     return Math.max(minSize, Math.min(baseSize, maxSize))
//   }

//   private async calculateKellyOptimalSize(
//     signal: TradeSignal,
//     marketData: MarketData[],
//     portfolio: Portfolio
//   ): Promise<number> {
    
//     // Simplified Kelly Criterion calculation
//     // In practice, would use historical win rate and average win/loss
//     const winRate = 0.6 // Would come from learning system
//     const avgWin = 0.03 // 3% average win
//     const avgLoss = 0.02 // 2% average loss
    
//     const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin
//     const kellySize = Math.max(0, Math.min(0.25, kellyPercent)) // Cap at 25%
    
//     return kellySize * portfolio.totalValue
//   }

//   private determineExecutionPriority(
//     confidence: number,
//     aiScore: number,
//     positionSize: number,
//     portfolioRisk: any
//   ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    
//     let score = 0
    
//     // Confidence contribution (0-40 points)
//     score += confidence * 40
    
//     // AI score contribution (0-30 points)
//     score += (aiScore / 100) * 30
    
//     // Position size contribution (0-20 points)
//     score += Math.min(positionSize * 200, 20) // Larger positions get higher priority
    
//     // Portfolio risk penalty (0-10 points deduction)
//     if (portfolioRisk.riskLevel === 'HIGH') score -= 5
//     if (portfolioRisk.riskLevel === 'CRITICAL') score -= 10
    
//     // Time factor (boost for market open/close)
//     const hour = new Date().getHours()
//     if ((hour >= 9 && hour <= 10) || (hour >= 15 && hour <= 16)) {
//       score += 10 // Market open/close boost
//     }
    
//     if (score >= 85) return 'CRITICAL'
//     if (score >= 70) return 'HIGH'
//     if (score >= 55) return 'MEDIUM'
//     return 'LOW'
//   }

//   private async getEffectiveConfidenceThreshold(symbol: string, strategy: string): Promise<number> {
//     // Start with base threshold
//     let threshold = this.config.confidenceThresholds.minimum
    
//     // Apply adaptive learning adjustments
//     if (this.config.learningIntegration.adaptiveThresholds) {
//       const adaptiveKey = `${symbol}_${strategy}`
//       const adaptiveThreshold = this.adaptiveThresholds.get(adaptiveKey)
      
//       if (adaptiveThreshold) {
//         threshold = adaptiveThreshold
//         console.log(`📊 Using adaptive threshold for ${adaptiveKey}: ${(threshold * 100).toFixed(1)}%`)
//       }
//     }
    
//     return threshold
//   }

//   private async loadAdaptiveThresholds(): Promise<void> {
//     if (!this.config.learningIntegration.adaptiveThresholds) return
    
//     const insights = this.learningSystem.getLatestInsights()
//     if (insights) {
//       // Apply learned optimal threshold
//       this.adaptiveThresholds.set('global', insights.optimalConfidenceThreshold)
      
//       // Apply pattern-specific thresholds
//       for (const pattern of insights.strongestPatterns) {
//         this.adaptiveThresholds.set(pattern.pattern, Math.max(0.5, pattern.accuracy - 0.1))
//       }
      
//       console.log(`🧠 Loaded ${this.adaptiveThresholds.size} adaptive thresholds from learning system`)
//     }
//   }

//   private async getLearningBasedSizeAdjustment(symbol: string, strategy: string): Promise<number> {
//     const insights = this.learningSystem.getLatestInsights()
//     if (!insights) return 1.0
    
//     // Adjust based on overall accuracy
//     let adjustment = 1.0
    
//     if (insights.overallAccuracy > 0.7) {
//       adjustment *= 1.15 // Increase size for good performance
//     } else if (insights.overallAccuracy < 0.5) {
//       adjustment *= 0.8 // Reduce size for poor performance
//     }
    
//     // Check if strategy is in least effective list
//     if (insights.recommendedAdjustments.strategies.leastEffective.includes(strategy)) {
//       adjustment *= 0.7 // Reduce size for ineffective strategies
//     }
    
//     // Check if strategy is in most effective list
//     if (insights.recommendedAdjustments.strategies.mostEffective.includes(strategy)) {
//       adjustment *= 1.1 // Increase size for effective strategies
//     }
    
//     return adjustment
//   }

//   private assessLiquidityAndSlippage(
//     marketData: MarketData[],
//     positionSize: number,
//     currentPrice: number
//   ): { estimatedSlippage: number; estimatedFees: number; excessiveSlippage: boolean } {
    
//     if (marketData.length === 0) {
//       return { estimatedSlippage: 0.01, estimatedFees: 0, excessiveSlippage: true }
//     }
    
//     // Calculate average volume
//     const avgVolume = marketData.slice(-10).reduce((sum, data) => sum + data.volume, 0) / Math.min(10, marketData.length)
//     const currentVolume = marketData[marketData.length - 1].volume
    
//     // Estimate position as percentage of volume
//     const sharenotional = positionSize / currentPrice
//     const volumeImpact = sharenotional / Math.max(currentVolume, 1000) // Avoid division by zero
    
//     // Estimate slippage based on volume impact
//     let estimatedSlippage = 0.001 // Base slippage
    
//     if (volumeImpact > 0.05) { // >5% of volume
//       estimatedSlippage = 0.01 + (volumeImpact * 0.1) // Higher slippage for large orders
//     } else if (volumeImpact > 0.02) { // >2% of volume
//       estimatedSlippage = 0.003 + (volumeImpact * 0.05)
//     }
    
//     // Estimate fees (simplified)
//     const estimatedFees = positionSize * 0.0001 // 1 basis point
    
//     const excessiveSlippage = estimatedSlippage > this.config.executionRules.spreadThreshold
    
//     return { estimatedSlippage, estimatedFees, excessiveSlippage }
//   }

//   private calculateRiskReward(
//     signal: TradeSignal,
//     currentPrice: number,
//     positionSize: number
//   ): { ratio: number; expectedReturn: number; maxLoss: number } {
    
//     const targetPrice = signal.metadata?.targetPrice || currentPrice * (signal.action === 'BUY' ? 1.05 : 0.95)
//     const stopLoss = signal.metadata?.stopLoss || currentPrice * (signal.action === 'BUY' ? 0.97 : 1.03)
    
//     const potentialProfit = Math.abs(targetPrice - currentPrice)
//     const potentialLoss = Math.abs(currentPrice - stopLoss)
    
//     const ratio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0
    
//     const expectedReturn = (potentialProfit / currentPrice) * signal.confidence * positionSize
//     const maxLoss = potentialLoss * positionSize
    
//     return { ratio, expectedReturn, maxLoss }
//   }

//   private async assessMarketConditions(
//     marketData: MarketData[],
//     symbol: string
//   ): Promise<{ suitable: boolean; reason?: string }> {
    
//     if (marketData.length === 0) {
//       return { suitable: false, reason: 'No market data available' }
//     }
    
//     const currentData = marketData[marketData.length - 1]
//     const isCrypto = symbol.includes('USD') && symbol.length <= 7
    
//     // Market hours check (skip for crypto)
//     if (this.config.executionRules.marketHoursOnly && !isCrypto) {
//       const now = new Date()
//       const hour = now.getHours()
//       const day = now.getDay()
      
//       // Weekend check
//       if (day === 0 || day === 6) { // Sunday = 0, Saturday = 6
//         if (!this.config.executionRules.weekendTrading) {
//           return { suitable: false, reason: 'Weekend trading disabled' }
//         }
//       }
      
//       // Market hours check (9:30 AM - 4:00 PM EST roughly 14:30 - 21:00 UTC)
//       const utcHour = now.getUTCHours()
//       if (utcHour < 14.5 || utcHour > 21) {
//         if (!this.config.executionRules.afterHoursTrading) {
//           return { suitable: false, reason: 'Outside market hours and after-hours trading disabled' }
//         }
//       }
//     }
    
//     // Volume check
//     const avgVolume = marketData.slice(-20).reduce((sum, data) => sum + data.volume, 0) / Math.min(20, marketData.length)
//     if (currentData.volume < this.config.executionRules.volumeThreshold) {
//       return { suitable: false, reason: `Volume too low: ${currentData.volume.toLocaleString()} < ${this.config.executionRules.volumeThreshold.toLocaleString()}` }
//     }
    
//     return { suitable: true }
//   }

//   private async analyzeTradePatterns(
//     signal: TradeSignal,
//     marketData: MarketData[],
//     portfolio: Portfolio
//   ): Promise<{ negativePattern: boolean; pattern?: string; confidence?: number }> {
    
//     if (!this.config.learningIntegration.patternAwareness) {
//       return { negativePattern: false }
//     }
    
//     const insights = this.learningSystem.getLatestInsights()
//     if (!insights || insights.weakestPatterns.length === 0) {
//       return { negativePattern: false }
//     }
    
//     // Check against weakest patterns
//     for (const weakPattern of insights.weakestPatterns) {
//       if (weakPattern.accuracy < 0.4 && this.matchesPattern(signal, marketData, weakPattern.pattern)) {
//         return {
//           negativePattern: true,
//           pattern: weakPattern.pattern,
//           confidence: weakPattern.accuracy
//         }
//       }
//     }
    
//     return { negativePattern: false }
//   }

//   private matchesPattern(signal: TradeSignal, marketData: MarketData[], pattern: string): boolean {
//     // Simplified pattern matching - in practice would be more sophisticated
//     const currentPrice = marketData[marketData.length - 1]?.close || 0
//     const previousPrice = marketData[marketData.length - 2]?.close || currentPrice
//     const priceChange = (currentPrice - previousPrice) / previousPrice
    
//     // Pattern matching logic
//     switch (pattern) {
//       case 'HIGH_VOLATILITY':
//         return this.calculateVolatility(marketData.slice(-14)) > 0.05
//       case 'LOW_CONFIDENCE':
//         return signal.confidence < 0.6
//       case 'MARKET_SIDEWAYS':
//         return Math.abs(priceChange) < 0.005 // Less than 0.5% change
//       case 'STRATEGY_TECHNICAL_ONLY':
//         return signal.strategy === 'TECHNICAL_ONLY'
//       default:
//         return false
//     }
//   }

//   private calculateVolatility(marketData: MarketData[]): number {
//     if (marketData.length < 2) return 0
    
//     const returns = []
//     for (let i = 1; i < marketData.length; i++) {
//       const currentPrice = marketData[i].close
//       const previousPrice = marketData[i - 1].close
//       returns.push((currentPrice - previousPrice) / previousPrice)
//     }
    
//     const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
//     const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
//     return Math.sqrt(variance)
//   }

//   private estimateTradingFees(notionalValue: number): number {
//     // Alpaca commission-free for stocks, small fee for crypto
//     return notionalValue * 0.0001 // 1 basis point estimate
//   }

//   private async postExecutionProcessing(
//     executionResult: ExecutionDecision,
//     signal: TradeSignal,
//     riskAssessment: ExecutionDecision
//   ): Promise<void> {
    
//     try {
//       // Update execution metrics
//       await this.updateExecutionMetrics(executionResult, signal)
      
//       // Log execution details for analysis
//       this.logExecutionDetails(executionResult, signal, riskAssessment)
      
//       // Check for learning opportunities
//       if (this.config.learningIntegration.performanceFeedback) {
//         await this.processPerformanceFeedback(executionResult, signal)
//       }
      
//       // Update adaptive thresholds if needed
//       if (this.config.learningIntegration.adaptiveThresholds) {
//         await this.updateAdaptiveThresholds(executionResult, signal)
//       }
      
//     } catch (error) {
//       console.error('❌ Post-execution processing failed:', error.message)
//     }
//   }

//   private async updateExecutionMetrics(executionResult: ExecutionDecision, signal: TradeSignal): Promise<void> {
//     // Update session metrics
//     if (executionResult.shouldExecute) {
//       // Successful execution - metrics updated during execution
//     } else {
//       // Rejected execution - log to Supabase for analytics
//       console.log(`📊 Trade rejected: ${signal.symbol} - ${executionResult.reason}`)

//       await tradePersistence.saveRejectedTrade(
//         signal.symbol,
//         executionResult.reason,
//         signal.confidence,
//         {
//           riskScore: executionResult.riskScore,
//           strategy: signal.strategy,
//           action: signal.action
//         }
//       )
//     }
//   }

//   private logExecutionDetails(
//     executionResult: ExecutionDecision,
//     signal: TradeSignal,
//     riskAssessment: ExecutionDecision
//   ): void {
    
//     const logLevel = executionResult.shouldExecute ? '✅' : '❌'
//     const status = executionResult.shouldExecute ? 'EXECUTED' : 'REJECTED'
    
//     console.log(`${logLevel} EXECUTION ${status}: ${signal.symbol} ${signal.action}`)
//     console.log(`   📊 Confidence: ${(signal.confidence * 100).toFixed(1)}% | Priority: ${executionResult.executionPriority}`)
//     console.log(`   🎯 Position: ${(executionResult.positionSize / 1000).toFixed(1)}K | R/R: ${executionResult.riskRewardRatio.toFixed(2)}`)
//     console.log(`   🛡️ Risk Score: ${(executionResult.riskScore * 100).toFixed(1)}% | Reason: ${executionResult.reason}`)
    
//     if (executionResult.riskAdjustments.sizeReduction) {
//       console.log(`   ⚖️ Size Adjustment: ${executionResult.riskAdjustments.sizeReduction.toFixed(1)}% reduction`)
//     }
    
//     if (executionResult.safetyOverrides.length > 0) {
//       console.log(`   🔒 Safety Overrides: ${executionResult.safetyOverrides.join(', ')}`)
//     }
//   }

//   private async processPerformanceFeedback(executionResult: ExecutionDecision, signal: TradeSignal): Promise<void> {
//     // This would integrate with the learning system to provide feedback
//     // For now, we'll log the decision for future analysis
    
//     if (executionResult.shouldExecute) {
//       // Positive feedback for executed trades
//       console.log(`🎓 Learning: Positive execution feedback for ${signal.symbol} ${signal.action}`)
//     } else {
//       // Negative feedback for rejected trades (depending on reason)
//       if (executionResult.reason.includes('confidence')) {
//         console.log(`🎓 Learning: Confidence threshold feedback for ${signal.symbol}`)
//       }
//     }
//   }

//   private async updateAdaptiveThresholds(executionResult: ExecutionDecision, signal: TradeSignal): Promise<void> {
//     // Update adaptive thresholds based on execution results
//     const key = `${signal.symbol}_${signal.strategy}`
    
//     if (executionResult.shouldExecute) {
//       // Successful execution - consider lowering threshold slightly
//       const currentThreshold = this.adaptiveThresholds.get(key) || this.config.confidenceThresholds.minimum
//       const newThreshold = Math.max(0.5, currentThreshold - 0.01) // Small decrease
//       this.adaptiveThresholds.set(key, newThreshold)
//     } else if (executionResult.reason.includes('confidence')) {
//       // Rejected for low confidence - consider raising threshold
//       const currentThreshold = this.adaptiveThresholds.get(key) || this.config.confidenceThresholds.minimum
//       const newThreshold = Math.min(0.9, currentThreshold + 0.005) // Small increase
//       this.adaptiveThresholds.set(key, newThreshold)
//     }
//   }

//   private createRejectionDecision(reason: string, signal: TradeSignal): ExecutionDecision {
//     return {
//       shouldExecute: false,
//       positionSize: 0,
//       reason,
//       confidence: signal.confidence,
//       riskScore: signal.riskScore || 0.5,
//       executionPriority: 'LOW',
//       riskAdjustments: {},
//       safetyOverrides: [],
//       estimatedSlippage: 0,
//       estimatedFees: 0,
//       expectedReturn: 0,
//       riskRewardRatio: 0
//     }
//   }

//   private startExecutionMonitoring(): void {
//     // Start monitoring active executions
//     setInterval(async () => {
//       if (this.activeExecutions.size > 0) {
//         await this.checkActiveExecutions()
//       }
//     }, 10000) // Check every 10 seconds
    
//     // Daily reset check
//     setInterval(() => {
//       this.checkDailyReset()
//     }, 60000) // Check every minute
//   }

//   private async checkActiveExecutions(): Promise<void> {
//     for (const [tradeId, execution] of this.activeExecutions) {
//       try {
//         // Check order status with Alpaca
//         const order = await this.alpacaClient.getOrder(execution.orderId)

//         if (order?.status === 'filled') {
//           // Update execution record
//           execution.fillStatus = 'FILLED'
          
//           // Track exit with learning system if position is closed
//           if (this.config.learningIntegration.enabled) {
//             await this.learningSystem.trackTradeExit(
//               tradeId,
//               order.filled_avg_price || execution.executionPrice,
//               new Date()
//             )
//           }
          
//           // Remove from active executions
//           this.activeExecutions.delete(tradeId)
          
//           console.log(`✅ Trade completed: ${tradeId} - ${execution.symbol} ${execution.action}`)
//         }
        
//       } catch (error) {
//         console.error(`❌ Error checking execution ${tradeId}:`, error.message)
//       }
//     }
//   }

//   private checkDailyReset(): void {
//     const now = new Date()
//     const today = now.toDateString()

//     if (this.lastExecutorResetDate !== today) {
//       this.resetDailyCounters()
//       this.lastExecutorResetDate = today
//       console.log('🔄 Daily execution counters reset')
//     }
//   }

//   private resetDailyCounters(): void {
//     this.dailyTradeCount = 0
//     this.dailyPnL = 0
    
//     // Clear execution history older than 7 days
//     const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
//     this.executionHistory = this.executionHistory.filter(
//       execution => execution.timestamp >= sevenDaysAgo
//     )
//   }

//   private async waitForPendingExecutions(): Promise<void> {
//     let attempts = 0
//     const maxAttempts = 30 // 30 seconds max wait
    
//     while (this.concurrentExecutions > 0 && attempts < maxAttempts) {
//       console.log(`⏳ Waiting for ${this.concurrentExecutions} pending executions...`)
//       await new Promise(resolve => setTimeout(resolve, 1000))
//       attempts++
//     }
    
//     if (this.concurrentExecutions > 0) {
//       console.warn(`⚠️ Shutdown with ${this.concurrentExecutions} executions still pending`)
//     }
//   }

//   private async saveExecutionMetrics(): Promise<void> {
//     const metrics = this.getExecutionMetrics()
    
//     // In production, would save to database
//     console.log('💾 Saving execution metrics:', {
//       session: metrics.session,
//       daily: metrics.daily,
//       performance: metrics.performance
//     })
//   }

//   // Public interface methods

//   public getExecutionMetrics(): ExecutionMetrics {
//     const sessionDuration = (Date.now() - this.sessionStartTime.getTime()) / (1000 * 60 * 60) // hours
//     const executedTrades = this.executionHistory.filter(e => e.fillStatus === 'FILLED')
//     const totalVolume = executedTrades.reduce((sum, e) => sum + e.notionalValue, 0)
    
//     const winningTrades = executedTrades.filter(e => 
//       (e.action === 'BUY' && (e.metadata.marketConditions?.price || 0) > e.executionPrice) ||
//       (e.action === 'SELL' && (e.metadata.marketConditions?.price || 0) < e.executionPrice)
//     )
    
//     const avgExecutionTime = executedTrades.length > 0 ?
//       executedTrades.reduce((sum, e) => sum + e.executionTime, 0) / executedTrades.length : 0
    
//     return {
//       session: {
//         tradesAttempted: this.executionHistory.length,
//         tradesExecuted: executedTrades.length,
//         tradesRejected: this.executionHistory.length - executedTrades.length,
//         successRate: this.executionHistory.length > 0 ? executedTrades.length / this.executionHistory.length : 0,
//         avgExecutionTime,
//         totalVolume
//       },
//       daily: {
//         tradeCount: this.dailyTradeCount,
//         remainingTrades: Math.max(0, this.config.riskControls.maxDailyTrades - this.dailyTradeCount),
//         dailyPnL: this.dailyPnL,
//         dailyLossLimit: this.config.riskControls.maxDailyLoss,
//         executionEnabled: this.isExecutionEnabled
//       },
//       risk: {
//         currentDrawdown: 0, // Would calculate from portfolio history
//         riskLevel: this.lastRiskAssessment?.riskLevel || 'MEDIUM',
//         openPositions: this.activeExecutions.size,
//         totalExposure: Array.from(this.activeExecutions.values()).reduce((sum, e) => sum + e.notionalValue, 0),
//         concentrationRisk: 0 // Would calculate based on position concentration
//       },
//       performance: {
//         winRate: executedTrades.length > 0 ? winningTrades.length / executedTrades.length : 0,
//         avgReturn: 0, // Would calculate from trade outcomes
//         sharpeRatio: 0, // Would calculate from returns
//         maxDrawdown: 0, // Would calculate from equity curve
//         profitFactor: 0, // Would calculate from win/loss ratio
//         totalPnL: this.dailyPnL
//       },
//       learning: {
//         adaptationsApplied: this.adaptiveThresholds.size,
//         thresholdAdjustments: 0, // Would track threshold changes
//         patternMatchCount: 0, // Would track pattern matches
//         lastLearningUpdate: new Date()
//       }
//     }
//   }

//   public getExecutionHistory(limit?: number): TradeExecution[] {
//     const history = [...this.executionHistory].reverse() // Most recent first
//     return limit ? history.slice(0, limit) : history
//   }

//   public getActiveExecutions(): TradeExecution[] {
//     return Array.from(this.activeExecutions.values())
//   }

//   public getDailyStats(): {
//     tradesExecuted: number
//     tradesRemaining: number
//     dailyPnL: number
//     executionEnabled: boolean
//   } {
//     return {
//       tradesExecuted: this.dailyTradeCount,
//       tradesRemaining: Math.max(0, this.config.riskControls.maxDailyTrades - this.dailyTradeCount),
//       dailyPnL: this.dailyPnL,
//       executionEnabled: this.isExecutionEnabled
//     }
//   }

//   public enableExecution(): void {
//     this.isExecutionEnabled = true
//     console.log('✅ Execution enabled')
//   }

//   public disableExecution(): void {
//     this.isExecutionEnabled = false
//     console.log('❌ Execution disabled')
//   }

//   public updateDailyPnL(portfolioPnL: number): void {
//     this.dailyPnL = portfolioPnL
//   }

//   public isReady(): boolean {
//     return this.isExecutionEnabled && this.riskEngine.isReady() && this.learningSystem.isReady()
//   }

//   public updateConfig(newConfig: Partial<ExecutionConfig>): void {
//     this.config = { ...this.config, ...newConfig }
//     console.log('⚙️ Enhanced AutoTradeExecutor config updated')
//   }

//   public clearExecutionHistory(): void {
//     this.executionHistory = []
//     this.activeExecutions.clear()
//     console.log('🗑️ Execution history cleared')
//   }

//   public async generateExecutionReport(): Promise<string> {
//     const metrics = this.getExecutionMetrics()
    
//     return `
// # Enhanced AutoTradeExecutor Report
// Generated: ${new Date().toISOString()}

// ## Session Summary
// - Trades Attempted: ${metrics.session.tradesAttempted}
// - Trades Executed: ${metrics.session.tradesExecuted}
// - Success Rate: ${(metrics.session.successRate * 100).toFixed(1)}%
// - Total Volume: ${metrics.session.totalVolume.toLocaleString()}
// - Avg Execution Time: ${metrics.session.avgExecutionTime.toFixed(0)}ms

// ## Daily Performance
// - Daily Trades: ${metrics.daily.tradeCount}/${this.config.riskControls.maxDailyTrades}
// - Daily P&L: ${metrics.daily.dailyPnL.toFixed(2)}
// - Execution Status: ${metrics.daily.executionEnabled ? 'ENABLED' : 'DISABLED'}

// ## Risk Management
// - Risk Level: ${metrics.risk.riskLevel}
// - Open Positions: ${metrics.risk.openPositions}
// - Total Exposure: ${metrics.risk.totalExposure.toLocaleString()}

// ## Learning Integration
// - Adaptive Thresholds: ${metrics.learning.adaptationsApplied} active
// - Pattern Awareness: ${this.config.learningIntegration.patternAwareness ? 'ENABLED' : 'DISABLED'}
// - Performance Feedback: ${this.config.learningIntegration.performanceFeedback ? 'ENABLED' : 'DISABLED'}

// ## Recent Executions (Last 5)
// ${this.getExecutionHistory(5).map(exec => 
//   `- ${exec.timestamp.toISOString()}: ${exec.symbol} ${exec.action} ${exec.notionalValue.toLocaleString()} (${exec.fillStatus})`
// ).join('\n')}

// ---
// *Report generated by Enhanced AutoTradeExecutor*
//     `.trim()
//   }
// }