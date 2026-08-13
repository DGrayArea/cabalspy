"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

interface TokenChartProps {
  mintAddress: string;
  tokenSymbol: string;
  isPumpFun?: boolean;
  createdTimestamp?: number;
  chainId?: string;
  isMigrated?: boolean;
  /** Best pair address from DexScreener (preferred for iframe embed accuracy) */
  pairAddress?: string;
  /** GeckoTerminal pair address (fallback if DexScreener chart fails) */
  geckoTerminalPairAddress?: string;
}

type IframeSource = "dexscreener" | "geckoterminal";

export function TokenChart({
  mintAddress,
  tokenSymbol,
  isPumpFun = false,
  createdTimestamp,
  chainId = "solana",
  isMigrated = false,
  pairAddress,
  geckoTerminalPairAddress,
}: TokenChartProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const dexChain = chainId === "sol" || chainId === "solana" ? "solana" : chainId;
  const geckoNetwork = chainId === "sol" || chainId === "solana" ? "solana" : chainId === "bsc" ? "bsc" : "solana";

  // Build ordered list of available chart providers
  const chartSources = [
    {
      name: "DexScreener",
      embedUrl: `https://dexscreener.com/${dexChain}/${pairAddress || mintAddress}?embed=1&theme=dark&trades=0&info=0`,
      publicUrl: `https://dexscreener.com/${dexChain}/${pairAddress || mintAddress}`,
    },
    {
      name: "GeckoTerminal",
      embedUrl: `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoTerminalPairAddress || pairAddress || mintAddress}?embed=1&footer=0&info=0&swaps=0&grayscale=0&light_chart=0`,
      publicUrl: `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoTerminalPairAddress || pairAddress || mintAddress}`,
    },
  ];

  const currentSource = chartSources[sourceIndex] || chartSources[0];

  const handleSourceError = () => {
    if (sourceIndex < chartSources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setShowFallback(true);
    }
  };

  useEffect(() => {
    setIframeLoaded(false);
    setShowFallback(false);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // DexScreener/GeckoTerminal embeds are heavy third-party pages. 3.5s was
    // routinely exceeded on mobile, so the chart would abandon a source that
    // was still loading, fall through to the next, exceed it again, and land
    // on the error state — the chart "failing" on phones was usually just an
    // impatient timeout. handleIframeLoaded clears this as soon as a source
    // responds, so a longer budget costs nothing when things are healthy.
    const loadBudgetMs = typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 15000 : 10000;

    timeoutRef.current = window.setTimeout(() => {
      handleSourceError();
    }, loadBudgetMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [sourceIndex, mintAddress, pairAddress]);

  const handleIframeLoaded = () => {
    setIframeLoaded(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowFallback(false);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-panel">
      {/* Loading Spinner */}
      {!iframeLoaded && !showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted z-0">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Loading {currentSource.name} Chart...
          </span>
        </div>
      )}

      <iframe
        key={currentSource.embedUrl}
        src={currentSource.embedUrl}
        className={`w-full h-full border-none transition-opacity duration-300 ${iframeLoaded ? "opacity-100 relative z-10" : "opacity-0 relative z-0"}`}
        title={`${tokenSymbol} Chart — ${currentSource.name}`}
        allow="clipboard-write"
        loading="eager"
        onLoad={handleIframeLoaded}
        onError={handleSourceError}
      />

      {showFallback && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-panel-elev/95 backdrop-blur-md text-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
            <ExternalLink className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-white">
            Chart View Options
          </div>
          <p className="max-w-xs text-xs text-gray-400 leading-relaxed mb-2">
            Embedded chart iframe restricted. Open direct chart stream:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={`https://dexscreener.com/${dexChain}/${pairAddress || mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              Open DexScreener
            </a>
            <a
              href={`https://www.geckoterminal.com/${geckoNetwork}/pools/${pairAddress || mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-gray-700 bg-panel hover:bg-panel-elev text-xs text-white font-bold transition-all cursor-pointer"
            >
              Open GeckoTerminal
            </a>
            {mintAddress.endsWith("pump") && (
              <a
                href={`https://pump.fun/coin/${mintAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-xs text-primary font-bold transition-all cursor-pointer"
              >
                Open Pump.fun
              </a>
            )}
          </div>
        </div>
      )}

      {/* Source badge */}
      <div className="absolute top-3 right-3 z-30">
        <a
          href={currentSource.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold text-muted hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
        >
          VIEW ON {currentSource.name.toUpperCase()}{" "}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
