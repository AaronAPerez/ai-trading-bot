'use client';

// Auto Execution Hook (Specialized)
import { RealTimeAITradingEngine } from "@/lib/ai/RealTimeAITradingEngine"
import React, { useEffect, useState } from "react"

export function useAutoExecution(engine: RealTimeAITradingEngine | null) {
  const [executionStats, setExecutionStats] = useState<ExecutionStats>()
  const [isActive, setIsActive] = useState(false)
  
  useEffect(() => {
    if (!engine || !isActive) return
    
    const interval = setInterval(async () => {
      const stats = await engine.getExecutionStats()
      setExecutionStats(stats)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [engine, isActive])
  
  return { executionStats, isActive, setIsActive }
}