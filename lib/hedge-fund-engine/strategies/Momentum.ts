export async function runMomentum(context: any) {
  const { priceHistory, symbol } = context

  const short = priceHistory.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3
  const long = priceHistory.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10

  const momentum = short - long
  const action = momentum > 0.5 ? 'buy' : momentum < -0.5 ? 'sell' : 'hold'

  return {
    strategy: 'momentum',
    symbol,
    action,
    confidence: Math.min(Math.abs(momentum) / 2, 1),
    metadata: { short, long, momentum }
  }
}