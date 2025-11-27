/**
 * ============================================================================
 * ISOLATED PROTOCOL WEBSOCKET MONITORING
 * ============================================================================
 * 
 * Real-time WebSocket monitoring for Moonshot and Jupiter Studio protocols.
 * 
 * TO DISABLE: Comment out the entire file or set ENABLE_PROTOCOL_WS_MONITORING = false
 * 
 * This service monitors:
 * - Moonshot: New token creation and migrations
 * - Jupiter Studio (Meteora DBC): New bonding curve pools and migrations
 * 
 * Based on the free Solana launchpad APIs strategy document.
 */

// Feature flag - set to false to disable all WebSocket monitoring
const ENABLE_PROTOCOL_WS_MONITORING = true;

// Program IDs (verify these are current)
const MOONSHOT_PROGRAM_ID = "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG";
const JUPITER_STUDIO_DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
const RAYDIUM_AMM_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_LAUNCHPAD_PROGRAM_ID = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";

export interface ProtocolEvent {
  platform: 'moonshot' | 'jupiter-studio' | 'raydium' | 'raydium-launchpad';
  eventType: 'new_token' | 'new_pool' | 'migrated';
  signature: string;
  timestamp: number;
  tokenMint?: string;
  poolAddress?: string;
}

export class ProtocolWebSocketMonitor {
  private wsConnection: WebSocket | null = null;
  private rpcWsUrl: string;
  private listeners: Map<string, ((event: ProtocolEvent) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;

  constructor(rpcWsUrl?: string) {
    // Use provided WebSocket URL or construct from RPC URL
    this.rpcWsUrl = rpcWsUrl || 
      process.env.NEXT_PUBLIC_SOLANA_WS_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ||
      (process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com")
        .replace("https://", "wss://")
        .replace("http://", "ws://");
  }

  /**
   * Connect to Solana RPC WebSocket and subscribe to protocol events
   * 
   * TO DISABLE: Comment out calls to connect() or set ENABLE_PROTOCOL_WS_MONITORING = false
   */
  async connect(): Promise<void> {
    if (!ENABLE_PROTOCOL_WS_MONITORING) {
      console.log("⚠️ Protocol WebSocket monitoring is disabled");
      return;
    }

    if (this.isConnecting || (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.wsConnection = new WebSocket(this.rpcWsUrl);

      this.wsConnection.onopen = () => {
        console.log("✅ Protocol WebSocket Monitor connected");
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.subscribeToProtocols();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.handleRPCResponse(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error("Protocol WebSocket error:", error);
        this.isConnecting = false;
      };

      this.wsConnection.onclose = () => {
        console.log("Protocol WebSocket disconnected");
        this.isConnecting = false;
        this.handleReconnect();
      };
    } catch (error) {
      console.error("Failed to connect Protocol WebSocket:", error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  /**
   * Subscribe to protocol program logs
   */
  private subscribeToProtocols(): void {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    // Subscribe to transaction events for all protocol programs
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "transactionSubscribe",
      params: [
        {
          failed: false,
          accountInclude: [
            MOONSHOT_PROGRAM_ID,
            JUPITER_STUDIO_DBC_PROGRAM_ID,
            RAYDIUM_AMM_PROGRAM_ID,
            RAYDIUM_LAUNCHPAD_PROGRAM_ID,
          ],
        },
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
          transactionDetails: "full",
          maxSupportedTransactionVersion: 0,
        },
      ],
    };

    try {
      this.wsConnection.send(JSON.stringify(request));
      console.log("📡 Subscribed to protocol program events");
    } catch (error) {
      console.error("Error subscribing to protocols:", error);
    }
  }

  /**
   * Handle RPC subscription responses
   */
  private handleRPCResponse(data: any): void {
    if (!data.params?.result) {
      return;
    }

    const { transaction, signature } = data.params.result;
    const logs = transaction.meta?.logMessages || [];

    // Detect platform and event type from logs
    let platform: ProtocolEvent['platform'] | null = null;
    let eventType: ProtocolEvent['eventType'] | null = null;
    let tokenMint: string | undefined;
    let poolAddress: string | undefined;

    // Moonshot detection
    if (logs.some((log: string) => log.includes('Program Moon') && log.includes('tokenMint'))) {
      platform = 'moonshot';
      eventType = 'new_token';
      // Extract token mint from transaction accounts
      const accounts = transaction.transaction?.message?.accountKeys || [];
      tokenMint = accounts.find((acc: any) => acc.pubkey && acc.pubkey !== MOONSHOT_PROGRAM_ID)?.pubkey;
    } else if (logs.some((log: string) => log.includes('Program Moon') && log.includes('migrateFunds'))) {
      platform = 'moonshot';
      eventType = 'migrated';
    }

    // Jupiter Studio (DBC) detection
    if (logs.some((log: string) => log.includes('Program dbci') && log.includes('initialize_virtual_pool'))) {
      platform = 'jupiter-studio';
      eventType = 'new_pool';
      const accounts = transaction.transaction?.message?.accountKeys || [];
      poolAddress = accounts.find((acc: any) => acc.pubkey && acc.pubkey !== JUPITER_STUDIO_DBC_PROGRAM_ID)?.pubkey;
    } else if (logs.some((log: string) => log.includes('Program dbci') && log.includes('migrate_meteora'))) {
      platform = 'jupiter-studio';
      eventType = 'migrated';
    }

    // Raydium detection
    if (logs.some((log: string) => log.includes('Program 675kPX') && log.includes('initialize2'))) {
      platform = 'raydium';
      eventType = 'new_pool';
      const accounts = transaction.transaction?.message?.accountKeys || [];
      poolAddress = accounts.find((acc: any) => acc.pubkey && acc.pubkey !== RAYDIUM_AMM_PROGRAM_ID)?.pubkey;
    } else if (logs.some((log: string) => log.includes('Program LanMV') && log.includes('initialize_v2'))) {
      platform = 'raydium-launchpad';
      eventType = 'new_pool';
    } else if (logs.some((log: string) => log.includes('migrateFunds') || log.includes('migrate_to_amm'))) {
      // Migration detection - determine platform from other logs
      if (logs.some((log: string) => log.includes('Moon'))) {
        platform = 'moonshot';
      } else if (logs.some((log: string) => log.includes('LanM'))) {
        platform = 'raydium-launchpad';
      } else if (logs.some((log: string) => log.includes('dbci'))) {
        platform = 'jupiter-studio';
      } else {
        platform = 'raydium';
      }
      eventType = 'migrated';
    }

    if (platform && eventType) {
      const event: ProtocolEvent = {
        platform,
        eventType,
        signature,
        timestamp: Date.now(),
        tokenMint,
        poolAddress,
      };

      this.emit('event', event);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached for Protocol WebSocket");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting Protocol WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to protocol events
   */
  on(event: 'event', callback: (event: ProtocolEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from protocol events
   */
  off(event: 'event', callback: (event: ProtocolEvent) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit events to listeners
   */
  private emit(event: 'event', data: ProtocolEvent): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in protocol event callback:", error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }
}

// Singleton instance (can be disabled by commenting out)
// TO DISABLE: Comment out the export below
export const protocolWebSocketMonitor = ENABLE_PROTOCOL_WS_MONITORING 
  ? new ProtocolWebSocketMonitor()
  : null;


