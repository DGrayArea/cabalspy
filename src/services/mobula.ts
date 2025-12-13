/**
 * Mobula API Service
 *
 * Provides token data with price changes, charts, and advanced filtering
 * Can be used alongside or instead of existing token services
 *
 * To use: Set NEXT_PUBLIC_USE_MOBULA=true in .env.local
 * To disable: Set NEXT_PUBLIC_USE_MOBULA=false or remove it
 */

import axios from "axios";
import { TokenData } from "@/types/token";
import { logger } from "@/lib/logger";

const MOBULA_API_URL = "https://pulse-v2-api.mobula.io/api/2/pulse";
// Primary API key (starts with 7)
const PRIMARY_API_KEY = "7b7ba456-f454-4a42-a80e-897319cb0ac1";
// Fallback API key from env
const FALLBACK_API_KEY = process.env.NEXT_PUBLIC_MOBULA_API_KEY || "";

// Global request queue to serialize ALL Mobula API requests
// This prevents concurrent requests that cause 500 errors
let globalRequestQueue: Promise<any> | null = null;
let queueLock = false; // Lock to prevent race conditions
const lastRequestTime: { [key: string]: number } = {};
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests (1 request/second max to be safe)

/**
 * Wait for the global queue to be available and acquire lock
 */
async function waitForQueueAndLock(): Promise<void> {
  // Wait for any pending request to complete
  if (globalRequestQueue) {
    console.log(`⏳ Mobula: Waiting for previous request in queue...`);
    try {
      await globalRequestQueue;
    } catch (e) {
      // Ignore errors from previous request
    }
  }

  // Wait for lock to be released (in case another request is setting up)
  while (queueLock) {
    await sleep(50);
  }

  // Acquire lock
  queueLock = true;
}

