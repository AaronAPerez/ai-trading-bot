import { useQuery } from '@tanstack/react-query'


/**
 * Real AI Bot Dashboard
 * Displays ONLY real data from Alpaca API and Supabase
 * 
 * NO MOCKS | NO SIMULATIONS | PRODUCTION READY
 */

// =============================================
// REAL DATA FETCHING HOOKS
// =============================================

// Fetch real bot status
export function useRealBotStatus() {
  return useQuery({
    queryKey: ['bot', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status')
      }
      
      return await response.json()
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time status
    staleTime: 3000
  })
}
