import { useQuery } from "@tanstack/react-query"
import { alpacaService } from '@/lib/services/alpaca-service'

// hooks/usePositions.ts
export const usePositions = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => alpacaService.getPositions(),
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
