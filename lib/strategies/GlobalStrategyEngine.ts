/**
 * Global Strategy Engine Instance
 *
 * Shared singleton instance of AdaptiveStrategyEngine used by:
 * - /api/ai-bot (generates signals and records trades)
 * - /api/strategies/auto-select (displays performance)
 *
 * This ensures strategy performance persists across API calls
 */

import { AdaptiveStrategyEngine } from './AdaptiveStrategyEngine'

let globalEngineInstance: AdaptiveStrategyEngine | null = null

/**
 * Get or create the global AdaptiveStrategyEngine instance
 */
export function getGlobalStrategyEngine(): AdaptiveStrategyEngine {
  if (!globalEngineInstance) {
    console.log('🔧 Creating global AdaptiveStrategyEngine instance...')

    globalEngineInstance = new AdaptiveStrategyEngine({
      autoSwitchEnabled: true,
      minTradesBeforeSwitch: 5,
      poorPerformanceThreshold: 0.25,
      testingEnabled: true,
      testTradesRequired: 7,
      positionSizing: {
        minTestSize: 5,
        maxTestSize: 10,
        minProdSize: 10,
        maxProdSize: 200,
        profitMultiplier: 1.5,
        lossMultiplier: 0.5
      }
    })
  }

  return globalEngineInstance
}

/**
 * Reset the global engine (useful for testing)
 */
export function resetGlobalStrategyEngine(): void {
  console.log('🔄 Resetting global AdaptiveStrategyEngine instance...')
  globalEngineInstance = null
}
