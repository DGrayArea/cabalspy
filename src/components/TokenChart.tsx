"use client";

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
  const effectiveIframeSource: IframeSource = pairAddress ? "dexscreener" : (geckoTerminalPairAddress ? "geckoterminal" : "dexscreener");
  
  const isGecko = effectiveIframeSource === "geckoterminal";
  const embedUrl = isGecko ? geckoEmbedUrl : dexEmbedUrl;
  const publicUrl = isGecko ? geckoPublicUrl : dexPublicUrl;
  const sourceLabel = isGecko ? "GeckoTerminal" : "DexScreener";

  return (
    <div className="absolute inset-0 w-full h-full">
      <iframe
        key={embedUrl}
        src={embedUrl}
        className="w-full h-full border-none"
        title={`${tokenSymbol} Chart — ${sourceLabel}`}
        allow="clipboard-write"
        loading="eager"
      />
      {/* Source badge */}
      <div className="absolute top-3 right-3 z-10">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-black italic text-muted hover:text-primary transition-all flex items-center gap-1.5"
        >
          VIEW ON {sourceLabel.toUpperCase()} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
