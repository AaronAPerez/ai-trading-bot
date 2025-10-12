import alpaca from '../alpaca'
import { SignalResult } from './SignalEngine'
import { RiskCheck } from './RiskEngine'
import { AlpacaOrderService, OrderRequest, OrderResponse } from '../alpaca/AlpacaOrderService'
import { OrderType, TimeInForce } from '@/types/trading'

export interface ExecutionContext {
  userId: string
  mode?: 'paper' | 'live'
  orderType?: OrderType
  timeInForce?: TimeInForce
  positionSize?: number
  useNotional?: boolean
  notionalAmount?: number
  dryRun?: boolean
  extendedHours?: boolean
  stopLoss?: boolean
  takeProfit?: boolean
}

export interface ExecutionResult {
  success: boolean
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  orderId?: string
  price?: number
  quantity?: number
  notional?: number
  broker: string
  mode: 'paper' | 'live'
  timestamp: Date
  latencyMs: number
  slippage?: number
  error?: string
  orderStatus?: string
  metadata: {
    signal: SignalResult
    riskCheck: RiskCheck
    orderResponse?: OrderResponse
    estimatedCost: number
    [key: string]: any
  }
}

export class ExecutionRouter {
  private alpacaOrderService: AlpacaOrderService
  private mode: 'paper' | 'live'

  constructor(mode: 'paper' | 'live' = 'paper') {
    this.mode = mode
    this.alpacaOrderService = new AlpacaOrderService({
      key: process.env.APCA_API_KEY_ID!,
      secret: process.env.APCA_API_SECRET_KEY!,
      paper: mode === 'paper'
    })
  }

  async execute(
    signal: SignalResult,
    riskCheck: RiskCheck,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      // Validate execution context
      if (!riskCheck.approved) {
        return this.createFailureResult(
          signal,
          riskCheck,
          'Risk check not approved',
          startTime
        )
      }

      if (signal.action === 'HOLD') {
        return this.createHoldResult(signal, riskCheck, startTime)
      }

      const mode = context.mode || this.mode

      // Determine order parameters
      const orderType = context.orderType || 'market'
      const timeInForce = context.timeInForce || 'gtc'

      // Calculate quantity or notional
      let quantity: number | undefined
      let notional: number | undefined

      if (context.useNotional && context.notionalAmount) {
        notional = context.notionalAmount
      } else if (context.positionSize) {
        quantity = context.positionSize
      } else {
        // Calculate based on risk metrics
        const estimatedSize = riskCheck.metrics.availableBuyingPower * 0.1 // Use 10% of buying power
        notional = estimatedSize
      }

      // Create order request
      const orderRequest: OrderRequest = {
        symbol: signal.symbol,
        side: signal.action.toLowerCase() as 'buy' | 'sell',
        type: orderType,
        time_in_force: timeInForce,
        ...(quantity && { qty: quantity }),
        ...(notional && { notional: notional }),
        ...(context.extendedHours !== undefined && { extended_hours: context.extendedHours }),
        ...(context.dryRun !== undefined && { dryRun: context.dryRun })
      }

      // Add stop loss and take profit if configured
      if (context.stopLoss && signal.stopLoss > 0) {
        orderRequest.order_class = 'bracket'
        orderRequest.stop_loss = {
          stop_price: signal.stopLoss
        }
      }

      if (context.takeProfit && signal.takeProfit > 0) {
        if (!orderRequest.order_class) {
          orderRequest.order_class = 'bracket'
        }
        orderRequest.take_profit = {
          limit_price: signal.takeProfit
        }
      }

      // Execute order through Alpaca
      const orderResponse = await this.alpacaOrderService.placeOrder(orderRequest)

      const latencyMs = Date.now() - startTime

      if (orderResponse.success && orderResponse.order) {
        return {
          success: true,
          symbol: signal.symbol,
          action: signal.action,
          orderId: orderResponse.order.id,
          price: orderResponse.order.filled_avg_price
            ? parseFloat(orderResponse.order.filled_avg_price)
            : undefined,
          quantity: quantity || (orderResponse.order.qty ? parseFloat(orderResponse.order.qty) : undefined),
          notional,
          broker: 'alpaca',
          mode,
          timestamp: new Date(),
          latencyMs,
          orderStatus: orderResponse.order.status,
          metadata: {
            signal,
            riskCheck,
            orderResponse,
            estimatedCost: notional || (quantity && signal.metadata?.currentPrice
              ? quantity * signal.metadata.currentPrice
              : 0),
            orderType,
            timeInForce
          }
        }
      } else {
        return this.createFailureResult(
          signal,
          riskCheck,
          orderResponse.error || 'Order execution failed',
          startTime,
          orderResponse
        )
      }

    } catch (error: any) {
      console.error('❌ Execution failed:', error)
      return this.createFailureResult(
        signal,
        riskCheck,
        `Execution error: ${error.message}`,
        startTime
      )
    }
  }

  private createFailureResult(
    signal: SignalResult,
    riskCheck: RiskCheck,
    error: string,
    startTime: number,
    orderResponse?: OrderResponse
  ): ExecutionResult {
    return {
      success: false,
      symbol: signal.symbol,
      action: signal.action,
      broker: 'alpaca',
      mode: this.mode,
      timestamp: new Date(),
      latencyMs: Date.now() - startTime,
      error,
      metadata: {
        signal,
        riskCheck,
        orderResponse,
        estimatedCost: 0
      }
    }
  }

  private createHoldResult(
    signal: SignalResult,
    riskCheck: RiskCheck,
    startTime: number
  ): ExecutionResult {
    return {
      success: true,
      symbol: signal.symbol,
      action: 'HOLD',
      broker: 'alpaca',
      mode: this.mode,
      timestamp: new Date(),
      latencyMs: Date.now() - startTime,
      orderStatus: 'hold',
      metadata: {
        signal,
        riskCheck,
        estimatedCost: 0
      }
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.alpacaOrderService.cancelOrder(orderId)
      return {
        success: result.success,
        error: result.error
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string) {
    try {
      return await this.alpacaOrderService.getOrderStatus(orderId)
    } catch (error: any) {
      console.error('Failed to get order status:', error)
      return null
    }
  }

  /**
   * Replace/modify an existing order
   */
  async replaceOrder(orderId: string, newParams: Partial<OrderRequest>) {
    try {
      return await this.alpacaOrderService.replaceOrder(orderId, newParams)
    } catch (error: any) {
      console.error('Failed to replace order:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Test connection to broker
   */
  async testConnection() {
    try {
      return await this.alpacaOrderService.testConnection()
    } catch (error: any) {
      console.error('Connection test failed:', error)
      return {
        connected: false,
        authenticated: false,
        paperTrading: this.mode === 'paper',
        accountStatus: 'error',
        marketOpen: false,
        lastUpdate: new Date(),
        error: error.message
      }
    }
  }

  /**
   * Get current execution mode
   */
  getMode(): 'paper' | 'live' {
    return this.mode
  }

  /**
   * Switch execution mode
   */
  setMode(mode: 'paper' | 'live'): void {
    this.mode = mode
    this.alpacaOrderService = new AlpacaOrderService({
      key: process.env.APCA_API_KEY_ID!,
      secret: process.env.APCA_API_SECRET_KEY!,
      paper: mode === 'paper'
    })
    console.log(`🔄 Execution mode switched to: ${mode.toUpperCase()}`)
  }
}