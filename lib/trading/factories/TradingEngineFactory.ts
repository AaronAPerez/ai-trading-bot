import { RealTimeAITradingEngine } from '../engines/RealTimeAITradingEngine'
import { AIRecommendationEngine } from '../engines/AIRecommendationEngine'
import { RiskManagementEngine } from '../engines/RiskManagementEngine'
import { EnhancedAutoTradeExecutor } from '../executors/AutoTradeExecutor'
import { AILearningSystem } from '../ml/AILearningSystem'
import { SentimentAnalyzer } from '../analyzers/SentimentAnalyzer'
import { TechnicalAnalyzer } from '../analyzers/TechnicalAnalyzer'
import { AlpacaServerClient } from '@/lib/alpaca/server-client'
import { EngineType, TradingMode } from '@/types/trading'


export interface EngineCreationOptions {
  type: EngineType
  mode: TradingMode
  config: TradingEngineConfig
  sessionId?: string
  persistent?: boolean
  autoStart?: boolean
  enableLearning?: boolean
  customAnalyzers?: {
    sentiment?: SentimentAnalyzer
    technical?: TechnicalAnalyzer
  }
}

export interface EngineInstance {
  id: string
  engine: RealTimeAITradingEngine
  type: EngineType
  mode: TradingMode
  config: TradingEngineConfig
  createdAt: Date
  lastActivity: Date
  status: 'INITIALIZING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  metrics: EngineMetrics
}

interface EngineMetrics {
  uptime: number
  cyclesCompleted: number
  tradesExecuted: number
  successRate: number
  totalVolume: number
  currentRiskLevel: string
  lastError?: string
}

interface EngineBuilder {
  withAlpacaClient(client: AlpacaServerClient): EngineBuilder
  withRiskManagement(config: any): EngineBuilder
  withLearningSystem(enabled: boolean): EngineBuilder
  withSentimentAnalysis(config: any): EngineBuilder
  withTechnicalAnalysis(config: any): EngineBuilder
  withCustomConfig(config: Partial<TradingEngineConfig>): EngineBuilder
  build(): Promise<RealTimeAITradingEngine>
}

