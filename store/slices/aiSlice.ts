
// ===============================================
// AI RECOMMENDATIONS STORE SLICE
// src/store/slices/aiSlice.ts
// ===============================================

import { AIRecommendation } from "@/types/trading"
import { create, StateCreator } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

interface AIState {
  recommendations: AIRecommendation[]
  activeRecommendations: AIRecommendation[]
  recommendationHistory: AIRecommendation[]
  models: any[]
  isGenerating: boolean
  error: string | null
  lastUpdate: Date | null
  executingIds: Set<string>
  generationStats: {
    totalGenerated: number
    successfulExecutions: number
    failedExecutions: number
    averageConfidence: number
  }
}

interface AIActions {
  addRecommendation: (recommendation: AIRecommendation) => void
  updateRecommendation: (id: string, updates: Partial<AIRecommendation>) => void
  removeRecommendation: (id: string) => void
  clearExpiredRecommendations: () => void
  markAsExecuting: (id: string) => void
  markAsExecuted: (id: string) => void
  setRecommendations: (recommendations: AIRecommendation[]) => void
  executeRecommendation: (recommendation: AIRecommendation) => Promise<void>
  generateRecommendation: (symbol: string) => Promise<AIRecommendation | null>
  refreshRecommendations: () => Promise<void>
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
  getRecommendationsBySymbol: (symbol: string) => AIRecommendation[]
  getHighConfidenceRecommendations: (minConfidence: number) => AIRecommendation[]
}

export type AISlice = AIState & AIActions
export type AIStore = AIState & AIActions

const initialAIState: AIState = {
  recommendations: [],
  activeRecommendations: [],
  recommendationHistory: [],
  models: [],
  isGenerating: false,
  error: null,
  lastUpdate: null,
  executingIds: new Set(),
  generationStats: {
    totalGenerated: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageConfidence: 0
  }
}

