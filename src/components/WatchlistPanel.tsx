"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown, X, ArrowUpRight, Loader2 } from "lucide-react";
import { useWatchlist } from "@/context/WatchlistContext";
import { formatCurrency, formatNumber } from "@/utils/format";

interface TokenPrice {
  price: number;
  change24h: number;
  volume24h: number;
}

interface WatchlistPanelProps {
  /** If compact, shows as a small sidebar strip instead of full grid */
  compact?: boolean;
  /** Maximum tokens to show (default unlimited) */
  limit?: number;
  className?: string;
}

export function WatchlistPanel({ compact = false, limit, className = "" }: WatchlistPanelProps) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  const displayed = limit ? watchlist.slice(0, limit) : watchlist;

  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoadingPrices(true);
    try {
      const mints = watchlist.map((t) => t.mint).join(",");
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${mints}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const pairs: any[] = data.pairs || [];

      const priceMap: Record<string, TokenPrice> = {};
      for (const pair of pairs) {
        const addr = pair?.baseToken?.address;
        if (!addr) continue;
        if (!priceMap[addr]) {
          priceMap[addr] = {
            price: parseFloat(pair.priceUsd || "0"),
            change24h: parseFloat(pair.priceChange?.h24 || "0"),
            volume24h: parseFloat(pair.volume?.h24 || "0"),
          };
        }
      }
      setPrices(priceMap);
    } catch (e) {
      console.warn("[WatchlistPanel] price fetch failed", e);
    } finally {
      setLoadingPrices(false);
    }
  }, [watchlist]);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 30_000); // refresh every 30s
    return () => clearInterval(iv);
  }, [fetchPrices]);

  if (watchlist.length === 0) {
    return (
      <div className={`glass rounded-2xl sm:rounded-3xl border border-white/10 p-6 text-center ${className}`}>
        <Star className="w-8 h-8 text-muted/30 mx-auto mb-3" />
        <p className="text-xs font-black text-muted uppercase tracking-widest">No Watchlist Items</p>
        <p className="text-[9px] text-muted/50 mt-1">
          Star a token on any page to track it here
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`glass rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Watchlist</span>
          </div>
          <div className="flex items-center gap-2">
            {loadingPrices && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
            <span className="text-[9px] font-black text-muted">{watchlist.length} tokens</span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {displayed.map((token) => {
            const p = prices[token.mint];
            const isUp = (p?.change24h ?? 0) >= 0;
            return (
              <div key={token.mint} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group">
                {/* Token image */}
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-panel-elev shrink-0 border border-white/5">
                  {token.image ? (
                    <img src={token.image} alt={token.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-black italic text-gradient uppercase">
                      {token.symbol[0]}
                    </div>
                  )}
                </div>

                {/* Name + symbol */}
                <Link href={`/sol/${token.mint}`} className="flex-1 min-w-0">
                  <div className="text-[10px] font-black truncate">{token.symbol}</div>
                  <div className="text-[8px] text-muted truncate">{token.name}</div>
                </Link>

                {/* Price */}
                <div className="text-right shrink-0">
                  {p ? (
                    <>
                      <div className="text-[10px] font-black">{formatCurrency(p.price)}</div>
                      <div className={`text-[8px] font-black ${isUp ? "text-primary" : "text-accent"}`}>
                        {isUp ? "+" : ""}{p.change24h.toFixed(1)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-[9px] text-muted/40">—</div>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={(e) => { e.preventDefault(); removeFromWatchlist(token.mint); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-accent/10 hover:text-accent"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {limit && watchlist.length > limit && (
          <div className="px-4 py-2 border-t border-white/5 text-center">
            <Link href="/portfolio" className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest">
              +{watchlist.length - limit} more
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full grid layout
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-primary fill-primary" />
          </div>
          <div>
            <h3 className="text-xs font-black italic tracking-tighter uppercase">Watchlist</h3>
            <p className="text-[9px] text-muted font-bold uppercase tracking-widest">
              {watchlist.length} token{watchlist.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
        </div>
        {loadingPrices && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayed.map((token) => {
          const p = prices[token.mint];
          const isUp = (p?.change24h ?? 0) >= 0;

          return (
            <div
              key={token.mint}
              className="glass border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all group relative"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-panel-elev border border-white/5 shrink-0">
                  {token.image ? (
                    <img src={token.image} alt={token.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black italic text-gradient uppercase">
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black truncate">{token.symbol}</div>
                  <div className="text-[9px] text-muted truncate">{token.name}</div>
                </div>
                <button
                  onClick={() => removeFromWatchlist(token.mint)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-accent/10 hover:text-accent shrink-0"
                  title="Remove from watchlist"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Price info */}
              <div className="flex items-end justify-between">
                <div>
                  {p ? (
                    <>
                      <div className="text-lg font-black italic leading-none">{formatCurrency(p.price)}</div>
                      <div className={`flex items-center gap-1 mt-1 text-[9px] font-black ${isUp ? "text-primary" : "text-accent"}`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? "+" : ""}{p.change24h.toFixed(2)}% 24H
                      </div>
                      {p.volume24h > 0 && (
                        <div className="text-[8px] text-muted mt-0.5">
                          Vol: {formatCurrency(p.volume24h)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm font-black italic text-muted/30">Loading...</div>
                  )}
                </div>

                <Link
                  href={`/sol/${token.mint}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all text-[9px] font-black text-muted hover:text-white"
                >
                  TRADE <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
