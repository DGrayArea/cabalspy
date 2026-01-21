/**
 * Mobula Pulse Service - Clean Implementation
 *
 * Handles two types of endpoints:
 * 1. GET endpoint - Returns new, bonding, bonded (basic filters)
 * 2. POST endpoint - Returns trending, quality-tokens, high-volume, price-gainers (advanced filters)
 *
 * Features:
 * - Auto-refresh with interval
 * - Smart merging of new data with existing
 * - Pagination support (offset)
 * - Infinite scroll support
 */

import axios, { AxiosResponse } from "axios";
import { TokenData } from "@/types/token";
import { logger } from "@/lib/logger";

const GET_API_URL = "https://api.mobula.io/api/2/pulse";
const POST_API_URL = "https://pulse-v2-api.mobula.io/api/2/pulse";
const API_KEY =
  process.env.NEXT_PUBLIC_MOBULA_API_KEY ||
  "7b7ba456-f454-4a42-a80e-897319cb0ac1";

// Pool types for Solana
const SOLANA_POOL_TYPES = [
  "pumpfun",
  "meteora",
  "moonshot",
  "jupiter",
  "raydium",
  "moonit",
  "letsbonk",
];

/**
 * Response structure from Mobula API
 * This is the actual structure returned by the API
 */
interface MobulaToken {
  address: string;
  chainId: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  price: number;
  latest_price: number;
  marketCap?: number;
  market_cap?: number;
  latest_market_cap?: number;
  liquidity: number;
  logo: string | null;
  createdAt: string | null;
  created_at?: string | null;

  // Price changes
  price_change_1min?: number;
  price_change_5min?: number;
  price_change_1h?: number;
  price_change_4h?: number;
  price_change_6h?: number;
  price_change_12h?: number;
  price_change_24h?: number;

  // Volumes
  volume_1min?: number;
  volume_5min?: number;
  volume_15min?: number;
  volume_1h?: number;
  volume_4h?: number;
  volume_6h?: number;
  volume_12h?: number;
  volume_24h?: number;

  // Buy/Sell volumes
  volume_buy_1h?: number;
  volume_sell_1h?: number;
  volume_buy_24h?: number;
  volume_sell_24h?: number;

  // Trade counts
  trades_1min?: number;
  trades_5min?: number;
  trades_15min?: number;
  trades_1h?: number;
  trades_4h?: number;
  trades_6h?: number;
  trades_12h?: number;
  trades_24h?: number;

  // Buys/Sells
  buys_1h?: number;
  sells_1h?: number;
  buys_24h?: number;
  sells_24h?: number;

  // Trader counts
  buyers_1h?: number;
  sellers_1h?: number;
  traders_1h?: number;

  // Holders
  holdersCount?: number;
  holders_count?: number;
  top10Holdings?: number;
  top50Holdings?: number;
  top100Holdings?: number;

  // Trader types
  smartTradersCount?: number;
  proTradersCount?: number;
  freshTradersCount?: number;
  insidersCount?: number;
  bundlersCount?: number;
  snipersCount?: number;

  // Holdings percentages
  devHoldings?: number;
  insidersHoldings?: number;
  bundlersHoldings?: number;
  smartTradersHoldings?: number;

  // Bonding
  bonded?: boolean;
  bondingPercentage?: number;
  bonded_at?: string | null;

  // ATH/ATL
  ath?: number;
  atl?: number;
  athDate?: string;
  atlDate?: string;

  // Trending scores
  trendingScore1min?: number;
  trendingScore5min?: number;
  trendingScore15min?: number;
  trendingScore1h?: number;
  trendingScore4h?: number;
  trendingScore6h?: number;
  trendingScore12h?: number;
  trendingScore24h?: number;

  // Security
  security?: {
    buyTax?: string;
    sellTax?: string;
    burnRate?: string;
    top10Holders?: string;
    isBlacklisted?: boolean;
    balanceMutable?: boolean;
    noMintAuthority?: boolean;
    transferPausable?: boolean;
  };

  // Socials
  socials?: {
    twitter?: string | null;
    website?: string | null;
    telegram?: string | null;
    others?: Record<string, any>;
  };

  // Dexscreener
  dexscreenerListed?: boolean;
  dexscreenerBoosted?: boolean;
  dexscreenerHeader?: string | null;

