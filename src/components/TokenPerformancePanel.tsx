"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/utils/format";
import type { TradeEntry } from "@/hooks/useTradeHistory";


interface TokenPerformancePanelProps {
  trades: TradeEntry[];
  currentPrice: number;
  tokenSymbol: string;
  tokenAddress: string;
  solPrice: number;
}

interface TradeStats {
  totalBuys: number;
  totalSells: number;
  successfulBuys: number;
  successfulSells: number;
  totalBuyVolumeSol: number;
  totalSellVolumeSol: number;
  avgEntryPrice: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  realizedPnlUsd: number | null;
  winCount: number;
  lossCount: number;
  winRate: number | null;
}

function computeStats(
  trades: TradeEntry[],
  currentPrice: number,
  solPrice: number
): TradeStats {
  const successBuys = trades.filter(
    (t) => t.direction === "buy" && t.status === "success"
  );
  const successSells = trades.filter(
    (t) => t.direction === "sell" && t.status === "success"
  );

  const totalBuyVolumeSol = successBuys.reduce(
    (s, t) => s + parseFloat(t.amount || "0"),
    0
  );
  const totalSellVolumeSol = successSells.reduce(
    (s, t) => s + parseFloat(t.output || "0"),
    0
  );

  // Average entry price from buys that recorded priceUsd
  const buysWithPrice = successBuys.filter((t) => t.priceUsd && t.priceUsd > 0);
  const avgEntryPrice =
    buysWithPrice.length > 0
      ? buysWithPrice.reduce((s, t) => s + t.priceUsd!, 0) / buysWithPrice.length
      : null;

  // Unrealized PnL: difference between current price and avg entry, scaled by total buy volume
  let unrealizedPnlUsd: number | null = null;
  let unrealizedPnlPct: number | null = null;
  if (avgEntryPrice !== null && avgEntryPrice > 0 && totalBuyVolumeSol > 0) {
    const totalCostUsd = totalBuyVolumeSol * solPrice;
    // Approximate tokens held = cost / avgEntryPrice
    const approxTokensHeld = totalCostUsd / avgEntryPrice;
    const currentValueUsd = approxTokensHeld * currentPrice;
    unrealizedPnlUsd = currentValueUsd - totalCostUsd;
    unrealizedPnlPct = (unrealizedPnlUsd / totalCostUsd) * 100;
  }

  // Realized PnL: sell proceeds vs cost basis (proportional)
  let realizedPnlUsd: number | null = null;
  if (successSells.length > 0 && totalBuyVolumeSol > 0) {
    const sellsSolValue = totalSellVolumeSol; // SOL received
    const sellsUsd = sellsSolValue * solPrice;
    // Cost basis for the sold portion
    const avgCostPerSol = (totalBuyVolumeSol * solPrice) / totalBuyVolumeSol;
    const costBasisSold = successSells.reduce(
      (s, t) => s + parseFloat(t.output || "0"),
      0
    ) * avgCostPerSol;
    realizedPnlUsd = sellsUsd - costBasisSold;
  }

  // Win/loss: compare entry vs exit price for paired sells
  let winCount = 0;
  let lossCount = 0;
  successSells.forEach((sell) => {
    if (sell.priceUsd && avgEntryPrice) {
      if (sell.priceUsd > avgEntryPrice) winCount++;
      else lossCount++;
    }
  });
  const totalClosedTrades = winCount + lossCount;
  const winRate = totalClosedTrades > 0 ? (winCount / totalClosedTrades) * 100 : null;

  return {
    totalBuys: trades.filter((t) => t.direction === "buy").length,
    totalSells: trades.filter((t) => t.direction === "sell").length,
    successfulBuys: successBuys.length,
    successfulSells: successSells.length,
    totalBuyVolumeSol,
    totalSellVolumeSol,
    avgEntryPrice,
    unrealizedPnlUsd,
    unrealizedPnlPct,
    realizedPnlUsd,
    winCount,
    lossCount,
    winRate,
  };
}