// Slice creator function for unified store
export const createAISlice: StateCreator<AISlice> = (set, get) => ({
  ...initialAIState,

  addRecommendation: (recommendation) =>
    set((state: any) => {
      state.recommendations = state.recommendations.filter((r: AIRecommendation) => r.symbol !== recommendation.symbol)
      state.recommendations.unshift(recommendation)

      const now = new Date()
      state.activeRecommendations = state.recommendations.filter((r: AIRecommendation) =>
        new Date(r.expiresAt) > now
      )

      state.recommendationHistory.unshift(recommendation)
      if (state.recommendationHistory.length > 200) {
        state.recommendationHistory = state.recommendationHistory.slice(0, 200)
      }

      state.generationStats.totalGenerated++
      const totalConfidence = state.recommendations.reduce((sum: number, r: AIRecommendation) => sum + r.confidence, 0)
      state.generationStats.averageConfidence = totalConfidence / state.recommendations.length

      state.lastUpdate = new Date()
    }),

  updateRecommendation: (id, updates) =>
    set((state: any) => {
      const index = state.recommendations.findIndex((r: AIRecommendation) => r.id === id)
      if (index >= 0) {
        Object.assign(state.recommendations[index], updates)
        state.lastUpdate = new Date()
      }
    }),

  removeRecommendation: (id) =>
    set((state: any) => {
      state.recommendations = state.recommendations.filter((r: AIRecommendation) => r.id !== id)
      state.activeRecommendations = state.activeRecommendations.filter((r: AIRecommendation) => r.id !== id)
    }),

  clearExpiredRecommendations: () =>
    set((state: any) => {
      const now = new Date()
      state.recommendations = state.recommendations.filter((r: AIRecommendation) =>
        new Date(r.expiresAt) > now
      )
      state.activeRecommendations = state.recommendations
    }),

  markAsExecuting: (id) =>
    set((state: any) => {
      state.executingIds.add(id)
    }),

  markAsExecuted: (id) =>
    set((state: any) => {
      state.executingIds.delete(id)
      const index = state.recommendations.findIndex((r: AIRecommendation) => r.id === id)
      if (index >= 0) {
        state.recommendations[index].executionMetadata = {
          ...state.recommendations[index].executionMetadata,
          executed: true,
          executedAt: new Date()
        }
      }
    }),

  setRecommendations: (recommendations) =>
    set((state: any) => {
      state.recommendations = recommendations
      const now = new Date()
      state.activeRecommendations = recommendations.filter((r: AIRecommendation) =>
        new Date(r.expiresAt) > now
      )
      state.lastUpdate = new Date()
    }),

  executeRecommendation: async (recommendation) => {
    const { id } = recommendation
    ;(get() as AISlice).markAsExecuting(id)

    try {
      const response = await fetch('/api/trading/execute-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recommendation)
      })

      if (!response.ok) {
        throw new Error(`Failed to execute recommendation: ${response.statusText}`)
      }

      const result = await response.json()

      set((state: any) => {
        const index = state.recommendations.findIndex((r: AIRecommendation) => r.id === id)
        if (index >= 0) {
          state.recommendations[index] = {
            ...state.recommendations[index],
            executionMetadata: {
              ...state.recommendations[index].executionMetadata,
              executed: true,
              executedAt: new Date(),
              orderId: result.orderId,
              executionPrice: result.executionPrice
            }
          }
        }
        state.generationStats.successfulExecutions++
        state.executingIds.delete(id)
        state.lastUpdate = new Date()
      })

      return result
    } catch (error) {
      set((state: any) => {
        state.error = error instanceof Error ? error.message : 'Failed to execute recommendation'
        state.generationStats.failedExecutions++
        state.executingIds.delete(id)
      })
      throw error
    }
  },

  generateRecommendation: async (symbol) => {
    set((state: any) => {
      state.isGenerating = true
      state.error = null
    })

    try {
      const response = await fetch('/api/ai/generate-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate recommendation: ${response.statusText}`)
      }

      const recommendation = await response.json()
      ;(get() as AISlice).addRecommendation(recommendation)

      set((state: any) => {
        state.isGenerating = false
      })

      return recommendation
    } catch (error) {
      set((state: any) => {
        state.error = error instanceof Error ? error.message : 'Failed to generate recommendation'
        state.isGenerating = false
      })
      return null
    }
  },

  refreshRecommendations: async () => {
    set((state: any) => {
      state.isGenerating = true
      state.error = null
    })

    try {
      const response = await fetch('/api/ai/recommendations')

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const recommendations = await response.json()

      set((state: any) => {
        state.recommendations = recommendations
        const now = new Date()
        state.activeRecommendations = recommendations.filter((r: AIRecommendation) =>
          new Date(r.expiresAt) > now
        )
        state.lastUpdate = new Date()
        state.isGenerating = false
      })
    } catch (error) {
      set((state: any) => {
        state.error = error instanceof Error ? error.message : 'Failed to refresh recommendations'
        state.isGenerating = false
      })
    }
  },

  setGenerating: (generating) =>
    set((state: any) => {
      state.isGenerating = generating
    }),

  setError: (error) =>
    set((state: any) => {
      state.error = error
    }),

  getRecommendationsBySymbol: (symbol) => {
    const { recommendations } = get() as AISlice
    return recommendations.filter(r => r.symbol === symbol)
  },

  getHighConfidenceRecommendations: (minConfidence) => {
    const { activeRecommendations } = get() as AISlice
    return activeRecommendations.filter(r => r.confidence >= minConfidence)
  }
})

