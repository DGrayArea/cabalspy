"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { dexscreenerService } from "@/services/dexscreener";
import { X, Search, TrendingUp, TrendingDown, Loader2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import Image from "next/image";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenSearchResult {
  address: string;
  chain: "solana" | "bsc";
  name: string;
  symbol: string;
  logo?: string;
  priceUsd?: number;
  priceChange24h?: number;
  dexUrl?: string;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState<TokenSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search input (500ms delay)
  const debouncedSearch = useDebounce(searchInput.trim(), 500);

  // Detect chain from address format
  const detectChain = (address: string): "solana" | "bsc" => {
    // Solana addresses are base58 encoded, typically 32-44 characters
    // BSC addresses are hex, 42 characters starting with 0x
    if (address.startsWith("0x") && address.length === 42) {
      return "bsc";
    }
    // Default to Solana for pump.fun addresses (usually end with "pump")
    return "solana";
  };

  // Search for token when debounced value changes
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 8) {
      setTokenResult(null);
      setError(null);
      return;
    }

    const searchToken = async () => {
      setIsLoading(true);
      setError(null);
      setTokenResult(null);

      try {
        const isAddress = debouncedSearch.length >= 32 || debouncedSearch.startsWith("0x");

        if (isAddress) {
          // It's likely a contract address, use v1 tokens endpoint directly
          const chain = detectChain(debouncedSearch);
          const tokenInfo = await dexscreenerService.fetchTokenPairs(chain, debouncedSearch);

          if (tokenInfo && tokenInfo.baseToken) {
            setTokenResult({
              address: debouncedSearch,
              chain,
              name: tokenInfo.baseToken.name || "Unknown Token",
              symbol: tokenInfo.baseToken.symbol || "UNKNOWN",
              logo: tokenInfo.logo,
              priceUsd: tokenInfo.priceUsd,
              priceChange24h: tokenInfo.priceChange24h,
              dexUrl: tokenInfo.dexUrl,
            });
            setIsLoading(false);
            return;
          }
        }

        // Fallback or text query: Use searchTokens
        const searchResults = await dexscreenerService.searchTokens(debouncedSearch);
        
        // Pick the best match (first pair where the base token name/symbol matches reasonably well)
        const topPair = searchResults.find(p => 
          p.baseToken.address.toLowerCase() === debouncedSearch.toLowerCase() ||
          p.baseToken.symbol.toLowerCase() === debouncedSearch.toLowerCase() ||
          p.baseToken.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        ) || searchResults[0];

        if (!topPair) {
          setError("Token not found on DexScreener");
          setIsLoading(false);
          return;
        }

        const chainId = topPair.chainId.toLowerCase();
        const detectedChain = chainId === "solana" || chainId === "sol" 
          ? "solana" 
          : (chainId === "bsc" || chainId === "56" || chainId === "binance-smart-chain")
          ? "bsc"
          : "solana";

        setTokenResult({
          address: topPair.baseToken.address,
          chain: detectedChain as "solana" | "bsc",
          name: topPair.baseToken.name || "Unknown Token",
          symbol: topPair.baseToken.symbol || "UNKNOWN",
          logo: topPair.info?.imageUrl,
          priceUsd: topPair.priceUsd ? parseFloat(topPair.priceUsd) : undefined,
          priceChange24h: topPair.priceChange?.h24,
          dexUrl: topPair.url,
        });

      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to search for token. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    searchToken();
  }, [debouncedSearch]);

  const handleTokenClick = () => {
    if (!tokenResult) return;
    const chainRoute = tokenResult.chain === "bsc" ? "bsc" : "sol";
    router.push(`/${chainRoute}/${tokenResult.address}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm modal-overlay"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div
          className="bg-panel border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden modal-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
            <h2 className="text-lg font-bold text-white">Search Token</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-panel-elev rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter token address..."
                className="w-full pl-10 pr-4 py-2.5 bg-panel-elev border border-gray-800/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Paste a Solana or BSC token address
            </p>
          </div>

          {/* Results */}
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="ml-2 text-gray-400">Searching...</span>
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-8">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {tokenResult && !isLoading && (
              <div
                onClick={handleTokenClick}
                className="bg-panel-elev border border-white/5 rounded-2xl p-4 hover:border-primary/50 hover:bg-white/[0.02] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  {/* Token Logo */}
                  {tokenResult.logo ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white/10 group-hover:border-primary/30 transition-colors">
                      <Image
                        src={tokenResult.logo}
                        alt={tokenResult.symbol}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-panel flex items-center justify-center flex-shrink-0 text-xl font-bold text-gradient uppercase border-2 border-white/10 group-hover:border-primary/30 transition-colors">
                      {tokenResult.symbol[0] || "?"}
                    </div>
                  )}

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-lg text-white truncate tracking-tighter">
                        {tokenResult.name}
                      </h3>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold uppercase text-white/70">
                        {tokenResult.chain === "solana" ? "SOL" : "BSC"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] text-muted font-bold">{tokenResult.symbol}</span>
                       <code className="text-[9px] font-mono text-muted/70 bg-black/40 px-1.5 py-0.5 rounded">
                         {tokenResult.address.slice(0, 6)}...{tokenResult.address.slice(-6)}
                       </code>
                    </div>

                    <div className="flex items-center gap-3">
                      {tokenResult.priceUsd !== undefined && (
                        <span className="text-sm font-bold text-white">
                          {formatCurrency(tokenResult.priceUsd)}
                        </span>
                      )}
                      {tokenResult.priceChange24h !== undefined && (
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tokenResult.priceChange24h >= 0
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {tokenResult.priceChange24h >= 0 ? "+" : ""}
                          {tokenResult.priceChange24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* External Link Icon */}
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <ExternalLink className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !error && !tokenResult && debouncedSearch.length >= 8 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No results found</p>
              </div>
            )}

            {!isLoading && !error && !tokenResult && debouncedSearch.length < 8 && debouncedSearch.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Enter at least 8 characters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