function PnlBadge({ value, pct, label }: { value: number | null; pct?: number | null; label: string }) {
  if (value === null) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black italic text-muted/40">—</span>
      </div>
    );
  }
  const isPos = value >= 0;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm font-black italic ${isPos ? "text-primary" : "text-accent"}`}>
          {isPos ? "+" : ""}{formatCurrency(value)}
        </span>
        {pct !== null && pct !== undefined && (
          <span className={`text-[9px] font-black ${isPos ? "text-primary/70" : "text-accent/70"}`}>
            {isPos ? "+" : ""}{pct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function TokenPerformancePanel({
  trades,
  currentPrice,
  tokenSymbol,
  tokenAddress,
  solPrice,
}: TokenPerformancePanelProps) {
  // Filter to this token only
  const tokenTrades = useMemo(
    () => trades.filter((t) => !t.tokenMint || t.tokenMint === tokenAddress),
    [trades, tokenAddress]
  );

  const stats = useMemo(
    () => computeStats(tokenTrades, currentPrice, solPrice),
    [tokenTrades, currentPrice, solPrice]
  );

  const hasAnyTrades = tokenTrades.length > 0;

  if (!hasAnyTrades) {
    return (
      <div className="glass rounded-2xl sm:rounded-3xl p-5 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-black italic tracking-tighter uppercase">Performance History</h3>
            <p className="text-[9px] text-muted font-bold uppercase tracking-widest">
              {tokenSymbol} · this session
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Target className="w-8 h-8 text-muted/30" />
          <p className="text-[10px] font-black text-muted uppercase tracking-widest">No Trades Yet</p>
          <p className="text-[9px] text-muted/60">
            Execute a swap to start tracking your performance on {tokenSymbol}
          </p>
        </div>
      </div>
    );
  }

  const netPnl =
    (stats.unrealizedPnlUsd ?? 0) + (stats.realizedPnlUsd ?? 0);
  const netIsPos = netPnl >= 0;

  return (
    <div className="glass rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-black italic tracking-tighter uppercase">Performance History</h3>
              <p className="text-[9px] text-muted font-bold uppercase tracking-widest">
                {tokenSymbol} · {tokenTrades.length} trade{tokenTrades.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Net PnL summary badge */}
          {(stats.unrealizedPnlUsd !== null || stats.realizedPnlUsd !== null) && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-black italic ${
                netIsPos
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-accent/10 border-accent/30 text-accent"
              }`}
            >
              {netIsPos ? "+" : ""}
              {formatCurrency(netPnl)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-5 space-y-4">

        {/* Row 1: Trade Counts + Win Rate */}
        <div className="grid grid-cols-4 gap-3">
          {/* Total Buys */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-center">
            <div className="text-lg font-black italic text-primary leading-none">
              {stats.successfulBuys}
            </div>
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-1">
              Buys
            </div>
          </div>

          {/* Total Sells */}
          <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-center">
            <div className="text-lg font-black italic text-accent leading-none">
              {stats.successfulSells}
            </div>
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-1">
              Sells
            </div>
          </div>

          {/* Wins */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <div className="text-lg font-black italic text-primary leading-none">
              {stats.winCount}
            </div>
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-1">
              Wins
            </div>
          </div>

          {/* Win Rate */}
          <div
            className={`rounded-xl p-3 text-center border ${
              stats.winRate !== null && stats.winRate >= 50
                ? "bg-primary/10 border-primary/20"
                : stats.winRate !== null
                ? "bg-accent/10 border-accent/20"
                : "bg-white/5 border-white/5"
            }`}
          >
            <div
              className={`text-lg font-black italic leading-none ${
                stats.winRate !== null && stats.winRate >= 50
                  ? "text-primary"
                  : stats.winRate !== null
                  ? "text-accent"
                  : "text-muted/40"
              }`}
            >
              {stats.winRate !== null ? `${stats.winRate.toFixed(0)}%` : "—"}
            </div>
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-1">
              Win Rate
            </div>
          </div>
        </div>

        {/* Row 2: Volume */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">
              Total Buy Volume
            </div>
            <div className="text-sm font-black italic">
              {stats.totalBuyVolumeSol.toFixed(3)}{" "}
              <span className="text-muted text-xs">SOL</span>
            </div>
            {solPrice > 0 && (
              <div className="text-[9px] text-muted mt-0.5">
                ≈ {formatCurrency(stats.totalBuyVolumeSol * solPrice)}
              </div>
            )}
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">
              Total Sell Volume
            </div>
            <div className="text-sm font-black italic">
              {stats.totalSellVolumeSol.toFixed(3)}{" "}
              <span className="text-muted text-xs">SOL</span>
            </div>
            {solPrice > 0 && (
              <div className="text-[9px] text-muted mt-0.5">
                ≈ {formatCurrency(stats.totalSellVolumeSol * solPrice)}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Avg Entry + PnL */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
          {/* Avg Entry Price */}
          {stats.avgEntryPrice !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                  Avg Entry Price
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black italic text-white">
                  {formatCurrency(stats.avgEntryPrice)}
                </span>
                {currentPrice > 0 && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                      currentPrice >= stats.avgEntryPrice
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {currentPrice >= stats.avgEntryPrice ? "▲" : "▼"}{" "}
                    {Math.abs(
                      ((currentPrice - stats.avgEntryPrice) / stats.avgEntryPrice) * 100
                    ).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <PnlBadge
              value={stats.unrealizedPnlUsd}
              pct={stats.unrealizedPnlPct}
              label="Unrealized PnL"
            />
            <PnlBadge
              value={stats.realizedPnlUsd}
              label="Realized PnL"
            />
          </div>

          {/* Warning if price data missing */}
          {stats.avgEntryPrice === null && tokenTrades.some((t) => t.direction === "buy") && (
            <div className="flex items-center gap-2 text-[9px] text-yellow-400/70 font-bold">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>PnL requires price data — new trades will be tracked automatically</span>
            </div>
          )}
        </div>

        {/* Win Streak indicator */}
        {stats.winRate !== null && (
          <div className="flex items-center gap-2 pt-1">
            {stats.winRate >= 60 ? (
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            ) : stats.winRate >= 50 ? (
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-accent" />
            )}
            <span className="text-[9px] font-black text-muted uppercase tracking-widest">
              {stats.winRate >= 60
                ? "Hot Streak — Keep it up!"
                : stats.winRate >= 50
                ? "Positive Record"
                : "Rough Patch — Tighten your entries"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
