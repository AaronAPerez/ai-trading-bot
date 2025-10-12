
export async function runBreakout(context: any) {
  const { priceHistory, symbol } = context

  const recentHigh = Math.max(...priceHistory.slice(-10))
  const recentLow = Math.min(...priceHistory.slice(-10))
  const current = priceHistory[priceHistory.length - 1]

  let action = 'hold'
  if (current > recentHigh * 1.01) action = 'buy'
  else if (current < recentLow * 0.99) action = 'sell'

  return {
    strategy: 'breakout',
    symbol,
    action,
    confidence: 0.9,
    metadata: { recentHigh, recentLow, current }
  }
}