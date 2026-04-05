"use client";

import { useEffect, useState, Suspense, useMemo, useCallback } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  BarChart3,
  Copy,
  Check,
  Share2,
  Star,
  Clock,
  Zap,
  RefreshCw,
  Wallet,
  Lock,
  Target,
  Globe,
  MessageCircle,
  Loader2,
  Settings,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/utils/format";
import { TokenData } from "@/types/token";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { useViewport } from "@/context/ViewportContext";
import { usePortfolio } from "@/context/PortfolioContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { WalletSettingsModal } from "@/services/WalletSettingsModal";
import { pumpFunService } from "@/services/pumpfun";
import { dexscreenerService, DexScreenerTokenInfo } from "@/services/dexscreener";
import { geckoTerminalService } from "@/services/geckoterminal";
import { multiChainTokenService } from "@/services/multichain-tokens";
import { aiPlatformDetector } from "@/services/ai-platform-detector";
import { getPlatformLogo, getPlatformName } from "@/utils/platformLogos";
import { heliusTokenDataService, TokenHolder } from "@/services/helius-token-data";
import { TokenChart } from "@/components/TokenChart";
import { SearchModal } from "@/components/SearchModal";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/use-toast";

const SOL_MINT = "So11111111111111111111111111111111111111112";

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.01c-.12.56-.46.70-.94.43l-2.6-1.91-1.25 1.21c-.14.14-.26.26-.53.26l.19-2.67 4.84-4.37c.21-.19-.05-.29-.32-.11l-5.98 3.77-2.58-.81c-.56-.17-.57-.56.12-.83l10.08-3.88c.47-.17.88.11.67.90z"/>
  </svg>
);

export default function TokenDetailPage() {
  return (
    <Suspense fallback={<TokenDetailPageSkeleton />}>
      <TokenDetailContent />
    </Suspense>
  );
}

