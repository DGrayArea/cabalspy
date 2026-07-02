"use client";

import { useState, useEffect, useCallback } from "react";

export interface TradeEntry {
  id: string;
  timestamp: number;
  direction: "buy" | "sell";
  amount: string;    // SOL amount on buy, token amount on sell
  output: string;    // token amount out on buy, SOL amount out on sell
  symbol: string;
  signature?: string;
  status: "success" | "failed";
  /** USD price of the token at time of the trade */
  priceUsd?: number;
  /** USD value of the output at execution time */
  outAmountUsd?: number;
  /** Referral/platform fee paid, in SOL (when the fee mint is SOL) */
  feesSOL?: number;
  /** Actual fee bps Jupiter charged (0 = fee not collected) */
  feesBps?: number;
  /** The SPL mint this trade was for */
  tokenMint?: string;
}

const STORAGE_KEY_PREFIX = "cabalspy-trade-history-";
const MAX_HISTORY = 100;

export function tradeHistoryKey(walletAddress: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress || "guest"}`;
}

/** Read all trades from localStorage for a wallet */
export function readTradeHistory(walletAddress: string | undefined): TradeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(tradeHistoryKey(walletAddress));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist the trade history to localStorage */
export function writeTradeHistory(walletAddress: string | undefined, entries: TradeEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tradeHistoryKey(walletAddress), JSON.stringify(entries));
}

/** Add a new trade to the front and persist */
export function appendTrade(walletAddress: string | undefined, entry: TradeEntry): TradeEntry[] {
  const current = readTradeHistory(walletAddress);
  const next = [entry, ...current].slice(0, MAX_HISTORY);
  writeTradeHistory(walletAddress, next);
  return next;
}

export interface UseTradeHistoryOptions {
  walletAddress?: string;
  /** If provided, only returns trades for this mint */
  filterMint?: string;
  /** Poll interval in ms (default 2000) */
  pollMs?: number;
}

export interface UseTradeHistoryReturn {
  trades: TradeEntry[];
  allTrades: TradeEntry[];
  addTrade: (entry: TradeEntry) => void;
  /** Per-token win stats */
  stats: {
    wins: number;
    losses: number;
    total: number;
    winRate: number | null;
    totalBuys: number;
    totalSells: number;
    totalBuyVolumeSol: number;
    totalSellVolumeSol: number;
    avgEntryPrice: number | null;
  };
}

export function useTradeHistory({
  walletAddress,
  filterMint,
  pollMs = 10000, // Reduced polling frequency to 10s since DB is source of truth
}: UseTradeHistoryOptions = {}): UseTradeHistoryReturn {
  const [allTrades, setAllTrades] = useState<TradeEntry[]>(() =>
    readTradeHistory(walletAddress)
  );

  // Sync from DB
  const syncFromDb = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch("/api/trades");
      if (!res.ok) return; // e.g. 401 if unauthenticated, fallback to localStorage

      const dbTrades = await res.json();
      if (!Array.isArray(dbTrades)) return;

      // Convert DB fields (timestamp as string -> number)
      const formattedTrades: TradeEntry[] = dbTrades.map((t: any) => ({
        id: t.id,
        timestamp: new Date(t.timestamp).getTime(),
        direction: t.direction as "buy" | "sell",
        amount: t.amount,
        output: t.output,
        symbol: t.symbol,
        signature: t.signature || undefined,
        status: t.status as "success" | "failed",
        priceUsd: t.priceUsd !== null ? t.priceUsd : undefined,
        outAmountUsd: t.outAmountUsd !== null ? t.outAmountUsd : undefined,
        feesSOL: t.feesSOL !== null ? t.feesSOL : undefined,
        feesBps: t.feesBps !== null ? t.feesBps : undefined,
        tokenMint: t.tokenMint,
      }));

      // Overwrite local state & localStorage with canonical DB state
      setAllTrades(formattedTrades);
      writeTradeHistory(walletAddress, formattedTrades);
    } catch (e) {
      console.warn("[useTradeHistory] DB sync failed", e);
    }
  }, [walletAddress]);

  // Initial load + poll
  useEffect(() => {
    // Fast initial load from localStorage
    setAllTrades(readTradeHistory(walletAddress));
    
    // Background sync from DB
    syncFromDb();
    
    // Poll DB less frequently, mostly to catch cross-device updates
    const iv = setInterval(syncFromDb, pollMs);
    return () => clearInterval(iv);
  }, [walletAddress, pollMs, syncFromDb]);

  // Add trade (Write-through cache)
  const addTrade = useCallback(
    async (entry: TradeEntry) => {
      // 1. Instant local update
      setAllTrades(appendTrade(walletAddress, entry));

      // 2. Background DB persist
      if (walletAddress) {
        try {
          await fetch("/api/trades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });
        } catch (e) {
          console.warn("[useTradeHistory] Failed to persist trade to DB", e);
        }
      }
    },
    [walletAddress]
  );

  const trades = filterMint
    ? allTrades.filter((t) => !t.tokenMint || t.tokenMint === filterMint)
    : allTrades;

  // Compute stats
  const successBuys = trades.filter((t) => t.direction === "buy" && t.status === "success");
  const successSells = trades.filter((t) => t.direction === "sell" && t.status === "success");

  const totalBuyVolumeSol = successBuys.reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
  const totalSellVolumeSol = successSells.reduce((s, t) => s + parseFloat(t.output || "0"), 0);

  const buysWithPrice = successBuys.filter((t) => t.priceUsd && t.priceUsd > 0);
  const avgEntryPrice =
    buysWithPrice.length > 0
      ? buysWithPrice.reduce((s, t) => s + t.priceUsd!, 0) / buysWithPrice.length
      : null;

  // Win = a sell whose price was higher than avg entry
  let wins = 0;
  let losses = 0;
  successSells.forEach((sell) => {
    if (sell.priceUsd && avgEntryPrice) {
      if (sell.priceUsd > avgEntryPrice) wins++;
      else losses++;
    }
  });
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : null;

  return {
    trades,
    allTrades,
    addTrade,
    stats: {
      wins,
      losses,
      total,
      winRate,
      totalBuys: successBuys.length,
      totalSells: successSells.length,
      totalBuyVolumeSol,
      totalSellVolumeSol,
      avgEntryPrice,
    },
  };
}
