/**
 * GeckoTerminal API Service
 * 
 * Provides token data, pair information, and trading data
 * GeckoTerminal is a reliable source for token information across multiple chains
 */

import { TokenData } from "@/types/token";
import { logger } from "@/lib/logger";

const GECKO_TERMINAL_API = "https://api.geckoterminal.com/api/v2";

export interface GeckoTerminalTokenInfo {
  logo?: string;
  name?: string;
  symbol?: string;
  priceUsd?: number;
  priceNative?: number;
  priceChange24h?: number;
  priceChange1h?: number;
  volume24h?: number;
  volume1h?: number;
  liquidity?: number;
  marketCap?: number;
  fdv?: number;
  pairAddress?: string;
  dexId?: string;
  baseToken?: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken?: {
    address: string;
    name: string;
    symbol: string;
  };
  transactions24h?: {
    buys: number;
    sells: number;
    total: number;
  };
}

interface GeckoTerminalResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      name?: string;
      address?: string;
      symbol?: string;
      image_url?: string;
      price_usd?: string;
      price_native_currency?: string;
      price_change_percentage?: {
        h1?: number;
        h24?: number;
      };
      volume_usd?: {
        h1?: string;
        h24?: string;
      };
      reserve_in_usd?: string;
      market_cap_usd?: string;
      fdv_usd?: string;
      transactions?: {
        h24?: {
          buys?: number;
          sells?: number;
        };
      };
      base_token?: {
        address?: string;
        name?: string;
        symbol?: string;
      };
      quote_token?: {
        address?: string;
        name?: string;
        symbol?: string;
      };
      pair_address?: string;
      dex_id?: string;
    };
  };
}

export class GeckoTerminalService {
  private cache: Map<
    string,
    { data: GeckoTerminalTokenInfo; timestamp: number }
  > = new Map();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Fetch token info from GeckoTerminal
   * @param network Network identifier: "solana", "bsc", "ethereum", "base", etc.
   * @param address Token contract/mint address
   */
  async fetchTokenInfo(
    network: "solana" | "bsc" | "ethereum" | "base",
    address: string
  ): Promise<GeckoTerminalTokenInfo | null> {
    // Check cache first
    const cacheKey = `${network}:${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // GeckoTerminal uses network-specific endpoints
      // Format: /networks/{network}/tokens/{address}
      // Note: GeckoTerminal may require searching for pairs instead of direct token lookup
      // Try direct token endpoint first, then fallback to pair search
      let url = `${GECKO_TERMINAL_API}/networks/${network}/tokens/${address}`;
      
      let response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      // If direct token lookup fails, try searching for pairs
      if (!response.ok && response.status === 404) {
        // Try searching for pools/pairs containing this token
        url = `${GECKO_TERMINAL_API}/networks/${network}/tokens/${address}/pools`;
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
      }

      if (!response.ok) {
        if (response.status === 404) {
          // Token not found on GeckoTerminal
          return null;
        }
        throw new Error(
          `GeckoTerminal error: ${response.status} ${response.statusText}`
        );
      }

      const data: any = await response.json();
      
      // Handle both token response and pools response formats
      if (!data.data) {
        return null;
      }
      
      let attrs: any;
      
      // If it's a pools response (array), extract token data from the first pool
      if (Array.isArray(data.data) && data.data.length > 0) {
        const pool = data.data[0];
        attrs = pool.attributes;
        if (!attrs) return null;
        
        // For pools, we need to find which token is our target token
        const baseToken = attrs.base_token;
        const quoteToken = attrs.quote_token;
        const isBaseToken = baseToken?.address?.toLowerCase() === address.toLowerCase();
        const targetToken = isBaseToken ? baseToken : quoteToken;
        
        if (!targetToken) return null;
        
        // Build token info from pool data
        const tokenInfo: GeckoTerminalTokenInfo = {
          logo: targetToken.logo || attrs.image_url,
          name: targetToken.name,
          symbol: targetToken.symbol,
          priceUsd: attrs.price_usd ? parseFloat(attrs.price_usd) : undefined,
          priceNative: attrs.price_native_currency 
            ? parseFloat(attrs.price_native_currency) 
            : undefined,
          priceChange24h: attrs.price_change_percentage?.h24,
          priceChange1h: attrs.price_change_percentage?.h1,
          volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : undefined,
          volume1h: attrs.volume_usd?.h1 ? parseFloat(attrs.volume_usd.h1) : undefined,
          liquidity: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : undefined,
          marketCap: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : undefined,
          fdv: attrs.fdv_usd ? parseFloat(attrs.fdv_usd) : undefined,
          pairAddress: attrs.address,
          dexId: attrs.dex_id,
          baseToken: baseToken ? {
            address: baseToken.address,
            name: baseToken.name,
            symbol: baseToken.symbol,
          } : undefined,
          quoteToken: quoteToken ? {
            address: quoteToken.address,
            name: quoteToken.name,
            symbol: quoteToken.symbol,
          } : undefined,
          transactions24h: attrs.transactions?.h24
            ? {
                buys: attrs.transactions.h24.buys || 0,
                sells: attrs.transactions.h24.sells || 0,
                total: (attrs.transactions.h24.buys || 0) + (attrs.transactions.h24.sells || 0),
              }
            : undefined,
        };
        
        // Cache the result
        this.cache.set(cacheKey, { data: tokenInfo, timestamp: Date.now() });
        return tokenInfo;
      }
      
      // Otherwise, it's a direct token response
      attrs = data.data.attributes;
      if (!attrs) return null;

      const tokenInfo: GeckoTerminalTokenInfo = {
        logo: attrs.image_url,
        name: attrs.name,
        symbol: attrs.symbol,
        priceUsd: attrs.price_usd ? parseFloat(attrs.price_usd) : undefined,
        priceNative: attrs.price_native_currency 
          ? parseFloat(attrs.price_native_currency) 
          : undefined,
        priceChange24h: attrs.price_change_percentage?.h24,
        priceChange1h: attrs.price_change_percentage?.h1,
        volume24h: attrs.volume_usd?.h24 ? parseFloat(attrs.volume_usd.h24) : undefined,
        volume1h: attrs.volume_usd?.h1 ? parseFloat(attrs.volume_usd.h1) : undefined,
        liquidity: attrs.reserve_in_usd ? parseFloat(attrs.reserve_in_usd) : undefined,
        marketCap: attrs.market_cap_usd ? parseFloat(attrs.market_cap_usd) : undefined,
        fdv: attrs.fdv_usd ? parseFloat(attrs.fdv_usd) : undefined,
        pairAddress: attrs.pair_address,
        dexId: attrs.dex_id,
        baseToken: attrs.base_token ? {
          address: attrs.base_token.address,
          name: attrs.base_token.name,
          symbol: attrs.base_token.symbol,
        } : undefined,
        quoteToken: attrs.quote_token ? {
          address: attrs.quote_token.address,
          name: attrs.quote_token.name,
          symbol: attrs.quote_token.symbol,
        } : undefined,
        transactions24h: attrs.transactions?.h24
          ? {
              buys: attrs.transactions.h24.buys || 0,
              sells: attrs.transactions.h24.sells || 0,
              total: (attrs.transactions.h24.buys || 0) + (attrs.transactions.h24.sells || 0),
            }
          : undefined,
      };

      // Cache the result
      this.cache.set(cacheKey, { data: tokenInfo, timestamp: Date.now() });

      return tokenInfo;
    } catch (error) {
      console.error(
        `Failed to fetch GeckoTerminal data for ${network}:${address}:`,
        error
      );
      return null;
    }
  }


  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const geckoTerminalService = new GeckoTerminalService();
