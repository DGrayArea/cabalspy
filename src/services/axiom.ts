import { TokenData } from '@/types/token';
import { logger } from '@/lib/logger';

const AXIOM_API_KEY = 'AxiomozyNSTbBlP88VY35BvSdDVS3du1be8Q1VMmconPgpWFVWnpmfnpUrhRj97F';
const AXIOM_BASE_URL = 'https://axiom-fra.gateway.astralane.io';

export interface AxiomTokenResponse {
  mint?: string;
  name?: string;
  symbol?: string;
  image?: string;
  imageUrl?: string;
  logo?: string;
  price?: number;
  marketCap?: number;
  mc?: number;
  volume?: number;
  vol?: number;
  fee?: number;
  transactions?: number;
  txCount?: number;
  timestamp?: number;
  ts?: number;
  priceChange?: number;
  pct?: number;
  quality?: number;
  views?: number;
  holders?: number;
  trades?: number;
}

export class AxiomService {
  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${AXIOM_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'api-key': AXIOM_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Axiom API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Axiom API request failed', error, { endpoint });
      throw error;
    }
    }

  /**
   * Fetch demo tokens from Axiom API
   * Adjust the endpoint based on the actual API structure
   */
  async fetchTokens(): Promise<TokenData[]> {
    try {
      // Try common endpoints - adjust based on actual API structure
      const endpoints = [
        '/gethealth', // Health check endpoint you provided
        '/tokens',
        '/api/tokens',
        '/v1/tokens',
      ];

      let tokens: AxiomTokenResponse[] = [];

      // Try health check first to verify API access
      await this.fetchWithAuth('/gethealth?api-key=' + AXIOM_API_KEY);

      // Try to fetch tokens - adjust endpoint as needed
      for (const endpoint of endpoints.slice(1)) {
        try {
          const data = await this.fetchWithAuth<unknown>(endpoint);
          
          // Handle different response formats
          const dataObj = data as Record<string, unknown>;
          if (Array.isArray(data)) {
            tokens = data as AxiomTokenResponse[];
            break;
          } else if (dataObj.tokens && Array.isArray(dataObj.tokens)) {
            tokens = dataObj.tokens as AxiomTokenResponse[];
            break;
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            tokens = dataObj.data as AxiomTokenResponse[];
            break;
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      // If no tokens found, generate demo data
      if (tokens.length === 0) {
        logger.warn('No tokens from API, generating demo data');
        tokens = this.generateDemoTokens();
      }

      return tokens.map(token => this.transformToTokenData(token));
    } catch (error) {
      logger.error('Failed to fetch tokens from Axiom', error);
      // Return demo tokens as fallback
      return this.generateDemoTokens().map(token => this.transformToTokenData(token));
    }
  }

  private transformToTokenData(data: AxiomTokenResponse): TokenData {
    const now = Date.now();
    const timestamp = data.timestamp || data.ts || now;
    const timeDiff = now - timestamp;

    return {
      id: data.mint || crypto.randomUUID(),
      name: data.name || data.symbol || 'Token',
      symbol: data.symbol || 'TKN',
      icon: this.getTokenIcon(data.symbol),
      image: data.image || data.imageUrl || data.logo,
      time: this.formatTime(timeDiff),
      marketCap: data.marketCap || data.mc || 0,
      volume: data.volume || data.vol || 0,
      fee: data.fee || 0,
      transactions: data.transactions || data.txCount || 0,
      percentages: this.calculatePercentages(data.priceChange || data.pct || 0),
      price: data.price || 0,
      activity: {
        Q: data.quality || 1,
        views: data.views || 0,
        holders: data.holders || 0,
        trades: data.trades || data.txCount || 0,
      },
    };
  }

  private getTokenIcon(symbol?: string): string {
    const iconMap: { [key: string]: string } = {
      'MOG': '🐕',
      'TIGER': '🐅',
      'GAME': '🎮',
      'CAT': '🐱',
      'DOGE': '🐕',
      'PEPE': '🐸',
      'SHIB': '🐕',
      'BONK': '🐕',
    };
    
    return iconMap[symbol?.toUpperCase() || ''] || '🪙';
  }

  private formatTime(diff: number): string {
    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m`;
    } else {
      return `${Math.floor(diff / 3600000)}h`;
    }
  }

  private calculatePercentages(priceChange: number): number[] {
    const percentage = Math.round(priceChange * 100);
    const bars: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      if (percentage > i * 20) {
        bars.push(Math.min(percentage, (i + 1) * 20));
      } else {
        bars.push(0);
      }
    }
    
    return bars;
  }

  private generateDemoTokens(): AxiomTokenResponse[] {
    const demoTokens = [
      {
        mint: '1',
        name: 'MOG MOG',
        symbol: 'MOG',
        imageUrl: 'https://via.placeholder.com/64',
        price: 4.2,
        marketCap: 6050,
        volume: 279,
        fee: 0.041,
        transactions: 2,
        timestamp: Date.now() - 7000,
        priceChange: 0.05,
        quality: 1,
      },
      {
        mint: '2',
        name: 'TIGER Playful Little Tiger',
        symbol: 'TIGER',
        imageUrl: 'https://via.placeholder.com/64',
        price: 2.1,
        marketCap: 5500,
        volume: 635,
        fee: 5.415,
        transactions: 2094,
        timestamp: Date.now() - 10000,
        priceChange: 0,
        quality: 2,
      },
      {
        mint: '3',
        name: 'BONK Coin',
        symbol: 'BONK',
        imageUrl: 'https://via.placeholder.com/64',
        price: 0.001,
        marketCap: 1000000,
        volume: 50000,
        fee: 0.25,
        transactions: 15000,
        timestamp: Date.now() - 30000,
        priceChange: 0.15,
        quality: 3,
      },
    ];

    // Generate more demo tokens
    for (let i = 4; i <= 50; i++) {
      demoTokens.push({
        mint: i.toString(),
        name: `Token ${i}`,
        symbol: `TK${i}`,
        imageUrl: `https://via.placeholder.com/64?text=TK${i}`,
        price: Math.random() * 10,
        marketCap: Math.random() * 100000,
        volume: Math.random() * 10000,
        fee: Math.random() * 10,
        transactions: Math.floor(Math.random() * 5000),
        timestamp: Date.now() - Math.random() * 3600000,
        priceChange: (Math.random() - 0.5) * 0.2,
        quality: Math.floor(Math.random() * 5) + 1,
      });
    }

    return demoTokens;
  }
}

export const axiomService = new AxiomService();

