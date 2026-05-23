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
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Normalised chain string for DexScreener
  const dexChain =
    chainId === "sol" || chainId === "solana" ? "solana" : chainId;

  // Prefer pairAddress for embed accuracy; fall back to mintAddress
  const dexEmbedId = pairAddress || mintAddress;
  const dexEmbedUrl = `https://dexscreener.com/${dexChain}/${dexEmbedId}?embed=1&theme=dark&trades=0&info=0`;
  const dexPublicUrl = `https://dexscreener.com/${dexChain}/${dexEmbedId}`;

  // GeckoTerminal embed — map chain
  const geckoNetwork =
    chainId === "sol" || chainId === "solana"
      ? "solana"
      : chainId === "bsc"
        ? "bsc"
        : "solana";
  const geckoEmbedId = geckoTerminalPairAddress || mintAddress;
  const geckoEmbedUrl = `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoEmbedId}?embed=1&footer=0&info=0&swaps=0&grayscale=0&light_chart=0`;
  const geckoPublicUrl = `https://www.geckoterminal.com/${geckoNetwork}/pools/${geckoEmbedId}`;

  // Automate source selection: Prefer DexScreener if pairAddress exists
  const effectiveIframeSource: IframeSource = pairAddress
    ? "dexscreener"
    : geckoTerminalPairAddress
      ? "geckoterminal"
      : "dexscreener";

  const isGecko = effectiveIframeSource === "geckoterminal";
  const embedUrl = isGecko ? geckoEmbedUrl : dexEmbedUrl;
  const publicUrl = isGecko ? geckoPublicUrl : dexPublicUrl;
  const sourceLabel = isGecko ? "GeckoTerminal" : "DexScreener";

  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
    setShowFallback(false);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setShowFallback(true);
    }, 7000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [embedUrl]);

  const handleIframeLoaded = () => {
    setIframeLoaded(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowFallback(false);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <iframe
        key={embedUrl}
        src={embedUrl}
        className="w-full h-full border-none"
        title={`${tokenSymbol} Chart — ${sourceLabel}`}
        allow="clipboard-write"
        loading="eager"
        onLoad={handleIframeLoaded}
        onError={() => {
          setIframeError(true);
          setShowFallback(true);
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }}
      />

      {showFallback && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 text-center p-6">
          <div className="text-sm font-black uppercase tracking-[0.3em] text-primary">
            Chart unavailable
          </div>
          <p className="max-w-xs text-[11px] text-white/75 leading-relaxed">
            The embedded chart did not load reliably. You can still open the
            token chart in a native explorer.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-primary text-black font-semibold text-[11px]"
            >
              Open {sourceLabel}
            </a>
            <a
              href={isGecko ? dexPublicUrl : geckoPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[11px] text-white"
            >
              Open alternate chart
            </a>
          </div>
        </div>
      )}

      {/* Source badge */}
      <div className="absolute top-3 right-3 z-10">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-black italic text-muted hover:text-primary transition-all flex items-center gap-1.5"
        >
          VIEW ON {sourceLabel.toUpperCase()}{" "}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
