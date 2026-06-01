"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Loader2 } from "lucide-react";
import Image from "next/image";

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
}

const SOL_TOKEN: TokenInfo = {
  address: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Wrapped SOL",
  decimals: 9,
  logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
};

const USDC_TOKEN: TokenInfo = {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
};

export function TokenSelectorModal({ isOpen, onClose, onSelect }: TokenSelectorModalProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([SOL_TOKEN, USDC_TOKEN]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    
    const fetchTokens = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("https://token.jup.ag/strict");
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          // Prepend SOL and USDC to ensure they're at the top, filter out duplicates
          const filteredData = data.filter((t: any) => t.address !== SOL_TOKEN.address && t.address !== USDC_TOKEN.address);
          setTokens([SOL_TOKEN, USDC_TOKEN, ...filteredData]);
        }
      } catch (err) {
        console.error("Failed to fetch Jupiter strict tokens", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    
    // Only fetch if we haven't already fetched a large list
    if (tokens.length <= 2) {
      fetchTokens();
    }
    
    return () => {
      mounted = false;
    };
  }, [isOpen, tokens.length]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens.slice(0, 50); // Show top 50 default
    
    const query = searchQuery.toLowerCase();
    
    // If it looks like an address, just return a custom token constructed from it
    if (query.length >= 32 && !query.includes(" ")) {
      // Find in list first
      const found = tokens.find(t => t.address.toLowerCase() === query);
      if (found) return [found];
      
      // Allow raw address (we assume 6 decimals, it will be handled by jupiter)
      return [{
        address: searchQuery.trim(),
        symbol: "Custom",
        name: "Custom Token",
        decimals: 6,
      }];
    }

    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(query) || 
      t.name.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [searchQuery, tokens]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-panel border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-base font-bold text-white">Select a token</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or paste address"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-panel-elev border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && tokens.length <= 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Loading tokens...</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTokens.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">No tokens found</div>
                ) : (
                  filteredTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => {
                        onSelect(token);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group text-left"
                    >
                      {token.logoURI ? (
                        <Image src={token.logoURI} alt={token.symbol} width={36} height={36} className="rounded-full bg-black" unoptimized />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                          {token.symbol[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{token.name}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
