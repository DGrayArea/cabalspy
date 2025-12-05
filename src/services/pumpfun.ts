/**
 * Pump.fun API integration
 * Uses pump.fun's frontend API endpoints to fetch token info
 * These are unofficial APIs that pump.fun's frontend uses
 */

export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  metadata_uri?: string;
  creator?: string;
  bonding_curve?: string;
  associated_bonding_curve?: string;
  complete: boolean; // Migration status - true if migrated to Raydium
  market_cap?: number;
  usd_market_cap?: number;
  volume?: number;
  virtual_sol_reserves?: number;
  virtual_token_reserves?: number;
  token_account_mint?: string;
  token_account_bonding?: string;
  real_sol_reserves?: number;
  real_token_reserves?: number;
  total_supply?: number;
  sol_reserves?: number;
  token_reserves?: number;
  price?: number;
  price_change_24h?: number;
  created_timestamp?: number;
  complete_timestamp?: number; // Migration timestamp
  raydium_pool?: string; // Raydium pool address if migrated
  website?: string;
  twitter?: string;
  telegram?: string;
  [key: string]: unknown;
}

export interface PumpFunTokenInfo {
  mint?: string; // Token mint address
  logo?: string;
  name: string;
  symbol: string;
  description?: string;
  price?: number;
  priceUsd?: number;
  marketCap?: number;
  volume?: number;
  decimals?: number; // Token decimals (6, 9, etc.) - usually included in API responses
  isMigrated: boolean; // true if migrated to Raydium
  migrationTimestamp?: number;
  raydiumPool?: string;
  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
  };
  reserves?: {
    sol?: number;
    token?: number;
  };
  priceChange24h?: number;
  bondingProgress?: number; // 0-1, from API bondingCurveProgress (0-100)
  numHolders?: number;
  holders?: any[]; // Top holders data
  transactions?: number;
  buyTransactions?: number;
  sellTransactions?: number;
  createdTimestamp?: number;
}

export interface PumpFunCandle {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export type PumpFunEndpointType =
  | "graduatedByTime"
  | "listByMarketCap"
  | "listByCreation"
  | "marketCapDesc"
  | "createdDesc"
  | "latest"
  | "featured"
  | "runners";

export class PumpFunService {
  // Pump.fun frontend API endpoints (unofficial but accessible)
  private baseUrl = "https://frontend-api.pump.fun"
  
  // Request deduplication - prevent multiple simultaneous requests to the same endpoint
  private pendingRequests = new Map<string, Promise<any>>();
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 60 seconds cache (increased to reduce API calls)
  private readonly MIN_REQUEST_INTERVAL = 2000; // Minimum 2 seconds between requests (increased to avoid rate limits)
  private lastRequestTime = new Map<string, number>();;
  private advancedApiUrl = "https://advanced-api-v2.pump.fun";
  private frontendApiV3Url = "https://frontend-api-v3.pump.fun";
  private swapApiUrl = "https://swap-api.pump.fun";

  private cache: Map<
    string,
    { data: PumpFunTokenInfo | PumpFunTokenInfo[]; timestamp: number }
  > = new Map();
  private cacheTTL = 30000; // 30 second cache (shorter for real-time data)

  // Endpoint definitions - try multiple endpoint patterns
  private endpoints: Record<PumpFunEndpointType, string> = {
    graduatedByTime: `${this.advancedApiUrl}/coins/graduated?sortBy=creationTime`,
    listByMarketCap: `${this.advancedApiUrl}/coins/list?sortBy=marketCap`,
    listByCreation: `${this.advancedApiUrl}/coins/list?sortBy=creationTime`,
    marketCapDesc: `${this.frontendApiV3Url}/coins?offset=0&limit=48&sort=market_cap&includeNsfw=false&order=DESC`,
    createdDesc: `${this.frontendApiV3Url}/coins?offset=0&limit=48&sort=created_timestamp&includeNsfw=false&order=DESC`,
    latest: `${this.frontendApiV3Url}/coins/latest`,
    featured: `${this.advancedApiUrl}/coins/featured?keywordSearchActive=false`,
    runners: `https://pump.fun/api/runners`,
  };

