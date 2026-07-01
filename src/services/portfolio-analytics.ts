import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface PerformanceMetrics {
  totalPnLUsd: number;
  totalPnLPercent: number;
  winRate: number;
  totalTrades: number;
  bestTrade: { symbol: string; roi: number };
  worstTrade: { symbol: string; roi: number };
}

interface Position {
  tokens: number;
  costUsd: number;
  symbol: string;
}

export class PortfolioAnalyticsService {
  /**
   * Compute realized performance from the user's recorded trades.
   *
   * Replays successful trades in chronological order keeping an
   * average-cost basis per mint; each sell realizes PnL against that
   * basis. Trades without a recorded USD price are counted in
   * totalTrades but excluded from PnL/win-rate math.
   */
  async getPerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
    try {
      const trades = await db.tradeHistory.findMany({
        where: { userId, status: "success" },
        orderBy: { timestamp: "asc" },
      });

      if (trades.length === 0) {
        return this.getDefaultMetrics();
      }

      const positions = new Map<string, Position>();
      const closedTrades: { symbol: string; roi: number; pnlUsd: number }[] = [];
      let totalPnLUsd = 0;
      let totalCostOfSoldUsd = 0;

      for (const trade of trades) {
        if (!trade.tokenMint || !trade.priceUsd || trade.priceUsd <= 0) continue;

        const pos = positions.get(trade.tokenMint) ?? {
          tokens: 0,
          costUsd: 0,
          symbol: trade.symbol,
        };

        if (trade.direction === "buy") {
          // On buys: output = token amount received, symbol = token symbol
          const tokensBought = parseFloat(trade.output || "0");
          if (tokensBought > 0) {
            pos.tokens += tokensBought;
            pos.costUsd += tokensBought * trade.priceUsd;
            pos.symbol = trade.symbol;
            positions.set(trade.tokenMint, pos);
          }
        } else if (trade.direction === "sell") {
          // On sells: amount = token amount sold (symbol is "SOL", the output side)
          const tokensSold = parseFloat(trade.amount || "0");
          if (tokensSold <= 0 || pos.tokens <= 0 || pos.costUsd <= 0) continue;

          const avgEntry = pos.costUsd / pos.tokens;
          const soldFromPosition = Math.min(tokensSold, pos.tokens);
          const costOfSold = soldFromPosition * avgEntry;
          const pnlUsd = soldFromPosition * (trade.priceUsd - avgEntry);
          const roi = ((trade.priceUsd - avgEntry) / avgEntry) * 100;

          totalPnLUsd += pnlUsd;
          totalCostOfSoldUsd += costOfSold;
          closedTrades.push({ symbol: pos.symbol, roi, pnlUsd });

          pos.tokens -= soldFromPosition;
          pos.costUsd -= costOfSold;
          positions.set(trade.tokenMint, pos);
        }
      }

      const wins = closedTrades.filter((t) => t.pnlUsd > 0).length;
      const winRate =
        closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

      let bestTrade = { symbol: "N/A", roi: 0 };
      let worstTrade = { symbol: "N/A", roi: 0 };
      for (const t of closedTrades) {
        if (bestTrade.symbol === "N/A" || t.roi > bestTrade.roi) {
          bestTrade = { symbol: t.symbol, roi: t.roi };
        }
        if (worstTrade.symbol === "N/A" || t.roi < worstTrade.roi) {
          worstTrade = { symbol: t.symbol, roi: t.roi };
        }
      }

      return {
        totalPnLUsd,
        totalPnLPercent:
          totalCostOfSoldUsd > 0 ? (totalPnLUsd / totalCostOfSoldUsd) * 100 : 0,
        winRate,
        totalTrades: trades.length,
        bestTrade,
        worstTrade,
      };
    } catch (error) {
      logger.error("[PORTFOLIO_ANALYTICS]", error);
      return this.getDefaultMetrics();
    }
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      totalPnLUsd: 0,
      totalPnLPercent: 0,
      winRate: 0,
      totalTrades: 0,
      bestTrade: { symbol: "N/A", roi: 0 },
      worstTrade: { symbol: "N/A", roi: 0 },
    };
  }
}

export const portfolioAnalytics = new PortfolioAnalyticsService();
