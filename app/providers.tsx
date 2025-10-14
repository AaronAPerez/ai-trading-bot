'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: false, // Disable default auto-refetch
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      retry: 1, // Reduce retries to avoid rate limiting
      retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
    },
  },
})

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}