// src/components/Dashboard.tsx
import { usePortfolio, useAIRecommendations, useTradingBot } from '@/hooks/useTrading'

export default function Dashboard() {
  const { metrics, isLoading, error } = usePortfolio()
  const { recommendations, actions: aiActions } = useAIRecommendations()
  const { isRunning, actions: botActions } = useTradingBot()

  return (
    <div>
      <h1>Portfolio Value: ${metrics.totalValue.toLocaleString()}</h1>
      <button onClick={() => aiActions.refresh()}>
        Refresh AI Recommendations
      </button>
      {recommendations.map(rec => (
        <Recommendation
          key={rec.id} 
          recommendation={rec}
          onExecute={() => aiActions.execute(rec)}
        />
      ))}
    </div>
  )
}