/**
 * Sleep helper for rate limiting and retries
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry request with exponential backoff
 */
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;

      // Don't retry on auth errors (401, 403)
      if (status === 401 || status === 403) {
        throw error;
      }

      // Retry on 429 (rate limit) or 500 (server error, might be rate limit)
      if (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503
      ) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(
            `🔄 Mobula: Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
            {
              status,
              error: error.message,
            }
          );
          await sleep(delay);
          continue;
        }
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError;
}

export interface MobulaToken {
  token: {
    address: string;
    chainId: string;
    symbol: string | null;
    name: string | null;
    decimals: number;
    price: number;
    marketCap?: number;
    liquidity: number;
    logo: string | null;
    bonded?: boolean;
    bondingPercentage?: number;
    holdersCount: number;
    createdAt: Date | null;
  };
  latest_price: number;
  price_change_1min?: number;
  price_change_5min?: number;
  price_change_1h?: number;
  price_change_4h?: number;
  price_change_6h?: number;
  price_change_12h?: number;
  price_change_24h?: number;
  volume_1h?: number;
  volume_24h?: number;
  organic_volume_1h?: number;
  market_cap?: number;
  latest_market_cap?: number;
  holders_count?: number;
  trades_1h?: number;
  created_at?: string;
  security?: {
    honeypot?: boolean;
    noMintAuthority?: boolean;
    buyTax?: string;
    sellTax?: string;
  };
  top10HoldingsPercentage?: number;
  smartTradersCount?: number;
  dexscreenerListed?: boolean;
}

export interface MobulaPulseResponse {
  [viewName: string]: {
    data: MobulaToken[];
  };
}

export class MobulaService {
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Fetch tokens from Mobula Pulse API
   */
  async fetchTokens(options?: {
    view?: "new" | "bonding" | "bonded" | "trending" | "safe";
    chainId?: string[];
    limit?: number;
    sortBy?: string;
    filters?: Record<string, any>;
  }): Promise<TokenData[]> {
    const cacheKey = JSON.stringify(options);
    const cached = this.requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const viewName = options?.view || "trending";
      const chainId = options?.chainId || ["solana:solana"];
      const limit = options?.limit || 100;

      console.log("🌐 Mobula Service: Fetching tokens...", {
        viewName,
        chainId,
        limit,
        cacheKey,
      });

      // Build view configuration
      const view: any = {
        name: viewName,
        chainId,
        limit,
      };

      // Add sorting
      if (options?.sortBy) {
        view.sortBy = options.sortBy;
        view.sortOrder = "desc";
      } else {
        // Default sorting based on view
        switch (viewName) {
          case "new":
            view.sortBy = "created_at";
            view.sortOrder = "desc";
            break;
          case "bonding":
            view.sortBy = "bonding_percentage";
            view.sortOrder = "desc";
            break;
          case "bonded":
            view.sortBy = "bonded_at";
            view.sortOrder = "desc";
            break;
          case "trending":
            view.sortBy = "volume_1h";
            view.sortOrder = "desc";
            break;
          case "safe":
            view.sortBy = "volume_1h";
            view.sortOrder = "desc";
            view.filters = {
              "security.honeypot": false,
              "security.noMintAuthority": true,
              volume_1h: { gte: 5000 },
              market_cap: { gte: 10000 },
            };
            break;
        }
      }

      // Merge custom filters
      if (options?.filters) {
        view.filters = { ...view.filters, ...options.filters };
      }

      const payload = {
        assetMode: true,
        compressed: false,
        views: [view],
      };

      // GLOBAL RATE LIMITING: Serialize ALL Mobula requests
      // This ensures only one request at a time, preventing 500 errors
      await waitForQueueAndLock();

      // Ensure minimum interval since last request (any API key)
      const now = Date.now();
      const lastGlobalRequest = Math.max(
        lastRequestTime[PRIMARY_API_KEY] || 0,
        lastRequestTime[FALLBACK_API_KEY] || 0
      );
      const timeSinceLastRequest = now - lastGlobalRequest;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`⏳ Mobula: Rate limiting, waiting ${waitTime}ms...`);
        await sleep(waitTime);
      }

      // Try primary API key first (starts with 7), then fallback to env key
      let response: axios.AxiosResponse<MobulaPulseResponse>;
      let lastError: any;

      // Create the request promise and add to global queue
      const apiKey = PRIMARY_API_KEY;
      const makeRequest = async () => {
        // Try primary key first with retry logic
        console.log("🔑 Mobula: Trying primary API key...", { view: viewName });
        try {
          return await retryRequest(async () => {
            return await axios.post<MobulaPulseResponse>(
              MOBULA_API_URL,
              payload,
              {
                headers: {
                  Authorization: PRIMARY_API_KEY,
                  "Content-Type": "application/json",
                },
                timeout: 15000, // Increased timeout for retries
              }
            );
          });
        } finally {
          // Release lock when request completes (success or error)
          queueLock = false;
        }
      };

      // Add to global queue - this ensures only one request at a time
      globalRequestQueue = makeRequest();
      lastRequestTime[apiKey] = Date.now();

      try {
        response = await globalRequestQueue;
        console.log("✅ Mobula: Primary key worked!", {
          status: response.status,
          viewData: Object.keys(response.data),
          view: viewName,
        });
        // Clear queue on success
        globalRequestQueue = null;
      } catch (error: any) {
        // Clear queue on error
        globalRequestQueue = null;
        console.log("⚠️ Mobula: Primary key failed", {
          status: error.response?.status,
          message: error.message,
          isRateLimit:
            error.response?.status === 429 || error.response?.status === 500,
        });

        // If primary key fails with auth error, try fallback
        if (
          (error.response?.status === 401 || error.response?.status === 403) &&
          FALLBACK_API_KEY
        ) {
          console.log("🔄 Mobula: Trying fallback API key from env...");
          logger.warn(
            "Primary API key failed, trying fallback key from env..."
          );

          // Try fallback key with same queueing
          const fallbackApiKey = FALLBACK_API_KEY;
          console.log("🔄 Mobula: Trying fallback API key...", {
            view: viewName,
          });

          // Wait for rate limit
          const fallbackNow = Date.now();
          const lastGlobalRequest = Math.max(
            lastRequestTime[PRIMARY_API_KEY] || 0,
            lastRequestTime[fallbackApiKey] || 0
          );
          const fallbackTimeSinceLastRequest = fallbackNow - lastGlobalRequest;
          if (fallbackTimeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            const waitTime =
              MIN_REQUEST_INTERVAL - fallbackTimeSinceLastRequest;
            await sleep(waitTime);
          }
          lastRequestTime[fallbackApiKey] = Date.now();

          const fallbackRequest = async () => {
            try {
              return await retryRequest(async () => {
                return await axios.post<MobulaPulseResponse>(
                  MOBULA_API_URL,
                  payload,
                  {
                    headers: {
                      Authorization: FALLBACK_API_KEY,
                      "Content-Type": "application/json",
                    },
                    timeout: 15000,
                  }
                );
              });
            } finally {
              queueLock = false;
            }
          };

          // Add to global queue
          globalRequestQueue = fallbackRequest();

          try {
            response = await globalRequestQueue;
            console.log("✅ Mobula: Fallback key worked!", {
              status: response.status,
              view: viewName,
            });
            globalRequestQueue = null;
          } catch (fallbackError: any) {
            globalRequestQueue = null;
            console.error("❌ Mobula: Fallback key also failed", {
              status: fallbackError.response?.status,
              message: fallbackError.message,
              isRateLimit:
                fallbackError.response?.status === 429 ||
                fallbackError.response?.status === 500,
            });
            lastError = fallbackError;

            // If it's a rate limit error, provide helpful message
            if (
              fallbackError.response?.status === 429 ||
              fallbackError.response?.status === 500
            ) {
              logger.warn(
                "Mobula API rate limit reached. Consider reducing request frequency."
              );
            }

            throw fallbackError;
          }
        } else {
          lastError = error;

          // If it's a rate limit error, provide helpful message
          if (
            error.response?.status === 429 ||
            error.response?.status === 500
          ) {
            logger.warn(
              "Mobula API rate limit reached. Consider reducing request frequency or using fewer concurrent views."
            );
          }

          throw error;
        }
      }

      const viewData = response.data[viewName];
      if (!viewData || !viewData.data) {
        logger.warn("No data returned from Mobula API");
        return [];
      }

      const tokens = viewData.data.map((mobulaToken) =>
        this.transformToTokenData(mobulaToken)
      );

      console.log("📦 Mobula: Transformed tokens", {
        count: tokens.length,
        firstTokenSymbol: tokens[0]?.symbol,
        firstTokenPriceChanges: tokens[0]?.percentages,
      });

      // Cache the result
      this.requestCache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error) {
      logger.error("Error fetching tokens from Mobula:", error);
      throw error;
    }
  }

  /**
   * Fetch trending tokens (high volume, recent activity)
   */
  async fetchTrending(limit = 100): Promise<TokenData[]> {
    return this.fetchTokens({
      view: "trending",
      limit,
      sortBy: "volume_1h",
    });
  }

  /**
   * Fetch new tokens (recently created)
   */
  async fetchNew(limit = 100): Promise<TokenData[]> {
    return this.fetchTokens({
      view: "new",
      limit,
      sortBy: "created_at",
    });
  }

  /**
   * Fetch bonding tokens (in bonding curve phase)
   */
  async fetchBonding(limit = 100): Promise<TokenData[]> {
    return this.fetchTokens({
      view: "bonding",
      limit,
      sortBy: "bonding_percentage",
    });
  }

  /**
   * Fetch bonded tokens (graduated from bonding curve)
   */
  async fetchBonded(limit = 100): Promise<TokenData[]> {
    return this.fetchTokens({
      view: "bonded",
      limit,
      sortBy: "bonded_at",
    });
  }

  /**
   * Fetch safe tokens (security verified)
   */
  async fetchSafe(limit = 100): Promise<TokenData[]> {
    return this.fetchTokens({
      view: "safe",
      limit,
    });
  }

  /**
   * Transform Mobula token to TokenData format
   */
  private transformToTokenData(mobulaToken: MobulaToken): TokenData {
    const token = mobulaToken.token;
    const priceChange1h = mobulaToken.price_change_1h || 0;
    const priceChange24h = mobulaToken.price_change_24h || 0;
    const priceChange5m = mobulaToken.price_change_5min || 0;

    // Build percentages array for chart (1m, 5m, 1h, 4h, 6h, 12h, 24h)
    const percentages = [
      mobulaToken.price_change_1min || 0,
      priceChange5m,
      priceChange1h,
      mobulaToken.price_change_4h || 0,
      mobulaToken.price_change_6h || 0,
      mobulaToken.price_change_12h || 0,
      priceChange24h,
    ];

    // Determine chain from chainId
    let chain: "solana" | "bsc" | "ethereum" | "base" = "solana";
    if (token.chainId.includes("evm:8453")) {
      chain = "base";
    } else if (token.chainId.includes("evm:56")) {
      chain = "bsc";
    } else if (token.chainId.includes("evm:1")) {
      chain = "ethereum";
    }

    // Get source from chainId
    const source = token.chainId.includes("solana")
      ? "mobula-solana"
      : "mobula-evm";

    const transformedToken = {
      id: `${chain}:${token.address}`,
      name: token.name || "Unknown",
      symbol: token.symbol || "UNKNOWN",
      icon: token.logo || "",
      image: token.logo || undefined,
      time:
        mobulaToken.created_at ||
        token.createdAt?.toISOString() ||
        new Date().toISOString(),
      createdTimestamp: token.createdAt
        ? new Date(token.createdAt).getTime()
        : undefined,
      marketCap: mobulaToken.market_cap || mobulaToken.latest_market_cap || 0,
      volume: mobulaToken.volume_24h || mobulaToken.volume_1h || 0,
      fee: 0, // Mobula doesn't provide fee data
      transactions: mobulaToken.trades_1h || 0,
      percentages, // Price changes for chart
      price: mobulaToken.latest_price || token.price || 0,
      decimals: token.decimals,
      activity: {
        Q: 0, // Not available from Mobula
        views: 0, // Not available from Mobula
        holders: mobulaToken.holders_count || token.holdersCount || 0,
        trades: mobulaToken.trades_1h || 0,
      },
      chain,
      source,
      // Add Mobula identifier
      _mobula: true, // Internal flag to identify Mobula tokens
      _mobulaData: {
        priceChanges: percentages,
        hasPriceChanges:
          percentages.length > 0 && percentages.some((p) => p !== 0),
        priceChange1h: priceChange1h,
        priceChange24h: priceChange24h,
      },
      // Enhanced DexScreener-like data from Mobula
      dexscreener: {
        logo: token.logo || undefined,
        priceUsd: mobulaToken.latest_price || token.price || 0,
        priceNative: token.price || 0,
        priceChange24h: priceChange24h,
        priceChange1h: priceChange1h,
        priceChange5m: priceChange5m,
        volume24h: mobulaToken.volume_24h || 0,
        liquidity: token.liquidity || 0,
        fdv: mobulaToken.market_cap || 0,
        isPaid: mobulaToken.dexscreenerListed || false,
      },
    } as TokenData & { _mobula: boolean; _mobulaData: any };

    // Log first token for debugging (only log once per batch)
    if (token.symbol && Math.random() < 0.1) {
      // Log ~10% of tokens to avoid spam
      // console.log("🔷 Mobula Token Sample:", {
      //   symbol: transformedToken.symbol,
      //   name: transformedToken.name,
      //   price: transformedToken.price,
      //   priceChanges: transformedToken.percentages,
      //   priceChange1h: transformedToken.dexscreener?.priceChange1h,
      //   priceChange24h: transformedToken.dexscreener?.priceChange24h,
      //   marketCap: transformedToken.marketCap,
      //   volume: transformedToken.volume,
      //   chain: transformedToken.chain,
      //   hasPriceChanges: transformedToken._mobulaData.hasPriceChanges,
      //   isMobula: transformedToken._mobula,
      // });
    }

    return transformedToken;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

// Export singleton instance
export const mobulaService = new MobulaService();
