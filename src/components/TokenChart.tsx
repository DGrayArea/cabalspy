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
    <div className="h-full w-full flex flex-col">
      {/* Embed Container - Full Width Professional View */}
      <div className="flex-1 w-full bg-panel-elev rounded-3xl overflow-hidden border border-white/10 relative h-full min-h-[400px] md:min-h-0">
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-none"
          title={`${tokenSymbol} Chart — ${sourceLabel}`}
          allow="clipboard-write"
          loading="lazy"
        />
        
        {/* Subtle source indicator */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black italic text-muted hover:text-primary transition-all flex items-center gap-1.5"
          >
            VIEW ON {sourceLabel.toUpperCase()} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