function TokenDetailContent() {
  const params = useParams();
  const router = useRouter();
  const chain = params.chain as string;
  const tokenAddress = params.tokenAddress as string;
  const { user, turnkeyUser, turnkeySession } = useAuth();
  const isAuthenticated = user || turnkeyUser || turnkeySession;
  const { solBalance, getTokenBalance } = usePortfolio();
  const { address: walletAddress, connection, signSolanaTransaction } = useTurnkeySolana();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const tokenNameFromParams = searchParams.get("name");
  const tokenSymbolFromParams = searchParams.get("symbol");
  const tokenLogoFromParams = searchParams.get("logo");
  const tokenDecimalsFromParams = searchParams.get("decimals");

  const tokenBalance = getTokenBalance ? getTokenBalance(tokenAddress) : null;

  // ── State ──────────────────────────────────────────────────────────
  const [dexData, setDexData] = useState<DexScreenerTokenInfo | null>(null);
  const [pumpfunData, setPumpfunData] = useState<any>(null);
  const [geckoData, setGeckoData] = useState<any>(null);
  const [baseToken, setBaseToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);

  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"trades" | "holders" | "info">("trades");
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [chartTab, setChartTab] = useState<"chart" | "cabalspy">("chart");
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [solPrice, setSolPrice] = useState<number>(0);

  // Trade state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeSlippage, setTradeSlippage] = useState("1");
  const [isTrading, setIsTrading] = useState(false);

  const isWatchlisted = watchlist.some(t => t.mint === tokenAddress);

  // ── Data Fetching ──────────────────────────────────────────────────
  useEffect(() => {
    if (!chain || !tokenAddress) return;
    const normalizedChain = chain.toLowerCase() === "sol" ? "solana" : chain.toLowerCase() as any;

    const fetchAll = async () => {
      setLoading(true);

      // Fire all fetches in parallel
      const [dexResult, geckoResult, pfResult] = await Promise.allSettled([
        dexscreenerService.fetchTokenPairs(normalizedChain, tokenAddress),
        geckoTerminalService.fetchTokenInfo(normalizedChain, tokenAddress),
        normalizedChain === "solana" ? pumpFunService.fetchTokenInfo(tokenAddress) : Promise.resolve(null),
      ]);

      if (dexResult.status === "fulfilled") setDexData(dexResult.value);
      if (geckoResult.status === "fulfilled") setGeckoData(geckoResult.value);
      if (pfResult.status === "fulfilled") setPumpfunData(pfResult.value);

      // Try to find in local cache
      const allTokens = [...multiChainTokenService.getSolanaTokens(), ...multiChainTokenService.getBSCTokens()];
      const cached = allTokens.find(t => t.id.toLowerCase() === tokenAddress.toLowerCase());
      if (cached) setBaseToken(cached);

      setLoading(false);
    };

    fetchAll();
  }, [chain, tokenAddress]);

  // Fetch SOL price
  useEffect(() => {
    fetch("https://api.jup.ag/price/v2?ids=" + SOL_MINT)
      .then(r => r.json())
      .then(d => {
        const p = d?.data?.[SOL_MINT]?.price;
        if (p) setSolPrice(parseFloat(p));
      })
      .catch(() => {});
  }, []);

  // Lazy-load holder data when holders tab is clicked
  useEffect(() => {
    if (activeTab === "holders" && holders.length === 0 && !holdersLoading) {
      setHoldersLoading(true);
      heliusTokenDataService.getTopHolders(tokenAddress)
        .then(setHolders)
        .finally(() => setHoldersLoading(false));

      heliusTokenDataService.getTokenSupply(tokenAddress)
        .then(s => { if (s) setTotalSupply(s.uiAmount); })
        .catch(() => {});
    }
  }, [activeTab, tokenAddress]);

  // Live age timer
  useEffect(() => {
    const createdAt = pumpfunData?.createdTimestamp || dexData?.pairCreatedAt;
    if (!createdAt) { setTimeDisplay(baseToken?.time || ""); return; }
    const update = () => {
      const diff = Date.now() - createdAt;
      if (diff < 60000) setTimeDisplay(`${Math.floor(diff / 1000)}s`);
      else if (diff < 3600000) setTimeDisplay(`${Math.floor(diff / 60000)}m`);
      else if (diff < 86400000) setTimeDisplay(`${Math.floor(diff / 3600000)}h`);
      else setTimeDisplay(`${Math.floor(diff / 86400000)}d`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [pumpfunData, dexData, baseToken]);

  // Widget timeout handling
  useEffect(() => {
    if (chartTab === "cabalspy" && !widgetLoaded) {
      setWidgetError(false);
      const timer = setTimeout(() => {
        setWidgetError(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [chartTab, widgetLoaded]);

  // ── Derived Values ─────────────────────────────────────────────────
  const tokenName = tokenNameFromParams || dexData?.baseToken?.name || geckoData?.name || pumpfunData?.name || baseToken?.name || "Unknown";
  const tokenSymbol = tokenSymbolFromParams || dexData?.baseToken?.symbol || geckoData?.symbol || pumpfunData?.symbol || baseToken?.symbol || "UNKNOWN";

  const tokenImage = useMemo(() => {
    const candidates = [tokenLogoFromParams, dexData?.logo, geckoData?.logo, pumpfunData?.logo, baseToken?.image];
    return candidates.find(u => u && typeof u === "string" && u.startsWith("http")) || null;
  }, [dexData, geckoData, pumpfunData, baseToken, tokenLogoFromParams]);

  const price = dexData?.priceUsd || geckoData?.priceUsd || pumpfunData?.priceUsd || baseToken?.price || 0;
  const marketCap = dexData?.fdv || geckoData?.marketCap || pumpfunData?.marketCap || baseToken?.marketCap || 0;
  const volume24h = dexData?.volume24h || geckoData?.volume24h || pumpfunData?.volume || 0;
  const liquidity = dexData?.liquidity || 0;
  const priceChange1h = dexData?.priceChange1h ?? 0;
  const priceChange5m = dexData?.priceChange5m ?? 0;
  const priceChange6h = dexData?.priceChange6h ?? 0;
  const priceChange24h = dexData?.priceChange24h ?? 0;
  const tokenDecimals = tokenDecimalsFromParams ? parseInt(tokenDecimalsFromParams) : baseToken?.decimals || 6;

  const txns24h = dexData?.txns24h;
  const txBuyPct = txns24h ? Math.round((txns24h.buys / (txns24h.total || 1)) * 100) : null;

  const bondingProgress = pumpfunData?.bondingProgress ?? (baseToken as any)?.bondingProgress ?? 0;
  const isMigrated = pumpfunData?.isMigrated || (baseToken as any)?.isMigrated || bondingProgress >= 1;

  const platform = aiPlatformDetector.detectPlatform({
    id: tokenAddress, name: tokenName, symbol: tokenSymbol,
    image: tokenImage || undefined,
    source: (baseToken as any)?.source || (pumpfunData ? "pumpfun" : undefined),
    protocol: (baseToken as any)?.protocol,
    chain, raydiumPool: pumpfunData?.raydiumPool || (baseToken as any)?.raydiumPool,
  });
  const platformLogo = getPlatformLogo(platform);
  const platformName = getPlatformName(platform);

  // Social links from DexScreener
  const socialLinks = useMemo(() => {
    const website = dexData?.websites?.[0]?.url || null;
    const twitter = dexData?.socials?.find(s => s.type === "twitter")?.url || null;
    const telegram = dexData?.socials?.find(s => s.type === "telegram")?.url || null;
    const dexUrl = dexData?.dexUrl || null;
    return { website, twitter, telegram, dexUrl };
  }, [dexData]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleWatchlist = () => {
    if (isWatchlisted) {
      removeFromWatchlist(tokenAddress);
      toast({ title: `${tokenSymbol} removed from watchlist` });
    } else {
      addToWatchlist({ mint: tokenAddress, symbol: tokenSymbol, name: tokenName, image: tokenImage || undefined, network: "solana" });
      toast({ title: `${tokenSymbol} added to watchlist ★` });
    }
  };

  if (loading) return <TokenDetailPageSkeleton />;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app text-white selection:bg-primary/30">
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />
      <Navbar showBackButton onBackClick={() => router.back()} showSearch onSearchClick={() => setShowSearchModal(true)} />

      <main className="relative z-10 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 pt-2 sm:pt-6 pb-20">

        {/* ── TOP HEADER BAR ────────────────────────────────────────── */}
        <section className="glass rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/10 mb-3">

          {/* Row 1: Logo + Name + Price + Actions — always visible, responsive sizing */}
          <div className="flex items-center gap-3">

            {/* Logo + bonding ring */}
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                  className={`${isMigrated ? "text-primary" : platform === "pump" ? "text-[#22c55e]" : platform === "meteora" ? "text-[#e879f9]" : "text-primary"} transition-all duration-1000`}
                  strokeDasharray={`${(isMigrated ? 1 : bondingProgress) * 276.5} 276.5`}
                />
              </svg>
              <div className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 z-10">
                {tokenImage && !imageError ? (
                  <Image src={tokenImage} alt={tokenSymbol} fill className="object-cover" unoptimized onError={() => setImageError(true)} />
                ) : (
                  <div className="w-full h-full bg-panel-elev flex items-center justify-center font-black italic text-gradient uppercase text-sm">{tokenSymbol[0]}</div>
                )}
              </div>
              {platformLogo && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-black rounded-md border border-white/10 p-0.5 z-20 overflow-hidden">
                  <img src={platformLogo} alt={platformName} className="w-full h-full object-contain" />
                </div>
              )}
            </div>

            {/* Name + symbol — takes up remaining space */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-xl font-black italic tracking-tighter leading-none truncate">{tokenName}</h1>
                {isMigrated && <div className="bg-secondary/20 text-secondary border border-secondary/30 px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase shrink-0">GRAD</div>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[9px] text-muted font-bold">{tokenSymbol}</span>
                {timeDisplay && (
                  <span className="flex items-center gap-0.5 sm:gap-1">
                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" /></span>
                    <span className="text-[8px] font-black uppercase text-muted">{timeDisplay}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Price — always visible, bigger on sm+ */}
            <div className="shrink-0 text-right">
              <div className="text-lg sm:text-2xl font-black italic tracking-tighter leading-none">{formatCurrency(price)}</div>
              <div className="flex items-center gap-1 mt-0.5 justify-end flex-wrap">
                {[{ label: "1H", val: priceChange1h }, { label: "24H", val: priceChange24h }].map(({ label, val }) => (
                  val !== 0 && <span key={label} className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black ${val >= 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>{label} {val >= 0 ? "+" : ""}{val?.toFixed(1)}%</span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={toggleWatchlist} className={`p-1.5 sm:p-2 rounded-xl border cursor-pointer transition-all ${isWatchlisted ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-white/10 text-muted hover:text-white hover:border-white/30"}`}>
                <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWatchlisted ? "fill-current" : ""}`} />
              </button>
              <div className="flex items-center gap-1 cursor-pointer px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all" onClick={copyAddress}>
                <code className="text-[8px] sm:text-[9px] font-mono text-muted hidden xs:block">{tokenAddress.slice(0, 4)}...{tokenAddress.slice(-4)}</code>
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted" />}
              </div>
              <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${isMigrated ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/10 text-secondary border border-secondary/30"}`}>
                {isMigrated ? (dexData?.dexId?.toUpperCase() || "DEX") : "BOND"}
              </div>
            </div>
          </div>

          {/* Row 2: Stats + changes — separated for clarity */}
          <div className="flex items-center gap-3 sm:gap-6 mt-2.5 pt-2.5 border-t border-white/5 flex-wrap">
            {/* 5m/6h changes only on sm+ to save mobile space */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[{ label: "5M", val: priceChange5m }, { label: "6H", val: priceChange6h }].map(({ label, val }) => (
                val !== 0 && <span key={label} className={`px-1.5 py-0.5 rounded text-[9px] font-black ${val >= 0 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>{label} {val >= 0 ? "+" : ""}{val?.toFixed(1)}%</span>
              ))}
            </div>

            {/* Stats */}
            {[
              { label: "MKT CAP", value: formatCurrency(marketCap), color: "text-primary" },
              { label: "VOL 24H", value: formatCurrency(volume24h), color: "text-accent" },
              { label: "LIQ", value: formatCurrency(liquidity), color: "text-secondary" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[7px] sm:text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
                <span className={`text-xs sm:text-sm font-black italic ${color}`}>{value}</span>
              </div>
            ))}

            {/* Buy/sell bar */}
            {txBuyPct !== null && (
              <div className="flex flex-col gap-1 min-w-[64px] sm:min-w-[80px]">
                <div className="flex justify-between text-[8px] font-black uppercase">
                  <span className="text-primary">{txBuyPct}%B</span>
                  <span className="text-accent">{100 - txBuyPct}%S</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${txBuyPct}%` }} />
                </div>
              </div>
            )}

            {/* Address — only on sm+ */}
            <div className="hidden sm:flex items-center gap-1.5 cursor-pointer ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all" onClick={copyAddress}>
              <code className="text-[9px] font-mono text-muted">{tokenAddress.slice(0, 6)}...{tokenAddress.slice(-6)}</code>
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted" />}
            </div>
          </div>
        </section>


        {/* ── CHART + RIGHT PANEL ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">

          {/* Left: Chart + Tabs */}
          <div className="space-y-3 min-w-0">
            <section className="glass rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden">
              <div className="flex border-b border-white/10 bg-black/40">
                {[{ id: "chart", label: "📈 CHART" }, { id: "cabalspy", label: "🔍 CABALSPY INTEL" }].map(tab => (
                  <button key={tab.id} onClick={() => { setChartTab(tab.id as any); if (tab.id === "cabalspy") setWidgetLoaded(false); }}
                    className={`cursor-pointer px-5 py-3.5 text-[10px] font-black tracking-[0.2em] transition-all relative ${chartTab === tab.id ? "text-primary bg-white/5" : "text-muted hover:text-white"}`}>
                    {tab.label}
                    {chartTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon" />}
                  </button>
                ))}
              </div>
              <div className="h-[45vh] sm:h-[60vh] min-h-[320px] sm:min-h-[440px] w-full relative bg-panel-elev">
                {/* Show loading spinner only when an iframe is actually loading */}
                {chartTab === "cabalspy" && tokenAddress !== "So11111111111111111111111111111111111111112" && !widgetLoaded && !widgetError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted z-0">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Loading intel...</span>
                  </div>
                )}
                {chartTab === "cabalspy" && widgetError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6 z-20 bg-panel-elev/90 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted">
                      <Settings className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-black italic text-white mb-1">Widget Offline</p>
                      <p className="text-[10px] text-muted uppercase tracking-widest">Intel server is currently unreachable</p>
                    </div>
                  </div>
                )}
                {chartTab === "chart" ? (
                  <TokenChart mintAddress={tokenAddress} tokenSymbol={tokenSymbol} isPumpFun={!!pumpfunData} isMigrated={isMigrated} pairAddress={dexData?.pairAddress} />
                ) : tokenAddress === "So11111111111111111111111111111111111111112" ? (
                  /* WSOL — widget has no data for native SOL */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-xl">🔍</span>
                    </div>
                    <div>
                      <p className="text-sm font-black italic text-white mb-1">{tokenSymbol} Not Available</p>
                      <p className="text-[10px] text-muted uppercase tracking-widest">CabalSpy Intel doesn&apos;t track native {tokenSymbol}</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    key={tokenAddress}
                    src={process.env.NODE_ENV === "development" ? `http://localhost:8080/widget?address=${tokenAddress}` : `https://widget.cabalspy.xyz:8443/widget?address=${tokenAddress}`}
                    className={`absolute inset-0 w-full h-full border-0 ${widgetError ? "opacity-0 pointer-events-none z-0" : "z-10"}`}
                    title="CabalSpy Intel"
                    loading="lazy"
                    allow="clipboard-read; clipboard-write"
                    onLoad={() => setWidgetLoaded(true)}
                  />
                )}
              </div>
            </section>

            {/* Data Tabs */}
            <section className="glass rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
              <div className="flex border-b border-white/10 bg-black/60">
                {[
                  { id: "trades", label: "TERMINAL", icon: Activity },
                  { id: "holders", label: "HOLDERS", icon: Users },
                  { id: "info", label: "PROTOCOL", icon: Globe },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`cursor-pointer flex-1 py-3.5 flex items-center justify-center gap-2 text-[9px] font-black tracking-[0.15em] transition-all relative ${activeTab === tab.id ? "text-primary bg-white/5" : "text-muted hover:text-white"}`}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon" />}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5 max-h-[420px] overflow-y-auto">

                {/* ── TERMINAL FEED ── */}
                {activeTab === "trades" && (
                  <div className="space-y-2 relative min-h-[200px]">
                    {!isAuthenticated ? (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-panel/60 backdrop-blur-md rounded-2xl text-center p-6">
                        <Lock className="w-8 h-8 text-primary mb-3" />
                        <h4 className="text-sm font-black italic mb-2">TERMINAL LOCKED</h4>
                        <p className="text-[10px] text-muted mb-4">Sign in to access live trade data</p>
                        <AuthButton />
                      </div>
                    ) : (
                      <>
                        {/* DexScreener aggregate stats */}
                        {txns24h && (
                          <div className="grid grid-cols-3 gap-2 mb-5">
                            {[
                              { label: "BUYS 24H", val: txns24h.buys, color: "text-primary" },
                              { label: "SELLS 24H", val: txns24h.sells, color: "text-accent" },
                              { label: "TOTAL TXS", val: txns24h.total, color: "text-white" },
                            ].map(s => (
                              <div key={s.label} className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className={`text-lg font-black italic ${s.color}`}>{formatNumber(s.val)}</div>
                                <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Multi-timeframe breakdown — real from DexScreener */}
                        <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">ACTIVITY BREAKDOWN</div>
                        <div className="space-y-2 mb-5">
                          {([
                            { label: "5 MIN", txns: dexData?.txns5m, vol: dexData?.volume5m },
                            { label: "1 HOUR", txns: dexData?.txns1h, vol: dexData?.volume1h },
                            { label: "6 HOURS", txns: dexData?.txns6h, vol: dexData?.volume6h },
                            { label: "24 HOURS", txns: dexData?.txns24h, vol: dexData?.volume24h },
                          ] as const).filter(r => r.txns).map(({ label, txns, vol }) => {
                            const total = (txns?.buys ?? 0) + (txns?.sells ?? 0);
                            const buyPct = total > 0 ? Math.round(((txns?.buys ?? 0) / total) * 100) : 50;
                            return (
                              <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
                                  <div className="flex items-center gap-3 text-[9px] font-black">
                                    <span className="text-primary">{txns?.buys ?? 0}B</span>
                                    <span className="text-accent">{txns?.sells ?? 0}S</span>
                                    {vol && <span className="text-white/40">{formatCurrency(vol)}</span>}
                                  </div>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${buyPct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Live trades link — we don't have free per-trade data, link out */}
                        {!txns24h && (
                          <div className="py-6 text-center">
                            <p className="text-[10px] text-muted uppercase tracking-widest mb-3">No trade data available yet</p>
                          </div>
                        )}
                        <a
                          href={dexData?.dexUrl || `https://dexscreener.com/solana/${tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-muted hover:text-white hover:border-white/20 transition-all uppercase tracking-wider"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          View Live Trades on DexScreener
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>
                )}

                {/* ── TOP HOLDERS ── */}
                {activeTab === "holders" && (
                  <div className="space-y-3">
                    {/* Holder count + Bubblemaps quick links */}
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] font-black text-muted uppercase tracking-widest">
                        {(baseToken as any)?._mobulaData?.holdersCount
                          ? `${formatNumber((baseToken as any)._mobulaData.holdersCount)} HOLDERS`
                          : "TOP HOLDERS"}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://app.bubblemaps.io/sol/token/${tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[8px] font-black text-primary hover:bg-primary/20 transition-all uppercase tracking-wider"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="9" x2="6" y2="6" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="9" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="15" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="15" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5"/></svg>
                          BUBBLE MAP
                        </a>
                        <a
                          href={`https://solscan.io/token/${tokenAddress}#holders`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-muted hover:text-white transition-all uppercase tracking-wider"
                        >
                          SOLSCAN <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>

                    {holdersLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-muted">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-black uppercase">Loading holder data...</span>
                      </div>
                    ) : holders.length > 0 ? (
                      <>
                        {holders.map((h, i) => (
                          <div key={h.address} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black italic text-primary">#{i + 1}</div>
                              <div>
                                <div className="text-[10px] font-mono text-white font-bold">{heliusTokenDataService.formatAddress(h.address)}</div>
                                <div className="text-[8px] text-muted uppercase">{formatNumber(h.uiAmount)} tokens</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-black italic text-primary">{h.percentage?.toFixed(2) || "—"}%</div>
                              <a href={`https://solscan.io/account/${h.address}`} target="_blank" rel="noopener noreferrer"
                                className="text-[8px] text-muted hover:text-white transition-colors flex items-center gap-0.5 justify-end">
                                SOLSCAN <ArrowUpRight className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="py-8 text-center space-y-3">
                        <div className="text-[10px] font-black text-muted uppercase tracking-widest">Holder data unavailable</div>
                        <p className="text-[9px] text-muted/60">View on Bubblemaps or Solscan for full distribution</p>
                        <div className="flex items-center justify-center gap-3">
                          <a href={`https://app.bubblemaps.io/sol/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-wider hover:bg-primary/20 transition-all">
                            View Bubble Map
                          </a>
                          <a href={`https://solscan.io/token/${tokenAddress}#holders`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-wider hover:text-white transition-colors">
                            Solscan <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── PROTOCOL INFO ── */}
                {activeTab === "info" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-black italic tracking-tighter mb-4">TOKENOMICS</h3>
                      <div className="space-y-0">
                        {[
                          { label: "Supply", value: totalSupply ? formatNumber(totalSupply) : (pumpfunData?.totalSupply ? formatNumber(pumpfunData.totalSupply) : "1,000,000,000") },
                          { label: "Decimals", value: tokenDecimals },
                          { label: "Network", value: chain.toUpperCase() },
                          { label: "Status", value: isMigrated ? "GRADUATED ✓" : `BONDING ${(bondingProgress * 100).toFixed(0)}%` },
                          { label: "DEX", value: dexData?.dexId ? dexData.dexId.charAt(0).toUpperCase() + dexData.dexId.slice(1) : platformName || "—" },
                          { label: "24H TXS", value: txns24h ? `${formatNumber(txns24h.buys)}B / ${formatNumber(txns24h.sells)}S` : "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">{label}</span>
                            <span className="text-xs font-black italic">{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      {pumpfunData?.description && (
                        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5">DESCRIPTION</div>
                          <p className="text-[10px] text-white/80 leading-relaxed">{pumpfunData.description}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-black italic tracking-tighter mb-4">RESOURCES</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { label: "Website", icon: Globe, url: socialLinks.website, color: "hover:border-primary/50 hover:text-primary" },
                          { label: "Twitter / X", icon: TwitterIcon, url: socialLinks.twitter, color: "hover:border-white/50 hover:text-white" },
                          { label: "Telegram", icon: TelegramIcon, url: socialLinks.telegram, color: "hover:border-blue-400/50 hover:text-blue-400" },
                          { label: "DexScreener", icon: BarChart3, url: socialLinks.dexUrl, color: "hover:border-secondary/50 hover:text-secondary" },
                          { label: "Solscan", icon: ExternalLink, url: `https://solscan.io/token/${tokenAddress}`, color: "hover:border-accent/50 hover:text-accent" },
                        ].map(({ label, icon: Icon, url, color }) => (
                          url ? (
                            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10 ${color} transition-all group active:scale-95`}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted group-hover:text-inherit transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                              </div>
                              <ArrowUpRight className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <div key={label} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 opacity-40 cursor-not-allowed">
                              <Icon className="w-4 h-4 text-muted" />
                              <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                              <span className="ml-auto text-[8px] text-muted italic">not listed</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right: Trade Panel */}
          <div className="space-y-3">
            <section className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

              <h2 className="text-xl font-black italic tracking-tighter mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                EXECUTE TRADE
              </h2>

              {isAuthenticated ? (
                <div className="space-y-5">
                  {/* Buy/Sell Tabs */}
                  <div className="flex p-1.5 bg-black/40 rounded-3xl border border-white/5">
                    {(["buy", "sell"] as const).map(t => (
                      <button key={t} onClick={() => setTradeType(t)}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tradeType === t ? (t === "buy" ? "bg-primary text-black shadow-neon scale-105" : "bg-accent text-white shadow-accent-neon scale-105") : "text-muted hover:text-white"}`}>
                        {t.toUpperCase()} {tokenSymbol}
                      </button>
                    ))}
                  </div>

                  {/* Amount Presets */}
                  <div className="space-y-3">
                    <div className="flex justify-between px-1">
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">Amount</span>
                      <span className="text-[9px] font-black text-muted/60 uppercase">Bal: {formatNumber(tradeType === "buy" ? solBalance : (tokenBalance?.amount || 0))} {tradeType === "buy" ? "SOL" : tokenSymbol}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(tradeType === "buy" ? ["0.1", "0.5", "1", "5"] : ["25%", "50%", "75%", "100%"]).map((amt) => (
                        <button key={amt} onClick={() => {
                          if (amt.includes("%") && tokenBalance) setTradeAmount((tokenBalance.amount * parseFloat(amt) / 100).toString());
                          else setTradeAmount(amt);
                        }}
                          className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black italic hover:border-white/30 hover:bg-white/10 transition-all active:scale-95">
                          {amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)}
                        placeholder={`Enter ${tradeType === "buy" ? "SOL" : tokenSymbol} amount...`}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black italic focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all pr-16" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted">{tradeType === "buy" ? "SOL" : tokenSymbol}</div>
                    </div>
                  </div>

                  {/* Slippage */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between px-1">
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">Slippage</span>
                      <span className="text-[9px] font-black text-primary">{tradeSlippage}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["0.5", "1", "3", "5"].map(s => (
                        <button key={s} onClick={() => setTradeSlippage(s)}
                          className={`py-2 rounded-xl text-[9px] font-black transition-all ${tradeSlippage === s ? "bg-primary/20 text-primary border border-primary/50" : "bg-white/5 border border-white/10 text-muted hover:text-white hover:border-white/20"}`}>
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execute */}
                  <button
                    onClick={async () => {
                      if (!walletAddress || !connection || !signSolanaTransaction) { toast({ title: "Connect wallet first" }); return; }
                      if (!tradeAmount || parseFloat(tradeAmount) <= 0) { toast({ title: "Invalid amount" }); return; }
                      try {
                        setIsTrading(true);
                        const result = await executeJupiterSwap({
                          inputMint: tradeType === "buy" ? SOL_MINT : tokenAddress,
                          outputMint: tradeType === "buy" ? tokenAddress : SOL_MINT,
                          amount: parseFloat(tradeAmount),
                          inputDecimals: tradeType === "sell" ? tokenDecimals : 9,
                          outputDecimals: tradeType === "buy" ? tokenDecimals : 9,
                          userPublicKey: walletAddress,
                          slippageBps: Math.round(parseFloat(tradeSlippage) * 100),
                          connection,
                          signTransaction: signSolanaTransaction,
                        });
                        if (result.success) {
                          toast({ title: "Trade Successful ✓", description: result.signature });
                          setTradeAmount("");
                        } else {
                          toast({ title: "Trade Failed", description: result.error });
                        }
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message });
                      } finally {
                        setIsTrading(false);
                      }
                    }}
                    disabled={isTrading || !tradeAmount}
                    className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn ${isTrading ? "opacity-70 cursor-wait" : ""} ${tradeType === "buy" ? "bg-primary text-black shadow-neon hover:scale-[1.02]" : "bg-accent text-white shadow-accent-neon hover:scale-[1.02]"}`}>
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isTrading ? <><Loader2 className="w-4 h-4 animate-spin" />PROCESSING...</> : <><Zap className={`w-4 h-4 ${tradeType === "buy" ? "fill-black" : "fill-white"}`} />{tradeType === "buy" ? "CONFIRM PURCHASE" : "CONFIRM SALE"}</>}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-10 gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-neon-sm animate-pulse">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase mb-2">Terminal Locked</h3>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Sign in to access<br />live trading & execution</p>
                  </div>
                  <div className="w-full"><AuthButton /></div>
                </div>
              )}
            </section>

            {/* Token volume breakdown */}
            {(dexData?.txns1h || dexData?.txns5m) && (
              <section className="glass rounded-2xl p-4 border border-white/10">
                <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-3">VOLUME BREAKDOWN</div>
                <div className="space-y-2">
                  {[
                    { label: "5 MIN", vol: dexData?.volume5m, txns: dexData?.txns5m },
                    { label: "1 HOUR", vol: dexData?.volume1h, txns: dexData?.txns1h },
                    { label: "6 HOURS", vol: dexData?.volume6h, txns: dexData?.txns6h },
                    { label: "24 HOURS", vol: dexData?.volume24h, txns: dexData?.txns24h },
                  ].filter(r => r.vol).map(({ label, vol, txns }) => (
                    <div key={label} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
                      <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
                      <div className="text-right">
                        <div className="text-[10px] font-black italic">{formatCurrency(vol || 0)}</div>
                        {txns && <div className="text-[8px] text-muted"><span className="text-primary">{txns.buys}B</span> / <span className="text-accent">{txns.sells}S</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
    </div>
  );
}

function TokenDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-app text-white animate-pulse">
      <div className="max-w-screen-2xl mx-auto px-4 pt-24 pb-20 space-y-4">
        <div className="h-20 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
          <div className="space-y-4">
            <div className="h-[60vh] bg-white/5 rounded-3xl" />
            <div className="h-[300px] bg-white/5 rounded-3xl" />
          </div>
          <div className="h-[500px] bg-white/5 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
