import { useQuery } from '@tanstack/react-query';

// Fetch real Alpaca account data
export function useRealAccount() {
  return useQuery({
    queryKey: ['alpaca', 'account'],
    queryFn: async () => {
      const response = await fetch('/api/alpaca/account')
      if (!response.ok) throw new Error('Failed to fetch account')
      const data = await response.json()
      
      // Validate real data
      if (!data.account?.account_number) {
        throw new Error('Invalid account data - possible mock data detected')
      }
      
      return data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000
  })
}
