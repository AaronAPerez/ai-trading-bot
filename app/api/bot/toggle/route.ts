import { NextRequest, NextResponse } from 'next/server'

let botState = {
  enabled: false,
  lastToggle: new Date(),
  mode: 'BALANCED'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enabled } = body

    botState = {
      ...botState,
      enabled: Boolean(enabled),
      lastToggle: new Date()
    }
    
    console.log(`AI Trading Bot ${enabled ? 'started' : 'stopped'}`)

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