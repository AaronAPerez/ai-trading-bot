
// ===============================================
// RISK MANAGEMENT STORE SLICE
// src/store/slices/riskSlice.ts
// ===============================================

import { create, StateCreator } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface RiskAssessment {
  id: string
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  stopLoss: number
  targetPrice: number
  riskAmount: number
  potentialReward: number
  riskRewardRatio: number
  positionSize: number
  accountRiskPercent: number
  overallRiskScore: number
  warnings: string[]
  recommendations: string[]
  timestamp: Date
}

export interface PortfolioRisk {
  totalValue: number
  valueAtRisk: number // VaR
  sharpeRatio: number
  beta: number
  maxDrawdown: number
  concentrationRisk: number
  correlationRisk: number
  volatility: number
  riskScore: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'
}

export interface RiskLimit {
  maxPositionSize: number // % of portfolio
  maxDailyLoss: number // % of portfolio
  maxOverallRisk: number // % of portfolio
  minRiskRewardRatio: number
  maxConcentration: number // % in single symbol
  maxCorrelation: number // max correlation coefficient
  maxLeverage: number
}

interface RiskState {
  assessments: RiskAssessment[]
  portfolioRisk: PortfolioRisk | null
  riskLimits: RiskLimit
  violatedLimits: string[]
  riskHistory: Array<{
    timestamp: Date
    portfolioRisk: PortfolioRisk
  }>
  isCalculating: boolean
  error: string | null
  lastUpdate: Date | null
}

interface RiskActions {
  addAssessment: (assessment: RiskAssessment) => void
  updateAssessment: (id: string, updates: Partial<RiskAssessment>) => void
  removeAssessment: (id: string) => void
  setPortfolioRisk: (risk: PortfolioRisk) => void
  updateRiskLimits: (limits: Partial<RiskLimit>) => void
  checkRiskLimits: (portfolioValue: number, positions: any[]) => string[]
  calculatePositionRisk: (params: {
    symbol: string
    action: 'BUY' | 'SELL'
    quantity: number
    entryPrice: number
    stopLoss: number
    targetPrice: number
    accountBalance: number
  }) => RiskAssessment
  assessTradeRisk: (params: {
    symbol: string
    action: 'BUY' | 'SELL'
    quantity: number
    entryPrice: number
    accountBalance: number
  }) => Promise<RiskAssessment>
  addToRiskHistory: (risk: PortfolioRisk) => void
  clearOldAssessments: () => void
  setCalculating: (calculating: boolean) => void
  setError: (error: string | null) => void
  getAssessmentBySymbol: (symbol: string) => RiskAssessment | undefined
  getHighRiskPositions: () => RiskAssessment[]
}

export type RiskSlice = RiskState & RiskActions
export type RiskStore = RiskState & RiskActions

const initialRiskState: RiskState = {
  assessments: [],
  portfolioRisk: null,
  riskLimits: {
    maxPositionSize: 20, // 20% of portfolio
    maxDailyLoss: 5, // 5% daily loss limit
    maxOverallRisk: 10, // 10% total risk
    minRiskRewardRatio: 1.5, // minimum 1.5:1
    maxConcentration: 30, // 30% in single symbol
    maxCorrelation: 0.8, // 0.8 correlation coefficient
    maxLeverage: 2 // 2x max leverage
  },
  violatedLimits: [],
  riskHistory: [],
  isCalculating: false,
  error: null,
  lastUpdate: null
}

