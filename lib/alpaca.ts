import Alpaca from '@alpacahq/alpaca-trade-api'
export default new Alpaca({
  keyId: process.env.ALPACA_API_KEY_ID!,
  secretKey: process.env.ALPACA_API_SECRET_KEY!,
  paper: process.env.ALPACA_PAPER === 'true',
  baseUrl: process.env.ALPACA_API_BASE_URL,
})

