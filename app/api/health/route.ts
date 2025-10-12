// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: 'unknown',
      alpaca: 'unknown',
    },
  };

  try {
    // Check Supabase connection using singleton server client
    const supabase = createServerSupabaseClient();

    const { error: dbError } = await supabase
      .from('bot_metrics')
      .select('id')
      .limit(1);

    checks.services.database = dbError ? 'unhealthy' : 'healthy';

    // Check Alpaca API
    const alpacaResponse = await fetch(
      `${process.env.ALPACA_BASE_URL}/v2/account`,
      {
        headers: {
          'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID!,
          'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!,
        },
      }
    );

    checks.services.alpaca = alpacaResponse.ok ? 'healthy' : 'unhealthy';

    // Overall status
    checks.status =
      checks.services.database === 'healthy' && checks.services.alpaca === 'healthy'
        ? 'healthy'
        : 'degraded';

    return NextResponse.json(checks);
  } catch (error) {
    return NextResponse.json(
      {
        ...checks,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}