// Slice creator function for unified store
export const createRiskSlice: StateCreator<RiskSlice> = (set, get) => ({
  ...initialRiskState,

  addAssessment: (assessment) =>
    set((state: any) => {
      // Remove old assessment for same symbol
      state.assessments = state.assessments.filter(
        (a: RiskAssessment) => a.symbol !== assessment.symbol
      )
      state.assessments.unshift(assessment)

      // Keep only last 100 assessments
      if (state.assessments.length > 100) {
        state.assessments = state.assessments.slice(0, 100)
      }

      state.lastUpdate = new Date()
    }),

  updateAssessment: (id, updates) =>
    set((state: any) => {
      const index = state.assessments.findIndex((a: RiskAssessment) => a.id === id)
      if (index >= 0) {
        Object.assign(state.assessments[index], updates)
        state.lastUpdate = new Date()
      }
    }),

  removeAssessment: (id) =>
    set((state: any) => {
      state.assessments = state.assessments.filter((a: RiskAssessment) => a.id !== id)
    }),

  setPortfolioRisk: (risk) =>
    set((state: any) => {
      state.portfolioRisk = risk
      state.lastUpdate = new Date()

      // Add to history
      ;(get() as RiskSlice).addToRiskHistory(risk)
    }),

  updateRiskLimits: (limits) =>
    set((state: any) => {
      Object.assign(state.riskLimits, limits)
    }),

  checkRiskLimits: (portfolioValue, positions) => {
    const { riskLimits } = get() as RiskSlice
    const violations: string[] = []

    // Check position concentration
    positions.forEach(pos => {
      const positionPercent = (Math.abs(pos.marketValue) / portfolioValue) * 100
      if (positionPercent > riskLimits.maxConcentration) {
        violations.push(
          `Position ${pos.symbol} exceeds concentration limit: ${positionPercent.toFixed(1)}% > ${riskLimits.maxConcentration}%`
        )
      }
    })

    // Check overall risk
    const totalRisk = positions.reduce((sum, pos) => {
      return sum + Math.abs(pos.unrealizedPnL)
    }, 0)
    const riskPercent = (totalRisk / portfolioValue) * 100

    if (riskPercent > riskLimits.maxOverallRisk) {
      violations.push(
        `Total portfolio risk exceeds limit: ${riskPercent.toFixed(1)}% > ${riskLimits.maxOverallRisk}%`
      )
    }

    set((state: any) => {
      state.violatedLimits = violations
    })

    return violations
  },

  calculatePositionRisk: (params) => {
    const { symbol, action, quantity, entryPrice, stopLoss, targetPrice, accountBalance } = params

    const riskPerShare = action === 'BUY'
      ? entryPrice - stopLoss
      : stopLoss - entryPrice

    const rewardPerShare = action === 'BUY'
      ? targetPrice - entryPrice
      : entryPrice - targetPrice

    const riskAmount = Math.abs(riskPerShare * quantity)
    const potentialReward = Math.abs(rewardPerShare * quantity)
    const riskRewardRatio = potentialReward / riskAmount

    const positionValue = entryPrice * quantity
    const positionSize = (positionValue / accountBalance) * 100
    const accountRiskPercent = (riskAmount / accountBalance) * 100

    // Calculate overall risk score (0-100, higher is riskier)
    let riskScore = 0
    riskScore += Math.min(positionSize * 2, 30) // Position size impact (max 30)
    riskScore += Math.min(accountRiskPercent * 3, 30) // Account risk impact (max 30)
    riskScore += riskRewardRatio < 1.5 ? 20 : 0 // Poor R:R ratio (20 points)
    riskScore += Math.max(0, 20 - (riskRewardRatio * 5)) // Better R:R reduces score

    const warnings: string[] = []
    const recommendations: string[] = []

    if (positionSize > 20) {
      warnings.push(`Position size ${positionSize.toFixed(1)}% exceeds recommended 20%`)
    }
    if (accountRiskPercent > 2) {
      warnings.push(`Account risk ${accountRiskPercent.toFixed(2)}% exceeds recommended 2%`)
    }
    if (riskRewardRatio < 1.5) {
      warnings.push(`Risk/reward ratio ${riskRewardRatio.toFixed(2)} is below recommended 1.5`)
      recommendations.push(`Consider adjusting target price or stop loss`)
    }
    if (riskScore > 70) {
      warnings.push('Overall risk score is HIGH')
      recommendations.push('Consider reducing position size')
    }

    const assessment: RiskAssessment = {
      id: `risk_${Date.now()}_${symbol}`,
      symbol,
      action,
      quantity,
      entryPrice,
      stopLoss,
      targetPrice,
      riskAmount,
      potentialReward,
      riskRewardRatio,
      positionSize,
      accountRiskPercent,
      overallRiskScore: riskScore,
      warnings,
      recommendations,
      timestamp: new Date()
    }

    return assessment
  },

  assessTradeRisk: async (params) => {
    set((state: any) => {
      state.isCalculating = true
      state.error = null
    })

    try {
      // Call API for comprehensive risk assessment
      const response = await fetch('/api/risk/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        throw new Error('Failed to assess trade risk')
      }

      const assessment = await response.json()

      ;(get() as RiskSlice).addAssessment(assessment)

      set((state: any) => {
        state.isCalculating = false
      })

      return assessment

    } catch (error) {
      set((state: any) => {
        state.error = error instanceof Error ? error.message : 'Failed to assess risk'
        state.isCalculating = false
      })

      // Return local calculation as fallback
      const stopLoss = params.action === 'BUY'
        ? params.entryPrice * 0.98
        : params.entryPrice * 1.02
      const targetPrice = params.action === 'BUY'
        ? params.entryPrice * 1.05
        : params.entryPrice * 0.95

      return (get() as RiskSlice).calculatePositionRisk({
        ...params,
        stopLoss,
        targetPrice
      })
    }
  },

  addToRiskHistory: (risk) =>
    set((state: any) => {
      state.riskHistory.unshift({
        timestamp: new Date(),
        portfolioRisk: risk
      })

      // Keep only last 1000 history points
      if (state.riskHistory.length > 1000) {
        state.riskHistory = state.riskHistory.slice(0, 1000)
      }
    }),

  clearOldAssessments: () =>
    set((state: any) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      state.assessments = state.assessments.filter(
        (a: RiskAssessment) => new Date(a.timestamp) > oneHourAgo
      )
    }),

  setCalculating: (calculating) =>
    set((state: any) => {
      state.isCalculating = calculating
    }),

  setError: (error) =>
    set((state: any) => {
      state.error = error
    }),

  getAssessmentBySymbol: (symbol) => {
    const { assessments } = get() as RiskSlice
    return assessments.find(a => a.symbol === symbol)
  },

  getHighRiskPositions: () => {
    const { assessments } = get() as RiskSlice
    return assessments.filter(a => a.overallRiskScore > 70)
  }
})

