import { NextRequest, NextResponse } from 'next/server'
import { shadowTradingEngine } from '@/lib/shadow-trading/ShadowTradingEngine'

/**
 * Shadow Trading API
 * Endpoints for managing shadow portfolios and comparing performance
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const portfolioId = searchParams.get('portfolioId')

    switch (action) {
      case 'list':
        // Get all shadow portfolios
        const portfolios = shadowTradingEngine.getShadowPortfolios()
        return NextResponse.json({
          success: true,
          portfolios,
          count: portfolios.length
        })

      case 'get':
        // Get specific portfolio
        if (!portfolioId) {
          return NextResponse.json({
            success: false,
            error: 'portfolioId required'
          }, { status: 400 })
        }

        const portfolio = shadowTradingEngine.getShadowPortfolio(portfolioId)
        if (!portfolio) {
          return NextResponse.json({
            success: false,
            error: 'Portfolio not found'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          portfolio
        })

      case 'compare':
        // Compare shadow vs real performance
        if (!portfolioId) {
          return NextResponse.json({
            success: false,
            error: 'portfolioId required'
          }, { status: 400 })
        }

        const comparison = shadowTradingEngine.comparePerformance(portfolioId)
        if (!comparison) {
          return NextResponse.json({
            success: false,
            error: 'Portfolio not found'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          comparison
        })

      case 'export':
        // Export all shadow trading data
        const data = shadowTradingEngine.exportData()
        return NextResponse.json({
          success: true,
          data
        })

      case 'update':
        // Update shadow positions with current prices
        await shadowTradingEngine.updateShadowPositions()
        return NextResponse.json({
          success: true,
          message: 'Shadow positions updated'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: list, get, compare, export, update'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Shadow trading API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-portfolio':
        // Create new shadow portfolio
        const { name, strategyVariant, initialCapital, metadata } = body

        if (!name || !strategyVariant || !initialCapital) {
          return NextResponse.json({
            success: false,
            error: 'name, strategyVariant, and initialCapital required'
          }, { status: 400 })
        }

        const portfolio = shadowTradingEngine.createShadowPortfolio({
          name,
          strategyVariant,
          initialCapital,
          metadata
        })

        return NextResponse.json({
          success: true,
          portfolio
        })

      case 'execute-shadow-trade':
        // Execute a shadow trade
        const { portfolioId, signal } = body

        if (!portfolioId || !signal) {
          return NextResponse.json({
            success: false,
            error: 'portfolioId and signal required'
          }, { status: 400 })
        }

        const trade = await shadowTradingEngine.executeShadowTrade(portfolioId, signal)

        if (!trade) {
          return NextResponse.json({
            success: false,
            error: 'Failed to execute shadow trade'
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          trade
        })

      case 'log-real-trade':
        // Log a real trade for comparison
        const { trade: realTrade } = body

        if (!realTrade) {
          return NextResponse.json({
            success: false,
            error: 'trade required'
          }, { status: 400 })
        }

        await shadowTradingEngine.logRealTrade(realTrade)

        return NextResponse.json({
          success: true,
          message: 'Real trade logged'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: create-portfolio, execute-shadow-trade, log-real-trade'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Shadow trading API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
