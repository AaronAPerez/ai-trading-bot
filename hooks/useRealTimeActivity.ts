'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

interface RealTimeActivity {
  id: string
  timestamp: string
  type: 'trade' | 'recommendation' | 'risk' | 'system' | 'info' | 'error'
  symbol?: string
  message: string
  status: 'completed' | 'failed' | 'pending'
  details?: string
  confidence?: number
}

interface ActivityStats {
  totalActivities: number
  tradesCount: number
  analysisCount: number
  recommendationsCount: number
  errorsCount: number
  lastActivityTime: string | null
}

// Fetch real-time activities from Supabase via API
async function fetchRealTimeActivities(): Promise<RealTimeActivity[]> {
  const response = await fetch('/api/ai-bot-activity?limit=20&realTime=true')

  if (!response.ok) {
    throw new Error('Failed to fetch real-time activities')
  }

  const data = await response.json()
  return data.activities || []
}

// Fetch activity statistics
async function fetchActivityStats(): Promise<ActivityStats> {
  const response = await fetch('/api/ai-bot-activity?type=stats')

  if (!response.ok) {
    throw new Error('Failed to fetch activity stats')
  }

  const data = await response.json()
  return data.stats || {
    totalActivities: 0,
    tradesCount: 0,
    analysisCount: 0,
    recommendationsCount: 0,
    errorsCount: 0,
    lastActivityTime: null
  }
}

export function useRealTimeActivity() {
  const [activities, setActivities] = useState<RealTimeActivity[]>([])
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    tradesCount: 0,
    analysisCount: 0,
    recommendationsCount: 0,
    errorsCount: 0,
    lastActivityTime: null
  })

  // Query real-time activities with very frequent updates
  const activitiesQuery = useQuery({
    queryKey: ['real-time-activities'],
    queryFn: fetchRealTimeActivities,
    refetchInterval: 1000, // Refetch every 1 second for real-time feel
    staleTime: 500,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Query activity statistics
  const statsQuery = useQuery({
    queryKey: ['activity-stats'],
    queryFn: fetchActivityStats,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  })

  // Update local state when data changes
  useEffect(() => {
    if (activitiesQuery.data) {
      setActivities(activitiesQuery.data)
    }
  }, [activitiesQuery.data])

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data)
    }
  }, [statsQuery.data])

  // Calculate real-time stats from activities
  useEffect(() => {
    if (activities.length > 0) {
      const calculatedStats: ActivityStats = {
        totalActivities: activities.length,
        tradesCount: activities.filter(a => a.type === 'trade').length,
        analysisCount: activities.filter(a => a.type === 'info').length,
        recommendationsCount: activities.filter(a => a.type === 'recommendation').length,
        errorsCount: activities.filter(a => a.type === 'error').length,
        lastActivityTime: activities[0]?.timestamp || null
      }

      setStats(prevStats => ({
        ...prevStats,
        ...calculatedStats
      }))
    }
  }, [activities])

  return {
    activities,
    stats,
    isLoading: activitiesQuery.isLoading || statsQuery.isLoading,
    error: activitiesQuery.error || statsQuery.error,
    refetch: () => {
      activitiesQuery.refetch()
      statsQuery.refetch()
    },
    // Helper functions
    hasRecentActivity: activities.length > 0 && activities[0] &&
      (Date.now() - new Date(activities[0].timestamp).getTime()) < 30000, // Within last 30 seconds
    latestActivity: activities[0] || null,
    recentTradesCount: activities.filter(a =>
      a.type === 'trade' &&
      (Date.now() - new Date(a.timestamp).getTime()) < 300000 // Within last 5 minutes
    ).length
  }
}