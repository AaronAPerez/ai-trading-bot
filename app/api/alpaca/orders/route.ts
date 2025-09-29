import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/api/error-handler'
import { alpacaClient } from '@/lib/alpaca/unified-client'

/**
 * POST /api/alpaca/orders
 * Create a new order with standardized error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const orderData = await request.json()

  const order = await alpacaClient.createOrder(orderData)

  return NextResponse.json({
    success: true,
    data: order,
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /api/alpaca/orders
 * Fetch orders with standardized error handling
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const direction = searchParams.get('direction') || 'desc'
  const nested = searchParams.get('nested') === 'true'

  const orders = await alpacaClient.getOrders({
    status,
    limit,
    direction,
    nested,
  })

  return NextResponse.json({
    success: true,
    data: orders,
    timestamp: new Date().toISOString(),
  })
})
