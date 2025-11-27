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
    // Check explicit source/protocol first
    if (token.source) {
      const source = token.source.toLowerCase();
      if (source.includes('pump') || source === 'pumpportal') return 'pump';
      if (source.includes('raydium')) return 'raydium';
      if (source.includes('meteora')) return 'meteora';
      if (source.includes('orca')) return 'orca';
      if (source.includes('moonshot')) return 'moonshot';
      if (source.includes('jupiter')) return 'jupiter-studio';
      if (source.includes('bonk')) return 'bonk';
    }

    if (token.protocol) {
      const protocol = token.protocol.toLowerCase();
      if (protocol.includes('pump')) return 'pump';
      if (protocol.includes('raydium')) return 'raydium';
      if (protocol.includes('meteora')) return 'meteora';
      if (protocol.includes('orca')) return 'orca';
      if (protocol.includes('moonshot')) return 'moonshot';
      if (protocol.includes('jupiter')) return 'jupiter-studio';
    }

    // Check for Raydium pool indicator
    if (token.raydiumPool) {
      return 'raydium';
    }

    // Check token ID patterns
    const tokenId = token.id.toLowerCase();
    
    // Pump.fun tokens often end with "pump"
    if (tokenId.endsWith('pump')) {
      return 'pump';
    }

    // Check image URL patterns
    if (token.image) {
      const imageUrl = token.image.toLowerCase();
      if (imageUrl.includes('pump.fun') || imageUrl.includes('pumpportal')) return 'pump';
      if (imageUrl.includes('raydium')) return 'raydium';
      if (imageUrl.includes('meteora')) return 'meteora';
      if (imageUrl.includes('orca')) return 'orca';
      if (imageUrl.includes('moonshot')) return 'moonshot';
      if (imageUrl.includes('jupiter')) return 'jupiter-studio';
    }

    // Default based on chain
    if (token.chain === 'solana') {
      return 'pump'; // Default Solana tokens to pump.fun
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

