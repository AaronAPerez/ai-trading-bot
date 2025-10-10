/**
 * DemoModeService - Centralized demo mode handling
 * Consolidates all demo/mock mode logic across the application
 */

export class DemoModeService {
  private static instance: DemoModeService
  private isDemoMode: boolean

  private constructor() {
    this.isDemoMode = process.env.NODE_ENV === 'development' ||
                     process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  }

  static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService()
    }
    return DemoModeService.instance
  }

  isDemo(): boolean {
    return this.isDemoMode
  }

  getDemoUserId(): string {
    // Centralized demo user ID generation
    return 'demo-user-uuid'
  }

  generateMockData<T>(generator: () => T): T {
    if (!this.isDemoMode) {
      throw new Error('Mock data only available in demo mode')
    }
    return generator()
  }

  /**
   * Get fallback quote data for demo mode
   */
  getFallbackQuote(symbol: string) {
    const basePrice = 100 + Math.random() * 200
    return {
      symbol,
      bid: basePrice - 0.05,
      ask: basePrice + 0.05,
      last: basePrice,
      timestamp: new Date(),
      BidPrice: basePrice - 0.05,
      AskPrice: basePrice + 0.05,
      isFallback: true
    }
  }

  /**
   * Check if API calls should use fallback data
   */
  shouldUseFallback(error: unknown): boolean {
    return this.isDemoMode && !!error
  }
}