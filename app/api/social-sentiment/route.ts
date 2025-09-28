import { NextRequest, NextResponse } from 'next/server'
import { socialMediaService } from '@/lib/sentiment/socialMediaService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type') || 'analysis'
    const hours = parseInt(searchParams.get('hours') || '24')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'analysis':
        const analysis = await socialMediaService.analyzeSocialSentiment(symbol.toUpperCase(), hours)
        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          analysis,
          timestamp: new Date().toISOString()
        })

      case 'influencers':
        const influencerSentiment = await socialMediaService.getInfluencerSentiment(symbol.toUpperCase())
        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          influencerSentiment,
          timestamp: new Date().toISOString()
        })

      case 'momentum':
        const momentum = await socialMediaService.trackSocialMomentum(symbol.toUpperCase())
        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          momentum,
          timestamp: new Date().toISOString()
        })

      case 'combined':
        const combined = await socialMediaService.getCombinedSentiment(symbol.toUpperCase())
        return NextResponse.json({
          symbol: symbol.toUpperCase(),
          combined,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: analysis, influencers, momentum, or combined' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Social sentiment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update_influencer_accuracy':
        await socialMediaService.updateInfluencerAccuracy()
        return NextResponse.json({
          success: true,
          message: 'Influencer accuracy updated successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Social sentiment POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}