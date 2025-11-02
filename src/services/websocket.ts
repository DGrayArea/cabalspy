import { TokenData } from '@/types/token';

type WebSocketCallback = (data?: unknown) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, WebSocketCallback[]> = new Map();
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
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

  send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  subscribe(event: string, callback: WebSocketCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  unsubscribe(event: string, callback: WebSocketCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
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

    this.wsService.subscribe('message', (data: unknown) => {
      this.routeIncomingMessage(data);
    });

    this.wsService.subscribe('error', (error: unknown) => {
      console.error('PumpAPI WebSocket error:', error);
    });
  }

  private handleTokenUpdateSafe(data: unknown): void {
    if (!data) return;
    try {
      this.handleTokenUpdate(data);
    } catch (e) {
      console.warn('Skipping unparsable token message', e);
    }
  }

  private handleTokenUpdate(data: unknown): void {
    // Transform incoming data (new token/trade) to our TokenData format
    const d = data as Record<string, unknown>;
    const tokenData: TokenData = {
      id: (d.mint || d.id || d.address || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || d.ticker || 'Token') as string,
      symbol: (d.symbol || d.ticker || 'TKN') as string,
      icon: this.getTokenIcon((d.symbol as string) || ''),
      image: (d.image || d.imageUrl || d.logo || undefined) as string | undefined,
      time: this.formatTime((d.timestamp || d.ts || Date.now()) as number),
      marketCap: (d.marketCap || d.mc || 0) as number,
      volume: (d.volume || d.vol || 0) as number,
      fee: (d.fee || 0) as number,
      transactions: (d.transactions || d.txCount || d.trades || 0) as number,
      percentages: this.calculatePercentages((d.priceChange || d.pct || 0) as number),
      price: (d.price || d.p || d.solPrice || 0) as number,
      activity: {
        Q: (d.quality || 0) as number,
        views: (d.views || 0) as number,
        holders: (d.holders || 0) as number,
        trades: (d.trades || d.txCount || 0) as number
      }
    };

    this.tokenData.set(tokenData.id, tokenData);
    this.wsService.emit('tokenUpdate', tokenData);
  }

  private routeIncomingMessage(raw: unknown): void {
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
    const payloadData = payload as Record<string, unknown>;
    const data = (payloadData.data || payloadData) as Record<string, unknown>;

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

  onError(callback: (err: Error | unknown) => void): void {
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

  private isMigrationEvent(d: unknown): boolean {
    if (!d) return false;
    const data = d as Record<string, unknown>;
    return Boolean(
      data.migration || data.migrated || data.event === 'migration' || data.type === 'migration' || data.isMigrated === true
    );
  }

  private isFinalStretchEvent(d: unknown): boolean {
    if (!d) return false;
    const data = d as Record<string, unknown>;
    const pct = (data.progressPct ?? data.progress ?? data.saleProgressPct ?? 0) as number;
    const stage = ((data.stage || data.state || '') as string).toLowerCase();
    return Boolean(data.finalStretch === true || stage.includes('final') || pct >= 90);
  }

  private toTokenData(data: unknown): TokenData {
    const d = data as Record<string, unknown>;
    return {
      id: (d.mint || d.id || d.address || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || d.ticker || 'Token') as string,
      symbol: (d.symbol || d.ticker || 'TKN') as string,
      icon: this.getTokenIcon((d.symbol as string) || ''),
      image: (d.image || d.imageUrl || d.logo || undefined) as string | undefined,
      time: this.formatTime((d.timestamp || d.ts || Date.now()) as number),
      marketCap: (d.marketCap || d.mc || 0) as number,
      volume: (d.volume || d.vol || 0) as number,
      fee: (d.fee || 0) as number,
      transactions: (d.transactions || d.txCount || d.trades || 0) as number,
      percentages: this.calculatePercentages((d.priceChange || d.pct || 0) as number),
      price: (d.price || d.p || d.solPrice || 0) as number,
      activity: {
        Q: (d.quality || 0) as number,
        views: (d.views || 0) as number,
        holders: (d.holders || 0) as number,
        trades: (d.trades || d.txCount || 0) as number
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
