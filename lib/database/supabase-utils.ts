import { supabase, createServerSupabaseClient } from '../supabaseClient'
import { Database } from '../../types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

type Tables = Database['public']['Tables']
type TradeHistory = Tables['trade_history']['Row']
type BotMetrics = Tables['bot_metrics']['Row']
type BotActivityLog = Tables['bot_activity_logs']['Row']
type AILearningData = Tables['ai_learning_data']['Row']
type MarketSentiment = Tables['market_sentiment']['Row']
type Profile = Tables['profiles']['Row']

export class SupabaseService {
  private _client: SupabaseClient<Database> = supabase
  private serverClient?: SupabaseClient<Database>

  // Public getter for the supabase client
  get supabase(): SupabaseClient<Database> {
    return this._client
  }

  // Public getter for the client with proper access
  get client(): SupabaseClient<Database> {
    return this._client
  }

  private getServerClient(): SupabaseClient<Database> {
    if (!this.serverClient && typeof window === 'undefined') {
      this.serverClient = createServerSupabaseClient()
    }
    return this.serverClient || this._client
  }

  // Use service role client for admin operations
  getServiceClient(): SupabaseClient<Database> {
    return this.getServerClient()
  }

  async saveTradeHistory(trade: Tables['trade_history']['Insert']) {
    // Use server client for server-side operations to bypass RLS
    const client = this.getServerClient()
    const { data, error } = await client
      .from('trade_history')
      .insert(trade)
      .select()
      .single()

    if (error) throw error
    return data
  }


  async updateBotMetrics(userId: string, metrics: Tables['bot_metrics']['Update']) {
    // Use server client for server-side operations to bypass RLS
    const client = this.getServerClient()
    const { data, error } = await client
      .from('bot_metrics')
      .upsert({
        user_id: userId,
        ...metrics,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getBotMetrics(userId: string): Promise<BotMetrics | null> {
    const { data, error } = await this._client
      .from('bot_metrics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async logBotActivity(log: Tables['bot_activity_logs']['Insert']) {
    // Use server client for server-side operations to bypass RLS
    const client = this.getServerClient()
    const { data, error } = await client
      .from('bot_activity_logs')
      .insert(log)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getBotActivityLogs(userId: string, limit = 100): Promise<BotActivityLog[]> {
    const { data, error } = await this._client
      .from('bot_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async saveAILearningData(learning: Tables['ai_learning_data']['Insert']) {
    // Only allow on server-side to prevent RLS violations
    if (typeof window !== 'undefined') {
      throw new Error('saveAILearningData can only be called from server-side')
    }

    // Use server client for server-side operations to bypass RLS
    const client = this.getServerClient()
    const { data, error } = await client
      .from('ai_learning_data')
      .insert(learning)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAILearningData(userId: string, symbol?: string): Promise<AILearningData[]> {
    let query = this._client
      .from('ai_learning_data')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async saveMarketSentiment(sentiment: Tables['market_sentiment']['Insert']) {
    const { data, error } = await this._client
      .from('market_sentiment')
      .insert(sentiment)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getLatestMarketSentiment(symbol: string): Promise<MarketSentiment | null> {
    const { data, error } = await this._client
      .from('market_sentiment')
      .select('*')
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createOrUpdateProfile(profile: Tables['profiles']['Insert']) {
    const { data, error } = await this._client
      .from('profiles')
      .upsert(profile)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this._client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getPortfolioSummary(userId: string) {
    const { data: trades, error } = await this._client
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'FILLED')

    if (error) throw error

    const summary = trades?.reduce((acc, trade) => {
      const value = trade.side === 'buy' ? -trade.value : trade.value
      acc.totalInvested += trade.side === 'buy' ? trade.value : 0
      acc.totalPnL += trade.pnl || 0
      acc.totalFees += trade.fees || 0
      acc.totalTrades += 1

      if (trade.pnl && trade.pnl > 0) {
        acc.winningTrades += 1
      }

      return acc
    }, {
      totalInvested: 0,
      totalPnL: 0,
      totalFees: 0,
      totalTrades: 0,
      winningTrades: 0
    })

    return {
      ...summary,
      winRate: summary?.totalTrades > 0 ? (summary.winningTrades / summary.totalTrades) * 100 : 0
    }
  }

  async getPositions(userId: string) {
    try {
      const { data, error } = await this._client
        .from('trade_history')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'FILLED')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get positions:', error)
      return []
    }
  }

  async getTradeHistory(userId: string, limit: number = 100, since?: Date) {
    try {
      let query = this._client
        .from('trade_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (since) {
        query = query.gt('created_at', since.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get trade history:', error)
      return []
    }
  }

  async getAILearningData(userId: string) {
    try {
      const { data, error } = await this._client
        .from('ai_learning_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get AI learning data:', error)
      return []
    }
  }

  async getBotMetrics(userId: string) {
    try {
      const { data, error } = await this._client
        .from('bot_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get bot metrics:', error)
      return []
    }
  }

  // Missing methods that bot-control API needs
  async upsertBotMetrics(userId: string, metrics: Partial<Tables['bot_metrics']['Update']>) {
    try {
      // Only allow on server-side to prevent RLS violations
      if (typeof window !== 'undefined') {
        console.warn('⚠️ upsertBotMetrics called from client-side, skipping...')
        return null
      }

      // Use server client to bypass RLS for bot operations
      const client = this.getServerClient()

      const { data, error } = await client
        .from('bot_metrics')
        .upsert({
          user_id: userId,
          ...metrics,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()

      if (error) {
        console.warn('Failed to upsert bot metrics:', error)
        return null
      }
      return data?.[0] || null
    } catch (error) {
      console.warn('Error upserting bot metrics:', error)
      return null
    }
  }

  async logBotActivity(userId: string, activity: {
    type: string
    symbol?: string
    message: string
    status: string
    details?: string
  }) {
    try {
      // Use server client to bypass RLS for bot operations
      const client = this.getServerClient()

      let metadata = null
      if (activity.details) {
        try {
          metadata = JSON.parse(activity.details)
        } catch {
          // If JSON parsing fails, leave metadata as null
          metadata = null
        }
      }

      const { data, error } = await client
        .from('bot_activity_logs')
        .insert({
          user_id: userId,
          timestamp: new Date().toISOString(),
          type: activity.type,
          symbol: activity.symbol,
          message: activity.message,
          status: activity.status,
          details: activity.details,
          metadata: metadata
        })
        .select()

      if (error) {
        console.warn('Failed to log bot activity:', error)
        return null
      }
      return data?.[0] || null
    } catch (error) {
      console.warn('Error logging bot activity:', error)
      return null
    }
  }

  async saveTrade(userId: string, trade: {
    symbol: string
    side: string
    quantity: number
    price: number
    value: number
    timestamp: string
    status: string
    order_id?: string
    ai_confidence?: number
  }) {
    try {
      // Use server client to bypass RLS for bot operations
      const client = this.getServerClient()

      const { data, error } = await client
        .from('trade_history')
        .insert({
          user_id: userId,
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          value: trade.value,
          timestamp: trade.timestamp,
          status: trade.status,
          order_id: trade.order_id,
          ai_confidence: trade.ai_confidence
        })
        .select()

      if (error) {
        console.warn('Failed to save trade:', error)
        return null
      }
      return data?.[0] || null
    } catch (error) {
      console.warn('Error saving trade:', error)
      return null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this._client
        .from('profiles')
        .select('count(*)')
        .limit(1)

      return !error
    } catch (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
  }
}

export const supabaseService = new SupabaseService()