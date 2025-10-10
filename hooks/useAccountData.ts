// hooks/useAccountData.ts
import { useQuery } from '@tanstack/react-query'
import { alpacaService } from '@/lib/services/alpaca-service'

export const useAccountData = () => {
  return useQuery({
    queryKey: ['account'],
    queryFn: () => alpacaService.getAccount(),
    refetchInterval: 30000,
    staleTime: 20000,
  })
}
