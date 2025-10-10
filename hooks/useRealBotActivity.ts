import { useQuery } from "@tanstack/react-query"

// Fetch real bot activity from Supabase
export function useRealBotActivity() {
  return useQuery({
    queryKey: ['bot', 'activity'],
    queryFn: async () => {
      const response = await fetch('/api/bot-activity?limit=20')
      if (!response.ok) throw new Error('Failed to fetch activity')
      const data = await response.json()
      return data.activities || []
    },
    refetchInterval: 5000
  })
}
