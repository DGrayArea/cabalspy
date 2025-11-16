import { logger } from "@/lib/logger";
import { TokenData } from "@/types/token";

/**
 * Solana RPC Subscription Service
 * Based on: https://github.com/chainstacklabs/pumpfun-bonkfun-bot
 *
 * Uses direct Solana RPC subscriptions (logsSubscribe/blockSubscribe) to detect
 * new pump.fun tokens without relying on third-party APIs.
 *
 * Key concepts from the reference repo:
 * - logsSubscribe: Listen to program logs for new token mints
 * - blockSubscribe: Listen to blocks for new token transactions
 * - Associated Bonding Curve (ABC): Compute PDA for bonding curve accounts
 * - Migration detection: Listen for PumpSwap migrations
 */

export interface SolanaTokenEvent {
  mint: string;
  bondingCurve?: string;
  associatedBondingCurve?: string;
  creator?: string;
  timestamp: number;
  signature?: string;
  isMigration?: boolean;
}

export class SolanaRPCSubscriptionService {
  private rpcUrl: string;
  private subscriptionId: number | null = null;
  private wsConnection: WebSocket | null = null;
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();

  constructor() {
    this.rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";
  }

  /**
   * Connect to Solana RPC WebSocket for subscriptions
   * Note: Most RPC providers support WebSocket subscriptions
   */
  async connect(): Promise<void> {
    try {
      // Convert HTTP RPC URL to WebSocket URL
      const wsUrl = this.rpcUrl
        .replace("https://", "wss://")
        .replace("http://", "ws://");

      // For providers like Chainstack, Helius, etc., WebSocket URLs may differ
      // Check if there's a specific WebSocket URL in env
      const wsRpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_WS_URL ||
        process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ||
        wsUrl;

      this.wsConnection = new WebSocket(wsRpcUrl);

      this.wsConnection.onopen = () => {
        console.log("✅ Connected to Solana RPC WebSocket");
        this.subscribeToNewTokens();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRPCResponse(data);
        } catch (error) {
          console.error("Error parsing RPC response:", error);
        }
      };

      this.wsConnection.onerror = (error) => {
        logger.error("Solana RPC WebSocket error", error);
      };

      this.wsConnection.onclose = () => {
        console.log("Solana RPC WebSocket disconnected, reconnecting...");
        setTimeout(() => this.connect(), 3000);
      };
    } catch (error) {
      logger.error("Failed to connect to Solana RPC", error);
      throw error;
    }
  }

  /**
   * Subscribe to new token mints using logsSubscribe
   * Based on: https://github.com/chainstacklabs/pumpfun-bonkfun-bot
   *
   * Listens for pump.fun program logs to detect new token creation
   */
  private subscribeToNewTokens(): void {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    // Pump.fun program ID (verify this is correct)
    const PUMP_FUN_PROGRAM_ID =
      process.env.NEXT_PUBLIC_PUMP_FUN_PROGRAM_ID ||
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"; // Verify this is correct

    // Subscribe to logs from pump.fun program
    const subscribeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        {
          mentions: [PUMP_FUN_PROGRAM_ID],
        },
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
        },
      ],
    };

    this.wsConnection.send(JSON.stringify(subscribeRequest));
    console.log("📡 Subscribed to pump.fun token mints via logsSubscribe");
  }

  /**
   * Handle RPC subscription responses
   */
  private handleRPCResponse(data: unknown): void {
    const response = data as {
      jsonrpc?: string;
      id?: number;
      method?: string;
      params?: {
        result?: {
          value?: {
            account?: {
              data?: {
                parsed?: {
                  info?: {
                    mint?: string;
                    owner?: string;
                  };
                };
              };
            };
            signature?: string;
            err?: unknown;
          };
          subscription?: number;
        };
      };
    };

    // Handle subscription result
    if (response.params?.result) {
      const result = response.params.result;

      if (result.subscription) {
        this.subscriptionId = result.subscription;
      }

      if (result.value) {
        this.processTokenEvent(result.value);
      }
    }
  }

  /**
   * Process token event from RPC subscription
   */
  private processTokenEvent(value: {
    account?: {
      data?: {
        parsed?: {
          info?: {
            mint?: string;
            owner?: string;
          };
        };
      };
    };
    signature?: string;
    err?: unknown;
  }): void {
    if (value.err) {
      return; // Skip failed transactions
    }

    const mint = value.account?.data?.parsed?.info?.mint;
    if (!mint) {
      return; // Not a token mint event
    }

    const tokenEvent: SolanaTokenEvent = {
      mint,
      signature: value.signature,
      timestamp: Date.now(),
    };

    // Compute associated bonding curve (if needed)
    // This would require Solana SDK on the backend
    // For now, we'll emit the basic event

    this.emit("newToken", tokenEvent);
  }

  /**
   * Alternative: Use HTTP polling with getProgramAccounts or getSignaturesForAddress
   * This is a fallback if WebSocket subscriptions aren't available
   */
  async fetchNewTokensViaHTTP(): Promise<SolanaTokenEvent[]> {
    try {
      const PUMP_FUN_PROGRAM_ID =
        process.env.NEXT_PUBLIC_PUMP_FUN_PROGRAM_ID ||
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

      // Get recent signatures from pump.fun program
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [
            PUMP_FUN_PROGRAM_ID,
            {
              limit: 50,
              commitment: "confirmed",
            },
          ],
        }),
      });

      const data = await response.json();
      const signatures = data.result || [];

      // Filter for new token mints (would need to parse transaction details)
      // This is a simplified version - full implementation would parse each transaction
      return signatures
        .filter((sig: { err: unknown }) => !sig.err)
        .map((sig: { signature: string; blockTime: number | null }) => ({
          mint: "", // Would need to parse transaction to get mint
          signature: sig.signature,
          timestamp: (sig.blockTime || Date.now() / 1000) * 1000,
        }));
    } catch (error) {
      logger.error("Failed to fetch tokens via HTTP", error);
      return [];
    }
  }

  /**
   * Transform Solana token event to TokenData format
   */
  transformToTokenData(event: SolanaTokenEvent): TokenData {
    return {
      id: event.mint,
      name: "New Token", // Would need to fetch metadata
      symbol: "TKN", // Would need to fetch metadata
      icon: "🪙",
      time: this.formatTime(event.timestamp),
      marketCap: 0, // Would need to compute from bonding curve
      volume: 0,
      fee: 0,
      transactions: 0,
      percentages: [0, 0, 0, 0, 0],
      price: 0,
      activity: {
        Q: 0,
        views: 0,
        holders: 0,
        trades: 0,
      },
      chain: "solana",
      source: "solana-rpc",
    };
  }

  private formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m`;
    } else {
      return `${Math.floor(diff / 3600000)}h`;
    }
  }

  // Event emitter pattern
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

// Export singleton instance
export const solanaRPCSubscriptionService = new SolanaRPCSubscriptionService();
