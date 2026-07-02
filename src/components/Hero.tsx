"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Zap, TrendingUp, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="relative w-full py-8 sm:py-20 px-4 mb-4 sm:mb-8 overflow-hidden rounded-3xl sm:rounded-2xl glass border border-white/10 shadow-2xl">
      {/* Decorative Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-secondary/20 blur-[100px] rounded-full animate-pulse transition-delay-1000" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12 max-w-6xl mx-auto">
        <div className="flex-1 text-center md:text-left animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6 group hover:border-primary/40 transition-all cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-muted group-hover:text-primary transition-colors">
              Market Intelligence Active
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-4 sm:mb-6 leading-[0.9]">
            HUNT THE <br />
            <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              NEXT CABAL.
            </span>
          </h1>
          
          <p className="text-muted text-base sm:text-lg font-medium max-w-md mb-8 sm:mb-10 leading-relaxed md:mx-0 mx-auto">
            Real-time pulse of every token on Solana & BSC. 
            Advanced analytics for the next generation of degens.
          </p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
            <Link href="/auth#login-section">
              <Button size="lg" variant="neon" className="rounded-xl sm:rounded-2xl px-6 sm:px-8 h-12 sm:h-14 shadow-neon font-bold text-xs sm:text-base">
                GET STARTED <ArrowUpRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="glass" className="rounded-xl sm:rounded-2xl px-6 sm:px-8 h-12 sm:h-14 border-white/10 hover:border-white/20 font-bold text-xs sm:text-base">
                VIEW TERMINAL
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 sm:mt-12 flex items-center justify-center md:justify-start gap-4 sm:gap-8 opacity-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Verified Sources</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Instant Feeds</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Cross-Chain</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative animate-float w-full max-w-md md:max-w-none">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative glass border border-white/20 rounded-3xl sm:rounded-[2.5rem] p-3 sm:p-4 shadow-2xl rotate-2 md:rotate-3 hover:rotate-0 transition-transform duration-500 mx-auto md:mx-0">
            <div className="bg-black/40 rounded-2xl overflow-hidden border border-white/5">
              <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <div className="text-[9px] sm:text-[10px] font-mono text-muted uppercase tracking-widest">Terminal Output</div>
              </div>
              <div className="p-4 sm:p-6 font-mono text-[10px] sm:text-[11px] leading-relaxed text-primary/80">
                <div className="flex gap-2 mb-1">
                  <span className="text-secondary opacity-50">$</span>
                  <span>scan --source solana --filter trending</span>
                </div>
                <div className="text-white mb-4">Found 4,291 new pairs in last 24h</div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-muted border-b border-white/5 pb-2 mb-2">
                  <span>TOKEN</span>
                  <span>PRICE</span>
                  <span>CHG</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-white mb-2">
                  <span className="text-primary font-bold truncate">CABAL</span>
                  <span>$0.0241</span>
                  <span className="text-primary">+12.4%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-white mb-2 opacity-60">
                  <span className="text-secondary font-bold truncate">SPY</span>
                  <span>$0.0052</span>
                  <span className="text-secondary">-2.1%</span>
                </div>
                <div className="flex gap-2 mt-4 animate-pulse">
                  <span className="text-primary">_</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
