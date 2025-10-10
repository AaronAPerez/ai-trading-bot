// Alpaca Client (Data Access)
// src/lib/alpaca/AlpacaClient.ts
// ================================

import { AlpacaOrderService, OrderRequest } from "./AlpacaOrderService"
import { AlpacaConfig } from "./client"

export class AlpacaClient {
  private config: AlpacaConfig
  private orderService: AlpacaOrderService

  constructor(config?: AlpacaConfig) {
    this.config = config || {
      keyId: process.env.APCA_API_KEY_ID || '',
      secretKey: process.env.APCA_API_SECRET_KEY || '',
      paper: true,
      baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
    }
    this.orderService = new AlpacaOrderService(this.config)
  }

  // Account methods
  async getAccount() {
    const response = await fetch(`${this.config.baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': this.config.keyId,
        'APCA-API-SECRET-KEY': this.config.secretKey
      }
    })
    if (!response.ok) throw new Error('Failed to fetch account')
    return await response.json()
  }

  // Positions methods
  async getPositions() {
    const response = await fetch(`${this.config.baseUrl}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': this.config.keyId,
        'APCA-API-SECRET-KEY': this.config.secretKey
      }
    })
    if (!response.ok) throw new Error('Failed to fetch positions')
    return await response.json()
  }

  // Market data methods
  async getLatestQuotes(symbols: string[]) {
    const quotes: Record<string, any> = {}

    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `${this.config.baseUrl.replace('paper-api', 'data')}/v2/stocks/${symbol}/quotes/latest`,
          {
            headers: {
              'APCA-API-KEY-ID': this.config.keyId,
              'APCA-API-SECRET-KEY': this.config.secretKey
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          quotes[symbol] = {
            bidPrice: data.quote?.bp || 0,
            askPrice: data.quote?.ap || 0,
            bidSize: data.quote?.bs || 0,
            askSize: data.quote?.as || 0
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch quote for ${symbol}:`, error)
      }
    }

    return quotes
  }

  async getBars(symbol: string, timeframe: string, limit: number) {
    const response = await fetch(
      `${this.config.baseUrl.replace('paper-api', 'data')}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`,
      {
        headers: {
          'APCA-API-KEY-ID': this.config.keyId,
          'APCA-API-SECRET-KEY': this.config.secretKey
        }
      }
    )

    if (!response.ok) throw new Error('Failed to fetch bars')
    return await response.json()
  }

  async getHistoricalData(symbol: string, timeframe: string, limit: number) {
    return await this.getBars(symbol, timeframe, limit)
  }

  // Order methods
  async placeOrder(order: OrderRequest) {
    return this.orderService.placeOrder(order)
  }

  async getMarketData(symbol: string) {
    try {
      const response = await fetch(
        `${this.config.baseUrl.replace('paper-api', 'data')}/v2/stocks/${symbol}/snapshot`,
        {
          headers: {
            'APCA-API-KEY-ID': this.config.keyId,
            'APCA-API-SECRET-KEY': this.config.secretKey
          }
        }
      )

      if (!response.ok) throw new Error('Failed to fetch market data')
      return await response.json()
    } catch (error) {
      console.warn(`Failed to fetch market data for ${symbol}:`, error)
      throw error
    }
  }
}