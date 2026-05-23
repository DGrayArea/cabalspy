"use client";

import { useEffect, useState } from "react";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { ArrowUpRight, CheckCircle2, XCircle, ArrowRightLeft, Clock } from "lucide-react";
import { formatNumber } from "@/utils/format";

type LocalTradeHistoryEntry = {
  id: string;
  timestamp: number;
  direction: "buy" | "sell";
  amount: string;
  output: string;
  symbol: string;
  signature?: string;
  status: "success" | "failed";
};

export function TradeHistoryList() {
  const { address } = useTurnkeySolana();
  const [history, setHistory] = useState<LocalTradeHistoryEntry[]>([]);

  useEffect(() => {
    const tradeHistoryKey = `cabalspy-trade-history-${address || "guest"}`;
    const data = window.localStorage.getItem(tradeHistoryKey);
    if (data) {
      try {
        setHistory(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse trade history", e);
      }
    }

    // Optional: listen to custom event if we want cross-tab sync, 
    // but a simple interval or rely on component mount is enough for MVP.
    const interval = setInterval(() => {
      const newData = window.localStorage.getItem(tradeHistoryKey);
      if (newData && newData !== data) {
        try {
          setHistory(JSON.parse(newData));
        } catch (e) {}
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [address]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <ArrowRightLeft className="w-8 h-8 mb-3 opacity-20" />
        <p className="text-xs uppercase tracking-widest font-bold">No Trade History</p>
        <p className="text-[10px] mt-1 text-gray-600">Your recent swaps will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((trade) => {
        const isSuccess = trade.status === "success";
        const date = new Date(trade.timestamp);
        
        return (
          <div key={trade.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSuccess ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black uppercase ${trade.direction === "buy" ? "text-green-400" : "text-red-400"}`}>
                    {trade.direction === "buy" ? "Buy" : "Sell"}
                  </span>
                  <span className="text-white font-bold text-sm">
                    {trade.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 font-medium">
                  <Clock className="w-3 h-3" />
                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {trade.amount} {trade.direction === "buy" ? "SOL" : trade.symbol}
              </div>
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
                  <span className="text-[10px] text-red-400/80 uppercase tracking-wider font-bold">Failed</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