export const useAIStore = create<AIStore>()(
  subscribeWithSelector(
    immer<AIStore>((set, get) => ({
      ...initialAIState,

      addRecommendation: (recommendation) =>
        set((state) => {
          // Remove existing recommendation for the same symbol
          state.recommendations = state.recommendations.filter(r => r.symbol !== recommendation.symbol)
          
          // Add new recommendation
          state.recommendations.unshift(recommendation)
          
          // Update active recommendations
          const now = new Date()
          state.activeRecommendations = state.recommendations.filter(r => 
            new Date(r.expiresAt) > now
          )
          
          // Add to history
          state.recommendationHistory.unshift(recommendation)
          if (state.recommendationHistory.length > 200) {
            state.recommendationHistory = state.recommendationHistory.slice(0, 200)
          }
          
          // Update stats
          state.generationStats.totalGenerated++
          const totalConfidence = state.recommendations.reduce((sum, r) => sum + r.confidence, 0)
          state.generationStats.averageConfidence = totalConfidence / state.recommendations.length
          
          state.lastUpdate = new Date()
        }),

      updateRecommendation: (id, updates) =>
        set((state) => {
          const index = state.recommendations.findIndex(r => r.id === id)
          if (index >= 0) {
            Object.assign(state.recommendations[index], updates)
            state.lastUpdate = new Date()
          }
        }),

      removeRecommendation: (id) =>
        set((state) => {
          state.recommendations = state.recommendations.filter(r => r.id !== id)
          state.activeRecommendations = state.activeRecommendations.filter(r => r.id !== id)
        }),

      executeRecommendation: async (recommendation) => {
        const { id } = recommendation
        
        // Mark as executing
        set((state) => {
          state.executingIds.add(id)
          state.error = null
        })

        try {
          const response = await fetch('/api/trading/execute-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recommendation)
          })

          if (!response.ok) {
            throw new Error(`Failed to execute recommendation: ${response.statusText}`)
          }

          const result = await response.json()

          set((state) => {
            // Update recommendation with execution data
            const index = state.recommendations.findIndex(r => r.id === id)
            if (index >= 0) {
              state.recommendations[index] = {
                ...state.recommendations[index],
                executionMetadata: {
                  ...state.recommendations[index].executionMetadata,
                  executed: true,
                  executedAt: new Date(),
                  orderId: result.orderId,
                  executionPrice: result.executionPrice
                }
              }
            }

            // Update stats
            state.generationStats.successfulExecutions++
            state.executingIds.delete(id)
            state.lastUpdate = new Date()
          })

          return result

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to execute recommendation'
            state.generationStats.failedExecutions++
            state.executingIds.delete(id)
          })
          throw error
        }
      },

      generateRecommendation: async (symbol) => {
        set((state) => {
          state.isGenerating = true
          state.error = null
        })

        try {
          const response = await fetch('/api/ai/generate-recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
          })

          if (!response.ok) {
            throw new Error(`Failed to generate recommendation: ${response.statusText}`)
          }

          const recommendation = await response.json()
          
          // Add the recommendation to store
          get().addRecommendation(recommendation)
          
          set((state) => {
            state.isGenerating = false
          })

          return recommendation

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to generate recommendation'
            state.isGenerating = false
          })
          return null
        }
      },

      refreshRecommendations: async () => {
        set((state) => {
          state.isGenerating = true
          state.error = null
        })

        try {
          const response = await fetch('/api/ai/recommendations')
          
          if (!response.ok) {
            throw new Error('Failed to fetch recommendations')
          }

          const recommendations = await response.json()

          set((state) => {
            state.recommendations = recommendations
            const now = new Date()
            state.activeRecommendations = recommendations.filter((r: AIRecommendation) => 
              new Date(r.expiresAt) > now
            )
            state.lastUpdate = new Date()
            state.isGenerating = false
          })

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to refresh recommendations'
            state.isGenerating = false
          })
        }
      },

      clearExpiredRecommendations: () =>
        set((state) => {
          const now = new Date()
          state.recommendations = state.recommendations.filter(r => 
            new Date(r.expiresAt) > now
          )
          state.activeRecommendations = state.recommendations
        }),

      setGenerating: (generating) =>
        set((state) => {
          state.isGenerating = generating
        }),

      setError: (error) =>
        set((state) => {
          state.error = error
        }),

      getRecommendationsBySymbol: (symbol) => {
        const { recommendations } = get()
        return recommendations.filter(r => r.symbol === symbol)
      },

      getHighConfidenceRecommendations: (minConfidence) => {
        const { activeRecommendations } = get()
        return activeRecommendations.filter(r => r.confidence >= minConfidence)
      }
    }))
  )
)
