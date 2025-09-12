const Alpaca = require('@alpacahq/alpaca-trade-api')

// Test different configurations
const configs = [
  {
    name: 'Config 1: Basic paper trading',
    config: {
      key: 'PKTESTPKZ2IY086UEI4VM4DP8Q',
      secret: 'qlMBTYgTrmYW0BTXGXgEChUcQdz93UgHdeCn36A8',
      paper: true,
      usePolygon: false
    }
  },
  {
    name: 'Config 2: With baseUrl v2',
    config: {
      key: 'PKTESTPKZ2IY086UEI4VM4DP8Q',
      secret: 'qlMBTYgTrmYW0BTXGXgEChUcQdz93UgHdeCn36A8',
      paper: true,
      usePolygon: false,
      baseUrl: 'https://paper-api.alpaca.markets/v2'
    }
  },
  {
    name: 'Config 3: Without v2',
    config: {
      key: 'PKTESTPKZ2IY086UEI4VM4DP8Q',
      secret: 'qlMBTYgTrmYW0BTXGXgEChUcQdz93UgHdeCn36A8',
      paper: true,
      usePolygon: false,
      baseUrl: 'https://paper-api.alpaca.markets'
    }
  }
]

async function testConnection() {
  for (const { name, config } of configs) {
    console.log(`\n🔄 Testing ${name}...`)
    try {
      const alpaca = new Alpaca(config)
      const account = await alpaca.getAccount()
      console.log('✅ Connection successful!')
      console.log('Account ID:', account.id)
      console.log('Portfolio Value:', account.portfolio_value)
      
      // Test market data
      const quotes = await alpaca.getLatestQuotes(['AAPL'])
      console.log('✅ Market data successful!')
      console.log('AAPL quote:', quotes.AAPL)
      
      break // Exit loop on success
    } catch (error) {
      console.error('❌ Failed:', error.message)
    }
  }
}

testConnection()