  // Alternative endpoint patterns to try if primary fails
  private getAlternativeEndpoints(endpointType: PumpFunEndpointType): string[] {
    const alternatives: Record<string, string[]> = {
      latest: [
        `${this.frontendApiV3Url}/coins/latest`,
        `${this.frontendApiV3Url}/coins?sort=created_timestamp&order=DESC&limit=100`,
        `${this.frontendApiV3Url}/coins?offset=0&limit=100&sort=created_timestamp&includeNsfw=false&order=DESC`,
        `${this.baseUrl}/coins/latest`,
        `https://frontend-api.pump.fun/coins/latest`, // Direct URL fallback
      ],
      featured: [
        `${this.advancedApiUrl}/coins/featured?keywordSearchActive=false`,
        `${this.frontendApiV3Url}/coins/featured`,
        `${this.baseUrl}/coins/featured`,
      ],
      graduatedByTime: [
        `${this.advancedApiUrl}/coins/graduated?sortBy=creationTime`,
        `${this.frontendApiV3Url}/coins?complete=true&sort=complete_timestamp&order=DESC`,
        `${this.advancedApiUrl}/coins/graduated`,
      ],
      listByMarketCap: [
        `${this.advancedApiUrl}/coins/list?sortBy=marketCap`,
        `${this.frontendApiV3Url}/coins?sort=market_cap&order=DESC&limit=100`,
        `${this.advancedApiUrl}/coins/list?sortBy=marketCap&limit=100`,
      ],
    };
    return alternatives[endpointType] || [this.endpoints[endpointType]];
  }

