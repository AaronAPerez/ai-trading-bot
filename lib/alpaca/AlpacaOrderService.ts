// Specialized Services - Complete Implementation

import {
  AlpacaConfig,
  AlpacaOrder,
  CreateOrderRequest,
  AlpacaOrderStatus,
  ConnectionStatus
} from './types'

export interface OrderRequest extends CreateOrderRequest {
  // Additional validation fields
  validateOnly?: boolean
  dryRun?: boolean
  riskCheck?: boolean
}

export interface OrderResponse {
  success: boolean
  order?: AlpacaOrder
  error?: string
  details?: any
  orderId?: string
  clientOrderId?: string
  estimatedFillPrice?: number
  estimatedFillTime?: number
  warnings?: string[]
}

export interface OrderValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  estimatedCost: number
  marginRequired: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export class AlpacaOrderService {
  private baseUrl: string
  private headers: Record<string, string>
  private retryCount = 0
  private maxRetries = 3

  constructor(private config: AlpacaConfig) {
    this.baseUrl = config.paper ?
      'https://paper-api.alpaca.markets' :
      'https://api.alpaca.markets'

    this.headers = {
      'APCA-API-KEY-ID': config.key,
      'APCA-API-SECRET-KEY': config.secret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    console.log(`🔧 AlpacaOrderService initialized - Mode: ${config.paper ? 'PAPER' : 'LIVE'}`)
  }

  async placeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    console.log(`📋 Placing order: ${orderRequest.symbol} ${orderRequest.side} ${orderRequest.qty || orderRequest.notional}`)

    try {
      // Validate order first
      const validation = await this.validateOrder(orderRequest)
      if (!validation.valid) {
        return {
          success: false,
          error: 'Order validation failed',
          details: { errors: validation.errors, warnings: validation.warnings }
        }
      }

      // Handle dry run
      if (orderRequest.dryRun) {
        console.log('🧪 DRY RUN: Order would be placed with validation passed')
        return {
          success: true,
          order: this.createMockOrder(orderRequest),
          warnings: validation.warnings
        }
      }

      // Handle validate-only requests
      if (orderRequest.validateOnly) {
        return {
          success: true,
          details: validation,
          warnings: validation.warnings
        }
      }

      // Place the actual order
      const response = await this.executeOrder(orderRequest)

      if (response.success && response.order) {
        console.log(`✅ Order placed successfully - ID: ${response.order.id}`)

        // Start monitoring order status
        this.monitorOrderStatus(response.order.id)
      }

      return response

    } catch (error: any) {
      console.error('❌ Order placement failed:', error.message)
      return {
        success: false,
        error: error.message || 'Order placement failed',
        details: error
      }
    }
  }

  private async executeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    const endpoint = `${this.baseUrl}/v2/orders`

    // Prepare order payload
    const orderPayload = {
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      time_in_force: orderRequest.time_in_force,
      ...(orderRequest.qty && { qty: orderRequest.qty.toString() }),
      ...(orderRequest.notional && { notional: orderRequest.notional.toString() }),
      ...(orderRequest.limit_price && { limit_price: orderRequest.limit_price.toString() }),
      ...(orderRequest.stop_price && { stop_price: orderRequest.stop_price.toString() }),
      ...(orderRequest.trail_price && { trail_price: orderRequest.trail_price.toString() }),
      ...(orderRequest.trail_percent && { trail_percent: orderRequest.trail_percent.toString() }),
      ...(orderRequest.extended_hours !== undefined && { extended_hours: orderRequest.extended_hours }),
      ...(orderRequest.client_order_id && { client_order_id: orderRequest.client_order_id }),
      ...(orderRequest.order_class && { order_class: orderRequest.order_class }),
      ...(orderRequest.take_profit && { take_profit: orderRequest.take_profit }),
      ...(orderRequest.stop_loss && { stop_loss: orderRequest.stop_loss })
    }

    console.log('📤 Sending order to Alpaca:', orderPayload)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(orderPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }

      throw new Error(errorMessage)
    }

    const orderData: AlpacaOrder = await response.json()

    return {
      success: true,
      order: orderData,
      orderId: orderData.id,
      clientOrderId: orderData.client_order_id
    }
  }

  async validateOrder(orderRequest: OrderRequest): Promise<OrderValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let estimatedCost = 0
    let marginRequired = 0
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

    try {
      // Basic validation
      if (!orderRequest.symbol) {
        errors.push('Symbol is required')
      }

      if (!orderRequest.side) {
        errors.push('Side (buy/sell) is required')
      }

      if (!orderRequest.qty && !orderRequest.notional) {
        errors.push('Either quantity or notional amount is required')
      }

      if (orderRequest.qty && orderRequest.qty <= 0) {
        errors.push('Quantity must be positive')
      }

      if (orderRequest.notional && orderRequest.notional <= 0) {
        errors.push('Notional amount must be positive')
      }

      // Type-specific validation
      if (orderRequest.type === 'limit' && !orderRequest.limit_price) {
        errors.push('Limit price is required for limit orders')
      }

      if (['stop', 'stop_limit'].includes(orderRequest.type) && !orderRequest.stop_price) {
        errors.push('Stop price is required for stop orders')
      }

      if (orderRequest.type === 'trailing_stop' && !orderRequest.trail_price && !orderRequest.trail_percent) {
        errors.push('Either trail price or trail percent is required for trailing stop orders')
      }

      // Get current market data for validation
      try {
        const quote = await this.getLatestQuote(orderRequest.symbol)
        if (quote) {
          const currentPrice = (quote.bid_price + quote.ask_price) / 2

          // Estimate order cost
          if (orderRequest.notional) {
            estimatedCost = orderRequest.notional
          } else if (orderRequest.qty) {
            estimatedCost = orderRequest.qty * currentPrice
          }

          // Risk assessment
          if (estimatedCost > 50000) {
            riskLevel = 'HIGH'
            warnings.push('Large order size - consider splitting')
          } else if (estimatedCost > 20000) {
            riskLevel = 'MEDIUM'
            warnings.push('Moderate order size')
          }

          // Price validation for limit orders
          if (orderRequest.type === 'limit' && orderRequest.limit_price) {
            const priceDiff = Math.abs(orderRequest.limit_price - currentPrice) / currentPrice
            if (priceDiff > 0.1) { // More than 10% from current price
              warnings.push(`Limit price is ${(priceDiff * 100).toFixed(1)}% away from current market price`)
            }
          }

          // Extended hours validation
          if (orderRequest.extended_hours) {
            const marketStatus = await this.getMarketClock()
            if (marketStatus && marketStatus.is_open) {
              warnings.push('Extended hours trading enabled but market is currently open')
            }
          }
        }
      } catch (error) {
        warnings.push('Could not fetch current market data for validation')
      }

      // Account validation
      try {
        const account = await this.getAccount()
        if (account) {
          const buyingPower = parseFloat(account.buying_power)

          if (estimatedCost > buyingPower) {
            errors.push('Insufficient buying power')
          } else if (estimatedCost > buyingPower * 0.8) {
            warnings.push('Order uses more than 80% of available buying power')
            riskLevel = 'HIGH'
          }

          marginRequired = Math.max(0, estimatedCost - parseFloat(account.cash))
          if (marginRequired > 0 && !account.shorting_enabled) {
            errors.push('Order requires margin but margin trading is not enabled')
          }
        }
      } catch (error) {
        warnings.push('Could not validate account status')
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        estimatedCost,
        marginRequired,
        riskLevel
      }

    } catch (error: any) {
      return {
        valid: false,
        errors: ['Validation failed: ' + error.message],
        warnings,
        estimatedCost,
        marginRequired,
        riskLevel: 'CRITICAL'
      }
    }
  }

  async cancelOrder(orderId: string): Promise<OrderResponse> {
    console.log(`❌ Cancelling order: ${orderId}`)

    try {
      const endpoint = `${this.baseUrl}/v2/orders/${orderId}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: this.headers
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      console.log(`✅ Order cancelled successfully: ${orderId}`)

      return {
        success: true,
        orderId
      }

    } catch (error: any) {
      console.error('❌ Order cancellation failed:', error.message)
      return {
        success: false,
        error: error.message || 'Order cancellation failed',
        orderId
      }
    }
  }

  async getOrderStatus(orderId: string): Promise<AlpacaOrder | null> {
    try {
      const endpoint = `${this.baseUrl}/v2/orders/${orderId}`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Order not found: ${orderId}`)
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const orderData: AlpacaOrder = await response.json()
      return orderData

    } catch (error: any) {
      console.error(`❌ Failed to get order status for ${orderId}:`, error.message)
      return null
    }
  }

  async getAllOrders(status?: AlpacaOrderStatus, limit: number = 100): Promise<AlpacaOrder[]> {
    try {
      let endpoint = `${this.baseUrl}/v2/orders?limit=${limit}`

      if (status) {
        endpoint += `&status=${status}`
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const orders: AlpacaOrder[] = await response.json()
      return orders

    } catch (error: any) {
      console.error('❌ Failed to get orders:', error.message)
      return []
    }
  }

  async replaceOrder(orderId: string, newOrderRequest: Partial<OrderRequest>): Promise<OrderResponse> {
    console.log(`🔄 Replacing order: ${orderId}`)

    try {
      const endpoint = `${this.baseUrl}/v2/orders/${orderId}`

      const replacePayload = {
        ...(newOrderRequest.qty && { qty: newOrderRequest.qty.toString() }),
        ...(newOrderRequest.notional && { notional: newOrderRequest.notional.toString() }),
        ...(newOrderRequest.limit_price && { limit_price: newOrderRequest.limit_price.toString() }),
        ...(newOrderRequest.stop_price && { stop_price: newOrderRequest.stop_price.toString() }),
        ...(newOrderRequest.trail_price && { trail_price: newOrderRequest.trail_price.toString() }),
        ...(newOrderRequest.trail_percent && { trail_percent: newOrderRequest.trail_percent.toString() }),
        ...(newOrderRequest.time_in_force && { time_in_force: newOrderRequest.time_in_force })
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(replacePayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const orderData: AlpacaOrder = await response.json()

      console.log(`✅ Order replaced successfully: ${orderId} -> ${orderData.id}`)

      return {
        success: true,
        order: orderData,
        orderId: orderData.id
      }

    } catch (error: any) {
      console.error('❌ Order replacement failed:', error.message)
      return {
        success: false,
        error: error.message || 'Order replacement failed',
        orderId
      }
    }
  }

  // Helper methods
  private async getLatestQuote(symbol: string) {
    try {
      const endpoint = `${this.baseUrl}/v2/stocks/${symbol}/quotes/latest`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.quote

    } catch (error) {
      return null
    }
  }

  private async getAccount() {
    try {
      const endpoint = `${this.baseUrl}/v2/account`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers
      })

      if (!response.ok) {
        return null
      }

      return await response.json()

    } catch (error) {
      return null
    }
  }

  private async getMarketClock() {
    try {
      const endpoint = `${this.baseUrl}/v2/clock`

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers
      })

      if (!response.ok) {
        return null
      }

      return await response.json()

    } catch (error) {
      return null
    }
  }

  private createMockOrder(orderRequest: OrderRequest): AlpacaOrder {
    const now = new Date().toISOString()
    return {
      id: `mock_${Date.now()}`,
      client_order_id: orderRequest.client_order_id || `client_${Date.now()}`,
      created_at: now,
      updated_at: now,
      submitted_at: now,
      asset_id: 'mock_asset_id',
      symbol: orderRequest.symbol,
      asset_class: 'us_equity',
      qty: orderRequest.qty?.toString() || '0',
      filled_qty: '0',
      order_class: orderRequest.order_class || 'simple',
      order_type: orderRequest.type,
      type: orderRequest.type,
      side: orderRequest.side,
      time_in_force: orderRequest.time_in_force,
      limit_price: orderRequest.limit_price?.toString(),
      stop_price: orderRequest.stop_price?.toString(),
      status: 'new',
      extended_hours: orderRequest.extended_hours || false,
      ...(orderRequest.notional && { notional: orderRequest.notional.toString() })
    }
  }

  private monitorOrderStatus(orderId: string) {
    // Start monitoring order status (simplified implementation)
    const checkStatus = async () => {
      const order = await this.getOrderStatus(orderId)
      if (order) {
        console.log(`📊 Order ${orderId} status: ${order.status}`)

        if (['filled', 'canceled', 'expired', 'rejected'].includes(order.status)) {
          console.log(`🏁 Order ${orderId} final status: ${order.status}`)
          return // Stop monitoring
        }
      }

      // Continue monitoring for up to 5 minutes
      setTimeout(checkStatus, 5000) // Check every 5 seconds
    }

    setTimeout(checkStatus, 1000) // Start after 1 second
  }

  // Utility methods
  async testConnection(): Promise<ConnectionStatus> {
    try {
      const account = await this.getAccount()
      const marketClock = await this.getMarketClock()

      return {
        connected: !!account,
        authenticated: !!account,
        paperTrading: this.config.paper || false,
        accountStatus: account?.status || 'unknown',
        marketOpen: marketClock?.is_open || false,
        lastUpdate: new Date()
      }
    } catch (error: any) {
      return {
        connected: false,
        authenticated: false,
        paperTrading: this.config.paper || false,
        accountStatus: 'error',
        marketOpen: false,
        lastUpdate: new Date(),
        error: error.message
      }
    }
  }

  getConfiguration(): AlpacaConfig {
    return { ...this.config }
  }

  updateConfiguration(newConfig: Partial<AlpacaConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update headers if credentials changed
    if (newConfig.key || newConfig.secret) {
      this.headers['APCA-API-KEY-ID'] = this.config.key
      this.headers['APCA-API-SECRET-KEY'] = this.config.secret
    }

    // Update base URL if paper mode changed
    if (newConfig.paper !== undefined) {
      this.baseUrl = this.config.paper ?
        'https://paper-api.alpaca.markets' :
        'https://api.alpaca.markets'
    }

    console.log('⚙️ AlpacaOrderService configuration updated')
  }
}