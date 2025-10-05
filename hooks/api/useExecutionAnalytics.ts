import { useQuery } from '@tanstack/react-query'

export const useExecutionAnalytics = () => {
  return useQuery({
    queryKey: ['executionAnalytics'],
    queryFn: async () => {
      const res = await fetch('/api/ai/metrics')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return await res.json()
    },
    refetchInterval: 10000 // every 10s
  })
}

