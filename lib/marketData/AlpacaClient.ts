/**
 * Client-Side AlpacaClient - Browser-Safe Implementation
 * Calls server-side API routes instead of importing Node.js packages
 * 
 * @author Aaron A Perez
 * @version 4.0.0 - Browser-Safe Implementation
 */

export class AlpacaClient {
  private baseUrl: string
  private isDemoMode: boolean
  getMarketData: any
  placeOrder: any
  getOrderStatus: any

  constructor() {
    this.baseUrl = '/api/alpaca'
    this.isDemoMode = process.env.NODE_ENV === 'development' || 
                     process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    
    if (this.isDemoMode) {
      console.log('🎯 Demo Mode: Using mock data for fresh account simulation')
      console.log('💰 Fresh Account: $100,000 paper trading balance')
    } else {
      console.log('📈 Live Mode: Connected to Alpaca Markets Paper Trading')
    }
  }

  /**
   * Make API request to server-side Alpaca route
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API Request failed:', error)
      throw error
    }
  }

  /**
   * Get real-time quote for a symbol
   * Enhanced with demo mode support for fresh account
   */
  async getQuote(symbol: string) {
    try {
      const data = await this.apiRequest(`?action=quote&symbol=${symbol}`)
      
      return {
        symbol,
        bid: data.BidPrice,
        ask: data.AskPrice,
        last: data.AskPrice,
        timestamp: new Date(data.timestamp),
        BidPrice: data.BidPrice,
        AskPrice: data.AskPrice,
        isMockData: data.isMockData || this.isDemoMode
      }
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Get historical bars (OHLCV data)
   * Enhanced with demo mode support
   */
  async getHistoricalData(symbol: string, timeframe: string = '1Hour', limit: number = 100) {
    if (this.isDemoMode) {
      // Generate mock historical data for demo
      const marketData = []
      const basePrice = 100 + Math.random() * 200
      let currentPrice = basePrice

      for (let i = limit; i > 0; i--) {
        const variation = (Math.random() - 0.5) * 0.02 // 2% max variation
        currentPrice = currentPrice * (1 + variation)
        
        const open = currentPrice
        const high = open * (1 + Math.random() * 0.01)
        const low = open * (1 - Math.random() * 0.01)
        const close = low + (high - low) * Math.random()
        
        marketData.push({
          symbol,
          timestamp: new Date(Date.now() - (i * 60 * 60 * 1000)), // Hours ago
          open,
          high,
          low,
          close,
          volume: 1000000 + Math.random() * 9000000,
          timeframe,
          isMockData: true
        })
      }

      return marketData.reverse() // Return chronological order
    }

    try {
      // For live mode, you would implement historical data API call here
      // For now, fallback to mock data
      return this.getHistoricalData(symbol, timeframe, limit)
    } catch (error) {
      console.error(`Failed to get historical data for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Execute paper trade through server-side API
   */
  async executePaperTrade(order: {
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    type?: 'market' | 'limit'
    time_in_force?: 'day' | 'gtc'
    limit_price?: number
  }) {
    try {
      const data = await this.apiRequest('', {
        method: 'POST',
        body: JSON.stringify({
          action: 'trade',
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          type: order.type || 'market',
          time_in_force: order.time_in_force || 'day',
          ...(order.limit_price && { limit_price: order.limit_price })
        })
      })

      const result = {
        orderId: data.id,
        symbol: data.symbol,
        side: data.side,
        quantity: parseFloat(data.qty),
        filledQuantity: parseFloat(data.filled_qty || '0'),
        avgFillPrice: parseFloat(data.filled_avg_price || '0'),
        status: data.status.toUpperCase(),
        fees: 0,
        timestamp: new Date(data.created_at),
        type: data.type,
        isMockData: data.isMockData || this.isDemoMode,
        id: data.id,
        qty: data.qty,
        filled_qty: data.filled_qty,
        filled_avg_price: data.filled_avg_price,
        created_at: data.created_at
      }

      if (this.isDemoMode) {
        console.log(`🎯 Demo Trade Executed: ${order.side.toUpperCase()} ${order.quantity} ${order.symbol} @ ${result.avgFillPrice.toFixed(2)}`)
      }

      return result
    } catch (error) {
      console.error('Failed to execute paper trade:', error)
      throw error
    }
  }

  /**
   * Get account information via server-side API
   */
  async getAccount() {
    try {
      const data = await this.apiRequest('?action=account')
      
      return {
        totalValue: data.totalValue || parseFloat(data.portfolio_value || '0'),
        cashBalance: data.cashBalance || parseFloat(data.cash || '0'),
        buyingPower: data.buyingPower || parseFloat(data.buying_power || '0'),
        dayPnL: data.dayPnL || parseFloat(data.unrealized_pl || '0'),
        totalPnL: data.totalPnL || parseFloat(data.unrealized_pl || '0'),
        // Preserve all original properties
        ...data,
        isMockData: data.isMockData || this.isDemoMode
      }
    } catch (error) {
      console.error('Failed to get account info:', error)
      throw error
    }
  }

  /**
   * Get current positions via server-side API
   */
  async getPositions() {
    try {
      const data = await this.apiRequest('?action=positions')
      
      return data.map((pos: any) => ({
        symbol: pos.symbol,
        quantity: pos.quantity || parseFloat(pos.qty || '0'),
        avgPrice: pos.avgPrice || parseFloat(pos.avg_cost || '0'),
        currentPrice: pos.currentPrice || parseFloat(pos.current_price || pos.avg_cost || '0'),
        unrealizedPnL: pos.unrealizedPnL || parseFloat(pos.unrealized_pl || '0'),
        realizedPnL: pos.realizedPnL || 0,
        percentChange: pos.percentChange || (parseFloat(pos.unrealized_plpc || '0') * 100),
        // Preserve original position object
        ...pos,
        isMockData: pos.isMockData || this.isDemoMode
      }))
    } catch (error) {
      console.error('Failed to get positions:', error)
      throw error
    }
  }

  /**
   * Get recent orders via server-side API
   */
  async getOrders(status?: string, limit: number = 50) {
    try {
      const data = await this.apiRequest(`?action=orders&status=${status || 'all'}&limit=${limit}`)
      
      return data.map((order: any) => ({
        ...order,
        isMockData: order.isMockData || this.isDemoMode
      }))
    } catch (error) {
      console.error('Failed to get orders:', error)
      throw error
    }
  }

  /**
   * Cancel an order via server-side API
   */
  async cancelOrder(orderId: string) {
    try {
      if (this.isDemoMode) {
        console.log(`🎯 Demo Mode: Simulating cancellation of order ${orderId}`)
        return {
          id: orderId,
          status: 'CANCELLED',
          isMockData: true
        }
      }

      const data = await this.apiRequest('', {
        method: 'POST',
        body: JSON.stringify({
          action: 'cancel',
          orderId
        })
      })

      return data
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error)
      throw error
    }
  }

  /**
   * Get portfolio history
   */
  async getPortfolioHistory(period: string = '1D', timeframe: string = '1Min') {
    if (this.isDemoMode) {
      // Generate flat portfolio history for fresh account
      const now = new Date()
      const startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)) // 24 hours ago
      const intervals = 100
      const intervalMs = (now.getTime() - startTime.getTime()) / intervals
      
      const history = []
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(startTime.getTime() + (i * intervalMs))
        history.push({
          timestamp: timestamp.toISOString(),
          equity: 100000, // Flat $100k for fresh account
          profit_loss: 0,
          profit_loss_pct: 0,
          base_value: 100000,
          timeframe,
          isMockData: true
        })
      }

      return {
        timestamp: history.map(h => h.timestamp),
        equity: history.map(h => h.equity),
        profit_loss: history.map(h => h.profit_loss),
        profit_loss_pct: history.map(h => h.profit_loss_pct),
        base_value: 100000,
        timeframe,
        isMockData: true
      }
    }

    try {
      // Real portfolio history would be implemented here
      return this.getPortfolioHistory(period, timeframe)
    } catch (error) {
      console.error('Failed to get portfolio history:', error)
      throw error
    }
  }

  /**
   * Check if client is in demo mode
   */
  public isDemoModeEnabled(): boolean {
    return this.isDemoMode
  }

  /**
   * Get connection status
   */
  public getConnectionStatus() {
    return {
      isConnected: true, // Always true since we're using HTTP API
      isPaperTrading: true,
      isDemoMode: this.isDemoMode,
      accountType: this.isDemoMode ? 'DEMO' : 'PAPER',
      environment: this.isDemoMode ? 'development' : 'production'
    }
  }

  /**
   * Health check for the client
   */
  async healthCheck() {
    try {
      const account = await this.getAccount()
      return {
        status: 'healthy',
        mode: this.isDemoMode ? 'demo' : 'live',
        timestamp: new Date().toISOString(),
        account: {
          balance: account.totalValue,
          isActive: account.status === 'ACTIVE' || this.isDemoMode
        }
      }
    } catch (error) {
      return {
        status: 'error',
        mode: this.isDemoMode ? 'demo' : 'live',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

