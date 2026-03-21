"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface DayPnL {
  date: string;
  pnl: number;
}

interface PnLCalendarProps {
  data?: DayPnL[];
  title?: string;
}

export function PnLCalendar({ data = [], title = "PERFORMANCE CALENDAR" }: PnLCalendarProps) {
  // Generate dummy data if none provided for demonstration
  const calendarData = useMemo(() => {
    if (data.length > 0) return data;
    
    const days = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay();
      
      // Random-ish but somewhat realistic PnL
      let pnl = 0;
      if (Math.random() > 0.3) {
        pnl = (Math.random() - 0.3) * 5000;
      }
      
      days.push({
        date: date.toISOString().split('T')[0],
        pnl: pnl,
      });
    }
    return days;
  }, [data]);

  const stats = useMemo(() => {
    const wins = calendarData.filter(d => d.pnl > 0).length;
    const totalPnl = calendarData.reduce((sum, d) => sum + d.pnl, 0);
    return { wins, totalPnl };
  }, [calendarData]);

  // Weekdays header
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black italic tracking-tighter uppercase">{title}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${stats.totalPnl >= 0 ? "text-primary" : "text-accent"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}{formatCurrency(stats.totalPnl)}
              </span>
              <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{stats.wins} WINS / {calendarData.length - stats.wins} LOSSES</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
            <ChevronLeft className="w-4 h-4 text-muted" />
          </button>
          <button className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all">
            <ChevronRight className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-[10px] font-black text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarData.map((day, idx) => {
          const isPositive = day.pnl > 0;
          const isZero = day.pnl === 0;
          
          return (
            <div 
              key={day.date}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 transition-all cursor-crosshair group relative
                ${isZero ? "bg-panel-elev/40 border border-white/5" : ""}
                ${isPositive ? "bg-primary/20 border border-primary/30 hover:bg-primary/30" : ""}
                ${!isPositive && !isZero ? "bg-accent/20 border border-accent/30 hover:bg-accent/30" : ""}
              `}
            >
              <span className="text-[8px] font-black text-muted/50 mb-1 leading-none absolute top-1 left-1">
                {new Date(day.date).getDate()}
              </span>
              
              {!isZero ? (
                <div className={`text-[10px] font-black italic text-center leading-tight ${isPositive ? "text-primary" : "text-accent"}`}>
                  {isPositive ? "+" : ""}{day.pnl >= 1000 ? `${(day.pnl / 1000).toFixed(1)}K` : Math.abs(day.pnl).toFixed(0)}
                </div>
              ) : (
                <div className="text-[10px] font-black italic text-muted/30">
                  $0
                </div>
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                <div className={isPositive ? "text-primary" : isZero ? "text-muted" : "text-accent"}>
                  {formatCurrency(day.pnl)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary shadow-neon"></div>
            <span className="text-[9px] font-black text-muted uppercase tracking-widest">PROFIT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent shadow-accent-neon"></div>
            <span className="text-[9px] font-black text-muted uppercase tracking-widest">LOSS</span>
          </div>
        </div>
        <div className="text-[9px] font-black text-muted uppercase tracking-widest">
          30 DAY SUMMARY
        </div>
      </div>
    </div>
  );
}
