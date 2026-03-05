import { TokenData } from "@/types/token";
import { logger } from "@/lib/logger";
import { dexscreenerService } from "./dexscreener";
import { pumpFunService } from "./pumpfun";

/**
 * Multi-chain token fetching service
 * Fetches tokens from:
 * - Solana: pumpapi.io / pumpswap (via WebSocket/HTTP)
 *   Alternative: Direct Solana RPC subscriptions (see solana-rpc-subscription.ts)
 *   Reference: https://github.com/chainstacklabs/pumpfun-bonkfun-bot
 * - BSC: forr.meme (via WebSocket/HTTP)
 */

export interface ChainTokenData extends TokenData {
  chain: "solana" | "bsc";
  source: string;
}

export class MultiChainTokenService {
  // Solana sources - PumpPortal (pumpportal.fun)
  private solanaWebSocketUrl =
    process.env.NEXT_PUBLIC_PUMPAPI_WS_URL || "wss://pumpportal.fun/api/data";
  private solanaApiUrl =
    process.env.NEXT_PUBLIC_PUMPAPI_URL || "https://pumpportal.fun";
  private pumpPortalApiKey = process.env.NEXT_PUBLIC_PUMPPORTAL_API_KEY || "";

  // BSC sources - TODO: Verify correct endpoints for forr.meme
  // Note: forr.meme may not have a public API - verify endpoints before using
  private bscWebSocketUrl = process.env.NEXT_PUBLIC_FORRMEME_WS_URL || "";
  private bscApiUrl = process.env.NEXT_PUBLIC_FORRMEME_API_URL || "";

  private solanaTokens: Map<string, ChainTokenData> = new Map();
  private bscTokens: Map<string, ChainTokenData> = new Map();
  private migratedTokens: Map<string, ChainTokenData> = new Map(); // Track migrated tokens separately
  private solanaWs: WebSocket | null = null;
  private bscWs: WebSocket | null = null;
  private solanaReconnectAttempts = 0;
  private bscReconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnectingSolana = false;
  private isConnectingBSC = false;

