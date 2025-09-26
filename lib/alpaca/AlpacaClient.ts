// Alpaca Client (Data Access)
// src/lib/alpaca/AlpacaClient.ts
// ================================

export class AlpacaClient {
  getHistoricalData(symbol: string, arg1: string, arg2: number) {
    throw new Error("Method not implemented.")
  }
  private accountService: AlpacaAccountService
  private orderService: AlpacaOrderService  
  private marketDataService: AlpacaMarketDataService
  
  constructor(config: AlpacaConfig) {
    this.accountService = new AlpacaAccountService(config)
    this.orderService = new AlpacaOrderService(config)
    this.marketDataService = new AlpacaMarketDataService(config)
  }
  
  // Delegates to specialized services
  async getAccount() { return this.accountService.getAccount() }
  async placeOrder(order: OrderRequest) { return this.orderService.placeOrder(order) }
  async getMarketData(symbol: string) { return this.marketDataService.getData(symbol) }
}