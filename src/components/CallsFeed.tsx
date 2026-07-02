"use client";

import { useEffect, useState, useRef } from "react";
import { socketCalls, CabalSpySignal } from "@/services/socket-calls";
import { 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink,
  Clock,
  ArrowUpRight,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/utils/format";
import { motion, AnimatePresence } from "framer-motion";

export default function CallsFeed() {
  const [signals, setSignals] = useState<CabalSpySignal[]>([]);
  const [status, setStatus] = useState<string>("disconnected");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketCalls.connect();

    const handleSignal = (signal: CabalSpySignal) => {
      setSignals((prev) => [signal, ...prev].slice(0, 50));
    };

    const handleStatus = (newStatus: string) => {
      setStatus(newStatus);
    };

    socketCalls.on("signal", handleSignal);
    socketCalls.on("status", handleStatus);
    setStatus(socketCalls.status);

    return () => {
      socketCalls.off("signal", handleSignal);
      socketCalls.off("status", handleStatus);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-panel/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              status === "connected" ? "bg-primary" : "bg-red-500"
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              status === "connected" ? "bg-primary" : "bg-red-500"
            }`}></span>
          </div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white">
            LIVE CALLS FEED
          </h3>
        </div>
        <div className="text-[8px] font-bold text-muted uppercase tracking-widest">
          {status}
        </div>
      </div>

      {/* Feed Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
              <Zap className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting alpha signals...</p>
            </div>
          ) : (
            signals.map((signal, idx) => (
              <motion.div
                key={signal.mint || idx}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                className="relative group bg-white/3 border border-white/5 rounded-2xl p-3 hover:bg-white/6 hover:border-primary/20 transition-all cursor-pointer overflow-hidden"
              >
                {/* Glow Background */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/2 transition-colors" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-[10px] font-bold border border-white/10 shrink-0">
                      {signal.symbol?.slice(0, 3) || "???"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                          {signal.name || "Unknown Token"}
                        </span>
                        <span className="text-[8px] font-bold text-muted bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          {signal.symbol || "TKN"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-primary">
                          {formatCurrency(signal.price || 0)}
                        </span>
                        <span className="text-[8px] font-medium text-muted">
                          MC: {formatNumber(signal.marketCap || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-bold text-primary uppercase flex items-center gap-1 justify-end">
                      <TrendingUp className="w-2.5 h-2.5" />
                      ALPHA
                    </div>
                    <div className="text-[8px] text-muted font-bold mt-1">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-2 h-2" />
                      SAFE
                    </div>
                    <div className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary uppercase">
                      PUMP.FUN
                    </div>
                  </div>
                  <Link 
                    href={`/sol/${signal.mint}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group/link"
                  >
                    <ChevronRight className="w-3 h-3 text-muted group-hover/link:text-white" />
                  </Link>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
