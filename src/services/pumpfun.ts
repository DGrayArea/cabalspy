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

    // Check for mint in various possible field names
    // advanced-api-v2 uses 'coinMint', frontend-api-v3 uses 'mint'
    const mint = tokenData.mint || (tokenData as any).coinMint || (tokenData as any).token || (tokenData as any).address || (tokenData as any).id;
    if (!tokenData || !mint) {
      console.warn(`⚠️ parseTokenData: Token missing mint address. Keys:`, Object.keys(tokenData || {}));
      return null;
    }
    
    // Ensure mint is set in tokenData
    if (!tokenData.mint) {
      tokenData.mint = mint;
    }

    // Handle different field name variations
    // advanced-api-v2 uses: coinMint, ticker, imageUrl, marketCap, currentMarketPrice
    // frontend-api-v3 uses: mint, symbol, image_uri, usd_market_cap, price
    const logo = tokenData.image_uri || (tokenData as any).imageUrl || (tokenData as any).image || (tokenData as any).logo;
    const name = tokenData.name || (tokenData as any).tokenName || "";
    const symbol = tokenData.symbol || (tokenData as any).ticker || (tokenData as any).tokenSymbol || "";
    const marketCap = tokenData.usd_market_cap || tokenData.market_cap || (tokenData as any).marketCap || 0;
    const volume = tokenData.volume || (tokenData as any).vol || 0;
    const price = tokenData.price || (tokenData as any).currentMarketPrice || (tokenData as any).priceUsd || 0;
    // Check if migrated/graduated: advanced-api-v2 has graduationDate, frontend-api-v3 has complete
    const isComplete = tokenData.complete === true || 
                       (tokenData as any).isComplete === true || 
                       (tokenData as any).migrated === true ||
                       !!(tokenData as any).graduationDate; // If graduationDate exists, token is migrated
    
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
      migrationTimestamp: tokenData.complete_timestamp || 
                          (tokenData as any).migrationTimestamp || 
                          (tokenData as any).completeTimestamp ||
                          ((tokenData as any).graduationDate ? new Date((tokenData as any).graduationDate).getTime() : undefined),
      raydiumPool: tokenData.raydium_pool || (tokenData as any).raydiumPool || (tokenData as any).poolAddress,
      socials: {
        website: tokenData.website || (tokenData as any).websiteUrl,
        twitter: tokenData.twitter || (tokenData as any).twitterUrl,
        telegram: tokenData.telegram || (tokenData as any).telegramUrl,
      },
      reserves: {
        sol: tokenData.sol_reserves || tokenData.real_sol_reserves || (tokenData as any).solReserves,
        token: tokenData.token_reserves || tokenData.real_token_reserves || (tokenData as any).tokenReserves,
      },
      priceChange24h: tokenData.price_change_24h || (tokenData as any).priceChange24h,
      createdTimestamp: tokenData.created_timestamp || 
                        (tokenData as any).createdTimestamp || 
                        (tokenData as any).creationTimestamp ||
                        (tokenData as any).creationTime, // advanced-api-v2 uses creationTime
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
      // Try primary endpoint first, then alternatives
      const endpointsToTry = [this.endpoints[endpointType], ...this.getAlternativeEndpoints(endpointType)].filter(
        (url, index, self) => self.indexOf(url) === index // Remove duplicates
      );

      for (let i = 0; i < endpointsToTry.length; i++) {
        let url = endpointsToTry[i];
        
        // Add limit if provided and endpoint supports it
        if (limit && !url.includes("limit=")) {
          url += url.includes("?") ? `&limit=${limit}` : `?limit=${limit}`;
        }

        console.log(`🌐 [${i + 1}/${endpointsToTry.length}] Fetching ${endpointType} from: ${url}`);
        
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Content-Type": "application/json",
            },
            credentials: "omit",
          });

          if (!response.ok) {
            // Try to get error details from response
            let errorDetails = "";
            try {
              const errorText = await response.text();
              errorDetails = errorText.substring(0, 200);
            } catch {
              // Ignore if we can't read error response
            }
            
            console.warn(`⚠️ ${endpointType} endpoint ${i + 1} failed:`, {
              url,
              status: response.status,
              statusText: response.statusText,
              errorDetails,
            });
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            throw new Error(`Failed to fetch ${endpointType}: ${response.status} ${response.statusText}`);
          }

          // Check if response is empty
          const contentLength = response.headers.get("content-length");
          const contentType = response.headers.get("content-type");
          
          console.log(`📦 ${endpointType} response:`, {
            status: response.status,
            contentType,
            contentLength,
            endpoint: i + 1,
          });

          // If content-length is 0, try next endpoint
          if (contentLength === "0") {
            console.warn(`⚠️ ${endpointType} endpoint ${i + 1} returned empty response (Content-Length: 0)`);
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          // Get response text first to check if it's actually empty
          const responseText = await response.text();
          
          if (!responseText || responseText.trim() === "") {
            console.warn(`⚠️ ${endpointType} endpoint ${i + 1} returned empty body`);
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error(`❌ Failed to parse JSON for ${endpointType} endpoint ${i + 1}:`, parseError);
            console.log("Raw response (first 200 chars):", responseText.substring(0, 200));
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }
          
          console.log(`📊 ${endpointType} parsed data:`, {
            type: Array.isArray(data) ? "array" : typeof data,
            keys: Object.keys(data || {}),
            length: Array.isArray(data) ? data.length : "N/A",
            endpoint: i + 1,
          });
      
          // Handle different response formats
          let tokens: PumpFunToken[] = [];
          if (Array.isArray(data)) {
            tokens = data;
            console.log(`✅ ${endpointType}: Found ${tokens.length} tokens (array format)`);
          } else if (data && data.coins && Array.isArray(data.coins)) {
            tokens = data.coins;
            console.log(`✅ ${endpointType}: Found ${tokens.length} tokens (data.coins format)`);
          } else if (data && data.tokens && Array.isArray(data.tokens)) {
            tokens = data.tokens;
            console.log(`✅ ${endpointType}: Found ${tokens.length} tokens (data.tokens format)`);
          } else if (data && data.data && Array.isArray(data.data)) {
            tokens = data.data;
            console.log(`✅ ${endpointType}: Found ${tokens.length} tokens (data.data format)`);
          } else {
            console.warn(`⚠️ ${endpointType}: Unknown response format. Data type:`, typeof data);
            if (data) {
              console.warn("Data keys:", Object.keys(data));
              console.warn("Sample:", JSON.stringify(data).substring(0, 500));
            }
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
            return [];
          }

          console.log(`🔍 ${endpointType}: Parsing ${tokens.length} tokens...`);
          if (tokens.length > 0) {
            console.log(`📋 Sample token structure (first token):`, {
              keys: Object.keys(tokens[0]),
              hasMint: !!(tokens[0] as any).mint,
              hasToken: !!(tokens[0] as any).token,
              hasAddress: !!(tokens[0] as any).address,
              sample: JSON.stringify(tokens[0]).substring(0, 300),
            });
          }
          
          const tokenInfos = tokens
            .map((t: PumpFunToken) => {
              // Try to get mint address from various possible field names
              // The advanced-api-v2 uses 'coinMint' instead of 'mint'
              const mint = t.mint || (t as any).coinMint || (t as any).token || (t as any).address || (t as any).id;
              if (!mint) {
                console.warn(`⚠️ Token missing mint address. Keys:`, Object.keys(t));
                return null;
              }
              const parsed = this.parseTokenData(t, mint);
              if (!parsed) {
                console.warn(`⚠️ Failed to parse token with mint: ${mint}`);
              }
              return parsed;
            })
            .filter((info): info is PumpFunTokenInfo => info !== null);
          
          console.log(`✅ ${endpointType}: Successfully parsed ${tokenInfos.length} out of ${tokens.length} tokens`);

          if (tokenInfos.length > 0) {
            console.log(`✅ ${endpointType}: Successfully fetched ${tokenInfos.length} tokens from endpoint ${i + 1}`);
            this.cache.set(cacheKey, {
              data: tokenInfos,
              timestamp: Date.now(),
            });
            return tokenInfos;
          } else {
            console.warn(`⚠️ ${endpointType} endpoint ${i + 1} returned 0 tokens after parsing`);
            if (i < endpointsToTry.length - 1) continue; // Try next endpoint
          }
        } catch (endpointError) {
          const errorMessage = endpointError instanceof Error ? endpointError.message : String(endpointError);
          const errorName = endpointError instanceof Error ? endpointError.name : "Unknown";
          console.error(`❌ ${endpointType} endpoint ${i + 1} error:`, {
            url,
            error: errorMessage,
            name: errorName,
            stack: endpointError instanceof Error ? endpointError.stack : undefined,
          });
          if (i < endpointsToTry.length - 1) continue; // Try next endpoint
        }
      }

      // If all endpoints failed, return empty array
      console.error(`❌ All endpoints failed for ${endpointType}`, {
        endpointsTried: endpointsToTry.length,
        endpoints: endpointsToTry,
      });
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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const pumpFunService = new PumpFunService();

