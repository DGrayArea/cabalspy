import { TokenData } from '@/types/token';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private heartbeatIntervalId: any = null;
  private heartbeatMs = 20000; // 20s

  constructor(private url: string) {}

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        // start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected');
        this.stopHeartbeat();
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        } catch {}
      }
    }, this.heartbeatMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  unsubscribe(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// PumpAPI WebSocket integration
export class PumpAPIService {
  private wsService: WebSocketService;
  private tokenData: Map<string, TokenData> = new Map();
  private finalStretch: Map<string, TokenData> = new Map();
  private migrated: Map<string, TokenData> = new Map();

  constructor() {
    const url = process.env.NEXT_PUBLIC_PUMPAPI_URL || 'wss://pumpportal.fun/api/data';
    this.wsService = new WebSocketService(url);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wsService.subscribe('connected', () => {
      console.log('Connected to PumpPortal');
      // Default: subscribe to new token creation events
      this.subscribeNewToken();
    });

    this.wsService.subscribe('message', (data: any) => {
      this.routeIncomingMessage(data);
    });

    this.wsService.subscribe('error', (error: any) => {
      console.error('PumpAPI WebSocket error:', error);
    });
  }

  private handleTokenUpdateSafe(data: any): void {
    if (!data) return;
    try {
      this.handleTokenUpdate(data);
    } catch (e) {
      console.warn('Skipping unparsable token message', e);
    }
  }

  private handleTokenUpdate(data: any): void {
    // Transform incoming data (new token/trade) to our TokenData format
    const tokenData: TokenData = {
      id: data.mint || data.id || data.address || crypto.randomUUID(),
      name: data.name || data.symbol || data.ticker || 'Token',
      symbol: data.symbol || data.ticker || 'TKN',
      icon: this.getTokenIcon(data.symbol),
      image: data.image || data.imageUrl || data.logo || undefined,
      time: this.formatTime(data.timestamp || data.ts || Date.now()),
      marketCap: data.marketCap || data.mc || 0,
      volume: data.volume || data.vol || 0,
      fee: data.fee || 0,
      transactions: data.transactions || data.txCount || data.trades || 0,
      percentages: this.calculatePercentages(data.priceChange || data.pct || 0),
      price: data.price || data.p || data.solPrice || 0,
      activity: {
        Q: data.quality || 0,
        views: data.views || 0,
        holders: data.holders || 0,
        trades: data.trades || data.txCount || 0
      }
    };

    this.tokenData.set(tokenData.id, tokenData);
    this.wsService.emit('tokenUpdate', tokenData);
  }

  private routeIncomingMessage(raw: any): void {
    // PumpPortal emits direct JSON messages for subscriptions
    // We accept both string and object
    const payload = typeof raw === 'string' ? safeParse(raw) : raw;
    if (!payload) return;

    // Common fields from PumpPortal examples include trade and token creation messages.
    // When subscribing to new tokens, messages often contain mint, name, symbol.
    // When subscribing to trades, messages include associated mint and possibly price/amount.
    if (Array.isArray(payload)) {
      payload.forEach((item) => this.handleTokenUpdateSafe(item));
      return;
    }

    // If payload contains a nested data field
    const data = payload.data || payload;

    // Migration detection
    if (this.isMigrationEvent(data)) {
      const t = this.toTokenData(data);
      this.migrated.set(t.id, t);
      this.wsService.emit('migrationUpdate', this.toArray(this.migrated));
      return;
    }

    // Final stretch detection
    if (this.isFinalStretchEvent(data)) {
      const t = this.toTokenData(data);
      this.finalStretch.set(t.id, t);
      this.wsService.emit('finalStretchUpdate', this.toArray(this.finalStretch));
      return;
    }

    // Heuristic: if it contains mint or token address, treat as general token update
    if (data && (data.mint || data.address || data.id)) {
      this.handleTokenUpdateSafe(data);
      return;
    }
  }

  private getTokenIcon(symbol: string): string {
    // Simple icon mapping based on symbol
    const iconMap: { [key: string]: string } = {
      'MOG': '🐕',
      'TIGER': '🐅',
      'GAME': '🎮',
      'CAT': '🐱',
      'DOGE': '🐕',
      'PEPE': '🐸',
      'SHIB': '🐕'
    };
    
    return iconMap[symbol?.toUpperCase()] || '🪙';
  }

  private formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return `${Math.floor(diff / 1000)}s`;
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m`;
    } else { // More than 1 hour
      return `${Math.floor(diff / 3600000)}h`;
    }
  }

  private calculatePercentages(priceChange: number): number[] {
    // Convert price change to percentage bars
    const percentage = Math.round(priceChange * 100);
    const bars = [];
    
    for (let i = 0; i < 5; i++) {
      if (percentage > i * 20) {
        bars.push(percentage);
      } else {
        bars.push(0);
      }
    }
    
    return bars;
  }

  connect(): void {
    this.wsService.connect();
  }

  disconnect(): void {
    this.wsService.disconnect();
  }

  subscribeToTokenUpdates(callback: (token: TokenData) => void): void {
    this.wsService.subscribe('tokenUpdate', callback);
  }

  onConnected(callback: () => void): void {
    this.wsService.subscribe('connected', callback);
  }

  onDisconnected(callback: () => void): void {
    this.wsService.subscribe('disconnected', callback);
  }

  onError(callback: (err: any) => void): void {
    this.wsService.subscribe('error', callback);
  }

  getTokenData(): Map<string, TokenData> {
    return this.tokenData;
  }

  getFinalStretch(): Map<string, TokenData> {
    return this.finalStretch;
  }

  getMigrated(): Map<string, TokenData> {
    return this.migrated;
  }

  // Public subscription helpers per PumpPortal API
  subscribeNewToken(): void {
    this.wsService.send({ method: 'subscribeNewToken' });
  }

  unsubscribeNewToken(): void {
    this.wsService.send({ method: 'unsubscribeNewToken' });
  }

  subscribeTokenTrade(keys: string[]): void {
    this.wsService.send({ method: 'subscribeTokenTrade', keys });
  }

  unsubscribeTokenTrade(keys: string[]): void {
    this.wsService.send({ method: 'unsubscribeTokenTrade', keys });
  }

  subscribeAccountTrade(keys: string[]): void {
    this.wsService.send({ method: 'subscribeAccountTrade', keys });
  }

  unsubscribeAccountTrade(keys: string[]): void {
    this.wsService.send({ method: 'unsubscribeAccountTrade', keys });
  }

  subscribeToFinalStretch(callback: (tokens: TokenData[]) => void): void {
    this.wsService.subscribe('finalStretchUpdate', callback);
  }

  subscribeToMigration(callback: (tokens: TokenData[]) => void): void {
    this.wsService.subscribe('migrationUpdate', callback);
  }

  private isMigrationEvent(d: any): boolean {
    if (!d) return false;
    return Boolean(
      d.migration || d.migrated || d.event === 'migration' || d.type === 'migration' || d.isMigrated === true
    );
  }

  private isFinalStretchEvent(d: any): boolean {
    if (!d) return false;
    const pct = d.progressPct ?? d.progress ?? d.saleProgressPct ?? 0;
    const stage = (d.stage || d.state || '').toString().toLowerCase();
    return Boolean(d.finalStretch === true || stage.includes('final') || pct >= 90);
  }

  private toTokenData(data: any): TokenData {
    return {
      id: data.mint || data.id || data.address || crypto.randomUUID(),
      name: data.name || data.symbol || data.ticker || 'Token',
      symbol: data.symbol || data.ticker || 'TKN',
      icon: this.getTokenIcon(data.symbol),
      image: data.image || data.imageUrl || data.logo || undefined,
      time: this.formatTime(data.timestamp || data.ts || Date.now()),
      marketCap: data.marketCap || data.mc || 0,
      volume: data.volume || data.vol || 0,
      fee: data.fee || 0,
      transactions: data.transactions || data.txCount || data.trades || 0,
      percentages: this.calculatePercentages(data.priceChange || data.pct || 0),
      price: data.price || data.p || data.solPrice || 0,
      activity: {
        Q: data.quality || 0,
        views: data.views || 0,
        holders: data.holders || 0,
        trades: data.trades || data.txCount || 0
      }
    };
  }

  private toArray(map: Map<string, TokenData>): TokenData[] {
    return Array.from(map.values());
  }
}

// Export singleton instance
export const pumpAPIService = new PumpAPIService();

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
