/**
 * Platform Detection Service
 * Intelligent pattern-based platform recognition
 * 
 * Uses endpoint patterns, token signatures, and known platform indicators
 * to detect which launchpad/platform a token came from.
 * 
 * Future: Can be enhanced with AI endpoint when ready
 */

export interface TokenPlatformData {
  id: string;
  name?: string;
  symbol?: string;
  image?: string;
  source?: string;
  protocol?: string;
  chain?: string;
  raydiumPool?: string;
  createdTimestamp?: number;
  [key: string]: unknown;
}

export type DetectedPlatform = 
  | 'pump'
  | 'pumpfun'
  | 'raydium'
  | 'meteora'
  | 'orca'
  | 'moonshot'
  | 'jupiter-studio'
  | 'jupiter'
  | 'bonk'
  | 'bags'
  | 'heaven'
  | 'daos-fun'
  | 'candle'
  | 'sugar'
  | 'believe'
  | 'moonit'
  | 'boop'
  | 'launchlab'
  | 'dynamic-bc'
  | 'mayhem'
  | 'pump-amm'
  | 'wavebreak'
  | 'unknown';

export class AIPlatformDetector {
  private cache: Map<string, DetectedPlatform> = new Map();

  constructor() {
    // No AI endpoint needed - using pattern-based detection only
  }

  /**
   * Detect platform from token data using intelligent pattern matching
   * No AI calls - just smart pattern detection
   */
  detectPlatform(token: TokenPlatformData): DetectedPlatform {
    const cacheKey = token.id;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Use intelligent pattern-based detection
    const detectedPlatform = this.detectPlatformFromPatterns(token);
    
    // Cache the result
    this.cache.set(cacheKey, detectedPlatform);

    return detectedPlatform;
  }

  /**
   * Intelligent pattern-based platform detection (fallback)
   * Uses endpoint patterns, token signatures, and known platform indicators
   */
  private detectPlatformFromPatterns(token: TokenPlatformData): DetectedPlatform {
    const rawData = (token as any)._mobulaData || {};
    const poolType = (rawData.poolType || token.protocol || token.source || "").toLowerCase();

    // Check explicit pool types/protocols first
    if (poolType.includes('pumpfun') || poolType.includes('pumpswap')) return 'pump';
    if (poolType.includes('raydium')) return 'raydium';
    if (poolType.includes('meteora')) return 'meteora';
    if (poolType.includes('orca')) return 'orca';
    if (poolType.includes('moonshot')) return 'moonshot';
    if (poolType.includes('jupiter')) return 'jupiter-studio';
    if (poolType.includes('moonit')) return 'moonit';
    if (poolType.includes('letsbonk') || poolType.includes('bonk')) return 'bonk';
    if (poolType.includes('heaven')) return 'heaven';

    // Check explicit source/protocol strings as fallback
    if (token.source) {
      const source = token.source.toLowerCase();
      if (source.includes('pump') || source === 'pumpportal') return 'pump';
      if (source.includes('raydium')) return 'raydium';
    }

    // Check for Raydium pool indicator
    if (token.raydiumPool) {
      return 'raydium';
    }

    // Check token ID patterns - Pump.fun tokens MUST end with "pump" on Solana
    const tokenId = token.id.toLowerCase();
    const tokenAddress = tokenId.includes(':') ? tokenId.split(':')[1] : tokenId;
    
    if (tokenAddress.endsWith('pump')) {
      return 'pump';
    }

    // Check image URL patterns
    if (token.image) {
      const imageUrl = token.image.toLowerCase();
      if (imageUrl.includes('pump.fun') || imageUrl.includes('pumpportal')) return 'pump';
      if (imageUrl.includes('raydium')) return 'raydium';
      if (imageUrl.includes('meteora')) return 'meteora';
    }

    // Final fallback for Solana items
    if (token.chain === 'solana') {
      // If it doesn't end in 'pump', it's likely a standard SPL token on Raydium
      return 'raydium';
    }

    return 'unknown';
  }


  /**
   * Clear cache (useful for testing or refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached platform (if available)
   */
  getCachedPlatform(tokenId: string): DetectedPlatform | null {
    return this.cache.get(tokenId) || null;
  }
}

// Singleton instance
export const aiPlatformDetector = new AIPlatformDetector();

