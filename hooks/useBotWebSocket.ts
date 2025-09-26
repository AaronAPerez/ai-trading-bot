import { useAIStore } from "@/store/slices/aiSlice"
import { useBotStore } from "@/store/slices/botSlice"
import { useState, useEffect, useCallback } from "react"
import { useWebSocket } from "./useWebSocket"

/**
 * Hook for AI bot real-time updates
 */
export const useBotWebSocket = () => {
  const { connectionStatus, sendInternalMessage } = useWebSocket()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>(null)

  // Listen to AI store updates
  useEffect(() => {
    const unsubscribeRecommendations = useAIStore.subscribe(
      (state) => state.recommendations,
      (recommendations) => {
        setRecommendations(recommendations)
      }
    )

    const unsubscribeActivities = useBotStore.subscribe(
      (state) => state.activityLogs,
      (activities) => {
        setActivities(activities)
      }
    )

    const unsubscribeMetrics = useBotStore.subscribe(
      (state) => state.metrics,
      (metrics) => {
        setMetrics(metrics)
      }
    )

    return () => {
      unsubscribeRecommendations()
      unsubscribeActivities()
      unsubscribeMetrics()
    }
  }, [])

  const sendBotCommand = useCallback((command: string, data?: any) => {
    return sendInternalMessage({
      type: 'bot_command',
      command,
      data,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  const sendRecommendationFeedback = useCallback((recommendationId: string, executed: boolean, result?: any) => {
    return sendInternalMessage({
      type: 'recommendation_feedback',
      recommendationId,
      executed,
      result,
      timestamp: new Date().toISOString()
    })
  }, [sendInternalMessage])

  return {
    recommendations,
    activities,
    metrics,
    isConnected: connectionStatus.internalWs,
    sendBotCommand,
    sendRecommendationFeedback
  }
}