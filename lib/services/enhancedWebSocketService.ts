
// ===============================================
// ENHANCED WEBSOCKET SERVICE WITH CONNECTION POOL
// lib/services/enhancedWebSocketService.ts
// ===============================================

export interface WebSocketConfig {
  url: string;
  auth: {
    key: string;
    secret: string;
  };
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

export interface AlpacaMessage {
  T: string; // Message type
  S?: string; // Symbol
  p?: number; // Price
  s?: number; // Size
  t?: number; // Timestamp
  o?: number; // Open
  h?: number; // High
  l?: number; // Low
  c?: number; // Close
  v?: number; // Volume
  bp?: number; // Bid price
  ap?: number; // Ask price
  bs?: number; // Bid size
  as?: number; // Ask size
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export class EnhancedWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isAuthenticated = false;
  private subscribedSymbols: Set<string> = new Set();
  private connectionPool: Map<string, WebSocket> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private statusSubscribers: Set<(status: ConnectionStatus) => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
      ...config,
    };
  }

  // ===============================================
  // CONNECTION MANAGEMENT
  // ===============================================

  /**
   * Connect to WebSocket with authentication
   */
  async connect(symbols: string[] = []): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      if (symbols.length > 0) {
        this.subscribe(symbols);
      }
      return;
    }

    this.updateStatus('connecting');
    console.log('🔌 Connecting to Alpaca WebSocket...');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.authenticate()
            .then(() => {
              this.updateStatus('connected');
              this.reconnectAttempts = 0;
              this.startHeartbeat();
              this.processMessageQueue();
              
              if (symbols.length > 0) {
                this.subscribe(symbols);
              }
              
              resolve();
            })
            .catch(reject);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.updateStatus('error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.updateStatus('disconnected');
          this.isAuthenticated = false;
          this.handleDisconnect();
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        this.updateStatus('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isAuthenticated = false;
    this.subscribedSymbols.clear();
    this.updateStatus('disconnected');
    console.log('🔌 WebSocket service disconnected');
  }

  /**
   * Update connection status and notify subscribers
   */
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusSubscribers.forEach(callback => callback(status));
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusSubscribers.add(callback);
    callback(this.status); // Immediately notify with current status
    
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  // ===============================================
  // AUTHENTICATION
  // ===============================================

  /**
   * Authenticate with Alpaca WebSocket
   */
  private async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authMessage = {
        action: 'auth',
        key: this.config.auth.key,
        secret: this.config.auth.secret,
      };

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      // Listen for auth response
      const authHandler = (data: any) => {
        if (data[0]?.T === 'success' && data[0]?.msg === 'authenticated') {
          clearTimeout(timeout);
          this.isAuthenticated = true;
          console.log('✅ WebSocket authenticated');
          resolve();
        } else if (data[0]?.T === 'error') {
          clearTimeout(timeout);
          reject(new Error(data[0]?.msg || 'Authentication failed'));
        }
      };

      // Temporary subscription for auth response
      this.on('success', authHandler);
      this.on('error', authHandler);

      // Send auth message
      this.send(authMessage);
    });
  }

  // ===============================================
  // SUBSCRIPTION MANAGEMENT
  // ===============================================

  /**
   * Subscribe to symbols
   */
  subscribe(symbols: string[]): void {
    if (!this.isAuthenticated) {
      console.warn('⚠️  Not authenticated, queueing subscription');
      this.queueMessage({ action: 'subscribe', symbols });
      return;
    }

    const newSymbols = symbols.filter(s => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) {
      console.log('✅ Already subscribed to all symbols');
      return;
    }

    const subscribeMessage = {
      action: 'subscribe',
      trades: newSymbols,
      quotes: newSymbols,
      bars: newSymbols,
    };

    this.send(subscribeMessage);
    newSymbols.forEach(s => this.subscribedSymbols.add(s));
    console.log(`📊 Subscribed to: ${newSymbols.join(', ')}`);
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]): void {
    if (!this.isAuthenticated) {
      return;
    }

    const subscribedOnly = symbols.filter(s => this.subscribedSymbols.has(s));
    if (subscribedOnly.length === 0) {
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      trades: subscribedOnly,
      quotes: subscribedOnly,
      bars: subscribedOnly,
    };

    this.send(unsubscribeMessage);
    subscribedOnly.forEach(s => this.subscribedSymbols.delete(s));
    console.log(`🚫 Unsubscribed from: ${subscribedOnly.join(', ')}`);
  }

  /**
   * Get currently subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  // ===============================================
  // MESSAGE HANDLING
  // ===============================================

  /**
   * Send message to WebSocket
   */
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: any): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push(message);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const messages = JSON.parse(data);
      const messageArray = Array.isArray(messages) ? messages : [messages];

      messageArray.forEach((msg: AlpacaMessage) => {
        const messageType = msg.T;

        // Notify all subscribers for this message type
        const typeSubscribers = this.subscribers.get(messageType);
        if (typeSubscribers) {
          typeSubscribers.forEach(callback => callback(msg));
        }

        // Notify symbol-specific subscribers
        if (msg.S) {
          const symbolSubscribers = this.subscribers.get(`${messageType}:${msg.S}`);
          if (symbolSubscribers) {
            symbolSubscribers.forEach(callback => callback(msg));
          }
        }

        // Notify all subscribers
        const allSubscribers = this.subscribers.get('*');
        if (allSubscribers) {
          allSubscribers.forEach(callback => callback(msg));
        }
      });
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  /**
   * Subscribe to specific message types or symbols
   */
  on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  // ===============================================
  // HEARTBEAT & RECONNECTION
  // ===============================================

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      } else {
        this.handleDisconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      this.updateStatus('reconnecting');

      this.reconnectTimeout = setTimeout(() => {
        const symbols = Array.from(this.subscribedSymbols);
        this.connect(symbols).catch((error) => {
          console.error('❌ Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.updateStatus('error');
    }
  }

  // ===============================================
  // CONNECTION POOL MANAGEMENT
  // ===============================================

  /**
   * Create connection pool for multiple WebSocket connections
   */
  createConnectionPool(poolSize: number, symbols: string[][]): Promise<void[]> {
    const connections = symbols.map((symbolGroup, index) => {
      return new Promise<void>((resolve, reject) => {
        const poolWs = new WebSocket(this.config.url);
        const poolKey = `pool-${index}`;

        poolWs.onopen = () => {
          this.connectionPool.set(poolKey, poolWs);
          // Authenticate and subscribe to this group
          this.authenticateConnection(poolWs)
            .then(() => {
              this.subscribeConnection(poolWs, symbolGroup);
              resolve();
            })
            .catch(reject);
        };

        poolWs.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        poolWs.onerror = reject;
      });
    });

    return Promise.all(connections);
  }

  /**
   * Authenticate a specific WebSocket connection
   */
  private async authenticateConnection(ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const authMessage = {
        action: 'auth',
        key: this.config.auth.key,
        secret: this.config.auth.secret,
      };

      const timeout = setTimeout(() => reject(new Error('Auth timeout')), 10000);

      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data[0]?.T === 'success') {
          clearTimeout(timeout);
          ws.removeEventListener('message', handler);
          resolve();
        }
      };

      ws.addEventListener('message', handler);
      ws.send(JSON.stringify(authMessage));
    });
  }

  /**
   * Subscribe a specific connection to symbols
   */
  private subscribeConnection(ws: WebSocket, symbols: string[]): void {
    const subscribeMessage = {
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols,
    };

    ws.send(JSON.stringify(subscribeMessage));
  }

  // ===============================================
  // UTILITY METHODS
  // ===============================================

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    status: ConnectionStatus;
    reconnectAttempts: number;
    subscribedSymbols: number;
    queuedMessages: number;
    isAuthenticated: boolean;
  } {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      subscribedSymbols: this.subscribedSymbols.size,
      queuedMessages: this.messageQueue.length,
      isAuthenticated: this.isAuthenticated,
    };
  }

  /**
   * Clear all subscribers
   */
  clearAllSubscribers(): void {
    this.subscribers.clear();
    this.statusSubscribers.clear();
  }
}

// ===============================================
// SINGLETON INSTANCE
// ===============================================

let enhancedWebSocketInstance: EnhancedWebSocketService | null = null;

export function getEnhancedWebSocketService(): EnhancedWebSocketService {
  if (!enhancedWebSocketInstance) {
    enhancedWebSocketInstance = new EnhancedWebSocketService({
      url: 'wss://stream.data.alpaca.markets/v2/iex',
      auth: {
        key: process.env.NEXT_PUBLIC_APCA_API_KEY_ID || '',
        secret: process.env.NEXT_PUBLIC_APCA_API_SECRET_KEY || '',
      },
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
    });
  }

  return enhancedWebSocketInstance;
}

export default getEnhancedWebSocketService();