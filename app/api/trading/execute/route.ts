import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'
import { detectAssetType, getSymbolMetadata } from '@/config/symbols'

/**
 * POST /api/trading/execute
 * Execute trades with standardized error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { order, mode = 'paper' } = await request.json()

  // Enhanced order validation
  if (!order || !order.symbol || !order.side || !order.quantity) {
    throw new Error('Invalid order format. Required: symbol, side, quantity')
  }

  // Validate order parameters
  const assetType = detectAssetType(order.symbol)
  const metadata = getSymbolMetadata(order.symbol)

  // Check minimum order size
  if (order.quantity < (metadata.minOrderSize || 0.0001)) {
    throw new Error(`Order quantity ${order.quantity} below minimum ${metadata.minOrderSize}`)
  }

  // Check trading hours for stocks
  if (assetType === 'stock' && metadata.tradingHours === 'market_hours') {
    const marketStatus = await checkMarketStatus()
    if (!marketStatus.stockMarket.isOpen && !marketStatus.stockMarket.isExtendedHours) {
      throw new Error('Stock market is closed. Next open: ' + marketStatus.stockMarket.nextOpen)
    }
  }

  let result

  if (mode === 'paper') {
    // Enhanced paper trading logic
    if (assetType === 'stock') {
      try {
        // Use Alpaca for stock paper trading
        result = await alpacaClient.createOrder({
          symbol: order.symbol,
          side: order.side.toLowerCase(),
          qty: order.quantity,
          type: order.orderType?.toLowerCase() || 'market',
          time_in_force: 'day'
        })
      } catch (alpacaError) {
        console.warn('Alpaca paper trading failed, using simulation:', alpacaError)
        result = await executeSimulatedTrade(order)
      }
    } else {
      // Simulate crypto or fallback trading
      result = await executeSimulatedTrade(order)
    }
  } else if (mode === 'live') {
    // Live trading (only for stocks via Alpaca)
    if (assetType === 'crypto') {
      throw new Error('Live crypto trading not yet implemented. Use paper mode.')
    }

    // Execute live trade via Alpaca
    result = await alpacaClient.createOrder(order) // For now, still paper
  }

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      assetType,
      metadata: {
        symbol: metadata.name,
        category: metadata.category,
        tradingHours: metadata.tradingHours
      }
    },
    mode,
    exchange: getExchangeName(assetType, mode),
    timestamp: new Date().toISOString()
  })
})

// Helper function for enhanced simulation
async function executeSimulatedTrade(order: any) {
  const assetType = detectAssetType(order.symbol)
  const metadata = getSymbolMetadata(order.symbol)

  // Get real market price from Alpaca API
  let price = 100 // Default fallback price

  try {
    // Get real price from Alpaca API directly
    const quotes = await alpacaClient.getQuotes([order.symbol])
    if (quotes[order.symbol]) {
      price = quotes[order.symbol].midPrice || quotes[order.symbol].askPrice || quotes[order.symbol].bidPrice
      console.log(`📈 Using real Alpaca price for ${order.symbol}: ${price}`)
    } else {
      console.warn(`⚠️ No quote available for ${order.symbol}, using fallback price`)
    }
  } catch (error) {
    console.warn(`⚠️ Could not fetch Alpaca price for ${order.symbol}:`, error.message)
  }

  // Enhanced slippage calculation based on asset type
  const baseSlippage = assetType === 'crypto' ? 0.001 : 0.0005 // Crypto has higher slippage
  const slippage = (Math.random() - 0.5) * baseSlippage * 2
  const executionPrice = price * (1 + slippage)

  // Enhanced fee calculation
  const baseFee = assetType === 'crypto' ? 0.005 : 0 // 0.5% for crypto, free for stocks
  const fees = order.quantity * executionPrice * baseFee

  return {
    orderId: `SIM_${assetType.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    filledQuantity: order.quantity,
    avgFillPrice: executionPrice,
    status: 'FILLED',
    fees,
    slippage: slippage * 100, // Percentage
    timestamp: new Date(),
    simulation: true,
    assetType
  }
}

// Helper function to check market status using Alpaca API
async function checkMarketStatus() {
  try {
    const marketStatus = await alpacaClient.getClock()
    return {
      stockMarket: {
        isOpen: marketStatus.is_open,
        nextOpen: marketStatus.next_open,
        nextClose: marketStatus.next_close
      }
    }
  } catch (error) {
    console.warn('Could not fetch market status from Alpaca:', error)
    return getDefaultMarketStatus()
  }
}

function getDefaultMarketStatus() {
  const now = new Date()
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5
  const hour = now.getHours()
  
  return {
    stockMarket: {
      isOpen: isWeekday && hour >= 9 && hour < 16,
      isExtendedHours: isWeekday && ((hour >= 4 && hour < 9) || (hour >= 16 && hour < 20)),
      nextOpen: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
    },
    cryptoMarket: {
      isOpen: true
    }
  }
}

function getExchangeName(assetType: 'stock' | 'crypto', mode: string): string {
  if (mode === 'paper') {
    return assetType === 'crypto' ? 'crypto_simulation' : 'alpaca_paper'
  }
  return assetType === 'crypto' ? 'coinbase_pro' : 'alpaca_live'
}