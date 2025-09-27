import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Direct fetch implementation using Alpaca Paper Trading API
    const accountOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
      }
    }

    const positionsOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!
      }
    }

    // Check if we have valid API credentials
    if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    // Fetch account data
    console.log('Fetching account data from Alpaca...')
    const accountResponse = await fetch('https://paper-api.alpaca.markets/v2/account', accountOptions)

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text()
      console.error('Account fetch failed:', accountResponse.status, errorText)
      throw new Error(`Account API failed: ${accountResponse.status} ${errorText}`)
    }

    const accountData = await accountResponse.json()
    console.log('Account data fetched successfully:', accountData.id)

    // Fetch positions data
    console.log('Fetching positions data from Alpaca...')
    const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', positionsOptions)

    let positionsData = []
    if (positionsResponse.ok) {
      positionsData = await positionsResponse.json()
      console.log('Positions data fetched successfully:', positionsData.length, 'positions')
    } else {
      console.warn('Positions fetch failed, continuing with empty positions')
    }

    // Calculate additional metrics
    const totalPnL = positionsData.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.unrealized_pl || 0)
    }, 0)

    const totalInvested = positionsData.reduce((sum: number, pos: any) => {
      return sum + (parseFloat(pos.avg_entry_price || 0) * parseFloat(pos.qty || 0))
    }, 0)

    const dayPnL = positionsData.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.unrealized_intraday_pl || 0)
    }, 0)

    // Enhanced account data with calculated metrics
    const enhancedAccount = {
      // Core account data
      id: accountData.id,
      account_number: accountData.account_number,
      status: accountData.status,
      currency: accountData.currency,
      buying_power: parseFloat(accountData.buying_power),
      regt_buying_power: parseFloat(accountData.regt_buying_power),
      daytrading_buying_power: parseFloat(accountData.daytrading_buying_power),
      cash: parseFloat(accountData.cash),
      portfolio_value: parseFloat(accountData.portfolio_value),
      pattern_day_trader: accountData.pattern_day_trader,
      trading_blocked: accountData.trading_blocked,
      transfers_blocked: accountData.transfers_blocked,
      account_blocked: accountData.account_blocked,
      created_at: accountData.created_at,
      trade_suspended_by_user: accountData.trade_suspended_by_user,
      multiplier: parseFloat(accountData.multiplier),
      shorting_enabled: accountData.shorting_enabled,
      equity: parseFloat(accountData.equity),
      last_equity: parseFloat(accountData.last_equity),
      long_market_value: parseFloat(accountData.long_market_value),
      short_market_value: parseFloat(accountData.short_market_value),
      initial_margin: parseFloat(accountData.initial_margin),
      maintenance_margin: parseFloat(accountData.maintenance_margin),
      last_maintenance_margin: parseFloat(accountData.last_maintenance_margin),
      sma: parseFloat(accountData.sma),
      daytrade_count: parseInt(accountData.daytrade_count),

      // Enhanced calculated metrics
      investedAmount: totalInvested,
      dayPnL: dayPnL,
      totalPnL: totalPnL,
      totalReturn: totalInvested > 0 ? (totalPnL / totalInvested) : 0,
      dayReturn: parseFloat(accountData.equity) > 0 ? (dayPnL / parseFloat(accountData.equity)) : 0,
      riskScore: Math.abs(totalPnL) / Math.max(parseFloat(accountData.portfolio_value), 1) * 100,
      positionsCount: positionsData.length,

      // Formatted display values
      totalBalance: parseFloat(accountData.portfolio_value),
      cashBalance: parseFloat(accountData.cash),
      dayTradingBuyingPower: parseFloat(accountData.daytrading_buying_power),
      isConnected: true,
      accountType: 'PAPER'
    }

    console.log('Account data processed successfully:', {
      portfolio_value: enhancedAccount.portfolio_value,
      cash: enhancedAccount.cash,
      positions: enhancedAccount.positionsCount,
      totalPnL: enhancedAccount.totalPnL
    })

    return NextResponse.json({
      success: true,
      data: enhancedAccount
    })

  } catch (error) {
    console.error('Account API error:', error)

    // Provide specific error messages
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed: Check your Alpaca API keys in .env.local' },
        { status: 500 }
      )
    }

    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Access forbidden: Check your Alpaca account permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch account data',
        details: error.message,
        isConnected: false
      },
      { status: 500 }
    )
  }
}