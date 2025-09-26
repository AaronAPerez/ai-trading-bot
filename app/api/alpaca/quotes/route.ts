import React from 'react';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || ['AAPL'];
    
    const apiKey = process.env.ALPACA_API_KEY || process.env.ALPACA_API_KEY_ID;
    const secretKey = process.env.ALPACA_SECRET_KEY || process.env.ALPACA_API_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Alpaca API credentials not configured'
      }, { status: 500 });
    }

    const alpacaModule = await import('@alpacahq/alpaca-trade-api');
    const Alpaca = alpacaModule.default || alpacaModule;
    
    const alpaca = new Alpaca({
      credentials: {
        key: apiKey,
        secret: secretKey,
      },
      paper: process.env.ALPACA_PAPER !== 'false',
    });

    console.log('Fetching quotes for symbols:', symbols);
    
    const quotes: Record<string, any> = {};
    
    // Try to get real quotes using available methods
    for (const symbol of symbols) {
      try {
        let quote = null;
        
        // Try getLastQuote method first
        if (typeof alpaca.z === 'function') {
          try {
            quote = await alpaca.getLastQuote(symbol);
            console.log(`Got quote for ${symbol} using getLastQuote`);
          } catch (quoteError: any) {
            if (quoteError.statusCode === 401) {
              // Suppress 401 errors - expected for accounts without market data subscription
            } else {
              console.log(`getLastQuote failed for ${symbol}:`, quoteError.message);
            }
          }
        }
        
        // Try lastQuote method as fallback
        if (!quote && typeof alpaca.lastQuote === 'function') {
          try {
            quote = await alpaca.lastQuote(symbol);
            console.log(`Got quote for ${symbol} using lastQuote`);
          } catch (quoteError: any) {
            if (quoteError.statusCode !== 401) {
              console.log(`lastQuote failed for ${symbol}:`, quoteError.message);
            }
          }
        }
        
        if (quote) {
          // Format the quote data
          quotes[symbol] = {
            bp: quote.bidprice || quote.bid || quote.bp || 0,
            ap: quote.askprice || quote.ask || quote.ap || 0,
            bs: quote.bidsize || quote.bs || 100,
            as: quote.asksize || quote.as || 100,
            t: quote.timestamp || quote.t || new Date().toISOString()
          };
        } else {
          throw new Error(`No quote data available for ${symbol}`);
        }

      } catch (symbolError) {
        console.error(`Error getting quote for ${symbol}:`, symbolError.message);
        throw symbolError;
      }
    }
    
    // Format all quotes to our standard format
    const formattedQuotes: Record<string, any> = {};
    for (const [symbol, quote] of Object.entries(quotes)) {
      const quoteData = quote as any;
      const bid = quoteData.bp || 0;
      const ask = quoteData.ap || 0;
      
      formattedQuotes[symbol] = {
        symbol,
        bidPrice: bid,
        askPrice: ask,
        bidSize: quoteData.bs || 0,
        askSize: quoteData.as || 0,
        timestamp: new Date(quoteData.t || Date.now()),
        spread: ask - bid,
        midPrice: (bid + ask) / 2
      };
    }

    return NextResponse.json({
      success: true,
      quotes: formattedQuotes,
      note: 'Real-time quotes from Alpaca API'
    });

  } catch (error) {
    console.error('Quotes API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real quotes from Alpaca API',
      details: error.message
    }, { status: 500 });
  }
}


