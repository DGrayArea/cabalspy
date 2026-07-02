"use client";

import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/utils/format";

// Re-export the type so imports don't break
export type { TradeEntry as LocalTradeHistoryEntry } from "@/hooks/useTradeHistory";

interface TradeHistoryListProps {
  /** If provided, only shows trades for this mint */
  filterMint?: string;
  /** Current token price in USD (for showing entry PnL on buy rows) */
  currentPrice?: number;
}

export function TradeHistoryList({ filterMint, currentPrice }: TradeHistoryListProps) {
  const { address } = useTurnkeySolana();
  const { trades } = useTradeHistory({ walletAddress: address ?? undefined, filterMint });

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <ArrowRightLeft className="w-8 h-8 mb-3 opacity-20" />
        <p className="text-xs uppercase tracking-widest font-bold">No Trade History</p>
        <p className="text-[10px] mt-1 text-gray-600">
          {filterMint ? "No trades for this token yet." : "Your recent swaps will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const isSuccess = trade.status === "success";
        const date = new Date(trade.timestamp);
        const isBuy = trade.direction === "buy";

        // For buy rows: show how the entry price compares to current
        let entryBadge: React.ReactNode = null;
        if (isBuy && trade.priceUsd && currentPrice && currentPrice > 0) {
          const pct = ((currentPrice - trade.priceUsd) / trade.priceUsd) * 100;
          const isUp = pct >= 0;
          entryBadge = (
            <span
              className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${
                isUp ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
              }`}
            >
              {isUp ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              {isUp ? "+" : ""}
              {pct.toFixed(1)}%
            </span>
          );
        }

        return (
          <div
            key={trade.id}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center justify-between">
              {/* Left: icon + direction + token */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSuccess
                      ? isBuy
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold uppercase ${
                        isBuy ? "text-primary" : "text-accent"
                      }`}
                    >
                      {isBuy ? "Buy" : "Sell"}
                    </span>
                    <span className="text-white font-bold text-sm">{trade.symbol}</span>
                    {entryBadge}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 font-medium">
                    <Clock className="w-3 h-3" />
                    {date.toLocaleDateString()}{" "}
                    {date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Right: amount + price at time + TX link */}
              <div className="text-right">
                <div className="text-sm font-bold text-white">
                  {trade.amount} {isBuy ? "SOL" : trade.symbol}
                </div>
                {trade.priceUsd && (
                  <div className="text-[9px] text-muted font-bold mt-0.5">
                    @ {formatCurrency(trade.priceUsd)}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {trade.signature ? (
                    <a
                      href={`https://solscan.io/tx/${trade.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-500 hover:text-primary transition-colors flex items-center gap-0.5 uppercase tracking-wider font-bold"
                    >
                      View TX <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-red-400/80 uppercase tracking-wider font-bold">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
