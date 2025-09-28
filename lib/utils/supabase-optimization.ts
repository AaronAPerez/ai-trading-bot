// Supabase Free Tier Optimization Utils
// Limits: 500MB database, 500MB RAM, 5GB egress, 1GB file storage

export interface SupabaseOptimizationConfig {
  maxRecordsPerTable: number
  dataRetentionDays: number
  compressionEnabled: boolean
  batchSize: number
  enableDataPurging: boolean
}

export const SUPABASE_LIMITS = {
  DATABASE_SIZE_MB: 500,
  RAM_MB: 500,
  EGRESS_GB: 5,
  FILE_STORAGE_GB: 1,
  MAX_CONNECTIONS: 60,
  MAX_REQUESTS_PER_SECOND: 100
}

export const DEFAULT_OPTIMIZATION_CONFIG: SupabaseOptimizationConfig = {
  maxRecordsPerTable: 10000, // Limit records per table
  dataRetentionDays: 30, // Keep only 30 days of data
  compressionEnabled: true,
  batchSize: 100, // Process in smaller batches
  enableDataPurging: true
}

export class SupabaseOptimizer {
  private config: SupabaseOptimizationConfig

  constructor(config: Partial<SupabaseOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config }
  }

  // Optimize learning data before saving
  optimizeLearningData(data: any): any {
    if (!data) return data

    // Remove unnecessary fields and compress data
    const optimized = {
      // Keep only essential fields
      user_id: data.user_id,
      trade_id: this.truncateString(data.trade_id, 50),
      symbol: data.symbol,
      strategy_used: this.truncateString(data.strategy_used, 30),
      confidence_level: Math.round(data.confidence_level * 100) / 100, // 2 decimal places

      // Compress market conditions
      market_conditions: this.compressMarketConditions(data.market_conditions),

      // Compress trade outcome
      trade_outcome: this.compressTradeOutcome(data.trade_outcome),

      // Limit learning data size
      learning_data: this.compressLearningData(data.learning_data),

      // Compress technical indicators
      technical_indicators: this.compressTechnicalIndicators(data.technical_indicators),

      // Compress sentiment data
      sentiment_data: this.compressSentimentData(data.sentiment_data)
    }

    return optimized
  }

  private compressMarketConditions(conditions: any): any {
    if (!conditions) return {}

    return {
      r: conditions.regime || 'U', // regime: single character
      v: Math.round((conditions.volatility || 0) * 1000) / 1000, // volatility: 3 decimals
      vol: Math.round((conditions.volume || 0) / 1000), // volume: in thousands
      s: Math.round((conditions.sentiment || 50)) // sentiment: integer
    }
  }

  private compressTradeOutcome(outcome: any): any {
    if (!outcome) return {}

    return {
      c: outcome.was_correct ? 1 : 0, // correct: boolean as 0/1
      p: Math.round((outcome.pnl || 0) * 100) / 100, // pnl: 2 decimals
      h: Math.round(outcome.hold_time_minutes || 0) // hold_time: integer minutes
    }
  }

  private compressLearningData(data: any): any {
    if (!data) return {}

    // Keep only essential learning insights
    return {
      acc: Math.round((data.accuracy || 0) * 1000) / 1000, // accuracy: 3 decimals
      conf: Math.round((data.confidence || 0) * 100) / 100, // confidence: 2 decimals
      patterns: data.patterns ? data.patterns.slice(0, 5) : [], // max 5 patterns
      timestamp: new Date().toISOString().split('T')[0] // date only
    }
  }

  private compressTechnicalIndicators(indicators: any): any {
    if (!indicators || typeof indicators !== 'object') return {}

    const compressed: any = {}

    // Keep only essential indicators with reduced precision
    const essentialIndicators = ['rsi', 'macd', 'sma20', 'volume', 'volatility']

    for (const key of essentialIndicators) {
      if (indicators[key] !== undefined) {
        compressed[key.slice(0, 3)] = Math.round((indicators[key] || 0) * 100) / 100
      }
    }

    return compressed
  }

  private compressSentimentData(sentiment: any): any {
    if (!sentiment) return {}

    return {
      s: Math.round(sentiment.score || 50), // score: integer
      c: Math.round((sentiment.confidence || 0) * 100) / 100, // confidence: 2 decimals
      src: sentiment.sources ? sentiment.sources.slice(0, 2) : [] // max 2 sources
    }
  }

  private truncateString(str: string, maxLength: number): string {
    if (!str) return ''
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }

  // Check if we should purge old data
  shouldPurgeData(recordCount: number): boolean {
    return this.config.enableDataPurging && recordCount > this.config.maxRecordsPerTable
  }

  // Generate purge criteria
  getPurgeCriteria(): { cutoffDate: string } {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays)

    return {
      cutoffDate: cutoffDate.toISOString()
    }
  }

  // Optimize query to reduce egress
  optimizeQuery(baseQuery: any): any {
    return baseQuery
      .select('user_id,trade_id,symbol,strategy_used,confidence_level,market_conditions,trade_outcome,created_at') // Select only needed fields
      .limit(this.config.batchSize) // Limit batch size
      .order('created_at', { ascending: false }) // Most recent first
  }

  // Estimate data size in MB
  estimateDataSize(data: any): number {
    const jsonString = JSON.stringify(data)
    const sizeInBytes = new Blob([jsonString]).size
    return sizeInBytes / (1024 * 1024) // Convert to MB
  }

  // Check if data exceeds size limits
  isWithinSizeLimits(data: any): boolean {
    const sizeMB = this.estimateDataSize(data)
    return sizeMB < 1 // Keep individual records under 1MB
  }
}

