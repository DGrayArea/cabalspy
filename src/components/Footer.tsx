"use client";

import Link from "next/link";
import {
  Settings,
  FileText,
  List,
  Wallet,
  Twitter,
  Search,
  BarChart3,
  Bell,
  Palette,
  MessageCircle,
  X,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-3xl border-t border-white/5 px-4 h-12 z-40 w-full flex items-center shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Left Section - Always Visible */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 group cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-neon" />
            <span className="text-[10px] font-black tracking-tighter text-muted group-hover:text-white transition-colors uppercase">Network: Mainnet</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] font-black text-primary italic">SOL</span>
            <span className="text-[10px] font-black text-white">$132.01</span>
          </div>
        </div>

        {/* Center Navigation - Simplified on Mobile */}
        <div className="flex items-center gap-4 sm:gap-8">
          <Link
            href="/portfolio"
            className="text-muted hover:text-primary transition-all cursor-pointer flex items-center gap-2 group"
          >
            <Wallet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black tracking-widest hidden sm:inline">WALLET</span>
          </Link>
          <a
            href="https://x.com"
            target="_blank"
            className="text-muted hover:text-primary transition-all cursor-pointer flex items-center gap-2 group"
          >
            <Twitter className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black tracking-widest hidden sm:inline">TWITTER</span>
          </a>
          <Link
            href="/"
            className="text-muted hover:text-primary transition-all cursor-pointer flex items-center gap-2 group"
          >
            <Search className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black tracking-widest hidden sm:inline">DISCOVER</span>
          </Link>
        </div>

        {/* Right Section - Essential Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 px-4 border-l border-white/5">
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help">
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black italic">v1.0.4</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-muted hover:text-white transition-colors relative group">
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent shadow-accent-neon animate-pulse" />
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-white/5 mx-1 hidden sm:block" />
            <button className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black transition-all group scale-90 sm:scale-100">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[9px] font-black">STABLE</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

