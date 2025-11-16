/**
 * DexScreener API integration
 * Fetches token details: logo, price, % change, socials, etc.
 * API: https://api.dexscreener.com/latest/dex/pairs/{chain}/{address}
 */

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: Array<{ label: string; url: string }>;
    socials?: Array<{ type: string; url: string }>;
  };
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[] | null;
  pair: DexScreenerPair | null;
}

export interface DexScreenerTokenInfo {
  logo?: string;
  priceUsd?: number;
  priceNative?: number;
  priceChange24h?: number;
  priceChange1h?: number;
  priceChange5m?: number;
  volume24h?: number;
  liquidity?: number;
  fdv?: number;
  socials?: Array<{ type: string; url: string }>;
  websites?: Array<{ label: string; url: string }>;
  dexUrl?: string;
  isPaid?: boolean; // DexScreener paid listing indicator
}

export class DexScreenerService {
  private baseUrl = "https://api.dexscreener.com/latest/dex";
  private cache: Map<
    string,
    { data: DexScreenerTokenInfo; timestamp: number }
  > = new Map();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Fetch token info from DexScreener
   * @param chain Chain identifier: "solana", "bsc", "ethereum", "base", etc.
   * @param address Token contract/mint address
   */
  async fetchTokenInfo(
    chain: "solana" | "bsc" | "ethereum" | "base",
    address: string
  ): Promise<DexScreenerTokenInfo | null> {
    // Check cache first
    const cacheKey = `${chain}:${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // DexScreener search endpoint to find pairs for this token address
      // The /pairs/{chain}/{address} endpoint expects a pair address, not token address
      // So we search for the token address first
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(address)}`;
      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!searchResponse.ok) {
        if (searchResponse.status === 404) {
          // Token not found on DexScreener (common for new tokens)
          return null;
        }
        throw new Error(
          `DexScreener search error: ${searchResponse.status} ${searchResponse.statusText}`
        );
      }

      const searchData: DexScreenerResponse = await searchResponse.json();
      const pairs = searchData.pairs || [];

      if (!pairs || pairs.length === 0) {
        return null;
      }

      // Filter pairs to only those matching our chain and token address
      // Find the pair where our token is the baseToken (most common)
      const matchingPairs = pairs.filter(
        (p) =>
          p.chainId === chain &&
          (p.baseToken.address.toLowerCase() === address.toLowerCase() ||
            p.quoteToken.address.toLowerCase() === address.toLowerCase())
      );

      if (matchingPairs.length === 0) {
        return null;
      }

      // Sort by liquidity (highest first) and pick the most liquid pair
      const pair = matchingPairs.sort((a, b) => {
        const aLiq = a.liquidity?.usd || 0;
        const bLiq = b.liquidity?.usd || 0;
        return bLiq - aLiq;
      })[0];

      if (!pair) {
        return null;
      }

      const tokenInfo: DexScreenerTokenInfo = {
        logo: pair.info?.imageUrl,
        priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : undefined,
        priceNative: pair.priceNative
          ? parseFloat(pair.priceNative)
          : undefined,
        priceChange24h: pair.priceChange?.h24,
        priceChange1h: pair.priceChange?.h1,
        priceChange5m: pair.priceChange?.m5,
        volume24h: pair.volume?.h24,
        liquidity: pair.liquidity?.usd,
        fdv: pair.fdv,
        socials: pair.info?.socials,
        websites: pair.info?.websites,
        dexUrl: pair.url,
        // DexScreener doesn't explicitly indicate paid listings in API
        // You might need to check other indicators or use a different method
        isPaid: false, // TODO: Determine paid listing status if needed
      };

      // Cache the result
      this.cache.set(cacheKey, { data: tokenInfo, timestamp: Date.now() });

      return tokenInfo;
    } catch (error) {
      console.error(
        `Failed to fetch DexScreener data for ${chain}:${address}:`,
        error
      );
      return null;
    }
  }

  /**
   * Search for tokens by query (name, symbol, or address)
   * Useful for finding tokens when you only have partial info
   */
  async searchTokens(query: string): Promise<DexScreenerPair[]> {
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.status}`);
      }

      const data: DexScreenerResponse = await response.json();
      return data.pairs || [];
    } catch (error) {
      console.error(`Failed to search DexScreener for "${query}":`, error);
      return [];
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const dexscreenerService = new DexScreenerService();
