import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory bot state for development
// In production, this would be stored in a database
let botState = {
  enabled: false,
  lastToggle: new Date(),
  mode: 'BALANCED'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enabled } = body

    // Update bot state
    botState = {
      ...botState,
      enabled: Boolean(enabled),
      lastToggle: new Date()
    }

    // In production, you would:
    // 1. Update database with new bot state
    // 2. Send signal to AI trading service
    // 3. Update monitoring/logging systems
    
    console.log(`AI Trading Bot ${enabled ? 'started' : 'stopped'} at ${botState.lastToggle}`)

    return NextResponse.json({
      success: true,
      botState,
      message: `Bot ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('Bot toggle error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle bot state' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(botState)
}