  /**
   * Fetch token info from pump.fun API
   * @param mintAddress Token mint address
   */
  async fetchTokenInfo(mintAddress: string): Promise<PumpFunTokenInfo | null> {
    // Check cache first
    const cacheKey = `pumpfun:${mintAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Try multiple possible endpoints (using working APIs)
      const endpoints = [
        {
          url: `${this.frontendApiV3Url}/coins/${mintAddress}`,
          name: "v3/coins",
        },
        {
          url: `${this.frontendApiV3Url}/coins?mint=${mintAddress}`,
          name: "v3/coins?mint",
        },
      ];

      for (const { url, name } of endpoints) {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0",
            },
          });

          if (response.ok) {
            const data = await response.json();
            const tokenInfo = this.parseTokenData(data, mintAddress);
            if (tokenInfo) {
              this.cache.set(cacheKey, {
                data: tokenInfo,
                timestamp: Date.now(),
              });
              return tokenInfo;
            }
          }
        } catch (error) {
          // Try next endpoint
          continue;
        }
      }

      // If all endpoints fail, try search endpoint
      return await this.searchToken(mintAddress);
    } catch (error) {
      console.error(`Failed to fetch pump.fun data for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Search for token by mint address
   * Note: frontend-api.pump.fun/tokens endpoint returns Cloudflare DNS errors
   * Using only working endpoints
   */
  private async searchToken(
    mintAddress: string
  ): Promise<PumpFunTokenInfo | null> {
    try {
      // Try search endpoints (only working APIs)
      const searchEndpoints = [
        {
          url: `${this.frontendApiV3Url}/coins?search=${mintAddress}`,
          name: "v3/coins?search",
        },
        {
          url: `${this.frontendApiV3Url}/coins?mint=${mintAddress}`,
          name: "v3/coins?mint",
        },
      ];

      for (const { url, name } of searchEndpoints) {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0",
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Handle array response
            if (Array.isArray(data)) {
              const token = data.find(
                (t: PumpFunToken) =>
                  t.mint?.toLowerCase() === mintAddress.toLowerCase()
              );
              if (token) {
                return this.parseTokenData(token, mintAddress);
              }
            } else if (data.mint || data.coins) {
              // Handle object response
              const token = data.mint ? data : data.coins?.[0];
              if (token) {
                return this.parseTokenData(token, mintAddress);
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse pump.fun token data into our format
   */
  private parseTokenData(
    data: unknown,
    mintAddress: string
  ): PumpFunTokenInfo | null {
    const token = data as PumpFunToken | { coins?: PumpFunToken[] };

    // Handle array or nested response
    let tokenData: PumpFunToken;
    if (Array.isArray(data)) {
      tokenData = data.find(
        (t: PumpFunToken) => t.mint?.toLowerCase() === mintAddress.toLowerCase()
      ) as PumpFunToken;
    } else if ("coins" in token && Array.isArray(token.coins)) {
      tokenData = token.coins.find(
        (t: PumpFunToken) => t.mint?.toLowerCase() === mintAddress.toLowerCase()
      ) as PumpFunToken;
    } else {
      tokenData = data as PumpFunToken;
    }

    // Check for mint in various possible field names
    // advanced-api-v2 uses 'coinMint', frontend-api-v3 uses 'mint'
    const mint =
      tokenData.mint ||
      (tokenData as any).coinMint ||
      (tokenData as any).token ||
      (tokenData as any).address ||
      (tokenData as any).id;
    if (!tokenData || !mint) {
      return null;
    }

    // Ensure mint is set in tokenData
    if (!tokenData.mint) {
      tokenData.mint = mint;
    }

    // Handle different field name variations
    // advanced-api-v2 uses: coinMint, ticker, imageUrl, marketCap, currentMarketPrice
    // frontend-api-v3 uses: mint, symbol, image_uri, usd_market_cap, price
    const logo =
      tokenData.image_uri ||
      (tokenData as any).imageUrl ||
      (tokenData as any).image ||
      (tokenData as any).logo;
    const name = tokenData.name || (tokenData as any).tokenName || "";
    const symbol =
      tokenData.symbol ||
      (tokenData as any).ticker ||
      (tokenData as any).tokenSymbol ||
      "";
    const marketCap =
      tokenData.usd_market_cap ||
      tokenData.market_cap ||
      (tokenData as any).marketCap ||
      0;
    const volume = tokenData.volume || (tokenData as any).vol || 0;
    const price =
      tokenData.price ||
      (tokenData as any).currentMarketPrice ||
      (tokenData as any).priceUsd ||
      0;
    // CRITICAL: Check migration status using EXACT API field names
    // advanced-api-v2 uses: graduationDate (timestamp) and poolAddress (Raydium pool)
    // frontend-api-v3 uses: complete (boolean)
    // NEVER infer from market cap or bondingCurveProgress - tokens can drop below threshold after migrating
    const graduationDate = (tokenData as any).graduationDate;
    const poolAddress =
      (tokenData as any).poolAddress ||
      tokenData.raydium_pool ||
      (tokenData as any).raydiumPool;
    const isComplete =
      tokenData.complete === true ||
      (tokenData as any).isComplete === true ||
      (tokenData as any).migrated === true ||
      (graduationDate !== null && graduationDate !== undefined) || // graduationDate exists = migrated
      (poolAddress !== null && poolAddress !== undefined); // poolAddress exists = migrated

    return {
      mint: mint,
      logo: logo,
      name: name,
      symbol: symbol,
      description: tokenData.description || (tokenData as any).desc,
      price: price,
      priceUsd: price,
      marketCap: marketCap,
      volume: volume,
      isMigrated: isComplete,
      migrationTimestamp:
        tokenData.complete_timestamp ||
        (tokenData as any).migrationTimestamp ||
        (tokenData as any).completeTimestamp ||
        (graduationDate ? new Date(graduationDate).getTime() : undefined),
      raydiumPool:
        poolAddress || tokenData.raydium_pool || (tokenData as any).raydiumPool,
      socials: {
        website: tokenData.website || (tokenData as any).websiteUrl,
        twitter: tokenData.twitter || (tokenData as any).twitterUrl,
        telegram: tokenData.telegram || (tokenData as any).telegramUrl,
      },
      reserves: {
        sol:
          tokenData.sol_reserves ||
          tokenData.real_sol_reserves ||
          (tokenData as any).solReserves,
        token:
          tokenData.token_reserves ||
          tokenData.real_token_reserves ||
          (tokenData as any).tokenReserves,
      },
      priceChange24h:
        tokenData.price_change_24h || (tokenData as any).priceChange24h,
      createdTimestamp:
        tokenData.created_timestamp ||
        (tokenData as any).createdTimestamp ||
        (tokenData as any).creationTimestamp ||
        (tokenData as any).creationTime, // advanced-api-v2 uses creationTime
      // CRITICAL: Use bondingCurveProgress from API if available (0-100, convert to 0-1)
      // This is more accurate than calculating from market cap
      bondingProgress:
        (tokenData as any).bondingCurveProgress !== undefined &&
        (tokenData as any).bondingCurveProgress !== null
          ? Math.min((tokenData as any).bondingCurveProgress / 100, 1.0) // Convert 0-100 to 0-1
          : undefined,
      // Preserve additional data for token pages
      numHolders: (tokenData as any).numHolders,
      holders: (tokenData as any).holders, // Top holders data
      transactions:
        (tokenData as any).transactions ||
        (tokenData as any).buyTransactions +
          (tokenData as any).sellTransactions,
      buyTransactions: (tokenData as any).buyTransactions,
      sellTransactions: (tokenData as any).sellTransactions,
      // Extract decimals from API response (check various possible field names)
      decimals:
        (tokenData as any).decimals ??
        (tokenData as any).decimal ??
        (tokenData as any).tokenDecimals ??
        (tokenData as any).decimals_ ??
        undefined,
    };
  }

  /**
   * Fetch tokens from a specific pump.fun endpoint
   * Includes request deduplication and caching to prevent too many simultaneous requests
   */
  async fetchFromEndpoint(
    endpointType: PumpFunEndpointType,
    limit?: number
  ): Promise<PumpFunTokenInfo[]> {
    // Create cache key
    const cacheKey = `${endpointType}-${limit || 'default'}`;
    
    // Check cache first
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Using cached data for ${cacheKey}`);
      return cached.data;
    }
    
    // Check if there's already a pending request for this endpoint
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`⏳ Waiting for existing request to ${cacheKey}...`);
      return pending;
    }
    
    // Throttle requests - ensure minimum interval between requests to same endpoint
    const lastRequest = this.lastRequestTime.get(cacheKey) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏸️ Throttling request to ${cacheKey}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Create the request promise
    const requestPromise = this._fetchFromEndpointInternal(endpointType, limit);
    
    // Store as pending
    this.pendingRequests.set(cacheKey, requestPromise);
    this.lastRequestTime.set(cacheKey, Date.now());
    
    try {
      const result = await requestPromise;
      // Cache the result
      this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  /**
   * Internal method to actually fetch from endpoint
   */
  private async _fetchFromEndpointInternal(
    endpointType: PumpFunEndpointType,
    limit?: number
  ): Promise<PumpFunTokenInfo[]> {
    try {
      // Try primary endpoint first, then alternatives
      const endpointsToTry = [
        this.endpoints[endpointType],
        ...this.getAlternativeEndpoints(endpointType),
      ].filter(
        (url, index, self) => self.indexOf(url) === index // Remove duplicates
      );

      for (let i = 0; i < endpointsToTry.length; i++) {
        let url = endpointsToTry[i];

        // Add limit if provided and endpoint supports it
        if (limit && !url.includes("limit=")) {
          url += url.includes("?") ? `&limit=${limit}` : `?limit=${limit}`;
        }

        try {
          // Use minimal headers to avoid CORS preflight issues
          // Only include Accept header - browser will add User-Agent automatically
          // Don't include Content-Type for GET requests as it triggers preflight
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              // Removed User-Agent and Content-Type to avoid CORS preflight
              // Browser automatically adds User-Agent, and Content-Type isn't needed for GET
            },
            credentials: "omit",
            mode: "cors", // Explicitly set CORS mode
          }).catch((error) => {
            // If it's a CORS/network error, don't try other endpoints - they'll likely fail too
            if (error.message?.includes("CORS") || error.message?.includes("Failed to fetch") || error.name === "TypeError") {
              console.warn(`🚫 CORS/Network error for ${endpointType}, skipping remaining endpoints`);
              throw error; // Re-throw to exit early
            }
            throw error;
          });

          if (!response.ok) {
            // Handle rate limiting (429) - wait a bit before trying next endpoint
            if (response.status === 429) {
              console.warn(`⏸️ Rate limited (429) for ${endpointType}, waiting before next attempt...`);
              if (i < endpointsToTry.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                continue; // Try next endpoint
              }
              throw new Error(`Rate limited: ${endpointType}`);
            }
            
            // Handle server errors (5xx) - don't try other endpoints if server is down
            if (response.status >= 500) {
              console.warn(`🚫 Server error (${response.status}) for ${endpointType}, skipping remaining endpoints`);
              if (endpointType === "featured") {
                // Featured endpoint often fails, return empty silently
                return [];
              }
              throw new Error(`Server error: ${endpointType} (${response.status})`);
            }
            
            // If it's a CORS-related error (status 0 or network error), don't try other endpoints
            if (response.status === 0 || response.type === "opaque") {
              console.warn(`🚫 CORS blocked request to ${url}, skipping remaining endpoints`);
              throw new Error(`CORS blocked: ${endpointType}`);
            }
            
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            throw new Error(
              `Failed to fetch ${endpointType}: ${response.status} ${response.statusText}`
            );
          }

          // Check if response is empty
          const contentLength = response.headers.get("content-length");
          if (contentLength === "0") {
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          // Get response text first to check if it's actually empty
          const responseText = await response.text();
          if (!responseText || responseText.trim() === "") {
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error(
              `Failed to parse JSON for ${endpointType}:`,
              parseError
            );
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          // Handle different response formats
          let tokens: PumpFunToken[] = [];
          if (Array.isArray(data)) {
            tokens = data;
          } else if (data && data.coins && Array.isArray(data.coins)) {
            tokens = data.coins;
          } else if (data && data.tokens && Array.isArray(data.tokens)) {
            tokens = data.tokens;
          } else if (data && data.data && Array.isArray(data.data)) {
            tokens = data.data;
          } else {
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          const tokenInfos = tokens
            .map((t: PumpFunToken) => {
              const mint =
                t.mint ||
                (t as any).coinMint ||
                (t as any).token ||
                (t as any).address ||
                (t as any).id;
              if (!mint) return null;
              return this.parseTokenData(t, mint);
            })
            .filter((info): info is PumpFunTokenInfo => info !== null);

          if (tokenInfos.length > 0) {
            // Cache is handled in the outer fetchFromEndpoint function
            return tokenInfos;
          } else {
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
          }
        } catch (endpointError) {
          if (i < endpointsToTry.length - 1) continue; // Try next endpoint
          // Silently fail for featured endpoint (it's often unavailable)
          if (endpointType !== "featured") {
            console.error(
              `Failed to fetch ${endpointType}:`,
              endpointError instanceof Error
                ? endpointError.message
                : endpointError
            );
          }
        }
      }

      // If all endpoints failed, return empty array silently for featured
      if (endpointType !== "featured") {
        console.error(`❌ All endpoints failed for ${endpointType}`, {
          endpointsTried: endpointsToTry.length,
          endpoints: endpointsToTry,
        });
      }
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch ${endpointType}:`, error);
      return [];
    }
  }

  /**
   * Fetch latest tokens
   */
  async fetchLatest(limit = 48): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("latest", limit);
  }

  /**
   * Fetch featured tokens
   */
  async fetchFeatured(limit?: number): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("featured", limit);
  }

  /**
   * Fetch graduated tokens (migrated to Raydium)
   */
  async fetchGraduated(limit?: number): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("graduatedByTime", limit);
  }

  /**
   * Fetch tokens sorted by market cap
   */
  async fetchByMarketCap(limit?: number): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("listByMarketCap", limit);
  }

