/**
 * Multi-Protocol Token Service
 * Fetches tokens from various Solana launchpads and AMMs
 * 
 * ============================================================================
 * ISOLATED INTEGRATIONS - HOW TO DISABLE
 * ============================================================================
 * 
 * To disable Moonshot integration:
 *   1. Comment out the fetchMoonshotTokens() method (lines ~60-150)
 *   2. Comment out the 'moonshot' case in fetchTokensByProtocols() switch
 * 
 * To disable Jupiter Studio integration:
 *   1. Comment out the fetchJupiterStudioTokens() method (lines ~150-250)
 *   2. Comment out the 'jupiter-studio' case in fetchTokensByProtocols() switch
 * 
 * To disable WebSocket monitoring:
 *   1. Set ENABLE_PROTOCOL_WS_MONITORING = false in protocol-websocket-monitor.ts
 *   2. Or comment out the entire protocol-websocket-monitor.ts file
 * 
 * All integrations are wrapped in try-catch blocks, so failures won't break
 * the rest of the service. They'll just return empty arrays on error.
 */

export interface ProtocolToken {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  price?: number;
  priceUsd?: number;
  marketCap?: number;
  volume?: number;
  volume24h?: number;
  liquidity?: number;
  isMigrated: boolean;
  bondingProgress?: number; // 0-1, where 1 = migrated
  createdTimestamp?: number;
  migrationTimestamp?: number;
  raydiumPool?: string;
  protocol: string; // 'pump', 'raydium', 'meteora', 'orca', 'bonk', etc.
  chain: 'solana' | 'bsc' | 'ethereum' | 'base';
}

export type ProtocolType =
  | 'pump'
  | 'raydium'
  | 'meteora'
  | 'meteora-amm'
  | 'meteora-amm-v2'
  | 'orca'
  | 'jupiter'
  | 'bonk'
  | 'bags'
  | 'moonshot'
  | 'heaven'
  | 'daos-fun'
  | 'candle'
  | 'sugar'
  | 'believe'
  | 'jupiter-studio'
  | 'moonit'
  | 'boop'
  | 'launchlab'
  | 'dynamic-bc'
  | 'mayhem'
  | 'pump-amm'
  | 'wavebreak';

export class ProtocolService {
  private cache: Map<string, { data: ProtocolToken[]; timestamp: number }> =
    new Map();
  private cacheTTL = 30000; // 30 seconds