  /**
   * Connect to Solana token feed (PumpPortal)
   * Subscribes to: new tokens and migrations (pump.fun data - free)
   *
   * Note: PumpSwap data requires API key and funded wallet (0.02 SOL min, 0.01 SOL per 10k messages)
   * Only use API key if you need PumpSwap-specific data
   */
  connectSolana(): void {
    // Prevent multiple simultaneous connection attempts
    if (
      this.isConnectingSolana ||
      (this.solanaWs && this.solanaWs.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Close existing connection if it exists
    if (this.solanaWs) {
      try {
        this.solanaWs.close();
      } catch (e) {
        // Ignore errors when closing
      }
      this.solanaWs = null;
    }

    // Check if we've exceeded max reconnect attempts
    if (this.solanaReconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached for PumpPortal WebSocket. ` +
          `Falling back to HTTP polling. Please check your network connection and the PumpPortal service status.`
      );
      return;
    }

    try {
      this.isConnectingSolana = true;

      // Use base endpoint for pump.fun data (free, no API key needed)
      // Only add API key if explicitly provided (for PumpSwap data access)
      const wsUrl = this.pumpPortalApiKey
        ? `${this.solanaWebSocketUrl}?api-key=${this.pumpPortalApiKey}`
        : this.solanaWebSocketUrl;

      // console.log(
      //   `🔌 Attempting to connect to PumpPortal WebSocket (attempt ${this.solanaReconnectAttempts + 1}/${this.maxReconnectAttempts})...`
      // );

      this.solanaWs = new WebSocket(wsUrl);

      this.solanaWs.onopen = () => {
        this.isConnectingSolana = false;
        this.solanaReconnectAttempts = 0; // Reset on successful connection

        if (this.pumpPortalApiKey) {
          // console.log(
          //   "✅ Connected to PumpPortal WebSocket (PumpSwap data enabled)"
          // );
        } else {
          // console.log(
          //   "✅ Connected to PumpPortal WebSocket (pump.fun data only)"
          // );
        }

        // Subscribe to new token creation events (pump.fun - free)
        try {
          this.solanaWs?.send(JSON.stringify({ method: "subscribeNewToken" }));
          this.solanaWs?.send(JSON.stringify({ method: "subscribeMigration" }));
        } catch (sendError) {
          console.error("Error sending subscription messages:", sendError);
        }

        // Note: Token trades and account trades subscriptions work on both endpoints
        // but PumpSwap-specific data requires API key and funded wallet
      };

      this.solanaWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Debug: Log received events in development
          // if (process.env.NODE_ENV === "development") {
          //   console.log("📨 PumpPortal event received:", {
          //     hasMint: !!data.mint || !!data.token,
          //     hasName: !!data.name,
          //     hasSymbol: !!data.symbol,
          //     txType: data.txType || data.type || "unknown",
          //   });
          // }

          // Handle different event types from PumpPortal
          this.handlePumpPortalEvent(data);
        } catch (error) {
          console.error("Error parsing PumpPortal data:", error);
        }
      };

      this.solanaWs.onerror = (error) => {
        this.isConnectingSolana = false;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorDetails =
          error instanceof Event
            ? {
                type: error.type,
                target: error.target?.constructor?.name,
              }
            : {};

        console.error("❌ PumpPortal WebSocket error:", {
          message: errorMessage,
          details: errorDetails,
          url: wsUrl,
          attempt: this.solanaReconnectAttempts + 1,
        });

        // Don't reconnect immediately on error - let onclose handle it
      };

      this.solanaWs.onclose = (event) => {
        this.isConnectingSolana = false;

        const wasClean = event.wasClean;
        const code = event.code;
        const reason = event.reason || "Unknown reason";

        if (wasClean) {
          // console.log("🔌 PumpPortal WebSocket closed cleanly");
          this.solanaReconnectAttempts = 0;
          return;
        }

        this.solanaReconnectAttempts++;

        // console.warn(
        //   `⚠️ PumpPortal WebSocket disconnected (code: ${code}, reason: ${reason}). ` +
        //   `Reconnecting in ${Math.min(3000 * this.solanaReconnectAttempts, 30000)}ms... ` +
        //   `(attempt ${this.solanaReconnectAttempts}/${this.maxReconnectAttempts})`
        // );

        // Exponential backoff with max delay of 30 seconds
        const delay = Math.min(3000 * this.solanaReconnectAttempts, 30000);

        setTimeout(() => {
          if (this.solanaReconnectAttempts < this.maxReconnectAttempts) {
            this.connectSolana();
          } else {
            console.error(
              "❌ Max reconnection attempts reached. PumpPortal WebSocket will not reconnect automatically. " +
                "Please refresh the page or check the service status."
            );
          }
        }, delay);
      };
    } catch (error) {
      this.isConnectingSolana = false;
      this.solanaReconnectAttempts++;
      logger.error("Failed to connect to PumpPortal", error);

      // Retry with exponential backoff
      if (this.solanaReconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(3000 * this.solanaReconnectAttempts, 30000);
        setTimeout(() => this.connectSolana(), delay);
      }
    }
  }

  /**
   * Connect to BSC token feed (forr.meme)
   * TODO: Verify correct endpoints - forr.meme may not have public API
   */
  connectBSC(): void {
    if (!this.bscWebSocketUrl) {
      // console.warn(
      //   "⚠️ BSC WebSocket URL not configured. Skipping BSC token feed."
      // );
      return;
    }

    try {
      this.bscWs = new WebSocket(this.bscWebSocketUrl);

      this.bscWs.onopen = () => {
        // console.log("✅ Connected to BSC token feed");
        // Subscribe to new tokens (adjust based on actual API)
        this.bscWs?.send(
          JSON.stringify({
            method: "subscribe",
            type: "new_tokens",
            chain: "bsc",
          })
        );
      };

      this.bscWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleBSCToken(data);
        } catch (error) {
          console.error("Error parsing BSC token data:", error);
        }
      };

      this.bscWs.onerror = (error) => {
        console.error("BSC WebSocket error:", error);
      };

      this.bscWs.onclose = () => {
        console.log("BSC WebSocket disconnected, reconnecting...");
        setTimeout(() => this.connectBSC(), 3000);
      };
    } catch (error) {
      logger.error("Failed to connect to BSC feed", error);
    }
  }

  /**
   * Handle incoming events from PumpPortal
   * Event types: new token creation, migrations, trades
   */
  private handlePumpPortalEvent(data: unknown): void {
    const event = data as {
      mint?: string;
      token?: string; // Alternative field name for token address
      signature?: string;
      name?: string;
      symbol?: string;
      image?: string;
      uri?: string;
      price?: number;
      marketCap?: number;
      marketCapSol?: number;
      solAmount?: number;
      tokenAmount?: number;
      volume?: number;
      timestamp?: number;
      createdAt?: number;
      trader?: string;
      traderPublicKey?: string;
      pool?: string;
      type?: string; // Event type indicator
      [key: string]: unknown;
    };

    const mint = event.mint || event.token;
    if (!mint) {
      return; // Invalid event - no token address
    }

    // Determine event type based on available fields
    // New token events typically have name, symbol, image
    // Trade events have trader, solAmount, tokenAmount
    // Migration events have pool change or specific indicators

    const isNewToken = !!(event.name || event.symbol || event.image);
    const isTrade = !!(
      event.trader ||
      event.traderPublicKey ||
      event.solAmount
    );
    const isMigration = event.pool === "pump-amm" || event.type === "migration";

    if (isNewToken) {
      // New token creation event
      const timestamp = event.timestamp || event.createdAt || Date.now();
      const marketCapSol = event.marketCap || event.marketCapSol || 0;

      const token: ChainTokenData = {
        id: mint,
        name: event.name || event.symbol || "Token",
        symbol: event.symbol || "TKN",
        icon: this.getTokenIcon(event.symbol || ""),
        image: event.image || event.uri || undefined,
        time: this.formatTime(timestamp),
        marketCap: marketCapSol, // Keep in SOL (or USD if that's what PumpPortal provides)
        volume: event.volume || event.solAmount || 0,
        fee: 0,
        transactions: 1,
        percentages: [0, 0, 0, 0, 0],
        price: event.price || 0,
        activity: {
          Q: 0,
          views: 0,
          holders: 0,
          trades: 1,
        },
        chain: "solana",
        source: "pumpportal",
      };

      // if (process.env.NODE_ENV === "development") {
      //   console.log("✨ New token created:", {
      //     id: token.id,
      //     name: token.name,
      //     symbol: token.symbol,
      //     time: token.time,
      //     marketCap: token.marketCap,
      //   });
      // }

      this.solanaTokens.set(token.id, token);
      this.emit("tokenUpdate", token);

      // Fetch DexScreener data asynchronously after emitting initial token
      this.enrichTokenWithDexScreener(token).catch((error: unknown) => {
        console.error(
          `Failed to enrich token ${token.id} with DexScreener data:`,
          error
        );
      });
    } else if (isMigration) {
      // Migration event - mark token as migrated
      const existingToken = this.solanaTokens.get(mint);
      if (existingToken) {
        const migratedToken: ChainTokenData = {
          ...existingToken,
          marketCap:
            event.marketCap || event.marketCapSol || existingToken.marketCap,
          volume: existingToken.volume + (event.volume || event.solAmount || 0),
          price: event.price || existingToken.price,
          transactions: existingToken.transactions + 1,
          activity: {
            ...existingToken.activity,
            trades: existingToken.activity.trades + 1,
          },
          time: this.formatTime(event.timestamp || Date.now()),
        };

        // Store in both regular tokens and migrated tokens
        this.solanaTokens.set(mint, migratedToken);
        this.migratedTokens.set(mint, migratedToken);

        // Emit both token update and migration update
        this.emit("tokenUpdate", migratedToken);
        this.emit("migrationUpdate", migratedToken);

        // if (process.env.NODE_ENV === "development") {
        //   console.log("🔄 Token migrated:", {
        //     id: migratedToken.id,
        //     name: migratedToken.name,
        //     symbol: migratedToken.symbol,
        //     pool: event.pool,
        //   });
        // }
      } else {
        // Migration event for token we haven't seen yet - create new token
        const timestamp = event.timestamp || Date.now();
        const migratedToken: ChainTokenData = {
          id: mint,
          name: event.name || event.symbol || "Token",
          symbol: event.symbol || "TKN",
          icon: this.getTokenIcon(event.symbol || ""),
          image: event.image || event.uri || undefined,
          time: this.formatTime(timestamp),
          marketCap: event.marketCap || event.marketCapSol || 0,
          volume: event.volume || event.solAmount || 0,
          fee: 0,
          transactions: 1,
          percentages: [0, 0, 0, 0, 0],
          price: event.price || 0,
          activity: {
            Q: 0,
            views: 0,
            holders: 0,
            trades: 1,
          },
          chain: "solana",
          source: "pumpportal",
        };

        this.solanaTokens.set(mint, migratedToken);
        this.migratedTokens.set(mint, migratedToken);
        this.emit("tokenUpdate", migratedToken);
        this.emit("migrationUpdate", migratedToken);
      }
    } else if (isTrade) {
      // Trade event - update existing token
      const existingToken = this.solanaTokens.get(mint);
      if (existingToken) {
        const updatedToken: ChainTokenData = {
          ...existingToken,
          marketCap:
            event.marketCap || event.marketCapSol || existingToken.marketCap,
          volume: existingToken.volume + (event.volume || event.solAmount || 0),
          price: event.price || existingToken.price,
          transactions: existingToken.transactions + 1,
          activity: {
            ...existingToken.activity,
            trades: existingToken.activity.trades + 1,
          },
          time: this.formatTime(event.timestamp || Date.now()),
        };
        this.solanaTokens.set(mint, updatedToken);

        // If token was migrated, also update migrated tokens
        if (this.migratedTokens.has(mint)) {
          this.migratedTokens.set(mint, updatedToken);
        }

        this.emit("tokenUpdate", updatedToken);
      }
    }
  }

  /**
   * @deprecated Use handleSolanaEvent instead
   */
  private handleSolanaToken(data: unknown): void {
    const d = data as Record<string, unknown>;
    const token: ChainTokenData = {
      id: (d.mint || d.id || d.address || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || d.ticker || "Token") as string,
      symbol: (d.symbol || d.ticker || "TKN") as string,
      icon: this.getTokenIcon((d.symbol as string) || ""),
      image: (d.image || d.imageUrl || d.logo || undefined) as
        | string
        | undefined,
      time: this.formatTime((d.timestamp || d.ts || Date.now()) as number),
      marketCap: (d.marketCap || d.mc || 0) as number,
      volume: (d.volume || d.vol || 0) as number,
      fee: (d.fee || 0) as number,
      transactions: (d.transactions || d.txCount || d.trades || 0) as number,
      percentages: this.calculatePercentages(
        (d.priceChange || d.pct || 0) as number
      ),
      price: (d.price || d.p || d.solPrice || 0) as number,
      activity: {
        Q: (d.quality || 0) as number,
        views: (d.views || 0) as number,
        holders: (d.holders || 0) as number,
        trades: (d.trades || d.txCount || 0) as number,
      },
      chain: "solana",
      source: "pumpportal",
    };

    this.solanaTokens.set(token.id, token);
    this.emit("tokenUpdate", token);
  }

  /**
   * Handle incoming BSC token data
   */
  private handleBSCToken(data: unknown): void {
    const d = data as Record<string, unknown>;
    const token: ChainTokenData = {
      id: (d.address || d.contract || d.id || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || d.ticker || "Token") as string,
      symbol: (d.symbol || d.ticker || "TKN") as string,
      icon: this.getTokenIcon((d.symbol as string) || ""),
      image: (d.image || d.imageUrl || d.logo || undefined) as
        | string
        | undefined,
      time: this.formatTime((d.timestamp || d.ts || Date.now()) as number),
      marketCap: (d.marketCap || d.mc || 0) as number,
      volume: (d.volume || d.vol || 0) as number,
      fee: (d.fee || 0) as number,
      transactions: (d.transactions || d.txCount || d.trades || 0) as number,
      percentages: this.calculatePercentages(
        (d.priceChange || d.pct || 0) as number
      ),
      price: (d.price || d.bnbPrice || 0) as number,
      activity: {
        Q: (d.quality || 0) as number,
        views: (d.views || 0) as number,
        holders: (d.holders || 0) as number,
        trades: (d.trades || d.txCount || 0) as number,
      },
      chain: "bsc",
      source: "forr.meme",
    };

    this.bscTokens.set(token.id, token);
    this.emit("tokenUpdate", token);

    // Fetch DexScreener data asynchronously after emitting initial token
    this.enrichTokenWithDexScreener(token).catch((error: unknown) => {
      console.error(
        `Failed to enrich BSC token ${token.id} with DexScreener data:`,
        error
      );
    });
  }

  /**
   * Fetch initial tokens from PumpPortal HTTP API
   * Note: PumpPortal primarily uses WebSocket for real-time data
   * This is a fallback for initial load if HTTP API is available
   */
  async fetchSolanaTokens(): Promise<ChainTokenData[]> {
    // PumpPortal primarily streams via WebSocket
    // HTTP API endpoints may vary - return empty and rely on WebSocket
    return [];
  }

  /**
   * Fetch migrated tokens from pump.fun
   * These are tokens that have completed their bonding curve and migrated to Raydium
   * Note: This requires the token mint address to be passed - pump.fun API needs mint to fetch token info
   */
  async fetchMigratedTokens(
    mintAddresses?: string[]
  ): Promise<ChainTokenData[]> {
    try {
      // If mint addresses provided, fetch each one individually
      if (mintAddresses && mintAddresses.length > 0) {
        const tokens: ChainTokenData[] = [];
        for (const mint of mintAddresses) {
          const info = await pumpFunService.fetchTokenInfo(mint);
          if (info && info.isMigrated) {
            const token: ChainTokenData = {
              id: mint,
              name: info.name,
              symbol: info.symbol,
              icon: this.getTokenIcon(info.symbol),
              image: info.logo,
              time: info.migrationTimestamp
                ? this.formatTime(info.migrationTimestamp)
                : "0s",
              marketCap: info.marketCap || 0,
              volume: info.volume || 0,
              fee: 0,
              transactions: 0,
              percentages: info.priceChange24h
                ? this.calculatePercentages(info.priceChange24h)
                : [0, 0, 0, 0, 0],
              price: info.priceUsd || info.price || 0,
              activity: {
                Q: 0,
                views: 0,
                holders: 0,
                trades: 0,
              },
              chain: "solana",
              source: "pumpfun",
              dexscreener: {
                logo: info.logo,
                priceUsd: info.priceUsd,
                socials: info.socials
                  ? [
                      ...(info.socials.website
                        ? [{ type: "website", url: info.socials.website }]
                        : []),
                      ...(info.socials.twitter
                        ? [{ type: "twitter", url: info.socials.twitter }]
                        : []),
                      ...(info.socials.telegram
                        ? [{ type: "telegram", url: info.socials.telegram }]
                        : []),
                    ]
                  : undefined,
              },
            };
            this.solanaTokens.set(token.id, token);
            tokens.push(token);
          }
        }
        return tokens;
      }

      // Otherwise try to fetch from pump.fun's migrated tokens endpoint
      const pumpFunTokens = await pumpFunService.fetchMigratedTokens(100);
      return pumpFunTokens
        .filter((info) => info.mint) // Only include tokens with mint addresses
        .map((info) => {
          const token: ChainTokenData = {
            id: info.mint!, // Use mint address as ID
            name: info.name,
            symbol: info.symbol,
            icon: this.getTokenIcon(info.symbol),
            image: info.logo,
            time: info.migrationTimestamp
              ? this.formatTime(info.migrationTimestamp)
              : "0s",
            marketCap: info.marketCap || 0,
            volume: info.volume || 0,
            fee: 0,
            transactions: 0,
            percentages: info.priceChange24h
              ? this.calculatePercentages(info.priceChange24h)
              : [0, 0, 0, 0, 0],
            price: info.priceUsd || info.price || 0,
            activity: {
              Q: 0,
              views: 0,
              holders: 0,
              trades: 0,
            },
            chain: "solana",
            source: "pumpfun",
            dexscreener: {
              logo: info.logo,
              priceUsd: info.priceUsd,
              socials: info.socials
                ? [
                    ...(info.socials.website
                      ? [{ type: "website", url: info.socials.website }]
                      : []),
                    ...(info.socials.twitter
                      ? [{ type: "twitter", url: info.socials.twitter }]
                      : []),
                    ...(info.socials.telegram
                      ? [{ type: "telegram", url: info.socials.telegram }]
                      : []),
                  ]
                : undefined,
            },
          };
          this.solanaTokens.set(token.id, token);
          return token;
        });
    } catch (error) {
      logger.warn("Failed to fetch migrated tokens from pump.fun", {
        error: String(error),
      });
      return [];
    }
  }

  /**
   * Subscribe to trades for specific tokens
   * Works on both pump.fun and PumpSwap data endpoints
   * @param tokenAddresses Array of token mint addresses to watch
   */
  subscribeToTokenTrades(tokenAddresses: string[]): void {
    if (!this.solanaWs || this.solanaWs.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket not connected. Cannot subscribe to token trades."
      );
      return;
    }

    this.solanaWs.send(
      JSON.stringify({
        method: "subscribeTokenTrade",
        keys: tokenAddresses,
      })
    );
  }

  /**
   * Unsubscribe from token trades
   * @param tokenAddresses Array of token mint addresses to stop watching
   */
  unsubscribeFromTokenTrades(tokenAddresses: string[]): void {
    if (!this.solanaWs || this.solanaWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.solanaWs.send(
      JSON.stringify({
        method: "unsubscribeTokenTrade",
        keys: tokenAddresses,
      })
    );
  }

  /**
   * Subscribe to trades for specific accounts
   * Works on both pump.fun and PumpSwap data endpoints
   * Note: PumpSwap account trades require API key and funded wallet
   * @param accountAddresses Array of account addresses to watch
   */
  subscribeToAccountTrades(accountAddresses: string[]): void {
    if (!this.solanaWs || this.solanaWs.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket not connected. Cannot subscribe to account trades."
      );
      return;
    }

    if (!this.pumpPortalApiKey) {
      console.warn(
        "⚠️ Account trades on PumpSwap require API key. Subscribing anyway (may only receive pump.fun data)."
      );
    }

    this.solanaWs.send(
      JSON.stringify({
        method: "subscribeAccountTrade",
        keys: accountAddresses,
      })
    );
  }

  /**
   * Unsubscribe from account trades
   * @param accountAddresses Array of account addresses to stop watching
   */
  unsubscribeFromAccountTrades(accountAddresses: string[]): void {
    if (!this.solanaWs || this.solanaWs.readyState !== WebSocket.OPEN) {
      return;
    }

    this.solanaWs.send(
      JSON.stringify({
        method: "unsubscribeAccountTrade",
        keys: accountAddresses,
      })
    );
  }

  async fetchBSCTokens(): Promise<ChainTokenData[]> {
    if (!this.bscApiUrl) {
      // console.warn("⚠️ BSC API URL not configured. Skipping BSC token fetch.");
      return [];
    }

    try {
      // TODO: Verify correct forr.meme API endpoint
      const response = await fetch(`${this.bscApiUrl}/api/tokens`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        const tokens = Array.isArray(data)
          ? data
          : data.tokens || data.data || [];
        return tokens.map((t: unknown) => this.transformToBSCToken(t));
      }
    } catch (error) {
      logger.warn("Failed to fetch BSC tokens from API", {
        error: String(error),
      });
    }
    return [];
  }

  private transformToSolanaToken(data: unknown): ChainTokenData {
    const d = data as {
      mint?: string;
      name?: string;
      symbol?: string;
      uri?: string;
      price?: number;
      marketCapSol?: number;
      vSolInBondingCurve?: number;
      timestamp?: number;
      [key: string]: unknown;
    };
    return {
      id: (d.mint || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || "Token") as string,
      symbol: (d.symbol || "TKN") as string,
      icon: this.getTokenIcon((d.symbol as string) || ""),
      image: d.uri as string | undefined,
      time: this.formatTime((d.timestamp || Date.now()) as number),
      marketCap: (d.marketCapSol || 0) as number,
      volume: (d.vSolInBondingCurve || 0) as number,
      fee: 0,
      transactions: 0,
      percentages: [0, 0, 0, 0, 0],
      price: (d.price || 0) as number,
      activity: {
        Q: 0,
        views: 0,
        holders: 0,
        trades: 0,
      },
      chain: "solana",
      source: "pumpportal",
    };
  }

  private transformToBSCToken(data: unknown): ChainTokenData {
    const d = data as Record<string, unknown>;
    return {
      id: (d.address || d.contract || d.id || crypto.randomUUID()) as string,
      name: (d.name || d.symbol || "Token") as string,
      symbol: (d.symbol || "TKN") as string,
      icon: this.getTokenIcon((d.symbol as string) || ""),
      image: (d.image || d.imageUrl || d.logo) as string | undefined,
      time: this.formatTime((d.timestamp || d.ts || Date.now()) as number),
      marketCap: (d.marketCap || d.mc || 0) as number,
      volume: (d.volume || d.vol || 0) as number,
      fee: (d.fee || 0) as number,
      transactions: (d.transactions || d.txCount || 0) as number,
      percentages: this.calculatePercentages(
        (d.priceChange || d.pct || 0) as number
      ),
      price: (d.price || d.bnbPrice || 0) as number,
      activity: {
        Q: (d.quality || 0) as number,
        views: (d.views || 0) as number,
        holders: (d.holders || 0) as number,
        trades: (d.trades || d.txCount || 0) as number,
      },
      chain: "bsc",
      source: "forr.meme",
    };
  }

  private getTokenIcon(symbol: string): string {
    const iconMap: { [key: string]: string } = {
      MOG: "🐕",
      TIGER: "🐅",
      GAME: "🎮",
      CAT: "🐱",
      DOGE: "🐕",
      PEPE: "🐸",
      SHIB: "🐕",
      BONK: "🐕",
    };
    return iconMap[symbol?.toUpperCase()] || "🪙";
  }

  private formatTime(timestamp: number): string {
    const now = Date.now();
    // Handle both milliseconds and seconds timestamps
    const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
    const diff = Math.max(0, now - ts); // Ensure non-negative

    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m`;
    } else {
      return `${Math.floor(diff / 3600000)}h`;
    }
  }

  private calculatePercentages(priceChange: number): number[] {
    const percentage = Math.round(priceChange * 100);
    const bars: number[] = [];

    for (let i = 0; i < 5; i++) {
      if (percentage > i * 20) {
        bars.push(Math.min(percentage, (i + 1) * 20));
      } else {
        bars.push(0);
      }
    }

    return bars;
  }

  // Event emitter pattern
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();

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

  getSolanaTokens(): ChainTokenData[] {
    return Array.from(this.solanaTokens.values());
  }

  getBSCTokens(): ChainTokenData[] {
    return Array.from(this.bscTokens.values());
  }

  /**
   * Get all migrated tokens (from WebSocket migration events)
   */
  getMigratedTokens(): ChainTokenData[] {
    return Array.from(this.migratedTokens.values());
  }

  getAllTokens(): ChainTokenData[] {
    return [...this.getSolanaTokens(), ...this.getBSCTokens()];
  }

  disconnect(): void {
    // Reset connection state
    this.isConnectingSolana = false;
    this.isConnectingBSC = false;
    this.solanaReconnectAttempts = 0;
    this.bscReconnectAttempts = 0;

    if (this.solanaWs) {
      try {
        this.solanaWs.close(1000, "Client disconnecting");
      } catch (e) {
        // Ignore errors when closing
      }
      this.solanaWs = null;
    }
    if (this.bscWs) {
      try {
        this.bscWs.close(1000, "Client disconnecting");
      } catch (e) {
        // Ignore errors when closing
      }
      this.bscWs = null;
    }
  }

  /**
   * Reset reconnection attempts (useful for manual retry)
   */
  resetReconnectAttempts(): void {
    this.solanaReconnectAttempts = 0;
    this.bscReconnectAttempts = 0;
  }

  /**
   * Enrich token with pump.fun and/or DexScreener data
   * For Solana tokens: Try pump.fun first (new tokens), then DexScreener (migrated tokens)
   * For other chains: Use DexScreener
   */
  private async enrichTokenWithDexScreener(
    token: ChainTokenData
  ): Promise<void> {
    if (!token.chain || !token.id) {
      return;
    }

    try {
      // For Solana tokens, try pump.fun first (they have data for new tokens)
      if (token.chain === "solana") {
        const pumpFunInfo = await pumpFunService.fetchTokenInfo(token.id);

        if (pumpFunInfo) {
          // Update token with pump.fun data
          const enrichedToken: ChainTokenData = {
            ...token,
            image: pumpFunInfo.logo || token.image,
            name: pumpFunInfo.name || token.name,
            symbol: pumpFunInfo.symbol || token.symbol,
            price: pumpFunInfo.priceUsd || pumpFunInfo.price || token.price,
            marketCap: pumpFunInfo.marketCap || token.marketCap,
            volume: pumpFunInfo.volume || token.volume,
            // Add pump.fun socials if available
            dexscreener: {
              logo: pumpFunInfo.logo,
              priceUsd: pumpFunInfo.priceUsd,
              socials: pumpFunInfo.socials
                ? [
                    ...(pumpFunInfo.socials.website
                      ? [{ type: "website", url: pumpFunInfo.socials.website }]
                      : []),
                    ...(pumpFunInfo.socials.twitter
                      ? [
                          {
                            type: "twitter",
                            url: pumpFunInfo.socials.twitter,
                          },
                        ]
                      : []),
                    ...(pumpFunInfo.socials.telegram
                      ? [
                          {
                            type: "telegram",
                            url: pumpFunInfo.socials.telegram,
                          },
                        ]
                      : []),
                  ]
                : undefined,
            },
          };

          // Update token in map
          this.solanaTokens.set(token.id, enrichedToken);
          this.emit("tokenUpdate", enrichedToken);

          // If token is migrated, also try DexScreener for Raydium pool data
          if (pumpFunInfo.isMigrated) {
            // Try DexScreener for migrated token (has Raydium pool data)
            await this.enrichWithDexScreener(token);
          }

          // if (process.env.NODE_ENV === "development") {
          //   console.log(
          //     `✨ Enriched Solana token ${token.symbol} with pump.fun data:`,
          //     {
          //       logo: pumpFunInfo.logo ? "✅" : "❌",
          //       price: pumpFunInfo.priceUsd ? "✅" : "❌",
          //       migrated: pumpFunInfo.isMigrated ? "✅" : "❌",
          //       socials: pumpFunInfo.socials ? "✅" : "❌",
          //     }
          //   );
          // }
          return; // Successfully enriched with pump.fun
        }
      }

      // For non-Solana tokens or if pump.fun failed, try DexScreener
      await this.enrichWithDexScreener(token);
    } catch (error: unknown) {
      // Silently fail - don't break token updates if enrichment fails
      logger.warn("Failed to enrich token", {
        tokenId: token.id,
        chain: token.chain,
        error: String(error),
      });
    }
  }

  /**
   * Enrich token with DexScreener data only
   */
  private async enrichWithDexScreener(token: ChainTokenData): Promise<void> {
    try {
      // Map chain names to DexScreener format
      const chainMap: Record<string, "solana" | "bsc" | "ethereum" | "base"> = {
        solana: "solana",
        bsc: "bsc",
        ethereum: "ethereum",
        base: "base",
      };

      const dexChain = chainMap[token.chain];
      if (!dexChain) {
        return; // Chain not supported by DexScreener
      }

      const dexscreenerInfo = await dexscreenerService.fetchTokenInfo(
        dexChain,
        token.id
      );

      if (!dexscreenerInfo) {
        // Token not found on DexScreener
        // if (process.env.NODE_ENV === "development") {
        //   console.log(
        //     `ℹ️ Token ${token.symbol} (${token.id}) not found on DexScreener`
        //   );
        // }
        return;
      }

      // Update token with DexScreener data
      const enrichedToken: ChainTokenData = {
        ...token,
        // Use DexScreener logo if available, otherwise keep existing image
        image: dexscreenerInfo.logo || token.image,
        // Update price if DexScreener has better data
        price: dexscreenerInfo.priceUsd || token.price,
        // Update percentages with DexScreener price changes
        percentages: [
          dexscreenerInfo.priceChange5m || 0,
          dexscreenerInfo.priceChange1h || 0,
          dexscreenerInfo.priceChange1h || 0, // 4h not available, use 1h
          dexscreenerInfo.priceChange24h || 0,
          dexscreenerInfo.priceChange24h || 0, // 24h
        ],
        // Update volume if available
        volume: dexscreenerInfo.volume24h || token.volume,
        // Add DexScreener enriched data
        dexscreener: dexscreenerInfo,
      };

      // Update token in map
      if (token.chain === "solana") {
        this.solanaTokens.set(token.id, enrichedToken);
      } else if (token.chain === "bsc") {
        this.bscTokens.set(token.id, enrichedToken);
      }

      // Emit updated token with DexScreener data
      this.emit("tokenUpdate", enrichedToken);

      // if (process.env.NODE_ENV === "development") {
      //   console.log(
      //     `✨ Enriched token ${token.symbol} with DexScreener data:`,
      //     {
      //       logo: dexscreenerInfo.logo ? "✅" : "❌",
      //       price: dexscreenerInfo.priceUsd ? "✅" : "❌",
      //       socials: dexscreenerInfo.socials?.length || 0,
      //     }
      //   );
      // }
    } catch (error: unknown) {
      // Silently fail - don't break token updates if DexScreener fails
      logger.warn("Failed to enrich token with DexScreener data", {
        tokenId: token.id,
        error: String(error),
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    solana: {
      connected: boolean;
      connecting: boolean;
      reconnectAttempts: number;
    };
    bsc: {
      connected: boolean;
      connecting: boolean;
      reconnectAttempts: number;
    };
  } {
    return {
      solana: {
        connected: this.solanaWs?.readyState === WebSocket.OPEN,
        connecting:
          this.isConnectingSolana ||
          this.solanaWs?.readyState === WebSocket.CONNECTING,
        reconnectAttempts: this.solanaReconnectAttempts,
      },
      bsc: {
        connected: this.bscWs?.readyState === WebSocket.OPEN,
        connecting:
          this.isConnectingBSC ||
          this.bscWs?.readyState === WebSocket.CONNECTING,
        reconnectAttempts: this.bscReconnectAttempts,
      },
    };
  }
}

// Export singleton instance
export const multiChainTokenService = new MultiChainTokenService();
