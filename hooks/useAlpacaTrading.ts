'use client'

import { useState, useCallback, useEffect } from 'react'

interface TradingAccount {
  accountType: 'PAPER' | 'LIVE'
  totalBalance: number
  cashBalance: number
  availableBuyingPower: number
  dayTradeCount: number
  patternDayTrader: boolean
  tradingEnabled: boolean
  isConnected: boolean
  investedAmount?: number
}

interface Position {
  symbol: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  side: 'long' | 'short'
}

export function useAlpacaTrading() {
  const [account, setAccount] = useState<TradingAccount | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch real account data
  const fetchAccount = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/alpaca/account')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch account')
      }
      
      const accountData = await response.json()
      setAccount(accountData)
      
      console.log('Real account data loaded:', accountData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account'
      setError(errorMessage)
      console.error('Account fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch real positions
  const fetchPositions = useCallback(async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/alpaca/positions')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch positions')
      }
      
      const positionsData = await response.json()
      setPositions(positionsData)
      
      console.log('Real positions loaded:', positionsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch positions'
      setError(errorMessage)
      console.error('Positions fetch error:', err)
    }
  }, [])

  // Execute real order
  const executeOrder = useCallback(async (orderData: {
    symbol: string
    quantity: number
    side: 'buy' | 'sell'
    type?: 'market' | 'limit'
    limitPrice?: number
  }) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Executing real order:', orderData)
      
      const response = await fetch('/api/alpaca/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: orderData.symbol,
          qty: orderData.quantity,
          side: orderData.side,
          type: orderData.type || 'market',
          limit_price: orderData.limitPrice
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute order')
      }
      
      const result = await response.json()
      console.log('Order executed successfully:', result)
      
      // Refresh data after order execution
      await Promise.all([fetchPositions(), fetchAccount()])
      
      return {
        success: true,
        message: `Successfully ${orderData.side === 'buy' ? 'bought' : 'sold'} ${orderData.quantity} shares of ${orderData.symbol}`,
        orderId: result.id
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute order'
      setError(errorMessage)
      console.error('Order execution error:', err)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchPositions, fetchAccount])

  // Load initial data
  useEffect(() => {
    fetchAccount()
    fetchPositions()
  }, [fetchAccount, fetchPositions])

  return {
    account,
    positions,
    isLoading,
    error,
    fetchAccount,
    fetchPositions,
    executeOrder
  }
}