  /**
   * Fetch tokens from Raydium Launchpad
   */
  async fetchRaydiumLaunchpadTokens(
    sort: 'hotToken' | 'new' = 'hotToken',
    limit = 100
  ): Promise<ProtocolToken[]> {
    const cacheKey = `raydium-launchpad:${sort}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://launch-mint-v1.raydium.io/get/list?sort=${sort}&size=${limit}&mintType=default&includeNsfw=false&platformId=PlatformWhiteList`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Raydium Launchpad API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (data.success && data.data?.rows) {
        for (const token of data.data.rows) {
          // Calculate price from marketCap and supply
          const price = token.marketCap && token.supply 
            ? token.marketCap / token.supply 
            : parseFloat(token.initPrice || '0');

          // Check if migrated (finishingRate >= 100 or has migrateAmmId)
          const isMigrated = token.finishingRate >= 100 || !!token.migrateAmmId;

          tokens.push({
            id: token.mint,
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNKNOWN',
            image: token.imgUrl,
            price: price,
            priceUsd: price,
            marketCap: token.marketCap || 0,
            volume: token.volumeU || token.volumeB || 0,
            volume24h: token.volumeU || token.volumeB || 0,
            liquidity: token.totalFundRaisingB ? parseFloat(token.totalFundRaisingB) / 1e9 : 0,
            isMigrated: isMigrated,
            bondingProgress: token.finishingRate ? Math.min(token.finishingRate / 100, 1) : (isMigrated ? 1 : 0),
            createdTimestamp: token.createAt,
            migrationTimestamp: token.migrateAmmId ? token.createAt : undefined,
            raydiumPool: token.poolId || token.migrateAmmId,
            protocol: 'raydium',
            chain: 'solana',
          });
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Raydium Launchpad API request timeout (15s)');
      } else {
        console.error('❌ Failed to fetch Raydium Launchpad tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch tokens from Raydium (AMM pools - legacy)
   */
  async fetchRaydiumTokens(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `raydium:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Fetch from Raydium API with timeout and smaller limit to avoid large responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Use a smaller limit to avoid huge responses
      const safeLimit = Math.min(limit, 50);
      
      // Try the AMM V3 pools endpoint (more reliable)
      const response = await fetch(
        `https://api.raydium.io/v2/ammV3/ammPools`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Raydium API error: ${response.status} ${response.statusText}`);
        return [];
      }

      // Check content length to avoid huge responses
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        console.warn(`⚠️ Raydium API response too large: ${contentLength} bytes, skipping`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      // Handle both array and object with data property
      const pools = Array.isArray(data) ? data : (data.data || []);
      
      if (Array.isArray(pools)) {
        for (const pool of pools.slice(0, limit)) {
          if (pool.mintA && pool.mintB) {
            // Only include SOL pairs
            const isSolPair =
              pool.mintA === 'So11111111111111111111111111111111111111112' ||
              pool.mintB === 'So11111111111111111111111111111111111111112';

            if (isSolPair) {
              const tokenMint =
                pool.mintA === 'So11111111111111111111111111111111111111112'
                  ? pool.mintB
                  : pool.mintA;

              // Raydium AMM V3 pools don't always have price/liquidity in the response
              // We'll use basic info and let the frontend fetch details if needed
              tokens.push({
                id: tokenMint,
                name: pool.name || pool.mintB || 'Unknown',
                symbol: pool.symbol || 'UNKNOWN',
                price: pool.price || 0,
                priceUsd: pool.price || 0,
                marketCap: pool.marketCap || pool.tvl || 0,
                volume: pool.volume24h || 0,
                volume24h: pool.volume24h || 0,
                liquidity: pool.liquidity || pool.tvl || 0,
                isMigrated: true, // Raydium pools are already migrated
                bondingProgress: 1.0,
                protocol: 'raydium',
                chain: 'solana',
                raydiumPool: pool.id,
              });
            }
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Raydium API request timeout (15s)');
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
        console.error('❌ Raydium API: Domain api.raydium.io not found');
      } else if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('terminated')) {
        console.error('❌ Raydium API connection terminated');
      } else {
        console.error('❌ Failed to fetch Raydium tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch tokens from Meteora DLMM
   */
  async fetchMeteoraTokens(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `meteora:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        `https://dlmm-api.meteora.ag/pair/all`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Meteora API error: ${response.status} ${response.statusText}`);
        return [];
      }

      // Check content length to avoid huge responses
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        console.warn(`Meteora API response too large: ${contentLength} bytes, skipping`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (Array.isArray(data)) {
        for (const pair of data.slice(0, limit)) {
          if (pair.mint_x && pair.mint_y) {
            const isSolPair =
              pair.mint_x === 'So11111111111111111111111111111111111111112' ||
              pair.mint_y === 'So11111111111111111111111111111111111111112';

            if (isSolPair) {
              const tokenMint =
                pair.mint_x === 'So11111111111111111111111111111111111111112'
                  ? pair.mint_y
                  : pair.mint_x;

              const reserveX = parseFloat(pair.reserve_x_amount || '0');
              const reserveY = parseFloat(pair.reserve_y_amount || '0');
              const liquidity =
                reserveX > 0 && reserveY > 0
                  ? (reserveX * reserveY) / Math.pow(10, 18)
                  : 0;

              tokens.push({
                id: tokenMint,
                name: pair.name?.split('-')[0] || 'Unknown',
                symbol: pair.name?.split('-')[0] || 'UNKNOWN',
                price: reserveY > 0 ? reserveX / reserveY : 0,
                marketCap: liquidity * 2, // Rough estimate
                volume: 0,
                volume24h: 0,
                liquidity: liquidity,
                isMigrated: true,
                bondingProgress: 1.0,
                protocol: 'meteora',
                chain: 'solana',
              });
            }
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Meteora API request timeout (15s)');
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
        console.error('❌ Meteora API: Domain dlmm-api.meteora.ag not found');
      } else if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('terminated')) {
        console.error('❌ Meteora API connection terminated');
      } else {
        console.error('❌ Failed to fetch Meteora tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * ============================================================================
   * MOONIT API INTEGRATION (ISOLATED - COMMENT OUT IF IT FAILS)
   * ============================================================================
   * Public API: https://api.mintlp.io/v1/fun
   * Moonit is Moonshot launchpad rebranded
   * 
   * To disable: Comment out the entire fetchMoonitTokens method and
   * remove 'moonshot'/'moonit' case from fetchTokensByProtocols switch statement
   */
  async fetchMoonitTokens(
    sortBy: 'MARKET_CAP' | 'TRENDING' = 'TRENDING',
    state: 'GRADUATED' | 'NOT_GRADUATED' = 'NOT_GRADUATED',
    limit = 100
  ): Promise<ProtocolToken[]> {
    const cacheKey = `moonit:${sortBy}:${state}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const pageSize = Math.min(limit, 100); // API supports up to 100 per page
      const response = await fetch(
        `https://api.mintlp.io/v1/fun?sortBy=${sortBy}&state=${state}&vanityExtension=moon&blockchainSymbol=SOL&page=1&pageSize=${pageSize}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Moonit API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

          if (data.data && Array.isArray(data.data)) {
        for (const token of data.data.slice(0, limit)) {
          if (token.mintAddress) {
            // CRITICAL: If state='GRADUATED' endpoint is used, ALL tokens are migrated
            // No need to check API fields - the endpoint itself guarantees migration status
            const isFromGraduatedEndpoint = state === 'GRADUATED';
            // progressPercent is in basis points (10000 = 100%)
            const bondingProgress = token.progressPercent ? token.progressPercent / 10000 : 0;
            const isMigrated = isFromGraduatedEndpoint || token.state === 'MIGRATED' || token.migrated === true;

            // Calculate price from marketcap if available
            const marketCap = token.marketcap ? parseFloat(token.marketcap) : 0;
            const supply = token.curve?.totalSupply ? parseFloat(token.curve.totalSupply) : 0;
            const price = supply > 0 && marketCap > 0 ? marketCap / supply : 0;

            tokens.push({
              id: token.mintAddress,
              name: token.name || 'Unknown',
              symbol: token.symbol || 'UNKNOWN',
              image: token.icon || token.banner,
              price: price,
              priceUsd: price,
              marketCap: marketCap,
              volume: token.volumeUSD24h ? parseFloat(token.volumeUSD24h) : (token.volumeUSD ? parseFloat(token.volumeUSD) : 0),
              volume24h: token.volumeUSD24h ? parseFloat(token.volumeUSD24h) : 0,
              liquidity: token.curve?.collateralCollected ? parseFloat(token.curve.collateralCollected) / 1e9 : 0,
              isMigrated: isMigrated,
              bondingProgress: bondingProgress,
              createdTimestamp: token.createdAt ? new Date(token.createdAt).getTime() : undefined,
              migrationTimestamp: isMigrated ? (token.createdAt ? new Date(token.createdAt).getTime() : undefined) : undefined,
              protocol: 'moonit',
              chain: 'solana',
            });
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Moonit API request timeout (15s)');
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
        console.error('❌ Moonit API: Domain api.mintlp.io not found');
      } else if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('terminated')) {
        console.error('❌ Moonit API connection terminated');
      } else {
        console.error('❌ Failed to fetch Moonit tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch graduated (migrated) tokens from Moonshot
   */
  async fetchMoonshotGraduated(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `moonshot:graduated:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://api.moonshot.cc/token/v1/solana?view=graduated`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Moonshot graduated API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];
      const tokenList = Array.isArray(data) ? data : (data.tokens || data.data || []);

      for (const token of tokenList.slice(0, limit)) {
        if (token.mint || token.address || token.pairAddress) {
          const tokenMint = token.mint || token.address || token.pairAddress;
          tokens.push({
            id: tokenMint,
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNKNOWN',
            image: token.image || token.logoURI,
            price: token.price || 0,
            priceUsd: token.priceUsd || token.price || 0,
            marketCap: token.marketCap || 0,
            volume: token.volume24h || 0,
            volume24h: token.volume24h || 0,
            liquidity: token.liquidity || 0,
            isMigrated: true, // Graduated tokens are migrated
            bondingProgress: 1.0,
            createdTimestamp: token.createdAt || token.createdTimestamp,
            migrationTimestamp: token.migratedAt || token.migrationTimestamp,
            protocol: 'moonshot',
            chain: 'solana',
          });
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      console.error('Failed to fetch Moonshot graduated tokens:', error.message || error);
      return [];
    }
  }

  /**
   * Fetch trending tokens from Moonshot
   */
  async fetchMoonshotTrending(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `moonshot:trending:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://api.moonshot.cc/token/v1/solana?view=trending`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Moonshot trending API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];
      const tokenList = Array.isArray(data) ? data : (data.tokens || data.data || []);

      for (const token of tokenList.slice(0, limit)) {
        if (token.mint || token.address || token.pairAddress) {
          const tokenMint = token.mint || token.address || token.pairAddress;
          tokens.push({
            id: tokenMint,
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNKNOWN',
            image: token.image || token.logoURI,
            price: token.price || 0,
            priceUsd: token.priceUsd || token.price || 0,
            marketCap: token.marketCap || 0,
            volume: token.volume24h || 0,
            volume24h: token.volume24h || 0,
            liquidity: token.liquidity || 0,
            isMigrated: token.metadata?.progress === 100 || false,
            bondingProgress: (token.metadata?.progress || 0) / 100,
            protocol: 'moonshot',
            chain: 'solana',
          });
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      console.error('Failed to fetch Moonshot trending tokens:', error.message || error);
      return [];
    }
  }

  /**
   * ============================================================================
   * JUPITER STUDIO (METEORA DBC) INTEGRATION (ISOLATED - COMMENT OUT IF IT FAILS)
   * ============================================================================
   * Uses Meteora DAMM API to find DBC (Dynamic Bonding Curve) pools
   * Program ID: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
   * 
   * To disable: Comment out the entire fetchJupiterStudioTokens method and
   * remove 'jupiter-studio' case from fetchTokensByProtocols switch statement
   */
  async fetchJupiterStudioTokens(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `jupiter-studio:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Fetch DAMM pools from Meteora (includes DBC pools used by Jupiter Studio)
      const response = await fetch(
        `https://damm-api.meteora.ag/pool/all`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Jupiter Studio (Meteora DBC) API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        console.warn(`Jupiter Studio API response too large: ${contentLength} bytes, skipping`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      // Handle empty or invalid responses
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.warn(`⚠️ Jupiter Studio (Meteora DAMM) API returned empty response`);
        return [];
      }

      // Filter for DBC pools (Dynamic Bonding Curve - used by Jupiter Studio)
      const pools = Array.isArray(data) ? data : (data.pools || data.data || []);
      
      if (!Array.isArray(pools) || pools.length === 0) {
        console.warn(`⚠️ Jupiter Studio: No pools found in response`);
        return [];
      }

      const dbcPools = pools.filter((pool: any) => 
        pool.pool_type === 'dbc' || 
        pool.type === 'dbc' ||
        pool.poolType === 'dbc' ||
        pool.name?.toLowerCase().includes('dbc') ||
        pool.pool_type === 'dynamic' ||
        pool.type === 'dynamic'
      );

      for (const pool of dbcPools.slice(0, limit)) {
        if (pool.mint_x && pool.mint_y) {
          const isSolPair =
            pool.mint_x === 'So11111111111111111111111111111111111111112' ||
            pool.mint_y === 'So11111111111111111111111111111111111111112';

          if (isSolPair) {
            const tokenMint =
              pool.mint_x === 'So11111111111111111111111111111111111111112'
                ? pool.mint_y
                : pool.mint_x;

            const reserveX = parseFloat(pool.reserve_x_amount || pool.reserveX || '0');
            const reserveY = parseFloat(pool.reserve_y_amount || pool.reserveY || '0');
            const liquidity =
              reserveX > 0 && reserveY > 0
                ? (reserveX * reserveY) / Math.pow(10, 18)
                : 0;

            // DBC pools are bonding curves, so check if migrated
            const isMigrated = pool.migrated || pool.isMigrated || pool.status === 'migrated';

            tokens.push({
              id: tokenMint,
              name: pool.name?.split('-')[0] || pool.token_name || 'Unknown',
              symbol: pool.symbol || pool.token_symbol || 'UNKNOWN',
              image: pool.image || pool.logoURI,
              price: reserveY > 0 ? reserveX / reserveY : 0,
              marketCap: liquidity * 2,
              volume: pool.trade_volume_24h || pool.volume24h || 0,
              volume24h: pool.trade_volume_24h || pool.volume24h || 0,
              liquidity: liquidity,
              isMigrated: isMigrated,
              bondingProgress: isMigrated ? 1.0 : (pool.progress || 0),
              createdTimestamp: pool.created_at ? new Date(pool.created_at).getTime() : undefined,
              migrationTimestamp: isMigrated && pool.migrated_at 
                ? new Date(pool.migrated_at).getTime() 
                : undefined,
              protocol: 'jupiter-studio',
              chain: 'solana',
            });
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Jupiter Studio (Meteora DBC) API request timeout (15s)');
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo ENOTFOUND')) {
        console.error('❌ Jupiter Studio API: Domain damm-api.meteora.ag not found - endpoint may be incorrect or API may be down');
      } else if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('terminated')) {
        console.error('❌ Jupiter Studio API connection terminated');
      } else {
        console.error('❌ Failed to fetch Jupiter Studio tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch tokens from Orca Whirlpools
   */
  async fetchOrcaTokens(limit = 100): Promise<ProtocolToken[]> {
    const cacheKey = `orca:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        `https://api.orca.so/v1/whirlpool/list`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Orca API error: ${response.status} ${response.statusText}`);
        return [];
      }

      // Check content length to avoid huge responses
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        console.warn(`Orca API response too large: ${contentLength} bytes, skipping`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (data.whirlpools && Array.isArray(data.whirlpools)) {
        for (const pool of data.whirlpools.slice(0, limit)) {
          if (pool.tokenA && pool.tokenB) {
            const isSolPair =
              pool.tokenA.mint ===
                'So11111111111111111111111111111111111111112' ||
              pool.tokenB.mint ===
                'So11111111111111111111111111111111111111112';

            if (isSolPair) {
              const token =
                pool.tokenA.mint ===
                'So11111111111111111111111111111111111111112'
                  ? pool.tokenB
                  : pool.tokenA;

              tokens.push({
                id: token.mint,
                name: token.name || 'Unknown',
                symbol: token.symbol || 'UNKNOWN',
                image: token.logoURI,
                marketCap: 0, // Orca API doesn't provide market cap directly
                volume: 0,
                volume24h: 0,
                liquidity: 0,
                isMigrated: true,
                bondingProgress: 1.0,
                protocol: 'orca',
                chain: 'solana',
              });
            }
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Orca API request timeout');
      } else if (error.code === 'UND_ERR_SOCKET' || error.message?.includes('terminated')) {
        console.error('Orca API connection terminated (response too large or server closed connection)');
      } else {
        console.error('Failed to fetch Orca tokens:', error.message || error);
      }
      return [];
    }
  }

  /**
   * ============================================================================
   * JUPITER DATA API INTEGRATION (ISOLATED - COMMENT OUT IF IT FAILS)
   * ============================================================================
   * Public API: https://datapi.jup.ag
   * 
   * To disable: Comment out all Jupiter API methods and remove cases from switch
   */

  /**
   * Fetch new tokens (gems) from Jupiter Data API for specific launchpads
   */
  async fetchJupiterGems(
    launchpads: string[],
    timeframe: '24h' = '24h',
    limit = 30
  ): Promise<ProtocolToken[]> {
    const cacheKey = `jupiter-gems:${launchpads.join(',')}:${timeframe}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://datapi.jup.ag/v1/assets/gems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://jup.ag',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          recent: {
            timeframe,
            limit,
            launchpads,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Jupiter Gems API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (data.recent?.assets && Array.isArray(data.recent.assets)) {
        for (const token of data.recent.assets) {
          if (token.id) {
            const isMigrated = token.graduatedPool !== null && token.graduatedPool !== undefined;
            const bondingProgress = token.bondingCurve ? token.bondingCurve / 100 : (isMigrated ? 1.0 : 0);

            tokens.push({
              id: token.id,
              name: token.name || 'Unknown',
              symbol: token.symbol || 'UNKNOWN',
              image: token.icon,
              price: token.usdPrice || 0,
              priceUsd: token.usdPrice || 0,
              marketCap: token.mcap || 0,
              volume: token.stats24h?.buyVolume + token.stats24h?.sellVolume || token.stats24h?.volumeChange || 0,
              volume24h: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              liquidity: token.liquidity || 0,
              isMigrated: isMigrated,
              bondingProgress: bondingProgress,
              createdTimestamp: token.createdAt ? new Date(token.createdAt).getTime() : undefined,
              migrationTimestamp: token.graduatedAt ? new Date(token.graduatedAt).getTime() : undefined,
              protocol: token.launchpad || 'unknown',
              chain: 'solana',
            });
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Jupiter Gems API request timeout (15s)');
      } else {
        console.error('❌ Failed to fetch Jupiter gems:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch top traded tokens from Jupiter Data API for specific launchpads
   */
  async fetchJupiterTopTraded(
    launchpads: string[],
    limit = 100
  ): Promise<ProtocolToken[]> {
    const cacheKey = `jupiter-toptraded:${launchpads.join(',')}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const launchpadParam = launchpads.join(',');
      const response = await fetch(
        `https://datapi.jup.ag/v1/assets/toptraded/24h?launchpads=${launchpadParam}&limit=${limit}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Jupiter Top Traded API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (Array.isArray(data)) {
        for (const token of data) {
          if (token.id) {
            const isMigrated = token.graduatedPool !== null && token.graduatedPool !== undefined;

            tokens.push({
              id: token.id,
              name: token.name || 'Unknown',
              symbol: token.symbol || 'UNKNOWN',
              image: token.icon,
              price: token.usdPrice || 0,
              priceUsd: token.usdPrice || 0,
              marketCap: token.mcap || 0,
              volume: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              volume24h: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              liquidity: token.liquidity || 0,
              isMigrated: isMigrated,
              bondingProgress: isMigrated ? 1.0 : (token.bondingCurve ? token.bondingCurve / 100 : 0),
              createdTimestamp: token.createdAt ? new Date(token.createdAt).getTime() : undefined,
              migrationTimestamp: token.graduatedAt ? new Date(token.graduatedAt).getTime() : undefined,
              protocol: token.launchpad || 'unknown',
              chain: 'solana',
            });
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Jupiter Top Traded API request timeout (15s)');
      } else {
        console.error('❌ Failed to fetch Jupiter top traded:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch top trending tokens from Jupiter Data API (global, limit 10)
   */
  async fetchJupiterTopTrending(limit = 10): Promise<ProtocolToken[]> {
    const cacheKey = `jupiter-toptrending:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds

      const response = await fetch(
        `https://datapi.jup.ag/v1/assets/toptrending/24h?limit=${limit}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Jupiter Top Trending API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const tokens: ProtocolToken[] = [];

      if (Array.isArray(data)) {
        for (const token of data) {
          if (token.id) {
            const isMigrated = token.graduatedPool !== null && token.graduatedPool !== undefined;

            tokens.push({
              id: token.id,
              name: token.name || 'Unknown',
              symbol: token.symbol || 'UNKNOWN',
              image: token.icon,
              price: token.usdPrice || 0,
              priceUsd: token.usdPrice || 0,
              marketCap: token.mcap || 0,
              volume: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              volume24h: token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0,
              liquidity: token.liquidity || 0,
              isMigrated: isMigrated,
              bondingProgress: isMigrated ? 1.0 : 0,
              createdTimestamp: token.createdAt ? new Date(token.createdAt).getTime() : undefined,
              migrationTimestamp: token.graduatedAt ? new Date(token.graduatedAt).getTime() : undefined,
              protocol: token.launchpad || 'unknown',
              chain: 'solana',
            });
          }
        }
      }

      this.cache.set(cacheKey, {
        data: tokens,
        timestamp: Date.now(),
      });

      return tokens;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Jupiter Top Trending API request timeout (30s)');
      } else {
        console.error('❌ Failed to fetch Jupiter top trending:', error.message || error);
      }
      return [];
    }
  }

  /**
   * Fetch launchpad statistics from Jupiter Data API
   */
  async fetchJupiterLaunchpadStats(): Promise<any> {
    const cacheKey = 'jupiter-launchpad-stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 2) { // Cache stats longer (60s)
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://datapi.jup.ag/v3/launchpads/stats', {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ Jupiter Launchpad Stats API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Jupiter Launchpad Stats API request timeout (15s)');
      } else {
        console.error('❌ Failed to fetch Jupiter launchpad stats:', error.message || error);
      }
      return null;
    }
  }

  /**
   * Fetch tokens from multiple protocols
   */
  async fetchTokensByProtocols(
    protocols: ProtocolType[],
    status?: 'new' | 'finalStretch' | 'migrated'
  ): Promise<ProtocolToken[]> {
    const allTokens: ProtocolToken[] = [];

    // Fetch from each protocol in parallel
    // Track which protocol each promise belongs to
    const fetchPromises: Array<{ protocol: ProtocolType; promise: Promise<ProtocolToken[]> }> = [];

    for (const protocol of protocols) {
      switch (protocol) {
        case 'raydium':
          // Use Launchpad API for new tokens, AMM pools for migrated
          if (status === 'new') {
            fetchPromises.push({ protocol, promise: this.fetchRaydiumLaunchpadTokens('new', 100) });
          } else if (status === 'migrated') {
            fetchPromises.push({ protocol, promise: this.fetchRaydiumTokens(100) });
          } else {
            // For trending/finalStretch, use hot tokens from Launchpad
            fetchPromises.push({ protocol, promise: this.fetchRaydiumLaunchpadTokens('hotToken', 100) });
          }
          break;
        case 'meteora':
        case 'meteora-amm':
        case 'meteora-amm-v2':
          fetchPromises.push({ protocol, promise: this.fetchMeteoraTokens(100) });
          break;
        case 'orca':
          fetchPromises.push({ protocol, promise: this.fetchOrcaTokens(100) });
          break;
        case 'pump':
          // Pump.fun is handled separately via pumpFunService
          break;
        
        // ========================================================================
        // ISOLATED INTEGRATIONS - COMMENT OUT IF THEY FAIL
        // ========================================================================
        
        case 'moonshot':
          // Use Jupiter Data API for moonshot launchpad only
          if (status === 'new') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterGems(['moonshot'], '24h', 30) });
          } else if (status === 'migrated') {
            // For migrated, use top traded and filter by graduatedPool
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['moonshot'], 100) });
          } else {
            // For trending/finalStretch, use top traded
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['moonshot'], 100) });
          }
          break;

        case 'moonit':
          // Combine Moonit from Jupiter API + Moonit public API (api.mintlp.io)
          // CRITICAL: Moonit API has state='GRADUATED' endpoint - tokens from there are ALWAYS migrated
          if (status === 'new') {
            // Fetch from both sources
            fetchPromises.push({ protocol: 'moonit-jupiter', promise: this.fetchJupiterGems(['moonit'], '24h', 30) });
            fetchPromises.push({ protocol: 'moonit-api', promise: this.fetchMoonitTokens('TRENDING', 'NOT_GRADUATED', 30) });
          } else if (status === 'migrated') {
            // For migrated, use both sources
            // CRITICAL: fetchMoonitTokens with state='GRADUATED' returns ONLY migrated tokens
            fetchPromises.push({ protocol: 'moonit-jupiter', promise: this.fetchJupiterTopTraded(['moonit'], 100) });
            fetchPromises.push({ protocol: 'moonit-api-graduated', promise: this.fetchMoonitTokens('MARKET_CAP', 'GRADUATED', 100) });
          } else {
            // For trending/finalStretch, use both sources
            fetchPromises.push({ protocol: 'moonit-jupiter', promise: this.fetchJupiterTopTraded(['moonit'], 100) });
            fetchPromises.push({ protocol: 'moonit-api', promise: this.fetchMoonitTokens('TRENDING', 'NOT_GRADUATED', 100) });
          }
          break;
        
        case 'jupiter-studio':
          // Use Jupiter Data API for jup-studio launchpad
          if (status === 'new') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterGems(['jup-studio'], '24h', 30) });
          } else if (status === 'migrated') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['jup-studio'], 100) });
          } else {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['jup-studio'], 100) });
          }
          break;

        case 'launchlab':
          // Use Jupiter Data API for raydium-launchlab launchpad
          if (status === 'new') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterGems(['raydium-launchlab'], '24h', 30) });
          } else if (status === 'migrated') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['raydium-launchlab'], 100) });
          } else {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['raydium-launchlab'], 100) });
          }
          break;

        case 'bonk':
          // Use Jupiter Data API for letsbonk.fun launchpad
          if (status === 'new') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterGems(['letsbonk.fun'], '24h', 30) });
          } else if (status === 'migrated') {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['letsbonk.fun'], 100) });
          } else {
            fetchPromises.push({ protocol, promise: this.fetchJupiterTopTraded(['letsbonk.fun'], 100) });
          }
          break;
        
        // ========================================================================
        // END ISOLATED INTEGRATIONS
        // ========================================================================
        
        default:
          // For protocols without direct APIs, we'll need to use Dexscreener or other aggregators
          console.warn(`Protocol ${protocol} not yet implemented`);
          break;
      }
    }

    const results = await Promise.allSettled(fetchPromises.map(fp => fp.promise));
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { protocol } = fetchPromises[i];
      if (result.status === 'fulfilled') {
        const tokens = result.value;
        if (tokens.length > 0) {
          console.log(`✅ ${protocol}: Fetched ${tokens.length} tokens`);
          // CRITICAL: Tokens from graduated endpoints are ALWAYS migrated
          // Normalize protocol names and mark tokens from graduated endpoints
          const normalizedTokens = tokens.map(token => {
            const isFromGraduatedEndpoint = protocol === 'moonit-api-graduated';
            const normalizedProtocol = (protocol === 'moonit-jupiter' || protocol === 'moonit-api' || protocol === 'moonit-api-graduated') 
              ? 'moonit' 
              : protocol;
            
            return { 
              ...token, 
              protocol: normalizedProtocol,
              // Force migrated status if from graduated endpoint (no need to check API fields)
              isMigrated: isFromGraduatedEndpoint || token.isMigrated,
              bondingProgress: isFromGraduatedEndpoint ? 1.0 : token.bondingProgress,
            };
          });
          allTokens.push(...normalizedTokens);
        } else {
          console.warn(`⚠️ ${protocol}: No tokens returned (API may be down or endpoint incorrect)`);
        }
      } else {
        console.error(`❌ ${protocol}: Failed to fetch tokens:`, result.reason?.message || result.reason);
      }
    }

    // Filter by status if provided
    if (status === 'migrated') {
      return allTokens.filter((t) => t.isMigrated).sort((a, b) => {
        // Sort by migration timestamp (most recent first) or created timestamp
        const aTime = a.migrationTimestamp || a.createdTimestamp || 0;
        const bTime = b.migrationTimestamp || b.createdTimestamp || 0;
        return bTime - aTime;
      });
    } else if (status === 'finalStretch') {
      return allTokens.filter((t) => {
        // Exclude migrated tokens
        if (t.isMigrated || t.migrationTimestamp || t.raydiumPool) {
          return false;
        }

        // Calculate bonding progress if not set
        // Prefer explicit bondingProgress, then SOL reserves, then market cap
        let bondingProgress = t.bondingProgress;
        
        if (bondingProgress === undefined || bondingProgress === null) {
          // Try to calculate from SOL reserves (more accurate)
          const solReserves = (t as any).reserves?.sol || (t as any).solReserves || (t as any).realSolReserves;
          if (solReserves && solReserves > 0) {
            const SOL_TARGET = 69; // Pump.fun target is ~69 SOL
            bondingProgress = Math.min(Math.max(solReserves / SOL_TARGET, 0), 1.0);
          } else {
            // Fallback to market cap calculation (less accurate)
            // 69 SOL at current price (~$137) = ~$9,453
            const bondingCurveTargetUSD = 69 * 137; // ~$9,453
            bondingProgress = t.marketCap
              ? Math.min((t.marketCap || 0) / bondingCurveTargetUSD, 1.0)
              : 0;
          }
        }

        // Final stretch: bonding progress between 90% and 100% (not migrated)
        return bondingProgress >= 0.9 && bondingProgress < 1.0;
      }).sort((a, b) => {
        // Sort by created timestamp (newest first)
        const aTime = a.createdTimestamp || 0;
        const bTime = b.createdTimestamp || 0;
        return bTime - aTime;
      });
    } else if (status === 'new') {
      return allTokens.filter(
        (t) => !t.isMigrated && (!t.bondingProgress || t.bondingProgress < 0.9)
      ).sort((a, b) => {
        // Sort by created timestamp (newest first)
        const aTime = a.createdTimestamp || 0;
        const bTime = b.createdTimestamp || 0;
        return bTime - aTime;
      });
    }

    // Default: sort by created timestamp (newest first)
    return allTokens.sort((a, b) => {
      const aTime = a.createdTimestamp || 0;
      const bTime = b.createdTimestamp || 0;
      return bTime - aTime;
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const protocolService = new ProtocolService();

