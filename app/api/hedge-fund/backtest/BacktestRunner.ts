import { StrategyRegistry } from '../StrategyRegistry'
import { evaluateBacktest } from './BacktestEvaluator'
import { logBacktestResult } from './BacktestLogger'
import { BacktestResult } from './types'

export async function runBacktest(userId: string, strategy: string, symbol: string, priceHistory: number[]) {
  const strategyFn = StrategyRegistry[strategy]
  if (!strategyFn) throw new Error(`Strategy ${strategy} not found`)

  const trades: any[] = []

  for (let i = 10; i < priceHistory.length; i++) {
    const context = { symbol, priceHistory: priceHistory.slice(0, i) }
    const signal = await strategyFn(context)

    if (signal.action !== 'hold') {
      trades.push({
        timestamp: i,
        action: signal.action,
        price: priceHistory[i],
        confidence: signal.confidence
      })
    }
  }

  const result: BacktestResult = evaluateBacktest(trades, priceHistory)
  await logBacktestResult(userId, strategy, symbol, result)

  return result
}