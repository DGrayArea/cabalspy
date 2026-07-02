"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";

interface DayPnL {
  date: string;            // "YYYY-MM-DD"
  pnl: number;             // USD change for that day
  startBalance?: number;   // portfolio value at day open
  endBalance?: number;     // portfolio value at day close
}

interface PnLCalendarProps {
  /** Override data — if omitted the component self-fetches from Mobula */
  data?: DayPnL[];
  title?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PnLCalendar({ data: propData, title = "PERFORMANCE CALENDAR" }: PnLCalendarProps) {
  const { address: walletAddress } = useTurnkeySolana();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const [fetchedData, setFetchedData] = useState<DayPnL[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // ── Fetch from Mobula (only if no override data and wallet available) ──────
  const fetchHistory = useCallback(async (force = false) => {
    if (propData) return; // caller provided data — skip
    if (!walletAddress) return;
    // Avoid hammering: re-use cached result within 5 min unless forced
    if (!force && lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/mobula/history?wallet=${walletAddress}&days=90`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFetchedData(json.data ?? []);
      setLastFetched(Date.now());
    } catch (err: any) {
      console.error("[PnLCalendar] fetch error", err);
      setError(err?.message ?? "Failed to load performance data");
    } finally {
      setIsLoading(false);
    }
  }, [propData, walletAddress, lastFetched]);

  useEffect(() => {
    fetchHistory();
  }, [walletAddress]); // re-fetch when wallet changes

  // ── Active dataset ────────────────────────────────────────────────────────
  const allData: DayPnL[] = propData ?? fetchedData;

  // Index by date string for O(1) lookups
  const dataByDate = useMemo(() => {
    const map: Record<string, DayPnL> = {};
    for (const d of allData) map[d.date] = d;
    return map;
  }, [allData]);

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return; // don't go into future
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // ── Calendar grid cells ───────────────────────────────────────────────────
  const days = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfWeek(viewYear, viewMonth); // blank cells before day 1
  const monthPrefix = isoMonth(viewYear, viewMonth);

  const cells = useMemo(() => {
    const result: Array<{ dateKey: string; dayNum: number; data: DayPnL | null }> = [];
    for (let d = 1; d <= days; d++) {
      const dateKey = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      result.push({ dateKey, dayNum: d, data: dataByDate[dateKey] ?? null });
    }
    return result;
  }, [days, monthPrefix, dataByDate]);

  // ── Monthly summary stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthData = cells.map(c => c.data).filter(Boolean) as DayPnL[];
    const wins = monthData.filter(d => d.pnl > 0).length;
    const losses = monthData.filter(d => d.pnl < 0).length;
    const totalPnl = monthData.reduce((s, d) => s + d.pnl, 0);
    return { wins, losses, totalPnl, days: monthData.length };
  }, [cells]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="glass rounded-3xl p-5 sm:p-6 border border-white/10 w-full overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tighter uppercase">{title}</h3>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
              {!propData && !walletAddress && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  Connect wallet
                </span>
              )}
              {error && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-accent/10 border border-accent/20 text-accent">
                  Error
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-xs font-bold ${stats.totalPnl >= 0 ? "text-primary" : "text-accent"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}{formatCurrency(stats.totalPnl)}
              </span>
              {stats.days > 0 && (
                <span className="text-[10px] text-muted font-bold uppercase tracking-widest">
                  {stats.wins}W / {stats.losses}L
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Refresh */}
          {!propData && walletAddress && (
            <button
              onClick={() => fetchHistory(true)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
          {/* Month nav */}
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
            <ChevronLeft className="w-4 h-4 text-muted" />
          </button>
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest px-1 hidden sm:block whitespace-nowrap">{monthLabel}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Month label on mobile */}
      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4 sm:hidden">{monthLabel}</p>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <div className="text-center py-4 mb-4 text-[10px] font-bold text-accent/80 uppercase tracking-widest">
          {error} — <button onClick={() => fetchHistory(true)} className="underline text-primary">retry</button>
        </div>
      )}

      {/* ── Weekday headers ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted py-1">{d}</div>
        ))}
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Blank leading cells */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}

        {cells.map(({ dateKey, dayNum, data }) => {
          const isToday = dateKey === today.toISOString().split("T")[0];
          const isPositive = data && data.pnl > 0;
          const isNegative = data && data.pnl < 0;
          const hasData = !!data;

          return (
            <div
              key={dateKey}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center p-1 relative cursor-crosshair group transition-all
                ${!hasData ? "bg-panel-elev/30 border border-white/5" : ""}
                ${isPositive ? "bg-primary/20 border border-primary/30 hover:bg-primary/30" : ""}
                ${isNegative ? "bg-accent/20 border border-accent/30 hover:bg-accent/30" : ""}
                ${hasData && !isPositive && !isNegative ? "bg-white/5 border border-white/10" : ""}
                ${isToday ? "ring-1 ring-primary ring-offset-0" : ""}
              `}
            >
              <span className="text-[8px] font-bold text-muted/60 leading-none absolute top-1 left-1.5">
                {dayNum}
              </span>

              {hasData ? (
                <div className={`text-[8px] sm:text-[9px] font-bold text-center leading-tight mt-2 ${isPositive ? "text-primary" : isNegative ? "text-accent" : "text-muted"}`}>
                  {isPositive ? "+" : ""}
                  {Math.abs(data.pnl) >= 1000
                    ? `${(data.pnl / 1000).toFixed(1)}K`
                    : data.pnl.toFixed(0)}
                </div>
              ) : (
                <div className="text-[8px] font-bold text-muted/20 mt-2">—</div>
              )}

              {/* Tooltip */}
              {hasData && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none whitespace-nowrap shadow-xl">
                  <div className="text-muted mb-1">
                    {new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className={isPositive ? "text-primary" : isNegative ? "text-accent" : "text-muted"}>
                    {isPositive ? "+" : ""}{formatCurrency(data.pnl)}
                  </div>
                  {data.startBalance !== undefined && (
                    <div className="text-muted/60 text-[8px] mt-0.5">
                      {formatCurrency(data.startBalance)} → {formatCurrency(data.endBalance!)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer legend ───────────────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary shadow-neon" />
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent shadow-accent-neon" />
            <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Loss</span>
          </div>
        </div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest">
          {propData ? "30 DAY SUMMARY" : walletAddress ? "LIVE · MOBULA" : "NO WALLET"}
        </div>
      </div>
    </div>
  );
}
