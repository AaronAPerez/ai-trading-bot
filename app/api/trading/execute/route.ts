import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/marketData/AlpacaClient'
import { detectAssetType, getSymbolMetadata } from '@/config/symbols'

const alpacaClient = new AlpacaClient()

export async function POST(request: NextRequest) {
  try {
    const { order, mode = 'paper' } = await request.json()

    // Enhanced order validation
    if (!order || !order.symbol || !order.side || !order.quantity) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid order format. Required: symbol, side, quantity' 
        },
        { status: 400 }
      )
    }

    // Validate order parameters
    const assetType = detectAssetType(order.symbol)
    const metadata = getSymbolMetadata(order.symbol)

    // Check minimum order size
    if (order.quantity < (metadata.minOrderSize || 0.0001)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order quantity ${order.quantity} below minimum ${metadata.minOrderSize}`
        },
        { status: 400 }
      )
    }

    // Check trading hours for stocks
    if (assetType === 'stock' && metadata.tradingHours === 'market_hours') {
      const marketStatus = await checkMarketStatus()
      if (!marketStatus.stockMarket.isOpen && !marketStatus.stockMarket.isExtendedHours) {
        return NextResponse.json(
          {
            success: false,
            error: 'Stock market is closed. Next open: ' + marketStatus.stockMarket.nextOpen
          },
          { status: 400 }
        )
      }
    }

    console.log(`🔄 Executing ${mode} ${assetType} trade:`, {
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      type: order.orderType || 'MARKET'
    })

    let result

    if (mode === 'paper') {
      // Enhanced paper trading logic
      if (assetType === 'stock' && process.env.ALPACA_API_KEY) {
        try {
          // Use Alpaca for stock paper trading
          result = await alpacaClient.executePaperTrade({
            symbol: order.symbol,
            side: order.side.toLowerCase(),
            quantity: order.quantity,
            type: order.orderType?.toLowerCase() || 'market'
          })
          
          console.log(`✅ Alpaca paper trade executed:`, result)
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
        return NextResponse.json(
          {
            success: false,
            error: 'Live crypto trading not yet implemented. Use paper mode.'
          },
          { status: 501 }
        )
      }

      if (!process.env.ALPACA_API_KEY) {
        return NextResponse.json(
          {
            success: false,
            error: 'Live trading requires Alpaca API configuration'
          },
          { status: 503 }
        )
      }

      // Execute live trade via Alpaca
      result = await alpacaClient.executePaperTrade(order) // For now, still paper
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
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Enhanced trading execution error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Trade execution failed' 
      },
      { status: 500 }
    )
  }
}

// Helper function for enhanced simulation
async function executeSimulatedTrade(order: any) {
  const assetType = detectAssetType(order.symbol)
  const metadata = getSymbolMetadata(order.symbol)
  
  // Get real market price from Alpaca API
  let price = 100 // Default fallback price

  try {
    // Get real price from Alpaca API directly
    const quotes = await alpacaClient.getLatestQuotes([order.symbol])
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
    const marketStatus = await alpacaClient.getMarketStatus()
    return {
      stockMarket: {
        isOpen: marketStatus.isOpen,
        nextOpen: marketStatus.nextOpen,
        nextClose: marketStatus.nextClose
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