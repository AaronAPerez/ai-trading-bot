import { useState, useCallback } from 'react'

/**
 * Hook to integrate shadow trading with the AI trading bot
 * Automatically logs real trades and executes shadow trades for comparison
 */
export function useShadowTrading(options?: {
  autoExecuteShadow?: boolean
  shadowPortfolioIds?: string[]
}) {
  const [isEnabled, setIsEnabled] = useState(options?.autoExecuteShadow ?? false)
  const [shadowPortfolioIds, setShadowPortfolioIds] = useState<string[]>(
    options?.shadowPortfolioIds || []
  )

  /**
   * Log a real trade to the shadow trading system
   */
  const logRealTrade = useCallback(async (trade: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    price: number
    strategyName: string
    reason: string
  }) => {
    try {
      const response = await fetch('/api/shadow-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log-real-trade',
          trade: {
            ...trade,
            timestamp: new Date()
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        console.log(`🌑 Real trade logged to shadow system: ${trade.side.toUpperCase()} ${trade.symbol}`)
      }

      return result
    } catch (error) {
      console.error('Failed to log real trade:', error)
      return { success: false, error }
    }
  }, [])

  /**
   * Execute shadow trades on all registered shadow portfolios
   */
  const executeShadowTrades = useCallback(async (signal: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    strategyName: string
    reason: string
    confidence: number
    metadata?: any
  }) => {
    if (!isEnabled || shadowPortfolioIds.length === 0) {
      return []
    }

    const results = []

    for (const portfolioId of shadowPortfolioIds) {
      try {
        const response = await fetch('/api/shadow-trading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute-shadow-trade',
            portfolioId,
            signal
          })
        })

        const result = await response.json()
        results.push({ portfolioId, ...result })

        if (result.success) {
          console.log(`🌑 Shadow trade executed: ${signal.side.toUpperCase()} ${signal.symbol} on ${portfolioId}`)
        }
      } catch (error) {
        console.error(`Failed to execute shadow trade on ${portfolioId}:`, error)
        results.push({ portfolioId, success: false, error })
      }
    }

    return results
  }, [isEnabled, shadowPortfolioIds])

  /**
   * Wrapper for executing both real and shadow trades
   */
  const executeWithShadow = useCallback(async (
    realTradeExecution: () => Promise<any>,
    signal: {
      symbol: string
      side: 'buy' | 'sell'
      qty: number
      strategyName: string
      reason: string
      confidence: number
      metadata?: any
    }
  ) => {
    // Execute real trade
    const realResult = await realTradeExecution()

    // Log real trade
    if (realResult.success) {
      await logRealTrade({
        symbol: signal.symbol,
        side: signal.side,
        qty: signal.qty,
        price: realResult.filledPrice || realResult.price || 0,
        strategyName: signal.strategyName,
        reason: signal.reason
      })
    }

    // Execute shadow trades
    const shadowResults = await executeShadowTrades(signal)

    return {
      real: realResult,
      shadow: shadowResults
    }
  }, [logRealTrade, executeShadowTrades])

  /**
   * Enable/disable shadow trading
   */
  const toggleShadowTrading = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
    console.log(`🌑 Shadow trading ${enabled ? 'enabled' : 'disabled'}`)
  }, [])

  /**
   * Set which shadow portfolios to trade on
   */
  const setShadowPortfolios = useCallback((portfolioIds: string[]) => {
    setShadowPortfolioIds(portfolioIds)
    console.log(`🌑 Shadow portfolios updated:`, portfolioIds)
  }, [])

  return {
    isEnabled,
    shadowPortfolioIds,
    logRealTrade,
    executeShadowTrades,
    executeWithShadow,
    toggleShadowTrading,
    setShadowPortfolios
  }
}
