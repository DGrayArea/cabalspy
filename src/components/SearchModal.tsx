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
        // Use searchTokens first to get better results with name/symbol
        const searchResults = await dexscreenerService.searchTokens(debouncedSearch);
        
        // Find the matching pair where the address matches exactly
        const matchingPair = searchResults.find(
          (pair) =>
            pair.baseToken.address.toLowerCase() === debouncedSearch.toLowerCase() ||
            pair.quoteToken.address.toLowerCase() === debouncedSearch.toLowerCase()
        );

        if (!matchingPair) {
          // If search didn't find it, try fetchTokenInfo as fallback
          const chain = detectChain(debouncedSearch);
          const tokenInfo = await dexscreenerService.fetchTokenInfo(chain, debouncedSearch);
          
          if (!tokenInfo) {
            setError("Token not found on DexScreener");
            setIsLoading(false);
            return;
          }

          setTokenResult({
            address: debouncedSearch,
            chain,
            name: "Unknown Token",
            symbol: "UNKNOWN",
            logo: tokenInfo.logo,
            priceUsd: tokenInfo.priceUsd,
            priceChange24h: tokenInfo.priceChange24h,
            dexUrl: tokenInfo.dexUrl,
          });
          setIsLoading(false);
          return;
        }

        // Extract token info from matching pair
        const isBaseToken = matchingPair.baseToken.address.toLowerCase() === debouncedSearch.toLowerCase();
        const token = isBaseToken ? matchingPair.baseToken : matchingPair.quoteToken;
        // Map chainId to our chain format
        // DexScreener uses: "solana", "bsc" (or "56"), "ethereum" (or "1"), "base" (or "8453")
        const chainId = matchingPair.chainId.toLowerCase();
        const chain = chainId === "solana" || chainId === "sol" 
          ? "solana" 
          : (chainId === "bsc" || chainId === "56" || chainId === "binance-smart-chain")
          ? "bsc"
          : "solana"; // Default to solana for unknown chains

        setTokenResult({
          address: debouncedSearch,
          chain: chain as "solana" | "bsc",
          name: token.name || "Unknown Token",
          symbol: token.symbol || "UNKNOWN",
          logo: matchingPair.info?.imageUrl,
          priceUsd: matchingPair.priceUsd ? parseFloat(matchingPair.priceUsd) : undefined,
          priceChange24h: matchingPair.priceChange?.h24,
          dexUrl: matchingPair.url,
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
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div
          className="bg-panel border border-gray-800/50 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
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
                className="bg-panel-elev border border-gray-800/50 rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Token Logo */}
                  {tokenResult.logo ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-800/50">
                      <Image
                        src={tokenResult.logo}
                        alt={tokenResult.symbol}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/20 flex items-center justify-center flex-shrink-0 text-xl">
                      {tokenResult.symbol[0] || "?"}
                    </div>
                  )}

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate">
                        {tokenResult.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-800/50 rounded text-xs font-medium uppercase">
                        {tokenResult.chain === "solana" ? "SOL" : "BSC"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2 truncate">
                      {tokenResult.symbol}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      {tokenResult.priceUsd !== undefined && (
                        <div>
                          <span className="text-xs text-gray-500">Price:</span>
                          <span className="ml-1 text-sm font-semibold text-white">
                            {formatCurrency(tokenResult.priceUsd)}
                          </span>
                        </div>
                      )}
                      {tokenResult.priceChange24h !== undefined && (
                        <div className="flex items-center gap-1">
                          {tokenResult.priceChange24h >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              tokenResult.priceChange24h >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {tokenResult.priceChange24h >= 0 ? "+" : ""}
                            {tokenResult.priceChange24h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <code className="text-xs bg-panel px-2 py-1 rounded font-mono text-gray-400">
                        {tokenResult.address.slice(0, 8)}...
                        {tokenResult.address.slice(-8)}
                      </code>
                    </div>
                  </div>

                  {/* External Link Icon */}
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" />
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

