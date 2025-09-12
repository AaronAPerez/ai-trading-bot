import { AlpacaApi } from '@alpacahq/alpaca-trade-api'

async function testAlpacaConnection() {
  try {
    const alpaca = new AlpacaApi({
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_SECRET_KEY,
      paper: process.env.ALPACA_PAPER === 'true'
    })

    console.log('🔄 Testing Alpaca connection...')
    
    // Test account access
    const account = await alpaca.getAccount()
    console.log('✅ Account connection successful')
    console.log(`   Account Type: ${process.env.ALPACA_PAPER === 'true' ? 'PAPER' : 'LIVE'}`)
    console.log(`   Balance: ${parseFloat(account.portfolio_value).toLocaleString()}`)
    console.log(`   Cash: ${parseFloat(account.cash).toLocaleString()}`)
    console.log(`   Day Trades: ${account.daytrade_count}/3`)
    
    // Test market data
    const quotes = await alpaca.getLatestQuotes(['AAPL', 'MSFT'])
    console.log('✅ Market data connection successful')
    console.log(`   AAPL: ${quotes.AAPL.ap} (ask)`)
    console.log(`   MSFT: ${quotes.MSFT.ap} (ask)`)
    
    // Test positions
    const positions = await alpaca.getPositions()
    console.log(`✅ Positions loaded: ${positions.length} active positions`)
    
    positions.forEach(pos => {
      const pnl = parseFloat(pos.unrealized_pl)
      console.log(`   ${pos.symbol}: ${pos.qty} shares, P&L: ${pnl.toFixed(2)}`)
    })
    
    console.log('\n🎉 All Alpaca API tests passed!')
    
  } catch (error) {
    console.error('❌ Alpaca connection test failed:')
    console.error(error.message)
    
    if (error.message.includes('Unauthorized')) {
      console.log('\n💡 Check your API keys in .env.local:')
      console.log('   ALPACA_API_KEY=your_key_here')
      console.log('   ALPACA_SECRET_KEY=your_secret_here')
    }
    
    process.exit(1)
  }
}

testAlpacaConnection()