  // Other fields
  type?: string;
  poolAddress?: string;
  blockchain?: string;
  deployer?: string;
  description?: string | null;
  totalSupply?: number;
  circulatingSupply?: number;
}

interface MobulaResponse {
  // For GET endpoint
  new?: {
    data: MobulaToken[];
  };
  bonding?: {
    data: MobulaToken[];
  };
  bonded?: {
    data: MobulaToken[];
  };

  // For POST endpoint
  trending?: {
    data: MobulaToken[];
  };
  "quality-tokens"?: {
    data: MobulaToken[];
  };
  "high-volume"?: {
    data: MobulaToken[];
  };
  "price-gainers"?: {
    data: MobulaToken[];
  };

  // Fallback for any view name
  [viewName: string]:
    | {
        data: MobulaToken[];
      }
    | undefined;
}

/**
 * Transform Mobula token to TokenData format
 * Maps the rich Mobula data to our internal format
 */
function transformToken(mobulaToken: MobulaToken): TokenData {
  const chain = mobulaToken.chainId === "solana:solana" ? "solana" : "bsc";

  // Get creation timestamp
  const createdAt = mobulaToken.createdAt || mobulaToken.created_at;
  const createdTimestamp = createdAt
    ? new Date(createdAt).getTime()
    : Date.now();

  // Build price change percentages for chart
  const percentages: number[] = [
    mobulaToken.price_change_1h || 0,
    mobulaToken.price_change_24h || 0,
  ];

  // Get the most accurate market cap
  const marketCap =
    mobulaToken.latest_market_cap ||
    mobulaToken.marketCap ||
    mobulaToken.market_cap ||
    0;

  // Get the most accurate price
  const price = mobulaToken.latest_price || mobulaToken.price || 0;

  // Calculate volume (prefer 24h, fallback to 1h)
  const volume = mobulaToken.volume_24h || mobulaToken.volume_1h || 0;

  // Get holder count
  const holdersCount =
    mobulaToken.holdersCount || mobulaToken.holders_count || 0;

  // Validate and clean image URL - filter out invalid URLs like "metadata.mobula.webp"
  const logoUrl = mobulaToken.logo;
  const isValidImageUrl = logoUrl && 
    (logoUrl.startsWith('http://') || 
     logoUrl.startsWith('https://') || 
     logoUrl.startsWith('data:') ||
     logoUrl.startsWith('/'));

  // Generate fallback icon from symbol (first character or emoji)
  const getFallbackIcon = (symbol: string | null): string => {
    if (!symbol) return "🪙";
    // Use first character of symbol, or emoji if it's a single emoji
    const firstChar = symbol.trim().charAt(0).toUpperCase();
    // If it's already an emoji or special character, use it
    if (/[\u{1F300}-\u{1F9FF}]/u.test(firstChar) || firstChar.length > 1) {
      return firstChar;
    }
    // Otherwise use first letter
    return firstChar || "🪙";
  };

  const symbol = mobulaToken.symbol || "UNKNOWN";
  const fallbackIcon = getFallbackIcon(symbol);

  return {
    id: `${chain}:${mobulaToken.address}`,
    name: mobulaToken.name || "Unknown",
    symbol: symbol,
    icon: fallbackIcon, // Always use fallback icon, never URL
    image: isValidImageUrl ? logoUrl : undefined,
    time: createdAt || new Date().toISOString(),
    createdTimestamp,
    marketCap,
    volume,
    fee: 0,
    transactions: mobulaToken.trades_24h || mobulaToken.trades_1h || 0,
    percentages,
    price,
    decimals: mobulaToken.decimals,
    activity: {
      Q: 0,
      views: 0,
      holders: holdersCount,
      trades: mobulaToken.trades_24h || mobulaToken.trades_1h || 0,
    },
    chain,
    source: "mobula",
    address: mobulaToken.address,

    // Mobula identifier with RICH data
    _mobula: true,
    _mobulaData: {
      // Price changes (all timeframes)
      priceChanges: percentages,
      hasPriceChanges: percentages.some((p) => p !== 0),
      priceChange1min: mobulaToken.price_change_1min || 0,
      priceChange5min: mobulaToken.price_change_5min || 0,
      priceChange1h: mobulaToken.price_change_1h || 0,
      priceChange4h: mobulaToken.price_change_4h || 0,
      priceChange6h: mobulaToken.price_change_6h || 0,
      priceChange12h: mobulaToken.price_change_12h || 0,
      priceChange24h: mobulaToken.price_change_24h || 0,

      // Volume data
      volume1min: mobulaToken.volume_1min || 0,
      volume5min: mobulaToken.volume_5min || 0,
      volume15min: mobulaToken.volume_15min || 0,
      volume1h: mobulaToken.volume_1h || 0,
      volume4h: mobulaToken.volume_4h || 0,
      volume6h: mobulaToken.volume_6h || 0,
      volume12h: mobulaToken.volume_12h || 0,
      volume24h: mobulaToken.volume_24h || 0,

      // Buy/Sell volume
      volumeBuy1h: mobulaToken.volume_buy_1h || 0,
      volumeSell1h: mobulaToken.volume_sell_1h || 0,
      volumeBuy24h: mobulaToken.volume_buy_24h || 0,
      volumeSell24h: mobulaToken.volume_sell_24h || 0,

      // Trade counts
      trades1h: mobulaToken.trades_1h || 0,
      trades24h: mobulaToken.trades_24h || 0,
      buys1h: mobulaToken.buys_1h || 0,
      sells1h: mobulaToken.sells_1h || 0,
      buys24h: mobulaToken.buys_24h || 0,
      sells24h: mobulaToken.sells_24h || 0,

      // Trader analytics
      buyers1h: mobulaToken.buyers_1h || 0,
      sellers1h: mobulaToken.sellers_1h || 0,
      traders1h: mobulaToken.traders_1h || 0,

      // Holder analytics
      holdersCount,
      top10Holdings: mobulaToken.top10Holdings || 0,
      top50Holdings: mobulaToken.top50Holdings || 0,
      top100Holdings: mobulaToken.top100Holdings || 0,

      // Smart trader data
      smartTradersCount: mobulaToken.smartTradersCount || 0,
      proTradersCount: mobulaToken.proTradersCount || 0,
      freshTradersCount: mobulaToken.freshTradersCount || 0,
      insidersCount: mobulaToken.insidersCount || 0,
      bundlersCount: mobulaToken.bundlersCount || 0,
      snipersCount: mobulaToken.snipersCount || 0,

      // Holdings percentages
      devHoldings: mobulaToken.devHoldings || 0,
      insidersHoldings: mobulaToken.insidersHoldings || 0,
      bundlersHoldings: mobulaToken.bundlersHoldings || 0,
      smartTradersHoldings: mobulaToken.smartTradersHoldings || 0,

      // Bonding status
      bonded: mobulaToken.bonded || false,
      bondingPercentage: mobulaToken.bondingPercentage || 0,
      bondedAt: mobulaToken.bonded_at || null,

      // ATH/ATL
      ath: mobulaToken.ath || 0,
      atl: mobulaToken.atl || 0,
      athDate: mobulaToken.athDate || null,
      atlDate: mobulaToken.atlDate || null,

      // Trending scores
      trendingScore1min: mobulaToken.trendingScore1min || 0,
      trendingScore5min: mobulaToken.trendingScore5min || 0,
      trendingScore15min: mobulaToken.trendingScore15min || 0,
      trendingScore1h: mobulaToken.trendingScore1h || 0,
      trendingScore4h: mobulaToken.trendingScore4h || 0,
      trendingScore6h: mobulaToken.trendingScore6h || 0,
      trendingScore12h: mobulaToken.trendingScore12h || 0,
      trendingScore24h: mobulaToken.trendingScore24h || 0,

      // Security
      security: mobulaToken.security,

      // Socials
      socials: mobulaToken.socials,

      // Dexscreener
      dexscreenerListed: mobulaToken.dexscreenerListed || false,
      dexscreenerBoosted: mobulaToken.dexscreenerBoosted || false,

      // Pool info
      poolAddress: mobulaToken.poolAddress,
      poolType: mobulaToken.type,
      deployer: mobulaToken.deployer,

      // Supply
      totalSupply: mobulaToken.totalSupply || 0,
      circulatingSupply: mobulaToken.circulatingSupply || 0,
    },

    // Dexscreener format for compatibility
    dexscreener: {
      logo: mobulaToken.logo || undefined,
      priceUsd: price,
      priceNative: mobulaToken.price || 0,
      priceChange24h: mobulaToken.price_change_24h || 0,
      priceChange1h: mobulaToken.price_change_1h || 0,
      volume24h: mobulaToken.volume_24h || 0,
      liquidity: mobulaToken.liquidity || 0,
      fdv: marketCap,
    },
  } as TokenData;
}