export class TradingEngineFactory {
  static create(config: any) {
    throw new Error('Method not implemented.')
  }
  private static instance: TradingEngineFactory
  private activeEngines = new Map<string, EngineInstance>()
  private engineCounter = 0
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.startCleanupMonitoring()
    console.log('🏭 TradingEngineFactory initialized')
  }

  public static getInstance(): TradingEngineFactory {
    if (!TradingEngineFactory.instance) {
      TradingEngineFactory.instance = new TradingEngineFactory()
    }
    return TradingEngineFactory.instance
  }

  /**
   * Create a new trading engine with specified options
   */
  public async createEngine(options: EngineCreationOptions): Promise<EngineInstance> {
    const engineId = options.sessionId || this.generateEngineId(options.type)
    
    console.log(`🔧 Creating ${options.type} trading engine: ${engineId}`)

    try {
      // Validate configuration
      this.validateEngineConfig(options.config)

      // Create engine instance
      const engine = await this.buildEngine(options)

      // Create engine instance wrapper
      const engineInstance: EngineInstance = {
        id: engineId,
        engine,
        type: options.type,
        mode: options.mode,
        config: options.config,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'INITIALIZING',
        metrics: this.createInitialMetrics()
      }

      // Initialize engine
      await engine.initialize()
      engineInstance.status = 'STOPPED'

      // Auto-start if requested
      if (options.autoStart) {
        await engine.start()
        engineInstance.status = 'RUNNING'
      }

      // Register engine
      this.activeEngines.set(engineId, engineInstance)

      console.log(`✅ Trading engine created successfully: ${engineId}`)
      return engineInstance

    } catch (error) {
      console.error(`❌ Failed to create trading engine ${engineId}:`, error)
      throw new Error(`Engine creation failed: ${error.message}`)
    }
  }

  /**
   * Create engine builder for fluent configuration
   */
  public createBuilder(type: EngineType, mode: TradingMode): EngineBuilder {
    return new TradingEngineBuilder(type, mode)
  }

  /**
   * Get engine by ID
   */
  public getEngine(engineId: string): EngineInstance | null {
    return this.activeEngines.get(engineId) || null
  }

  /**
   * Get all active engines
   */
  public getAllEngines(): EngineInstance[] {
    return Array.from(this.activeEngines.values())
  }

  /**
   * Get engines by type
   */
  public getEnginesByType(type: EngineType): EngineInstance[] {
    return this.getAllEngines().filter(instance => instance.type === type)
  }

  /**
   * Get engines by mode
   */
  public getEnginesByMode(mode: TradingMode): EngineInstance[] {
    return this.getAllEngines().filter(instance => instance.mode === mode)
  }

  /**
   * Start engine
   */
  public async startEngine(engineId: string): Promise<void> {
    const instance = this.activeEngines.get(engineId)
    if (!instance) {
      throw new Error(`Engine not found: ${engineId}`)
    }

    if (instance.status === 'RUNNING') {
      console.log(`⚠️ Engine ${engineId} is already running`)
      return
    }

    try {
      console.log(`🚀 Starting trading engine: ${engineId}`)
      await instance.engine.start()
      instance.status = 'RUNNING'
      instance.lastActivity = new Date()
      
      console.log(`✅ Trading engine started: ${engineId}`)
    } catch (error) {
      instance.status = 'ERROR'
      instance.metrics.lastError = error.message
      console.error(`❌ Failed to start engine ${engineId}:`, error)
      throw error
    }
  }

  /**
   * Stop engine
   */
  public async stopEngine(engineId: string): Promise<void> {
    const instance = this.activeEngines.get(engineId)
    if (!instance) {
      throw new Error(`Engine not found: ${engineId}`)
    }

    if (instance.status === 'STOPPED') {
      console.log(`⚠️ Engine ${engineId} is already stopped`)
      return
    }

    try {
      console.log(`🛑 Stopping trading engine: ${engineId}`)
      await instance.engine.stop()
      instance.status = 'STOPPED'
      instance.lastActivity = new Date()
      
      console.log(`✅ Trading engine stopped: ${engineId}`)
    } catch (error) {
      instance.status = 'ERROR'
      instance.metrics.lastError = error.message
      console.error(`❌ Failed to stop engine ${engineId}:`, error)
      throw error
    }
  }

  /**
   * Restart engine
   */
  public async restartEngine(engineId: string): Promise<void> {
    console.log(`🔄 Restarting trading engine: ${engineId}`)
    
    await this.stopEngine(engineId)
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second cooldown
    await this.startEngine(engineId)
    
    console.log(`✅ Trading engine restarted: ${engineId}`)
  }

  /**
   * Remove engine
   */
  public async removeEngine(engineId: string): Promise<void> {
    const instance = this.activeEngines.get(engineId)
    if (!instance) {
      throw new Error(`Engine not found: ${engineId}`)
    }

    try {
      console.log(`🗑️ Removing trading engine: ${engineId}`)
      
      // Stop if running
      if (instance.status === 'RUNNING') {
        await this.stopEngine(engineId)
      }

      // Shutdown engine
      await instance.engine.shutdown()

      // Remove from registry
      this.activeEngines.delete(engineId)
      
      console.log(`✅ Trading engine removed: ${engineId}`)
    } catch (error) {
      console.error(`❌ Failed to remove engine ${engineId}:`, error)
      throw error
    }
  }

  /**
   * Update engine metrics
   */
  public updateEngineMetrics(engineId: string): void {
    const instance = this.activeEngines.get(engineId)
    if (!instance) return

    try {
      const engine = instance.engine
      const uptime = Date.now() - instance.createdAt.getTime()

      instance.metrics = {
        uptime: Math.floor(uptime / 1000), // seconds
        cyclesCompleted: engine.getCycleCount?.() || 0,
        tradesExecuted: engine.getTradeCount?.() || 0,
        successRate: engine.getSuccessRate?.() || 0,
        totalVolume: engine.getTotalVolume?.() || 0,
        currentRiskLevel: engine.getCurrentRiskLevel?.() || 'UNKNOWN',
        lastError: instance.metrics.lastError
      }

      instance.lastActivity = new Date()
    } catch (error) {
      console.error(`❌ Failed to update metrics for engine ${engineId}:`, error)
    }
  }

  /**
   * Get engine statistics
   */
  public getFactoryStats(): {
    totalEngines: number
    runningEngines: number
    stoppedEngines: number
    errorEngines: number
    totalUptime: number
    totalTrades: number
    avgSuccessRate: number
  } {
    const engines = this.getAllEngines()
    
    const runningCount = engines.filter(e => e.status === 'RUNNING').length
    const stoppedCount = engines.filter(e => e.status === 'STOPPED').length
    const errorCount = engines.filter(e => e.status === 'ERROR').length
    
    const totalUptime = engines.reduce((sum, e) => sum + e.metrics.uptime, 0)
    const totalTrades = engines.reduce((sum, e) => sum + e.metrics.tradesExecuted, 0)
    const avgSuccessRate = engines.length > 0 
      ? engines.reduce((sum, e) => sum + e.metrics.successRate, 0) / engines.length 
      : 0

    return {
      totalEngines: engines.length,
      runningEngines: runningCount,
      stoppedEngines: stoppedCount,
      errorEngines: errorCount,
      totalUptime,
      totalTrades,
      avgSuccessRate
    }
  }

  /**
   * Cleanup inactive engines
   */
  public async cleanupInactiveEngines(maxIdleTime: number = 30 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const instancesToRemove: string[] = []

    for (const [engineId, instance] of this.activeEngines) {
      const idleTime = now - instance.lastActivity.getTime()
      
      if (idleTime > maxIdleTime && instance.status === 'STOPPED') {
        instancesToRemove.push(engineId)
      }
    }

    console.log(`🧹 Cleaning up ${instancesToRemove.length} inactive engines`)

    for (const engineId of instancesToRemove) {
      try {
        await this.removeEngine(engineId)
      } catch (error) {
        console.error(`❌ Failed to cleanup engine ${engineId}:`, error)
      }
    }
  }

  /**
   * Shutdown factory and all engines
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down TradingEngineFactory...')

    // Stop cleanup monitoring
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Shutdown all engines
    const shutdownPromises = Array.from(this.activeEngines.keys()).map(
      engineId => this.removeEngine(engineId).catch(error => 
        console.error(`Failed to shutdown engine ${engineId}:`, error)
      )
    )

    await Promise.all(shutdownPromises)

    console.log('✅ TradingEngineFactory shut down successfully')
  }

  // Private implementation methods

  private async buildEngine(options: EngineCreationOptions): Promise<RealTimeAITradingEngine> {
    // Create Alpaca client
    const alpacaClient = new AlpacaServerClient()

    // Create risk management engine
    const riskEngine = new RiskManagementEngine(options.config.risk)
    await riskEngine.initialize()

    // Create learning system
    const learningSystem = new AILearningSystem({
      learningRate: 0.1,
      maxHistorySize: 10000
    })
    if (options.enableLearning) {
      await learningSystem.initialize()
    }

    // Create analyzers
    const sentimentAnalyzer = options.customAnalyzers?.sentiment || 
      new SentimentAnalyzer({
        enabledSources: ['news', 'fear_greed'],
        cacheTTL: 15 * 60 * 1000
      })
    await sentimentAnalyzer.initialize()

    const technicalAnalyzer = options.customAnalyzers?.technical || 
      new TechnicalAnalyzer()
    await technicalAnalyzer.initialize()

    // Create AI recommendation engine
    const recommendationEngine = new AIRecommendationEngine(
      options.config.ai, 
      alpacaClient
    )
    await recommendationEngine.initialize()

    // Create enhanced auto trade executor
    const autoTradeExecutor = new EnhancedAutoTradeExecutor(
      options.config.execution,
      riskEngine,
      learningSystem,
      alpacaClient
    )
    await autoTradeExecutor.initialize()

    // Create main trading engine
    const tradingEngine = new RealTimeAITradingEngine(
      alpacaClient,
      options.config,
      {
        recommendationEngine,
        autoTradeExecutor,
        riskEngine,
        learningSystem,
        sentimentAnalyzer,
        technicalAnalyzer
      }
    )

    return tradingEngine
  }

  private validateEngineConfig(config: TradingEngineConfig): void {
    // Validate AI configuration
    if (!config.ai) {
      throw new Error('AI configuration is required')
    }

    if (!config.ai.confidenceThresholds) {
      throw new Error('AI confidence thresholds are required')
    }

    const { minimum, conservative, aggressive, maximum } = config.ai.confidenceThresholds
    if (minimum >= conservative || conservative >= aggressive || aggressive >= maximum) {
      throw new Error('Invalid confidence threshold progression')
    }

    if (minimum < 0 || maximum > 1) {
      throw new Error('Confidence thresholds must be between 0 and 1')
    }

    // Validate execution configuration
    if (!config.execution) {
      throw new Error('Execution configuration is required')
    }

    if (config.execution.positionSizing.baseSize <= 0 || config.execution.positionSizing.baseSize > 1) {
      throw new Error('Base position size must be between 0 and 1')
    }

    if (config.execution.positionSizing.maxSize <= 0 || config.execution.positionSizing.maxSize > 1) {
      throw new Error('Maximum position size must be between 0 and 1')
    }

    // Validate risk configuration
    if (!config.risk) {
      throw new Error('Risk configuration is required')
    }

    if (config.risk.maxDailyLoss <= 0 || config.risk.maxDailyLoss > 1) {
      throw new Error('Max daily loss must be between 0 and 1')
    }

    if (config.risk.maxDrawdown <= 0 || config.risk.maxDrawdown > 1) {
      throw new Error('Max drawdown must be between 0 and 1')
    }

    console.log('✅ Engine configuration validation passed')
  }

  private generateEngineId(type: EngineType): string {
    this.engineCounter++
    const timestamp = Date.now().toString(36)
    return `${type.toLowerCase()}_${this.engineCounter}_${timestamp}`
  }

  private createInitialMetrics(): EngineMetrics {
    return {
      uptime: 0,
      cyclesCompleted: 0,
      tradesExecuted: 0,
      successRate: 0,
      totalVolume: 0,
      currentRiskLevel: 'UNKNOWN'
    }
  }

  private startCleanupMonitoring(): void {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveEngines().catch(error => 
        console.error('❌ Cleanup monitoring error:', error)
      )
    }, 10 * 60 * 1000)

    // Update metrics every 30 seconds
    setInterval(() => {
      for (const engineId of this.activeEngines.keys()) {
        this.updateEngineMetrics(engineId)
      }
    }, 30000)
  }
}

// ===============================================
// TRADING ENGINE BUILDER - Fluent Configuration
// ===============================================

class TradingEngineBuilder implements EngineBuilder {
  private alpacaClient?: AlpacaServerClient
  private riskConfig?: any
  private learningEnabled = true
  private sentimentConfig?: any
  private technicalConfig?: any
  private customConfig: Partial<TradingEngineConfig> = {}

  constructor(
    private type: EngineType,
    private mode: TradingMode
  ) {}

  withAlpacaClient(client: AlpacaServerClient): EngineBuilder {
    this.alpacaClient = client
    return this
  }

  withRiskManagement(config: any): EngineBuilder {
    this.riskConfig = config
    return this
  }

  withLearningSystem(enabled: boolean): EngineBuilder {
    this.learningEnabled = enabled
    return this
  }

  withSentimentAnalysis(config: any): EngineBuilder {
    this.sentimentConfig = config
    return this
  }

  withTechnicalAnalysis(config: any): EngineBuilder {
    this.technicalConfig = config
    return this
  }

  withCustomConfig(config: Partial<TradingEngineConfig>): EngineBuilder {
    this.customConfig = { ...this.customConfig, ...config }
    return this
  }

  async build(): Promise<RealTimeAITradingEngine> {
    // Create default configuration
    const defaultConfig: TradingEngineConfig = {
      ai: {
        confidenceThresholds: {
          minimum: 0.60,
          conservative: 0.70,
          aggressive: 0.80,
          maximum: 0.90
        },
        strategies: ['ML_ENHANCED', 'TECHNICAL', 'SENTIMENT'],
        learningEnabled: this.learningEnabled
      },
      execution: {
        autoExecuteEnabled: true,
        positionSizing: {
          baseSize: 0.025,
          maxSize: 0.08,
          confidenceMultiplier: 2.0,
          riskAdjustmentEnabled: true,
          kellyEnabled: false
        },
        riskControls: {
          maxDailyTrades: 30,
          maxOpenPositions: 10,
          maxDailyLoss: 0.03,
          cooldownPeriod: 5,
          maxConcurrentExecutions: 3
        },
        executionRules: {
          marketHoursOnly: false,
          avoidEarnings: false,
          volumeThreshold: 15000,
          spreadThreshold: 0.05,
          cryptoTradingEnabled: true,
          afterHoursTrading: true,
          weekendTrading: true,
          slippageProtection: true,
          partialFillHandling: true
        },
        learningIntegration: {
          enabled: this.learningEnabled,
          adaptiveThresholds: true,
          patternAwareness: true,
          performanceFeedback: true
        }
      },
      risk: this.riskConfig || {
        maxDailyLoss: 0.03,
        maxDrawdown: 0.15,
        maxPositionSize: 0.08,
        maxSectorExposure: 0.25,
        maxCorrelation: 0.70,
        stopLossRequired: true
      },
      market: {
        watchlist: [],
        updateFrequency: 30000
      }
    }

    // Merge with custom configuration
    const finalConfig = this.mergeConfigurations(defaultConfig, this.customConfig)

    // Create factory options
    const options: EngineCreationOptions = {
      type: this.type,
      mode: this.mode,
      config: finalConfig,
      enableLearning: this.learningEnabled,
      autoStart: false
    }

    // Build engine through factory
    const factory = TradingEngineFactory.getInstance()
    const instance = await factory.createEngine(options)
    
    return instance.engine
  }

  private mergeConfigurations(
    defaultConfig: TradingEngineConfig,
    customConfig: Partial<TradingEngineConfig>
  ): TradingEngineConfig {
    return {
      ai: { ...defaultConfig.ai, ...customConfig.ai },
      execution: { 
        ...defaultConfig.execution, 
        ...customConfig.execution,
        positionSizing: {
          ...defaultConfig.execution.positionSizing,
          ...customConfig.execution?.positionSizing
        },
        riskControls: {
          ...defaultConfig.execution.riskControls,
          ...customConfig.execution?.riskControls
        },
        executionRules: {
          ...defaultConfig.execution.executionRules,
          ...customConfig.execution?.executionRules
        },
        learningIntegration: {
          ...defaultConfig.execution.learningIntegration,
          ...customConfig.execution?.learningIntegration
        }
      },
      risk: { ...defaultConfig.risk, ...customConfig.risk },
      market: { ...defaultConfig.market, ...customConfig.market }
    }
  }
}

// ===============================================
// TRADING ENGINE MANAGER - Global Management
// ===============================================

export class TradingEngineManager {
  static getActiveEngine() {
    throw new Error('Method not implemented.')
  }
  private static factory = TradingEngineFactory.getInstance()

  /**
   * Create a new trading engine
   */
  public static async create(options: EngineCreationOptions): Promise<string> {
    const instance = await this.factory.createEngine(options)
    return instance.id
  }

  /**
   * Start an engine
   */
  public static async start(engineId: string): Promise<void> {
    await this.factory.startEngine(engineId)
  }

  /**
   * Stop an engine
   */
  public static async stop(engineId: string): Promise<void> {
    await this.factory.stopEngine(engineId)
  }

  /**
   * Get engine status
   */
  public static getStatus(engineId: string): EngineInstance | null {
    return this.factory.getEngine(engineId)
  }

  /**
   * Get all engines
   */
  public static getAllEngines(): EngineInstance[] {
    return this.factory.getAllEngines()
  }

  /**
   * Get factory statistics
   */
  public static getStats() {
    return this.factory.getFactoryStats()
  }

  /**
   * Shutdown all engines
   */
  public static async shutdown(): Promise<void> {
    await this.factory.shutdown()
  }
}

// Export default instance for convenience
export const tradingEngineFactory = TradingEngineFactory.getInstance()