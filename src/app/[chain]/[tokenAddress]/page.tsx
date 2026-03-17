"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import {
  useParams,
  useRouter,
  usePathname,
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
  Shield,
  Clock,
  Zap,
  RefreshCw,
  User,
  Wallet,
  Bell,
  Volume2,
  Calendar,
  Search,
  Lock,
  Target,
  Flame,
  Globe,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPercentCompact,
} from "@/utils/format";
import { TokenData } from "@/types/token";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { useViewport } from "@/context/ViewportContext";
import { usePortfolio } from "@/context/PortfolioContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { WalletSettingsModal } from "@/services/WalletSettingsModal";
import { pumpFunService, PumpFunTokenInfo } from "@/services/pumpfun";
import { dexscreenerService } from "@/services/dexscreener";
import { geckoTerminalService } from "@/services/geckoterminal";
import { multiChainTokenService } from "@/services/multichain-tokens";
import { env } from "@/lib/env";
import { TokenChart } from "@/components/TokenChart";
import { SearchModal } from "@/components/SearchModal";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { ToastAction } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import Footer from "@/components/Footer";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface TokenDetailData {
  chain: string;
  address: string;
  data: {
    base?: TokenData;
    pumpfun?: any;
    dexscreener?: any;
    geckoterminal?: any;
    mobula?: any;
    transactions?: unknown[];
    holders?: unknown[];
  };
}

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
  const pathname = usePathname();
  const chain = params.chain as string;
  const tokenAddress = params.tokenAddress as string;
  const { user, turnkeyUser, turnkeySession } = useAuth();
  const isAuthenticated = user || turnkeyUser || turnkeySession;
  const { isDesktop, isMobile } = useViewport();
  const { solBalance, solBalanceUsd, getTokenBalance } = usePortfolio();
  const {
    address: walletAddress,
    connection,
    signSolanaTransaction,
  } = useTurnkeySolana();
  const searchParams = useSearchParams();

  const tokenNameFromParams = searchParams.get("name");
  const tokenSymbolFromParams = searchParams.get("symbol");
  const tokenLogoFromParams = searchParams.get("logo");
  const tokenDecimalsFromParams = searchParams.get("decimals");

  const tokenBalance = getTokenBalance ? getTokenBalance(tokenAddress) : null;

  const [tokenData, setTokenData] = useState<TokenDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"trades" | "holders" | "info">(
    "trades",
  );
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { toast, dismiss } = useToast();

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeSlippage, setTradeSlippage] = useState("0.5");
  const [isTrading, setIsTrading] = useState(false);
  const [chartTab, setChartTab] = useState<"chart" | "cabalspy">("chart");

  const [slippage, setSlippage] = useState<string>("1");
  const [quickBuyAmount, setQuickBuyAmount] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quickBuyAmount") || "0.1";
    }
    return "0.1";
  });
  const [timeDisplay, setTimeDisplay] = useState<string>("");
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        );
        if (response.ok) {
          const data = await response.json();
          if (data.solana?.usd) {
            setSolPrice(data.solana.usd);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch SOL price from CoinGecko:", error);
      }
      setSolPrice(150);
    };
    fetchSolPrice();
  }, []);

  useEffect(() => {
    if (!tokenData) {
      setTimeDisplay("");
      return;
    }

    const baseToken = tokenData?.data?.base;
    const pumpfunData = tokenData?.data?.pumpfun;
    const createdTimestamp =
      pumpfunData?.createdTimestamp || baseToken?.createdTimestamp;

    if (!createdTimestamp) {
      setTimeDisplay(baseToken?.time || "Unknown");
      return;
    }

    const updateTime = () => {
      const diff = Date.now() - createdTimestamp;
      if (diff < 60000) setTimeDisplay(`${Math.floor(diff / 1000)}s`);
      else if (diff < 3600000) setTimeDisplay(`${Math.floor(diff / 60000)}m`);
      else setTimeDisplay(`${Math.floor(diff / 3600000)}h`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [tokenData]);

  useEffect(() => {
    if (!chain || !tokenAddress) return;

    const fetchTokenData = async () => {
      try {
        setLoading(true);
        setImageError(false);

        const normalizedChain = chain.toLowerCase();
        const tokenData: TokenDetailData["data"] = {};

        try {
          const dexChain = normalizedChain === "bsc" ? "bsc" : "solana";
          const dexData = await dexscreenerService.fetchTokenInfo(
            dexChain,
            tokenAddress,
          );
          if (dexData) tokenData.dexscreener = dexData;
        } catch (e) {}

        try {
          const geckoNetwork = normalizedChain === "bsc" ? "bsc" : "solana";
          const geckoData = await geckoTerminalService.fetchTokenInfo(
            geckoNetwork,
            tokenAddress,
          );
          if (geckoData) tokenData.geckoterminal = geckoData;
        } catch (e) {}

        if (normalizedChain === "sol" || normalizedChain === "solana") {
          try {
            const pfData = await pumpFunService.fetchTokenInfo(tokenAddress);
            if (pfData) tokenData.pumpfun = pfData;
          } catch (e) {}
        }

        if (!tokenData.base) {
          const allTokens = [
            ...multiChainTokenService.getSolanaTokens(),
            ...multiChainTokenService.getBSCTokens(),
          ];
          const cachedToken = allTokens.find(
            (t) => t.id.toLowerCase() === tokenAddress.toLowerCase(),
          );
          if (cachedToken) tokenData.base = cachedToken;
        }

        setTokenData({
          chain: normalizedChain,
          address: tokenAddress,
          data: tokenData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [chain, tokenAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <TokenDetailPageSkeleton />;

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black italic mb-4">TOKEN NOT FOUND</h1>
          <Link
            href="/"
            className="px-8 py-3 bg-primary text-black rounded-2xl font-black italic shadow-neon"
          >
            BACK TO DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  const dexscreenerData = tokenData?.data?.dexscreener;
  const geckoTerminalData = tokenData?.data?.geckoterminal;
  const pumpfunData = tokenData?.data?.pumpfun;
  const baseToken = tokenData?.data?.base;

  const tokenName =
    tokenNameFromParams ||
    dexscreenerData?.baseToken?.name ||
    geckoTerminalData?.name ||
    pumpfunData?.name ||
    baseToken?.name ||
    "Unknown";
  const tokenSymbol =
    tokenSymbolFromParams ||
    dexscreenerData?.baseToken?.symbol ||
    geckoTerminalData?.symbol ||
    pumpfunData?.symbol ||
    baseToken?.symbol ||
    "UNKNOWN";

  const getTokenImage = (): string | null => {
    const candidates = [
      tokenLogoFromParams,
      dexscreenerData?.logo,
      geckoTerminalData?.logo,
      pumpfunData?.logo,
      baseToken?.image,
    ];
    for (const url of candidates) {
      if (
        url &&
        typeof url === "string" &&
        (url.startsWith("http") || url.startsWith("/"))
      )
        return url;
    }
    return null;
  };

  const tokenImage = getTokenImage();
  const tokenDecimals = tokenDecimalsFromParams
    ? parseInt(tokenDecimalsFromParams)
    : baseToken?.decimals || 6;
  const price =
    dexscreenerData?.priceUsd ||
    geckoTerminalData?.priceUsd ||
    pumpfunData?.priceUsd ||
    baseToken?.price ||
    0;
  const marketCap =
    dexscreenerData?.fdv ||
    geckoTerminalData?.marketCap ||
    pumpfunData?.marketCap ||
    baseToken?.marketCap ||
    0;
  const volume =
    dexscreenerData?.volume24h ||
    geckoTerminalData?.volume24h ||
    pumpfunData?.volume ||
    baseToken?.volume ||
    0;
  const priceChange =
    dexscreenerData?.priceChange1h ?? dexscreenerData?.priceChange24h ?? 0;
  const holders = tokenData?.data?.holders || [];
  const isPositive = priceChange >= 0;

  const bondingProgress =
    pumpfunData?.bondingProgress ?? (baseToken as any)?.bondingProgress ?? 0;
  const isMigrated = pumpfunData?.isMigrated || (baseToken as any)?.isMigrated;

  return (
    <div className="min-h-screen bg-app text-white selection:bg-primary/30">
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />

      <Navbar
        showBackButton={true}
        onBackClick={() => router.back()}
        showSearch={true}
        onSearchClick={() => setShowSearchModal(true)}
      />

      <main className="relative z-10 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 pt-4 pb-20">

        {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
        <section className="glass rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-white/10 mb-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">

            {/* Logo + Name */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0">
                {tokenImage && !imageError ? (
                  <Image
                    src={tokenImage}
                    alt={tokenSymbol}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-panel-elev flex items-center justify-center text-lg font-black italic text-gradient">
                    {tokenSymbol[0]}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-black italic tracking-tighter leading-none">{tokenName}</h1>
                <span className="text-[10px] sm:text-xs text-muted font-bold">{tokenSymbol}</span>
              </div>
            </div>

            {/* Price + Change */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter">{formatCurrency(price)}</span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${isPositive ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                {formatPercent(priceChange)}
              </span>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-1">
              {[
                { label: "MKT CAP", value: formatCurrency(marketCap), color: "text-primary" },
                { label: "VOLUME 24H", value: formatCurrency(volume), color: "text-accent" },
                { label: "LIQUIDITY", value: formatCurrency(dexscreenerData?.liquidity?.usd || 0), color: "text-secondary" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
                  <span className={`text-sm font-black italic ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Address + Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <div
                className="hidden md:flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                onClick={copyAddress}
              >
                <code className="text-[9px] font-mono text-muted group-hover:text-white transition-colors">
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-6)}
                </code>
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted" />}
              </div>
              <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isMigrated ? "bg-secondary/10 text-secondary border border-secondary/30" : "bg-primary/10 text-primary border border-primary/30"}`}>
                {isMigrated ? "GRADUATED" : "BONDING"}
              </div>
              {timeDisplay && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted">{timeDisplay}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CHART + BOTTOM GRID ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">

          {/* Left column: Chart + Data Tabs */}
          <div className="space-y-3 min-w-0">

            {/* Chart section */}
            <section className="glass rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden">
              {/* Chart tab switcher */}
              <div className="flex border-b border-white/10 bg-black/40">
                {[
                  { id: "chart", label: "📈 CHART" },
                  { id: "cabalspy", label: "🔍 CABALSPY" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setChartTab(tab.id as "chart" | "cabalspy")}
                    className={`px-5 py-3.5 text-[10px] font-black tracking-[0.2em] transition-all cursor-pointer relative ${
                      chartTab === tab.id
                        ? "text-primary bg-white/5"
                        : "text-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                    {chartTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon" />
                    )}
                  </button>
                ))}
              </div>

              {/* Chart content */}
              <div className="h-[55vh] min-h-[400px] w-full">
                {chartTab === "chart" ? (
                  <TokenChart
                    mintAddress={tokenAddress}
                    tokenSymbol={tokenSymbol}
                    isPumpFun={!!pumpfunData}
                    isMigrated={isMigrated}
                    pairAddress={dexscreenerData?.pairAddress}
                  />
                ) : (
                  <iframe
                    src={`https://widget.cabalspy.xyz:8443/widget?address=${tokenAddress}`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    title="CabalSpy Widget"
                    loading="lazy"
                  />
                )}
              </div>
            </section>

            {/* Data Tabs: Terminal Feed | Holders | Protocol Info */}
            <section className="glass rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 bg-panel/30">
              <div className="flex border-b border-white/10 bg-black/60">
                {[
                  { id: "trades", label: "TERMINAL FEED", icon: Activity },
                  { id: "holders", label: "TOP HOLDERS", icon: Users },
                  { id: "info", label: "PROTOCOL INFO", icon: Globe },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black tracking-[0.15em] transition-all relative cursor-pointer active:scale-95 ${
                      activeTab === tab.id
                        ? "text-primary bg-white/5"
                        : "text-muted hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-6 max-h-[400px] overflow-y-auto">
                {activeTab === "trades" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black italic tracking-tighter">LIVE TRANSACTIONS</h3>
                      <span className="text-[9px] font-black text-muted uppercase tracking-widest">Buy/Sell 1.42x</span>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black ${i % 2 === 0 ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                            {i % 2 === 0 ? "BUY" : "SELL"}
                          </div>
                          <div>
                            <div className="text-xs font-black italic">{i % 2 === 0 ? "+" : "-"}{(Math.random() * 5).toFixed(2)} SOL</div>
                            <div className="text-[9px] text-muted font-bold uppercase">30s AGO</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black italic">${(Math.random() * 1000).toFixed(2)}</div>
                          <button className="text-[9px] text-muted hover:text-white transition-colors">
                            <ArrowUpRight className="w-3.5 h-3.5 inline" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "holders" && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-black italic tracking-tighter mb-3">TOP HODLERS</h3>
                    {holders.length > 0 ? (
                      holders.slice(0, 10).map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[9px] font-black italic">#{i + 1}</div>
                            <span className="text-xs font-mono text-muted">{h.address?.slice(0, 10)}...</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black italic">{h.percentage?.toFixed(2)}%</div>
                            <div className="text-[9px] text-primary font-black uppercase">SUPPLY</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-muted font-bold uppercase tracking-widest italic text-xs opacity-50">
                        Syncing blockchain data...
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-black italic tracking-tighter mb-4">TOKENOMICS</h3>
                      <div className="space-y-3">
                        {[
                          { label: "Supply", value: "1,000,000,000" },
                          { label: "Decimals", value: tokenDecimals },
                          { label: "Network", value: chain.toUpperCase() },
                          { label: "Status", value: isMigrated ? "GRADUATED ✓" : "BONDING CURVE" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">{label}</span>
                            <span className="text-xs font-black italic">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black italic tracking-tighter mb-4">RESOURCES</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Website", icon: Globe, hoverColor: "hover:border-primary/50 group-hover:text-primary" },
                          { label: "Twitter", icon: BarChart3, hoverColor: "hover:border-secondary/50 group-hover:text-secondary" },
                          { label: "Telegram", icon: MessageCircle, hoverColor: "hover:border-accent/50 group-hover:text-accent" },
                          { label: "Explorer", icon: ExternalLink, hoverColor: "hover:border-white/50 group-hover:text-white" },
                        ].map(({ label, icon: Icon, hoverColor }) => (
                          <button key={label} className={`flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 ${hoverColor} transition-all group active:scale-95 cursor-pointer`}>
                            <Icon className="w-4 h-4 text-muted transition-colors" />
                            <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right column: Trade Panel */}
          <div className="space-y-3">
            {/* Execute Trade */}
            <section className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/10">
              <h3 className="text-lg font-black italic mb-5 tracking-tighter">EXECUTE TRADE</h3>

              {/* Buy/Sell toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setTradeType("buy")}
                  className={`flex-1 py-3.5 border rounded-xl text-[10px] font-black tracking-[0.2em] transition-all cursor-pointer active:scale-95 ${tradeType === "buy" ? "bg-primary/20 text-primary border-primary shadow-neon" : "bg-black/40 text-muted border-white/10 hover:border-white/30 hover:text-white"}`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  className={`flex-1 py-3.5 border rounded-xl text-[10px] font-black tracking-[0.2em] transition-all cursor-pointer active:scale-95 ${tradeType === "sell" ? "bg-accent/20 text-accent border-accent shadow-accent-neon" : "bg-black/40 text-muted border-white/10 hover:border-white/30 hover:text-white"}`}
                >
                  SELL
                </button>
              </div>

              <div className="space-y-4">
                {/* Amount input */}
                <div>
                  <div className="flex justify-between mb-2 px-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest">Amount</label>
                    <span className="text-[9px] font-black text-primary uppercase">
                      Bal: {formatNumber(tradeType === "buy" ? solBalance : tokenBalance?.amount || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 font-black italic text-xl tracking-tighter focus:border-primary/50 transition-all outline-none"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        onClick={() => setTradeAmount(tradeType === "buy" ? Math.max(0, solBalance - 0.01).toString() : (tokenBalance?.amount || 0).toString())}
                        className="text-[9px] font-black text-primary border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary hover:text-black transition-all"
                      >
                        MAX
                      </button>
                      <span className="text-sm font-black italic text-muted opacity-40">
                        {tradeType === "buy" ? "SOL" : tokenSymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Est. output + Slippage */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Est. {tradeType === "buy" ? "Output" : "Proceeds"}</span>
                    <span className="text-sm font-black italic">~0.00 {tradeType === "buy" ? tokenSymbol : "SOL"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Slippage</span>
                    <div className="flex gap-1.5">
                      {["0.5", "1.0", "3.0"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setTradeSlippage(s)}
                          className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${tradeSlippage === s ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted hover:border-white/30 hover:text-white"}`}
                        >
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Execute button */}
                <button
                  onClick={async () => {
                    if (!isAuthenticated) { setShowLoginModal(true); return; }
                    if (!walletAddress || !connection || !signSolanaTransaction) {
                      toast({ variant: "error", title: "Connect wallet first" });
                      return;
                    }
                    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
                      toast({ variant: "error", title: "Invalid amount" });
                      return;
                    }
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
                        toast({ variant: "success", title: "Trade Successful", description: result.signature });
                        setTradeAmount("");
                      } else {
                        toast({ variant: "error", title: "Trade Failed", description: result.error });
                      }
                    } catch (e: any) {
                      toast({ variant: "error", title: "Error", description: e.message });
                    } finally {
                      setIsTrading(false);
                    }
                  }}
                  disabled={isTrading || !tradeAmount}
                  className={`w-full py-5 rounded-2xl font-black italic text-base tracking-tight transition-all flex items-center justify-center gap-2 border-2 ${tradeType === "buy" ? "bg-primary/20 text-primary border-primary hover:bg-primary/30 shadow-neon" : "bg-accent/20 text-accent border-accent hover:bg-accent/30 shadow-accent-neon"} disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                  {isTrading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  CONFIRM {tradeType.toUpperCase()}
                </button>
              </div>
            </section>

            {/* Bonding Status */}
            <section className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-white/10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black italic tracking-tighter">BONDING STATUS</h3>
                <Target className="w-5 h-5 text-primary" />
              </div>

              <div className="space-y-5">
                <div className="relative h-3 bg-black/60 rounded-full border border-white/5 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-primary via-secondary to-accent shadow-neon transition-all duration-1000"
                    style={{ width: `${bondingProgress * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Progress</span>
                    <div className="text-xl font-black italic">{(bondingProgress * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Stage</span>
                    <div className="text-base font-black italic text-secondary">{isMigrated ? "GRADUATED" : "ORBITAL"}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <Flame className="w-6 h-6 text-accent animate-pulse shrink-0" />
                  <p className="text-[9px] font-bold text-muted leading-relaxed uppercase tracking-widest">
                    Token is{" "}
                    <span className="text-white">{(100 - bondingProgress * 100).toFixed(1)}%</span>{" "}
                    away from Raydium LP migration.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-panel border border-white/10 rounded-4xl shadow-neon">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic text-white flex items-center gap-3 tracking-tighter">
              <Lock className="w-6 h-6 text-primary" />
              AUTHENTICATION REQUIRED
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <Zap className="relative w-16 h-16 text-primary animate-pulse" />
            </div>
            <p className="text-muted font-medium text-lg leading-relaxed">
              Connect your terminal to access live trading and high-speed execution.
            </p>
            <div className="w-full">
              <AuthButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </div>
  );
}

function TokenDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-app text-white animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8">
        <div className="h-96 bg-white/5 rounded-[3rem]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[600px] bg-white/5 rounded-[3rem]" />
          <div className="h-[600px] bg-white/5 rounded-[3rem]" />
        </div>
      </div>
    </div>
  );
}

const Twitter = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
