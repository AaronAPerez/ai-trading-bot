import { useQuery } from "@tanstack/react-query"

// Fetch real positions from Alpaca
export function useRealPositions() {
  return useQuery({
    queryKey: ['alpaca', 'positions'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/positions')
      if (!response.ok) throw new Error('Failed to fetch positions')
      const data = await response.json()
      return data.positions || []
    },
    refetchInterval: 15000,
    staleTime: 10000
  })
}
