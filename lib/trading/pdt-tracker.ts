/**
 * Pattern Day Trading (PDT) Protection Tracker
 * Helps avoid PDT violations by tracking same-day trades
 *
 * Per Alpaca PDT Rules:
 * - 4+ day trades within 5 business days = Pattern Day Trader
 * - Accounts < $25,000 are blocked from additional day trades
 * - CRYPTO IS EXEMPT from PDT rules (trades 24/7)
 *
 * @see https://docs.alpaca.markets/docs/user-protection#pattern-day-trader-pdt-protection-at-alpaca
 * @fileoverview PDT tracking and violation prevention
 * @author Aaron A Perez
 */

interface PositionEntry {
  symbol: string
  entryDate: string // YYYY-MM-DD format
  qty: number
  canCloseToday: boolean
}

interface PDTStatus {
  isDayTrader: boolean
  accountEquity: number
  dayTradesUsed: number
  dayTradesRemaining: number
  canDayTrade: boolean
  resetDate: string
}

/**
 * Common crypto symbols (PDT rules DON'T apply to crypto)
 */
const CRYPTO_SYMBOLS = [
  'BTC/USD', 'ETH/USD', 'LINK/USD', 'AAVE/USD', 'UNI/USD', 'SUSHI/USD',
  'AVAX/USD', 'DOT/USD', 'MATIC/USD', 'LTC/USD', 'BCH/USD', 'XLM/USD',
  'BTCUSD', 'ETHUSD', 'LINKUSD', 'AAVEUSD', 'UNIUSD', 'SUSHIUSD',
  'AVAXUSD', 'DOTUSD', 'MATICUSD', 'LTCUSD', 'BCHUSD', 'XLMUSD',
  'SOL/USD', 'ADA/USD', 'DOGE/USD', 'SHIB/USD', 'ATOM/USD', 'NEAR/USD',
  'SOLUSD', 'ADAUSD', 'DOGEUSD', 'SHIBUSD', 'ATOMUSD', 'NEARUSD'
]

/**
 * Check if symbol is cryptocurrency (exempt from PDT)
 */
export function isCrypto(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase()
  return CRYPTO_SYMBOLS.some(crypto =>
    upperSymbol.includes(crypto.replace('/', ''))
  ) || upperSymbol.includes('USD') // Most crypto pairs end with USD
}

/**
 * Check if a position was opened today (would trigger PDT if closed)
 */
export function isPositionOpenedToday(entryDate: string | Date): boolean {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const entry = typeof entryDate === 'string'
    ? entryDate.split('T')[0]
    : entryDate.toISOString().split('T')[0]

  return entry === today
}

/**
 * Check if closing a position would trigger PDT violation
 */
export function wouldTriggerPDT(
  symbol: string,
  positions: any[],
  accountEquity: number
): {
  wouldViolate: boolean
  reason: string
  canClose: boolean
} {
  // ✅ CRYPTO IS ALWAYS SAFE - PDT rules don't apply
  if (isCrypto(symbol)) {
    return {
      wouldViolate: false,
      reason: 'Cryptocurrency - exempt from PDT rules (trades 24/7)',
      canClose: true
    }
  }

  // Accounts with $25K+ can day trade freely
  if (accountEquity >= 25000) {
    return {
      wouldViolate: false,
      reason: 'Account equity >= $25,000 - PDT rules do not apply',
      canClose: true
    }
  }

  // Find the position
  const position = positions.find(p => p.symbol === symbol)

  if (!position) {
    return {
      wouldViolate: false,
      reason: 'Position not found',
      canClose: false
    }
  }

  // Check if position was opened today
  const openedToday = isPositionOpenedToday(position.created_at || position.entry_date || new Date())

  if (openedToday) {
    return {
      wouldViolate: true,
      reason: `Position opened today - closing would count as day trade (account < $25K)`,
      canClose: false
    }
  }

  return {
    wouldViolate: false,
    reason: 'Position opened on previous day - safe to close',
    canClose: true
  }
}

/**
 * Get PDT status for account
 */
export async function getPDTStatus(
  accountEquity: number,
  dayTradesUsedInLast5Days: number = 0
): Promise<PDTStatus> {
  const isDayTrader = accountEquity < 25000
  const maxDayTrades = 3 // SEC allows 3 day trades in 5 business days
  const remaining = Math.max(0, maxDayTrades - dayTradesUsedInLast5Days)

  // Calculate next reset date (5 business days from now)
  const resetDate = new Date()
  resetDate.setDate(resetDate.getDate() + 5)

  return {
    isDayTrader,
    accountEquity,
    dayTradesUsed: dayTradesUsedInLast5Days,
    dayTradesRemaining: remaining,
    canDayTrade: accountEquity >= 25000 || remaining > 0,
    resetDate: resetDate.toISOString().split('T')[0]
  }
}

/**
 * Filter positions that are safe to close (won't trigger PDT)
 */
export function getSafeToClosePositions(
  positions: any[],
  accountEquity: number
): {
  safeToClose: any[]
  blockedByPDT: any[]
} {
  const safeToClose: any[] = []
  const blockedByPDT: any[] = []

  positions.forEach(position => {
    const check = wouldTriggerPDT(position.symbol, positions, accountEquity)

    if (check.canClose) {
      safeToClose.push({
        ...position,
        pdtStatus: 'safe',
        pdtReason: check.reason
      })
    } else {
      blockedByPDT.push({
        ...position,
        pdtStatus: 'blocked',
        pdtReason: check.reason
      })
    }
  })

  return { safeToClose, blockedByPDT }
}

/**
 * Check if bot should avoid opening new positions due to PDT risk
 */
export function shouldAvoidNewPosition(
  currentPositionCount: number,
  accountEquity: number,
  todayTradeCount: number
): {
  shouldAvoid: boolean
  reason: string
} {
  // Accounts >= $25K have no PDT restrictions
  if (accountEquity >= 25000) {
    return {
      shouldAvoid: false,
      reason: 'No PDT restrictions for accounts >= $25K'
    }
  }

  // If we've already made 3+ trades today, be cautious
  if (todayTradeCount >= 3) {
    return {
      shouldAvoid: true,
      reason: `Already made ${todayTradeCount} trades today - approaching PDT limit (3 day trades per 5 days)`
    }
  }

  // If account is small and we have many positions, be conservative
  if (accountEquity < 1000 && currentPositionCount >= 5) {
    return {
      shouldAvoid: true,
      reason: 'Too many open positions for small account - reduces ability to exit without PDT violation'
    }
  }

  return {
    shouldAvoid: false,
    reason: 'Safe to open new position'
  }
}