export const useRiskStore = create<RiskStore>()(
  subscribeWithSelector(
    immer<RiskStore>((set, get) => ({
      ...initialRiskState,

      addAssessment: (assessment) =>
        set((state) => {
          // Remove old assessment for same symbol
          state.assessments = state.assessments.filter(a => a.symbol !== assessment.symbol)
          state.assessments.unshift(assessment)

          // Keep only last 100
          if (state.assessments.length > 100) {
            state.assessments = state.assessments.slice(0, 100)
          }

          state.lastUpdate = new Date()
        }),

      updateAssessment: (id, updates) =>
        set((state) => {
          const index = state.assessments.findIndex(a => a.id === id)
          if (index >= 0) {
            Object.assign(state.assessments[index], updates)
            state.lastUpdate = new Date()
          }
        }),

      removeAssessment: (id) =>
        set((state) => {
          state.assessments = state.assessments.filter(a => a.id !== id)
        }),

      setPortfolioRisk: (risk) =>
        set((state) => {
          state.portfolioRisk = risk
          state.lastUpdate = new Date()

          // Add to history
          get().addToRiskHistory(risk)
        }),

      updateRiskLimits: (limits) =>
        set((state) => {
          Object.assign(state.riskLimits, limits)
        }),

      checkRiskLimits: (portfolioValue, positions) => {
        const { riskLimits } = get()
        const violations: string[] = []

        positions.forEach(pos => {
          const positionPercent = (Math.abs(pos.marketValue) / portfolioValue) * 100
          if (positionPercent > riskLimits.maxConcentration) {
            violations.push(
              `Position ${pos.symbol} exceeds concentration limit: ${positionPercent.toFixed(1)}% > ${riskLimits.maxConcentration}%`
            )
          }
        })

        const totalRisk = positions.reduce((sum, pos) => sum + Math.abs(pos.unrealizedPnL), 0)
        const riskPercent = (totalRisk / portfolioValue) * 100

        if (riskPercent > riskLimits.maxOverallRisk) {
          violations.push(
            `Total portfolio risk exceeds limit: ${riskPercent.toFixed(1)}% > ${riskLimits.maxOverallRisk}%`
          )
        }

        set((state) => {
          state.violatedLimits = violations
        })

        return violations
      },

      calculatePositionRisk: (params) => {
        const { symbol, action, quantity, entryPrice, stopLoss, targetPrice, accountBalance } = params

        const riskPerShare = action === 'BUY'
          ? entryPrice - stopLoss
          : stopLoss - entryPrice

        const rewardPerShare = action === 'BUY'
          ? targetPrice - entryPrice
          : entryPrice - targetPrice

        const riskAmount = Math.abs(riskPerShare * quantity)
        const potentialReward = Math.abs(rewardPerShare * quantity)
        const riskRewardRatio = potentialReward / riskAmount

        const positionValue = entryPrice * quantity
        const positionSize = (positionValue / accountBalance) * 100
        const accountRiskPercent = (riskAmount / accountBalance) * 100

        let riskScore = 0
        riskScore += Math.min(positionSize * 2, 30)
        riskScore += Math.min(accountRiskPercent * 3, 30)
        riskScore += riskRewardRatio < 1.5 ? 20 : 0
        riskScore += Math.max(0, 20 - (riskRewardRatio * 5))

        const warnings: string[] = []
        const recommendations: string[] = []

        if (positionSize > 20) {
          warnings.push(`Position size ${positionSize.toFixed(1)}% exceeds recommended 20%`)
        }
        if (accountRiskPercent > 2) {
          warnings.push(`Account risk ${accountRiskPercent.toFixed(2)}% exceeds recommended 2%`)
        }
        if (riskRewardRatio < 1.5) {
          warnings.push(`Risk/reward ratio ${riskRewardRatio.toFixed(2)} is below recommended 1.5`)
          recommendations.push(`Consider adjusting target price or stop loss`)
        }
        if (riskScore > 70) {
          warnings.push('Overall risk score is HIGH')
          recommendations.push('Consider reducing position size')
        }

        return {
          id: `risk_${Date.now()}_${symbol}`,
          symbol,
          action,
          quantity,
          entryPrice,
          stopLoss,
          targetPrice,
          riskAmount,
          potentialReward,
          riskRewardRatio,
          positionSize,
          accountRiskPercent,
          overallRiskScore: riskScore,
          warnings,
          recommendations,
          timestamp: new Date()
        }
      },

      assessTradeRisk: async (params) => {
        set((state) => {
          state.isCalculating = true
          state.error = null
        })

        try {
          const response = await fetch('/api/risk/assess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          })

          if (!response.ok) {
            throw new Error('Failed to assess trade risk')
          }

          const assessment = await response.json()
          get().addAssessment(assessment)

          set((state) => {
            state.isCalculating = false
          })

          return assessment

        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to assess risk'
            state.isCalculating = false
          })

          const stopLoss = params.action === 'BUY'
            ? params.entryPrice * 0.98
            : params.entryPrice * 1.02
          const targetPrice = params.action === 'BUY'
            ? params.entryPrice * 1.05
            : params.entryPrice * 0.95

          return get().calculatePositionRisk({
            ...params,
            stopLoss,
            targetPrice
          })
        }
      },

      addToRiskHistory: (risk) =>
        set((state) => {
          state.riskHistory.unshift({
            timestamp: new Date(),
            portfolioRisk: risk
          })

          if (state.riskHistory.length > 1000) {
            state.riskHistory = state.riskHistory.slice(0, 1000)
          }
        }),

      clearOldAssessments: () =>
        set((state) => {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
          state.assessments = state.assessments.filter(
            a => new Date(a.timestamp) > oneHourAgo
          )
        }),

      setCalculating: (calculating) =>
        set((state) => {
          state.isCalculating = calculating
        }),

      setError: (error) =>
        set((state) => {
          state.error = error
        }),

      getAssessmentBySymbol: (symbol) => {
        return get().assessments.find(a => a.symbol === symbol)
      },

      getHighRiskPositions: () => {
        return get().assessments.filter(a => a.overallRiskScore > 70)
      }
    }))
  )
)
