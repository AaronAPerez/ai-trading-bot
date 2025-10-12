import { BacktestResult } from './types'

export function evaluateBacktest(trades: any[], priceHistory: number[]): BacktestResult {
  let pnl = 0
  let drawdown = 0
  let peak = 0
  let wins = 0
  let losses = 0

  for (const trade of trades) {
    const nextPrice = priceHistory[trade.timestamp + 1] || trade.price
    const delta = trade.action === 'buy' ? nextPrice - trade.price : trade.price - nextPrice
    pnl += delta
    if (delta > 0) wins++
    else losses++

    peak = Math.max(peak, pnl)
    drawdown = Math.max(drawdown, peak - pnl)
  }

  return {
    tradesExecuted: trades.length,
    winRate: wins / (wins + losses),
    totalPnl: pnl,
    maxDrawdown: drawdown,
    avgConfidence: trades.reduce((a, t) => a + t.confidence, 0) / trades.length
  }
}