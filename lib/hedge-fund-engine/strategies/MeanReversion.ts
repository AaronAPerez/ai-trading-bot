export async function runMeanReversion(context: any) {
  const { priceHistory, symbol } = context

  const recent = priceHistory.slice(-5)
  const mean = recent.reduce((a: number, b: number) => a + b, 0) / recent.length
  const current = priceHistory[priceHistory.length - 1]

  const deviation = (current - mean) / mean
  const action = deviation < -0.02 ? 'buy' : deviation > 0.02 ? 'sell' : 'hold'

  return {
    strategy: 'meanReversion',
    symbol,
    action,
    confidence: Math.min(Math.abs(deviation) * 10, 1),
    metadata: { mean, current, deviation }
  }
}