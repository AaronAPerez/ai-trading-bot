/**
 * Alpaca Client - Market Data Integration
 * ALWAYS uses real Alpaca API data
 * Fallback data only used in demo mode when API is unavailable
 */

import { DemoModeService } from '@/lib/services/DemoModeService'

export class AlpacaClient {
  private baseUrl: string
  private demoMode: DemoModeService

  constructor() {
    this.baseUrl = '/api/alpaca'
    this.demoMode = DemoModeService.getInstance()
  }

  /**
   * Get real-time quote - ALWAYS uses Alpaca API
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
        AskPrice: data.AskPrice
      }
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error)

      // Only in demo mode, return fallback data using centralized service
      if (this.demoMode.shouldUseFallback(error)) {
        return this.demoMode.getFallbackQuote(symbol)
      }
      throw error
    }
  }

  /**
   * Get account information from Alpaca
   */
  async getAccount() {
    try {
      return await this.apiRequest('?action=account')
    } catch (error) {
      console.error('Failed to get account:', error)
      throw error
    }
  }

  /**
   * Get positions from Alpaca
   */
  async getPositions() {
    try {
      return await this.apiRequest('?action=positions')
    } catch (error) {
      console.error('Failed to get positions:', error)
      throw error
    }
  }

  /**
   * Get orders from Alpaca
   */
  async getOrders(params?: { status?: string; limit?: number }) {
    try {
      const queryParams = new URLSearchParams({
        action: 'orders',
        ...(params?.status && { status: params.status }),
        ...(params?.limit && { limit: params.limit.toString() })
      })
      return await this.apiRequest(`?${queryParams.toString()}`)
    } catch (error) {
      console.error('Failed to get orders:', error)
      throw error
    }
  }

  /**
   * Get historical bars (candles) from Alpaca
   */
  async getBars(symbol: string, timeframe: string = '1Hour', limit: number = 100) {
    try {
      const queryParams = new URLSearchParams({
        action: 'bars',
        symbol,
        timeframe,
        limit: limit.toString()
      })
      return await this.apiRequest(`?${queryParams.toString()}`)
    } catch (error) {
      console.error(`Failed to get bars for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Place order with Alpaca
   */
  async placeOrder(params: {
    symbol: string
    qty: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
    limit_price?: number
    stop_price?: number
  }) {
    try {
      return await this.apiRequest('', {
        method: 'POST',
        body: JSON.stringify({ action: 'order', ...params })
      })
    } catch (error) {
      console.error('Failed to place order:', error)
      throw error
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string) {
    try {
      return await this.apiRequest('', {
        method: 'DELETE',
        body: JSON.stringify({ action: 'cancel_order', order_id: orderId })
      })
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error)
      throw error
    }
  }

  /**
   * Get market clock
   */
  async getClock() {
    try {
      return await this.apiRequest('?action=clock')
    } catch (error) {
      console.error('Failed to get market clock:', error)
      throw error
    }
  }

  /**
   * Internal API request method
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return response.json()
  }
}