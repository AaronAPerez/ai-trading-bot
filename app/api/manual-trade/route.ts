import { NextRequest, NextResponse } from 'next/server'
import { AlpacaClient } from '@/lib/alpaca/client'
import { AdvancedRiskManager } from '@/lib/ai/AdvancedRiskManager'

function getAlpacaClient() {
  const config = {
    key: process.env.APCA_API_KEY_ID!,
    secret: process.env.APCA_API_SECRET_KEY!,
    paper: process.env.NEXT_PUBLIC_TRADING_MODE === 'paper'
  }

  if (!config.key || !config.secret) {
    throw new Error('Alpaca API credentials not configured')
  }

  return new AlpacaClient(config)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbol, action, positionSize, orderType = 'MARKET', source = 'MANUAL' } = body

    if (!symbol || !action || !positionSize) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, action, positionSize' },
        { status: 400 }
      )
    }

    if (!['BUY', 'SELL'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be BUY or SELL' },
        { status: 400 }
      )
    }

    const alpacaClient = getAlpacaClient()

    // Get current account and portfolio information
    const account = await alpacaClient.getAccount()
    const positions = await alpacaClient.getPositions()
    const totalPortfolioValue = parseFloat(account.totalBalance)

    // Calculate position size in dollars
    const positionValueUSD = totalPortfolioValue * positionSize

    // Get current market price for the symbol
    const marketData = await alpacaClient.getLatestQuote(symbol)
    if (!marketData) {
      return NextResponse.json(
        { error: `Unable to get market data for ${symbol}` },
        { status: 400 }
      )
    }

    const currentPrice = marketData.askPrice || marketData.lastPrice || marketData.bidPrice
    if (!currentPrice) {
      return NextResponse.json(
        { error: `Unable to determine current price for ${symbol}` },
        { status: 400 }
      )
    }

    // Calculate shares to trade
    let sharesToTrade: number

    if (action === 'BUY') {
      sharesToTrade = Math.floor(positionValueUSD / currentPrice)
    } else {
      // For SELL, check current position
      const currentPosition = positions.find(pos => pos.symbol === symbol)
      if (!currentPosition || currentPosition.quantity <= 0) {
        return NextResponse.json(
          { error: `No position found for ${symbol} to sell` },
          { status: 400 }
        )
      }
      // Sell the requested percentage of current position
      sharesToTrade = Math.floor(currentPosition.quantity * positionSize)
    }

    if (sharesToTrade <= 0) {
      return NextResponse.json(
        { error: 'Calculated shares to trade is zero or negative' },
        { status: 400 }
      )
    }

    // Risk validation using AdvancedRiskManager
    const riskManager = new AdvancedRiskManager({
      maxPositionSize: 0.1, // 10% max position
      maxPortfolioRisk: 0.05, // 5% max portfolio risk
      maxDailyLoss: 0.03, // 3% max daily loss
      stopLossThreshold: 0.02, // 2% stop loss
      correlationThreshold: 0.7
    })

    // Create a simplified trade signal for risk validation
    const tradeSignal = {
      symbol,
      action: action.toLowerCase() as 'buy' | 'sell',
      confidence: 0.75, // Default confidence for manual trades
      strength: 0.7,
      price: currentPrice,
      timestamp: new Date(),
      reasoning: [`Manual trade execution via dashboard`],
      stopLoss: action === 'BUY' ? currentPrice * 0.98 : currentPrice * 1.02,
      takeProfit: action === 'BUY' ? currentPrice * 1.05 : currentPrice * 0.95,
      timeframe: '1D'
    }

    // Validate the trade
    const riskValidation = await riskManager.validateTrade(
      tradeSignal,
      {
        totalValue: totalPortfolioValue,
        cashBalance: parseFloat(account.cashBalance),
        positions: positions.map(pos => ({
          symbol: pos.symbol,
          quantity: pos.quantity,
          marketValue: pos.marketValue,
          unrealizedPnL: pos.unrealizedPnL
        })),
        dayTradingBuyingPower: parseFloat(account.dayTradingBuyingPower)
      },
      [] // No historical market data needed for basic validation
    )

    if (!riskValidation.approved) {
      return NextResponse.json({
        error: 'Trade rejected by risk management',
        warnings: riskValidation.warnings,
        restrictions: riskValidation.restrictions
      }, { status: 400 })
    }

    // Execute the trade
    const orderRequest = {
      symbol,
      qty: sharesToTrade,
      side: action.toLowerCase() as 'buy' | 'sell',
      type: orderType.toLowerCase() as 'market' | 'limit',
      time_in_force: 'day'
    }

    const order = await alpacaClient.createOrder(orderRequest)

    // Log the manual trade execution
    console.log(`Manual trade executed:`, {
      symbol,
      action,
      shares: sharesToTrade,
      estimatedValue: sharesToTrade * currentPrice,
      positionSize: `${(positionSize * 100).toFixed(1)}%`,
      source,
      orderId: order.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Manual ${action} order submitted successfully`,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        type: order.type,
        status: order.status,
        estimatedValue: sharesToTrade * currentPrice,
        positionSize: `${(positionSize * 100).toFixed(1)}%`
      },
      riskValidation: {
        warnings: riskValidation.warnings,
        positionSizing: riskValidation.sizing
      }
    })

  } catch (error) {
    console.error('Manual trade execution error:', error)

    // Handle specific Alpaca API errors
    if (error.message?.includes('insufficient buying power')) {
      return NextResponse.json({
        error: 'Insufficient buying power for this trade',
        details: 'Please reduce position size or add more funds to your account'
      }, { status: 400 })
    }

    if (error.message?.includes('market is closed')) {
      return NextResponse.json({
        error: 'Market is currently closed',
        details: 'Manual trades can only be executed during market hours'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Manual trade execution failed',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const symbol = url.searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter required' },
        { status: 400 }
      )
    }

    const alpacaClient = getAlpacaClient()

    // Get current market data for price validation
    const marketData = await alpacaClient.getLatestQuote(symbol)
    const positions = await alpacaClient.getPositions()
    const currentPosition = positions.find(pos => pos.symbol === symbol)

    return NextResponse.json({
      symbol,
      currentPrice: marketData?.askPrice || marketData?.lastPrice || marketData?.bidPrice,
      currentPosition: currentPosition ? {
        quantity: currentPosition.quantity,
        marketValue: currentPosition.marketValue,
        unrealizedPnL: currentPosition.unrealizedPnL,
        unrealizedPnLPercent: currentPosition.unrealizedPnLPercent
      } : null,
      marketOpen: marketData ? true : false,
      tradeable: true
    })

  } catch (error) {
    console.error('Manual trade validation error:', error)
    return NextResponse.json({
      error: 'Failed to validate manual trade',
      details: error.message
    }, { status: 500 })
  }
}