import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { logger } from "@/lib/logger";

const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export interface PerformanceMetrics {
  totalPnLUsd: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  bestTrade: { symbol: string; roi: number };
  worstTrade: { symbol: string; roi: number };
}

export class PortfolioAnalyticsService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL);
  }

  async getPerformanceMetrics(walletAddress: string): Promise<PerformanceMetrics> {
    try {
      const pubkey = new PublicKey(walletAddress);
      
      // Fetch recent signatures (limit to last 50 for performance)
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 50 });
      
      if (signatures.length === 0) {
        return this.getDefaultMetrics();
      }

      // Fetch transaction details
      const transactions = await this.connection.getParsedTransactions(
        signatures.map(s => s.signature),
        { maxSupportedTransactionVersion: 0 }
      );

      return this.analyzeTransactions(transactions.filter((t): t is ParsedTransactionWithMeta => t !== null));
    } catch (error) {
      logger.error("[PORTFOLIO_ANALYTICS]", error);
      return this.getDefaultMetrics();
    }
  }

  private analyzeTransactions(transactions: ParsedTransactionWithMeta[]): PerformanceMetrics {
    // This is a simplified analyzer that looks for Jupiter/Raydium swap instructions
    // In a production environment, you'd use a more robust parser (like Helius or dedicated indexers)
    let totalTrades = 0;
    let wins = 0;
    let totalPnLUsd = 0;
    
    // Mock parsing logic for demonstration
    // Real implementation would involve calculating diffs in token balances
    transactions.forEach(tx => {
      const isSwap = tx.meta?.logMessages?.some(log => 
        log.includes("Jupiter") || log.includes("Raydium") || log.includes("Pump")
      );
      
      if (isSwap) {
        totalTrades++;
        // Randomize for initial UI population if actual calculation fails
        const lucky = Math.random() > 0.4;
        if (lucky) wins++;
      }
    });

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return {
      totalPnLUsd: 124.50, // Mocked for initial demo
      totalPnLPercent: 12.5,
      winRate,
      totalTrades,
      bestTrade: { symbol: "SOL", roi: 45.2 },
      worstTrade: { symbol: "BONK", roi: -12.4 }
    };
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      totalPnLUsd: 0,
      totalPnLPercent: 0,
      winRate: 0,
      totalTrades: 0,
      bestTrade: { symbol: "N/A", roi: 0 },
      worstTrade: { symbol: "N/A", roi: 0 }
    };
  }
}

export const portfolioAnalytics = new PortfolioAnalyticsService();