  /**
   * Fetch tokens sorted by creation time
   */
  async fetchByCreation(limit?: number): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("listByCreation", limit);
  }

  /**
   * Fetch runners (trending tokens)
   */
  async fetchRunners(limit?: number): Promise<PumpFunTokenInfo[]> {
    return this.fetchFromEndpoint("runners", limit);
  }

  /**
   * Fetch migrated tokens (tokens that completed bonding curve)
   */
  async fetchMigratedTokens(limit = 50): Promise<PumpFunTokenInfo[]> {
    // Use graduated endpoint for migrated tokens
    return this.fetchGraduated(limit);
  }

  /**
   * Fetch candles/OHLCV data for a token (for charting)
   * Endpoint: https://swap-api.pump.fun/v2/coins/{mintAddress}/candles
   *
   * NOTE: This endpoint may not work for all coins - some tokens may not have candle data
   * Valid intervals: 1s, 15s, 30s, 1m, 5m, 15m, 30m, 1h, 4h, 6h, 12h, 24h
   *
   * @param mintAddress - Token mint address
   * @param interval - Candle interval: '1m', '5m', '15m', '1h', '4h', '6h', '12h', '24h' (default: '1h')
   * @param limit - Number of candles to fetch (default: 1000, max: 1000)
   * @param currency - Currency for prices: 'USD' or 'SOL' (default: 'USD')
   * @param createdTs - Token creation timestamp (optional, helps with data accuracy)
   * @returns Array of candle data or empty array if not available
   */
  async fetchTokenCandles(
    mintAddress: string,
    interval: "1m" | "5m" | "15m" | "1h" | "4h" | "6h" | "12h" | "24h" = "1h",
    limit: number = 1000,
    currency: "USD" | "SOL" = "USD",
    createdTs?: number
  ): Promise<
    Array<{
      timestamp: number;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }>
  > {
    const cacheKey = `candles:${mintAddress}:${interval}:${limit}:${currency}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as Array<{
        timestamp: number;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
      }>;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Build URL with query parameters
      const params = new URLSearchParams({
        interval,
        limit: limit.toString(),
        currency,
      });

      // Add createdTs if provided
      if (createdTs) {
        params.append("createdTs", createdTs.toString());
      }

      const url = `${this.swapApiUrl}/v2/coins/${mintAddress}/candles?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If 404 or other error, token may not have candle data - return empty array
        if (response.status === 404) {
          console.warn(`⚠️ No candle data available for token ${mintAddress}`);
          return [];
        }
        console.error(
          `❌ Pump.fun candles API error: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data = await response.json();

      // Validate response format
      if (!Array.isArray(data)) {
        console.warn(
          `⚠️ Unexpected candles response format for ${mintAddress}`
        );
        return [];
      }

      // Parse candles - keep as strings (as returned by API) for precision
      const candles = data.map((candle: any) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

      // Cache the result
      this.cache.set(cacheKey, {
        data: candles,
        timestamp: Date.now(),
      });

      return candles;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(
          `❌ Pump.fun candles API request timeout for ${mintAddress}`
        );
      } else {
        console.error(
          `❌ Failed to fetch candles for ${mintAddress}:`,
          error.message || error
        );
      }
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const pumpFunService = new PumpFunService();
