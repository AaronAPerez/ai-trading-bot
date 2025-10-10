import { useMutation, useQueryClient } from "@tanstack/react-query"

// Stop bot mutation
export function useStopBot() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      if (!response.ok) throw new Error('Failed to stop bot')
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot'] })
    }
  })
}
