import { useQuery } from "@tanstack/react-query"

// Fetch real orders from Alpaca
export function useRealOrders() {
  return useQuery({
    queryKey: ['alpaca', 'orders'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/orders?status=all&limit=10')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      return data.orders || []
    },
    refetchInterval: 10000
  })
}