// Singleton instance
export const supabaseOptimizer = new SupabaseOptimizer()

// Database maintenance utilities
export class DatabaseMaintenance {
  static async purgeOldData(supabaseService: any, userId: string): Promise<void> {
    const { cutoffDate } = supabaseOptimizer.getPurgeCriteria()

    try {
      // Check if supabaseService and its client exist
      if (!supabaseService || !supabaseService.supabase) {
        console.warn('Supabase client not available, skipping data purge')
        return
      }

      console.log(`🧹 Purging data older than ${cutoffDate}`)

      const client = supabaseService.supabase

      // Purge old AI learning data
      await client
        .from('ai_learning_data')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate)

      // Purge old trade history (keep only recent trades)
      await client
        .from('trade_history')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate)

      // Purge old bot activity logs
      await client
        .from('bot_activity_logs')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', cutoffDate)

      console.log('✅ Data purge completed')

    } catch (error) {
      console.error('❌ Failed to purge old data:', error)
    }
  }

  static async getStorageStats(supabaseService: any, userId: string): Promise<{
    aiLearningRecords: number
    tradeHistoryRecords: number
    botActivityRecords: number
    estimatedSizeMB: number
  }> {
    try {
      // Check if supabaseService and its client exist
      if (!supabaseService || !supabaseService.supabase) {
        console.warn('Supabase client not available, returning empty stats')
        return {
          aiLearningRecords: 0,
          tradeHistoryRecords: 0,
          botActivityRecords: 0,
          estimatedSizeMB: 0
        }
      }

      const client = supabaseService.supabase

      const [aiData, tradeData, activityData] = await Promise.all([
        client
          .from('ai_learning_data')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),

        client
          .from('trade_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),

        client
          .from('bot_activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
      ])

      const aiRecords = aiData.count || 0
      const tradeRecords = tradeData.count || 0
      const activityRecords = activityData.count || 0

      // Estimate size (rough calculation)
      const estimatedSizeMB = (
        aiRecords * 0.002 + // ~2KB per AI learning record
        tradeRecords * 0.001 + // ~1KB per trade record
        activityRecords * 0.0005 // ~0.5KB per activity record
      )

      return {
        aiLearningRecords: aiRecords,
        tradeHistoryRecords: tradeRecords,
        botActivityRecords: activityRecords,
        estimatedSizeMB
      }

    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return {
        aiLearningRecords: 0,
        tradeHistoryRecords: 0,
        botActivityRecords: 0,
        estimatedSizeMB: 0
      }
    }
  }
}

// Connection pool optimization
export class ConnectionOptimizer {
  private static activeConnections = 0
  private static readonly MAX_CONNECTIONS = 50 // Leave buffer for other operations

  static async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.MAX_CONNECTIONS) {
      // Wait for a connection to free up
      await this.waitForConnection()
    }

    this.activeConnections++

    try {
      const result = await operation()
      return result
    } finally {
      this.activeConnections--
    }
  }

  private static async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.activeConnections < this.MAX_CONNECTIONS) {
          resolve()
        } else {
          setTimeout(checkConnection, 100)
        }
      }
      checkConnection()
    })
  }

  static getActiveConnections(): number {
    return this.activeConnections
  }
}