/**
 * Smart merge function - adds new tokens, updates existing ones
 */
function mergeTokens(
  existing: TokenData[],
  incoming: TokenData[]
): TokenData[] {
  const merged = new Map<string, TokenData>();

  // Add existing tokens
  existing.forEach((token) => merged.set(token.id, token));

  // Add/update with incoming tokens
  incoming.forEach((token) => merged.set(token.id, token));

  return Array.from(merged.values());
}

/**
 * ============================================================================
 * GET METHOD - Basic Views (new, bonding, bonded)
 * ============================================================================
 * Use for: "new", "finalStretch", "graduated" filters
 * Returns all 3 views automatically
 */
export async function fetchBasicViews(
  limit = 100,
  offset = 0
): Promise<{
  new: TokenData[];
  bonding: TokenData[];
  bonded: TokenData[];
}> {
  try {
    const params = new URLSearchParams({
      assetMode: "true",
      chainId: "solana:solana",
      poolTypes: SOLANA_POOL_TYPES.join(","),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const url = `${GET_API_URL}?${params.toString()}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    };

    const response: AxiosResponse<MobulaResponse> = await axios.get(url, {
      headers,
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(`Mobula API returned ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return {
      new: (response.data.new?.data || []).map(transformToken),
      bonding: (response.data.bonding?.data || []).map(transformToken),
      bonded: (response.data.bonded?.data || []).map(transformToken),
    };
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    const statusCode = error?.response?.status;
    
    if (statusCode === 502 || statusCode === 503) {
      logger.warn("Mobula API unavailable, returning empty data", { statusCode });
      return { new: [], bonding: [], bonded: [] };
    }
    
    logger.error("Error fetching basic views from Mobula:", {
      message: errorMessage,
      status: statusCode,
      url: GET_API_URL,
    });
    
    
    throw error;
  }
}

/**
 * ============================================================================
 * POST METHOD - Custom Views (trending, quality, high-volume, price-gainers)
 * ============================================================================
 * Use for: "trending", "featured", "marketCap", "latest" filters
 */
export async function fetchCustomViews(
  limit = 100,
  offset = 0
): Promise<{
  trending: TokenData[];
  "quality-tokens": TokenData[];
  "high-volume": TokenData[];
  "price-gainers": TokenData[];
}> {
  try {
    const payload = {
      assetMode: true,
      views: [
        {
          name: "trending",
          chainId: ["solana:solana"],
          poolTypes: SOLANA_POOL_TYPES,
          sortBy: "volume_1h",
          sortOrder: "desc",
          limit,
          offset,
        },
        {
          name: "quality-tokens",
          chainId: ["solana:solana"],
          poolTypes: SOLANA_POOL_TYPES,
          sortBy: "volume_1h",
          sortOrder: "desc",
          limit,
          offset,
          filters: {
            volume_24h: { gte: 5000 },
            holders_count: { gte: 50 },
            dexscreenerListed: true,
          },
        },
        {
          name: "high-volume",
          chainId: ["solana:solana"],
          poolTypes: SOLANA_POOL_TYPES,
          sortBy: "volume_1h",
          sortOrder: "desc",
          limit,
          offset,
          filters: {
            volume_1h: { gte: 1000 },
            market_cap: { gte: 5000, lte: 50000 },
            trades_1h: { gte: 10 },
          },
        },
        {
          name: "price-gainers",
          chainId: ["solana:solana"],
          poolTypes: SOLANA_POOL_TYPES,
          sortBy: "price_change_24h",
          sortOrder: "desc",
          limit,
          offset,
        },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    };

    const response: AxiosResponse<MobulaResponse> = await axios.post(
      POST_API_URL,
      payload,
      {
        headers,
        timeout: 15000,
        validateStatus: (status) => status < 500,
      }
    );

    if (response.status >= 400) {
      throw new Error(`Mobula API returned ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return {
      trending: (response.data.trending?.data || []).map(transformToken),
      "quality-tokens": (response.data["quality-tokens"]?.data || []).map(
        transformToken
      ),
      "high-volume": (response.data["high-volume"]?.data || []).map(
        transformToken
      ),
      "price-gainers": (response.data["price-gainers"]?.data || []).map(
        transformToken
      ),
    };
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    const statusCode = error?.response?.status;
    
    if (statusCode === 502 || statusCode === 503) {
      logger.warn("Mobula API unavailable, returning empty data", { statusCode });
      return {
        trending: [],
        "quality-tokens": [],
        "high-volume": [],
        "price-gainers": [],
      };
    }
    
    throw error;
  }
}

/**
 * ============================================================================
 * SINGLE VIEW FETCH - For pagination on specific filter
 * ============================================================================
 * Use when user wants to paginate a specific filter
 */
export async function fetchSingleView(
  viewName: "trending" | "quality-tokens" | "high-volume" | "price-gainers",
  limit = 100,
  offset = 0
): Promise<TokenData[]> {
  try {
    const viewConfigs: Record<string, any> = {
      trending: {
        name: "trending",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit,
        offset,
      },
      "quality-tokens": {
        name: "quality-tokens",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit,
        offset,
        filters: {
          volume_24h: { gte: 5000 },
          holders_count: { gte: 50 },
          dexscreenerListed: true,
        },
      },
      "high-volume": {
        name: "high-volume",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit,
        offset,
        filters: {
          volume_1h: { gte: 1000 },
          market_cap: { gte: 5000, lte: 50000 },
          trades_1h: { gte: 10 },
        },
      },
      "price-gainers": {
        name: "price-gainers",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "price_change_24h",
        sortOrder: "desc",
        limit,
        offset,
      },
    };

    const payload = {
      assetMode: true,
      views: [viewConfigs[viewName]],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    };

    const response: AxiosResponse<MobulaResponse> = await axios.post(
      POST_API_URL,
      payload,
      {
        headers,
        timeout: 30000, // Increased to 30 seconds
      }
    );

    return (response.data[viewName]?.data || []).map(transformToken);
  } catch (error) {
    logger.error(`Error fetching ${viewName} from Mobula:`, error);
    throw error;
  }
}

/**
 * ============================================================================
 * FETCH SINGLE TOKEN BY ADDRESS
 * ============================================================================
 * Fetches detailed information for a specific token by its address
 * Uses trending view with high limit and filters results client-side
 */
export async function fetchTokenByAddress(
  address: string,
  chainId: string = "solana:solana"
): Promise<TokenData | null> {
  try {
    // Mobula Pulse API doesn't support direct address filtering
    // So we fetch a trending view with a high limit and filter client-side
    // This is less efficient but works with the current API structure
    const payload = {
      assetMode: true,
      views: [
        {
          name: "token-search",
          chainId: [chainId],
          poolTypes: SOLANA_POOL_TYPES,
          sortBy: "volume_24h",
          sortOrder: "desc",
          limit: 1000, // Fetch more tokens to increase chance of finding our token
        },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    };

    const response: AxiosResponse<MobulaResponse> = await axios.post(
      POST_API_URL,
      payload,
      {
        headers,
        timeout: 30000,
      }
    );

    // Filter results to find the token by address
    const allTokens = (response.data["token-search"]?.data || []).map(transformToken);
    const normalizedAddress = address.toLowerCase();
    const foundToken = allTokens.find(
      (token) => token.address?.toLowerCase() === normalizedAddress
    );

    if (foundToken) {
      logger.info(`✅ Found token in Mobula: ${address}`);
      return foundToken;
    }

    // If not found in trending, try searching in new tokens view
    try {
      const basicViews = await fetchBasicViews(1000, 0);
      const allBasicTokens = [
        ...basicViews.new,
        ...basicViews.bonding,
        ...basicViews.bonded,
      ];
      const foundInBasic = allBasicTokens.find(
        (token) => token.address?.toLowerCase() === normalizedAddress
      );
      if (foundInBasic) {
        logger.info(`✅ Found token in Mobula basic views: ${address}`);
        return foundInBasic;
      }
    } catch (basicError) {
      // Ignore basic view errors, we'll return null
    }

    logger.warn(`⚠️ Token not found in Mobula: ${address}`);
    return null;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    const statusCode = error?.response?.status;
    
    logger.error("Error fetching token by address from Mobula:", {
      address,
      chainId,
      message: errorMessage,
      status: statusCode,
    });
    
    // Don't throw - return null so other sources can be tried
    return null;
  }
}

/**
 * ============================================================================
 * FILTER MAPPING
 * ============================================================================
 * Maps your filter tabs to Mobula endpoints/views
 */
export const FILTER_TO_VIEW_MAPPING = {
  // GET endpoint views (basic)
  new: "new", // GET endpoint -> new view
  finalStretch: "bonding", // GET endpoint -> bonding view
  graduated: "bonded", // GET endpoint -> bonded view

  // POST endpoint views (custom)
  trending: "trending", // POST -> trending view
  featured: "quality-tokens", // POST -> quality-tokens view
  marketCap: "high-volume", // POST -> high-volume view
  latest: "price-gainers", // POST -> price-gainers view (rename this filter)
};

/**
 * ============================================================================
 * AUTO-REFRESH MANAGER
 * ============================================================================
 * Handles periodic refresh and smart merging
 */
export class MobulaPulseManager {
  private basicViewsCache: {
    new: TokenData[];
    bonding: TokenData[];
    bonded: TokenData[];
  } = {
    new: [],
    bonding: [],
    bonded: [],
  };

  private customViewsCache: {
    trending: TokenData[];
    "quality-tokens": TokenData[];
    "high-volume": TokenData[];
    "price-gainers": TokenData[];
  } = {
    trending: [],
    "quality-tokens": [],
    "high-volume": [],
    "price-gainers": [],
  };

  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Start auto-refresh for both GET and POST endpoints
   */
  startAutoRefresh(
    onUpdate: () => void,
    onError?: (error: any) => void
  ): void {
    // Initial fetch with error handling
    this.refreshAll().catch((err) => {
      logger.error("Mobula Pulse: Initial refresh error:", err);
      if (onError) onError(err);
    });

    // Set up interval
    this.refreshInterval = setInterval(async () => {
      try {
        await this.refreshAll();
        onUpdate(); // Notify caller of updates
      } catch (err) {
        logger.error("Mobula Pulse: Interval refresh error:", err);
        if (onError) onError(err);
      }
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh all views (both GET and POST)
   */
  private async refreshAll(): Promise<void> {
    // Fetch GET endpoint (basic views) - handle errors independently
    try {
      const basicViews = await fetchBasicViews(100, 0);

      // Smart merge - add new tokens, keep existing ones
      this.basicViewsCache.new = mergeTokens(
        this.basicViewsCache.new,
        basicViews.new
      );
      this.basicViewsCache.bonding = mergeTokens(
        this.basicViewsCache.bonding,
        basicViews.bonding
      );
      this.basicViewsCache.bonded = mergeTokens(
        this.basicViewsCache.bonded,
        basicViews.bonded
      );
    } catch (error) {
      logger.error("Error fetching basic views from Mobula:", error);
      // Continue even if basic views fail
    }

    // Fetch POST endpoint (custom views) - handle errors independently
    try {
      const customViews = await fetchCustomViews(100, 0);

      // Smart merge - add new tokens, keep existing ones
      this.customViewsCache.trending = mergeTokens(
        this.customViewsCache.trending,
        customViews.trending
      );
      this.customViewsCache["quality-tokens"] = mergeTokens(
        this.customViewsCache["quality-tokens"],
        customViews["quality-tokens"]
      );
      this.customViewsCache["high-volume"] = mergeTokens(
        this.customViewsCache["high-volume"],
        customViews["high-volume"]
      );
      this.customViewsCache["price-gainers"] = mergeTokens(
        this.customViewsCache["price-gainers"],
        customViews["price-gainers"]
      );
    } catch (error) {
      logger.error("Error fetching custom views from Mobula:", error);
      // Continue even if custom views fail
    }

    logger.info("Mobula auto-refresh completed", {
      new: this.basicViewsCache.new.length,
      bonding: this.basicViewsCache.bonding.length,
      bonded: this.basicViewsCache.bonded.length,
      trending: this.customViewsCache.trending.length,
      quality: this.customViewsCache["quality-tokens"].length,
      highVolume: this.customViewsCache["high-volume"].length,
      priceGainers: this.customViewsCache["price-gainers"].length,
    });
  }

  /**
   * Get tokens for a specific filter
   */
  getTokensForFilter(filter: keyof typeof FILTER_TO_VIEW_MAPPING): TokenData[] {
    const viewName = FILTER_TO_VIEW_MAPPING[filter];

    // Basic views (from GET endpoint)
    if (viewName === "new") return this.basicViewsCache.new;
    if (viewName === "bonding") return this.basicViewsCache.bonding;
    if (viewName === "bonded") return this.basicViewsCache.bonded;

    // Custom views (from POST endpoint)
    if (viewName === "trending") return this.customViewsCache.trending;
    if (viewName === "quality-tokens")
      return this.customViewsCache["quality-tokens"];
    if (viewName === "high-volume") return this.customViewsCache["high-volume"];
    if (viewName === "price-gainers")
      return this.customViewsCache["price-gainers"];

    return [];
  }

  /**
   * Load more tokens for a specific filter (pagination/infinite scroll)
   */
  async loadMore(
    filter: keyof typeof FILTER_TO_VIEW_MAPPING,
    limit = 100
  ): Promise<TokenData[]> {
    const viewName = FILTER_TO_VIEW_MAPPING[filter];
    const currentTokens = this.getTokensForFilter(filter);
    const offset = currentTokens.length;

    logger.info(`Loading more tokens for ${filter}`, { offset, limit });

    try {
      // For basic views, use GET endpoint
      if (
        viewName === "new" ||
        viewName === "bonding" ||
        viewName === "bonded"
      ) {
        const basicViews = await fetchBasicViews(limit, offset);
        const newTokens = basicViews[viewName] || [];

        // Merge with existing
        if (viewName === "new") {
          this.basicViewsCache.new = mergeTokens(
            this.basicViewsCache.new,
            newTokens
          );
        } else if (viewName === "bonding") {
          this.basicViewsCache.bonding = mergeTokens(
            this.basicViewsCache.bonding,
            newTokens
          );
        } else if (viewName === "bonded") {
          this.basicViewsCache.bonded = mergeTokens(
            this.basicViewsCache.bonded,
            newTokens
          );
        }

        return this.getTokensForFilter(filter);
      }

      // For custom views, use POST endpoint with single view
      const newTokens = await fetchSingleView(
        viewName as
          | "trending"
          | "quality-tokens"
          | "high-volume"
          | "price-gainers",
        limit,
        offset
      );

      // Merge with existing
      if (viewName === "trending") {
        this.customViewsCache.trending = mergeTokens(
          this.customViewsCache.trending,
          newTokens
        );
      } else if (viewName === "quality-tokens") {
        this.customViewsCache["quality-tokens"] = mergeTokens(
          this.customViewsCache["quality-tokens"],
          newTokens
        );
      } else if (viewName === "high-volume") {
        this.customViewsCache["high-volume"] = mergeTokens(
          this.customViewsCache["high-volume"],
          newTokens
        );
      } else if (viewName === "price-gainers") {
        this.customViewsCache["price-gainers"] = mergeTokens(
          this.customViewsCache["price-gainers"],
          newTokens
        );
      }

      return this.getTokensForFilter(filter);
    } catch (error) {
      logger.error(`Error loading more tokens for ${filter}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific filter
   */
  clearFilter(filter: keyof typeof FILTER_TO_VIEW_MAPPING): void {
    const viewName = FILTER_TO_VIEW_MAPPING[filter];

    if (viewName === "new") this.basicViewsCache.new = [];
    else if (viewName === "bonding") this.basicViewsCache.bonding = [];
    else if (viewName === "bonded") this.basicViewsCache.bonded = [];
    else if (viewName === "trending") this.customViewsCache.trending = [];
    else if (viewName === "quality-tokens")
      this.customViewsCache["quality-tokens"] = [];
    else if (viewName === "high-volume")
      this.customViewsCache["high-volume"] = [];
    else if (viewName === "price-gainers")
      this.customViewsCache["price-gainers"] = [];
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.basicViewsCache = { new: [], bonding: [], bonded: [] };
    this.customViewsCache = {
      trending: [],
      "quality-tokens": [],
      "high-volume": [],
      "price-gainers": [],
    };
  }
}

// Export singleton instance
export const mobulaPulseManager = new MobulaPulseManager();

/**
 * ============================================================================
 * CUSTOM FILTER SUPPORT
 * ============================================================================
 * Build custom queries from user-defined filters
 */

export interface CustomFilterOptions {
  protocols: string[];
  volume?: {
    timeframe: "1h" | "4h" | "24h";
    min?: number;
    max?: number;
  };
  marketCap?: {
    min?: number;
    max?: number;
  };
  priceChange?: {
    timeframe: "1h" | "4h" | "24h";
    min?: number;
    max?: number;
  };
  holders?: {
    min?: number;
    max?: number;
  };
  trades?: {
    timeframe: "1h" | "24h";
    min?: number;
  };
  liquidity?: {
    min?: number;
    max?: number;
  };
  smartTraders?: {
    min?: number;
  };
  topHoldingsPercentage?: {
    max?: number;
  };
  sortBy:
    | "volume_1h"
    | "volume_24h"
    | "price_change_1h"
    | "price_change_24h"
    | "market_cap"
    | "liquidity"
    | "trades_1h"
    | "holders_count"
    | "trendingScore1h";
  sortOrder: "asc" | "desc";
  limit: number;
}

/**
 * Build Mobula payload from custom filter options
 */
function buildCustomFilterPayload(options: CustomFilterOptions): any {
  const filters: any = {};

  // Volume filter
  if (options.volume) {
    const volumeKey = `volume_${options.volume.timeframe}`;
    if (options.volume.min !== undefined) {
      filters[volumeKey] = { ...filters[volumeKey], gte: options.volume.min };
    }
    if (options.volume.max !== undefined) {
      filters[volumeKey] = { ...filters[volumeKey], lte: options.volume.max };
    }
  }

  // Market cap filter
  if (options.marketCap) {
    if (options.marketCap.min !== undefined) {
      filters.market_cap = {
        ...filters.market_cap,
        gte: options.marketCap.min,
      };
    }
    if (options.marketCap.max !== undefined) {
      filters.market_cap = {
        ...filters.market_cap,
        lte: options.marketCap.max,
      };
    }
  }

  // Price change filter
  if (options.priceChange) {
    const priceChangeKey = `price_change_${options.priceChange.timeframe}`;
    if (options.priceChange.min !== undefined) {
      filters[priceChangeKey] = {
        ...filters[priceChangeKey],
        gte: options.priceChange.min,
      };
    }
    if (options.priceChange.max !== undefined) {
      filters[priceChangeKey] = {
        ...filters[priceChangeKey],
        lte: options.priceChange.max,
      };
    }
  }

  // Holders filter
  if (options.holders) {
    if (options.holders.min !== undefined) {
      filters.holders_count = {
        ...filters.holders_count,
        gte: options.holders.min,
      };
    }
    if (options.holders.max !== undefined) {
      filters.holders_count = {
        ...filters.holders_count,
        lte: options.holders.max,
      };
    }
  }

  // Trades filter
  if (options.trades) {
    const tradesKey = `trades_${options.trades.timeframe}`;
    if (options.trades.min !== undefined) {
      filters[tradesKey] = { gte: options.trades.min };
    }
  }

  // Liquidity filter
  if (options.liquidity) {
    if (options.liquidity.min !== undefined) {
      filters.liquidity = { ...filters.liquidity, gte: options.liquidity.min };
    }
    if (options.liquidity.max !== undefined) {
      filters.liquidity = { ...filters.liquidity, lte: options.liquidity.max };
    }
  }

  // Smart traders filter
  if (options.smartTraders?.min !== undefined) {
    filters.smartTradersCount = { gte: options.smartTraders.min };
  }

  // Top holdings percentage filter
  if (options.topHoldingsPercentage?.max !== undefined) {
    filters.top10Holdings = { lte: options.topHoldingsPercentage.max };
  }

  return {
    assetMode: true,
    views: [
      {
        name: "custom",
        chainId: ["solana:solana"],
        poolTypes: options.protocols,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
        limit: options.limit,
        offset: 0,
        ...(Object.keys(filters).length > 0 && { filters }),
      },
    ],
  };
}

/**
 * Fetch tokens with custom filter
 */
export async function fetchCustomFilter(
  options: CustomFilterOptions,
  offset = 0
): Promise<TokenData[]> {
  try {
    const payload = buildCustomFilterPayload(options);
    payload.views[0].offset = offset;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    };

    const response: AxiosResponse<MobulaResponse> = await axios.post(
      POST_API_URL,
      payload,
      {
        headers,
        timeout: 30000, // Increased to 30 seconds
      }
    );

    return (response.data.custom?.data || []).map(transformToken);
  } catch (error) {
    logger.error("Error fetching custom filter from Mobula:", error);
    throw error;
  }
}
