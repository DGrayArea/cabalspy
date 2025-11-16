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
  private baseUrl = "https://frontend-api.pump.fun";
  private advancedApiUrl = "https://advanced-api-v2.pump.fun";
  private frontendApiV3Url = "https://frontend-api-v3.pump.fun";
  private swapApiUrl = "https://swap-api.pump.fun";
  
  private cache: Map<
    string,
    { data: PumpFunTokenInfo | PumpFunTokenInfo[]; timestamp: number }
  > = new Map();
  private cacheTTL = 30000; // 30 second cache (shorter for real-time data)
  
  // Endpoint definitions
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
        { url: `${this.frontendApiV3Url}/coins/${mintAddress}`, name: "v3/coins" },
        { url: `${this.frontendApiV3Url}/coins?mint=${mintAddress}`, name: "v3/coins?mint" },
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
      console.error(
        `Failed to fetch pump.fun data for ${mintAddress}:`,
        error
      );
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
        { url: `${this.frontendApiV3Url}/coins?search=${mintAddress}`, name: "v3/coins?search" },
        { url: `${this.frontendApiV3Url}/coins?mint=${mintAddress}`, name: "v3/coins?mint" },
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
        (t: PumpFunToken) =>
          t.mint?.toLowerCase() === mintAddress.toLowerCase()
      ) as PumpFunToken;
    } else if ("coins" in token && Array.isArray(token.coins)) {
      tokenData = token.coins.find(
        (t: PumpFunToken) =>
          t.mint?.toLowerCase() === mintAddress.toLowerCase()
      ) as PumpFunToken;
    } else {
      tokenData = data as PumpFunToken;
    }

    if (!tokenData || !tokenData.mint) {
      return null;
    }

    return {
      mint: tokenData.mint,
      logo: tokenData.image_uri,
      name: tokenData.name || "",
      symbol: tokenData.symbol || "",
      description: tokenData.description,
      price: tokenData.price,
      priceUsd: tokenData.price, // Assuming price is in USD
      marketCap: tokenData.usd_market_cap || tokenData.market_cap,
      volume: tokenData.volume,
      isMigrated: tokenData.complete === true,
      migrationTimestamp: tokenData.complete_timestamp,
      raydiumPool: tokenData.raydium_pool,
      socials: {
        website: tokenData.website,
        twitter: tokenData.twitter,
        telegram: tokenData.telegram,
      },
      reserves: {
        sol: tokenData.sol_reserves || tokenData.real_sol_reserves,
        token: tokenData.token_reserves || tokenData.real_token_reserves,
      },
      priceChange24h: tokenData.price_change_24h,
    };
  }

  /**
   * Fetch tokens from a specific pump.fun endpoint
   */
  async fetchFromEndpoint(
    endpointType: PumpFunEndpointType,
    limit?: number
  ): Promise<PumpFunTokenInfo[]> {
    const cacheKey = `endpoint:${endpointType}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return Array.isArray(cached.data) ? cached.data : [];
    }

    try {
      let url = this.endpoints[endpointType];
      
      // Add limit if provided and endpoint supports it
      if (limit && !url.includes("limit=")) {
        url += url.includes("?") ? `&limit=${limit}` : `?limit=${limit}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpointType}: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let tokens: PumpFunToken[] = [];
      if (Array.isArray(data)) {
        tokens = data;
      } else if (data.coins) {
        tokens = Array.isArray(data.coins) ? data.coins : [];
      } else if (data.tokens) {
        tokens = Array.isArray(data.tokens) ? data.tokens : [];
      } else if (data.data) {
        tokens = Array.isArray(data.data) ? data.data : [];
      }

      const tokenInfos = tokens
        .map((t: PumpFunToken) => this.parseTokenData(t, t.mint))
        .filter((info): info is PumpFunTokenInfo => info !== null);

      this.cache.set(cacheKey, {
        data: tokenInfos,
        timestamp: Date.now(),
      });

      return tokenInfos;
    } catch (error) {
      console.error(`Failed to fetch ${endpointType}:`, error);
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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const pumpFunService = new PumpFunService();

