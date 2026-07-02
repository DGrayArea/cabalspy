"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, ArrowLeftRight, BarChart3, Activity, Droplets } from "lucide-react";
import { TokenData } from "@/types/token";
import { formatCurrency, formatNumber, formatPercentCompact } from "@/utils/format";

interface ComparisonModalProps {
  tokenA: TokenData | null;
  onClose: () => void;
  availableTokens: TokenData[];
}

export default function TokenComparison({ tokenA, onClose, availableTokens }: ComparisonModalProps) {
  const [tokenB, setTokenB] = useState<TokenData | null>(null);

  const renderTokenStats = (token: TokenData | null) => {
    if (!token) return (
      <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-3xl bg-white/2">
        <BarChart3 className="w-12 h-12 text-gray-700 mb-4" />
        <p className="text-gray-500 text-sm font-bold uppercase">Select a token to compare</p>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden relative border border-white/10">
            {token.image ? (
              <Image src={token.image} alt={token.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-panel flex items-center justify-center text-xl font-bold">{token.symbol?.[0]}</div>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold uppercase tracking-tighter">{token.symbol}</h3>
            <p className="text-gray-500 text-xs font-bold uppercase">{token.name}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <Stat name="Market Cap" value={formatCurrency(token.marketCap || 0)} icon={BarChart3} />
          <Stat name="24h Volume" value={formatCurrency(token.volume || 0)} icon={Activity} />
          <Stat name="Price Change" value={`${formatPercentCompact(token.priceChange24h || 0)}`} icon={ArrowLeftRight} color={token.priceChange24h && token.priceChange24h >= 0 ? "text-primary" : "text-red-500"} />
          <Stat name="Liquidity" value={token.liquidity ? formatCurrency(token.liquidity) : "N/A"} icon={Droplets} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-neon bg-app/90">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-gradient">Token Comparison</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center shadow-neon-sm bg-app">
              <span className="text-primary font-bold uppercase text-xs">VS</span>
            </div>
          </div>

          <div className="relative">
            {renderTokenStats(tokenA)}
          </div>

          <div className="relative">
            {tokenB ? (
              <div className="relative h-full">
                <button 
                  onClick={() => setTokenB(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors z-20"
                >
                  <X className="w-4 h-4" />
                </button>
                {renderTokenStats(tokenB)}
              </div>
            ) : (
              <div className="h-full flex flex-col gap-4">
                <div className="relative">
                  <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select 
                    onChange={(e) => {
                      const selected = availableTokens.find(t => t.id === e.target.value);
                      if (selected) setTokenB(selected);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold uppercase focus:outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Choose token to compare...</option>
                    {availableTokens.filter(t => t.id !== tokenA?.id).map(token => (
                      <option key={token.id} value={token.id}>{token.symbol} - {token.name}</option>
                    ))}
                  </select>
                </div>
                {renderTokenStats(null)}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/2 border-t border-white/5 flex justify-center">
           <button 
             onClick={onClose}
             className="px-12 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all font-bold uppercase text-sm tracking-widest border border-white/5"
           >
             Close Comparison
           </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ name, value, icon: Icon, color = "text-white" }: { name: string; value: string; icon: any; color?: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 group hover:border-primary/20 transition-all">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
        <span className="text-xs font-bold uppercase text-gray-500">{name}</span>
      </div>
      <span className={`text-sm font-bold tracking-tight ${color}`}>{value}</span>
    </div>
  );
}
