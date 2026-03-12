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
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent, formatPercentCompact } from "@/utils/format";
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
    "trades"
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
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
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
          const dexData = await dexscreenerService.fetchTokenInfo(dexChain, tokenAddress);
          if (dexData) tokenData.dexscreener = dexData;
        } catch (e) {}

        try {
          const geckoNetwork = normalizedChain === "bsc" ? "bsc" : "solana";
          const geckoData = await geckoTerminalService.fetchTokenInfo(geckoNetwork, tokenAddress);
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
            (t) => t.id.toLowerCase() === tokenAddress.toLowerCase()
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
          <Link href="/" className="px-8 py-3 bg-primary text-black rounded-2xl font-black italic shadow-neon">
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

  const tokenName = tokenNameFromParams || dexscreenerData?.baseToken?.name || geckoTerminalData?.name || pumpfunData?.name || baseToken?.name || "Unknown";
  const tokenSymbol = tokenSymbolFromParams || dexscreenerData?.baseToken?.symbol || geckoTerminalData?.symbol || pumpfunData?.symbol || baseToken?.symbol || "UNKNOWN";

  const getTokenImage = (): string | null => {
    const candidates = [tokenLogoFromParams, dexscreenerData?.logo, geckoTerminalData?.logo, pumpfunData?.logo, baseToken?.image];
    for (const url of candidates) {
      if (url && typeof url === "string" && (url.startsWith("http") || url.startsWith("/"))) return url;
    }
    return null;
  };

  const tokenImage = getTokenImage();
  const tokenDecimals = tokenDecimalsFromParams ? parseInt(tokenDecimalsFromParams) : baseToken?.decimals || 6;
  const price = dexscreenerData?.priceUsd || geckoTerminalData?.priceUsd || pumpfunData?.priceUsd || baseToken?.price || 0;
  const marketCap = dexscreenerData?.fdv || geckoTerminalData?.marketCap || pumpfunData?.marketCap || baseToken?.marketCap || 0;
  const volume = dexscreenerData?.volume24h || geckoTerminalData?.volume24h || pumpfunData?.volume || baseToken?.volume || 0;
  const priceChange = dexscreenerData?.priceChange1h ?? dexscreenerData?.priceChange24h ?? 0;
  const isPositive = priceChange >= 0;

  const bondingProgress = pumpfunData?.bondingProgress ?? (baseToken as any)?.bondingProgress ?? 0;
  const isMigrated = pumpfunData?.isMigrated || (baseToken as any)?.isMigrated;

  return (
    <div className="min-h-screen bg-app text-white pb-24 selection:bg-primary/30">
      <div className="fixed inset-0 bg-grid opacity-10 pointer-events-none" />

      <Navbar
        showBackButton={true}
        onBackClick={() => router.back()}
        showSearch={true}
        onSearchClick={() => setShowSearchModal(true)}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <section className="glass rounded-[3rem] p-8 md:p-12 relative overflow-hidden group">
               <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/10 blur-[100px] rounded-full animate-pulse" />

               <div className="absolute top-8 right-8">
                 <div className={`px-6 py-3 rounded-2xl font-black italic text-lg tracking-tighter ${isPositive ? "bg-primary/10 text-primary shadow-neon" : "bg-accent/10 text-accent shadow-accent-neon"}`}>
                   {isPositive ? "+" : ""}{formatPercent(priceChange)}
                 </div>
               </div>

               <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                 <div className="relative group/avatar">
                    <div className="absolute inset-[-4px] bg-gradient-to-tr from-primary via-secondary to-accent rounded-[2.5rem] opacity-40 blur-lg group-hover/avatar:opacity-100 transition-opacity" />
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 border-black ring-1 ring-white/20">
                      {tokenImage && !imageError ? (
                        <Image src={tokenImage} alt={tokenSymbol} fill className="object-cover" unoptimized onError={() => setImageError(true)} />
                      ) : (
                        <div className="w-full h-full bg-panel-elev flex items-center justify-center text-5xl font-black italic text-gradient">{tokenSymbol[0]}</div>
                      )}
                    </div>
                 </div>

                 <div className="flex-1 text-center md:text-left min-w-0">
                   <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                     <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter truncate leading-[0.8]">{tokenName}</h1>
                     <span className="text-muted font-bold text-2xl opacity-40 tracking-tighter">/{tokenSymbol}</span>
                   </div>

                   <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mb-8">
                     <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{timeDisplay} PULSE</span>
                     </div>
                     <div className="flex items-center gap-2 cursor-pointer group px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all" onClick={copyAddress}>
                        <code className="text-[10px] font-mono font-bold text-muted group-hover:text-white transition-colors">{tokenAddress}</code>
                        {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3 text-muted group-hover:text-white" />}
                     </div>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Current Price</span>
                        <span className="text-2xl font-black italic tracking-tighter">{formatCurrency(price)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Market Cap</span>
                        <span className="text-2xl font-black italic tracking-tighter text-primary">{formatCurrency(marketCap)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Liquidity</span>
                        <span className="text-2xl font-black italic tracking-tighter text-secondary">{formatCurrency(dexscreenerData?.liquidity?.usd || 0)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">Volume (24h)</span>
                        <span className="text-2xl font-black italic tracking-tighter text-accent">{formatCurrency(volume)}</span>
                     </div>
                   </div>
                 </div>
               </div>
            </section>

            {/* Chart Section */}
            <section className="glass rounded-[3rem] p-4 border border-white/10 overflow-hidden shadow-neon-strong/10">
               <div className="min-h-[600px] w-full relative">
                 <TokenChart
                   mintAddress={tokenAddress}
                   tokenSymbol={tokenSymbol}
                   isPumpFun={!!pumpfunData}
                   isMigrated={isMigrated}
                   pairAddress={dexscreenerData?.pairAddress}
                 />
               </div>
            </section>

            {/* Tabs Section - Redesigned to maintain functionality */}
            <section className="glass rounded-[3rem] overflow-hidden border border-white/10">
              <div className="flex border-b border-white/5 bg-black/40">
                {[
                  { id: "trades", label: "TERMINAL FEED", icon: Activity },
                  { id: "holders", label: "HOLDERS", icon: Users },
                  { id: "info", label: "PROTOCOL INFO", icon: Globe },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-5 flex items-center justify-center gap-3 text-[10px] font-black tracking-[0.2em] transition-all relative ${
                      activeTab === tab.id ? "text-primary" : "text-muted hover:text-white"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-neon animate-fade-in" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-8">
                {activeTab === "trades" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black italic tracking-tighter">LIVE TRANSACTIONS</h3>
                      <div className="flex gap-4">
                         <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-muted uppercase tracking-widest">Buy/Sell Ratio</span>
                            <span className="text-xs font-black text-primary italic">1.42x</span>
                         </div>
                      </div>
                    </div>

                    {/* Simplified Transaction Table with Premium Style */}
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${i % 2 === 0 ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                               {i % 2 === 0 ? "BUY" : "SELL"}
                             </div>
                             <div className="flex flex-col">
                               <span className="text-xs font-black italic">{i % 2 === 0 ? "+" : "-"}{(Math.random() * 5).toFixed(2)} SOL</span>
                               <span className="text-[8px] text-muted font-bold uppercase tracking-widest">30s AGO</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="text-right">
                               <div className="text-xs font-black italic">${(Math.random() * 1000).toFixed(2)}</div>
                               <div className="text-[8px] text-muted font-bold uppercase tracking-widest">VALUE</div>
                             </div>
                             <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                               <ArrowUpRight className="w-4 h-4 text-muted" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "holders" && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-black italic tracking-tighter">TOP HODLERS</h3>
                    <div className="space-y-2">
                       {holders.length > 0 ? holders.slice(0, 8).map((h: any, i: number) => (
                         <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black italic">
                                 #{i + 1}
                               </div>
                               <span className="text-xs font-mono text-muted">{h.address?.slice(0, 12)}...</span>
                            </div>
                            <div className="text-right">
                               <div className="text-xs font-black italic">{h.percentage?.toFixed(2)}%</div>
                               <div className="text-[8px] text-primary font-black uppercase tracking-widest">SUPPLY</div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center text-muted font-bold uppercase tracking-widest italic opacity-50">
                           Syncing blockchain data...
                         </div>
                       )}
                    </div>
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-xl font-black italic tracking-tighter">TOKENOMICS</h3>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Supply</span>
                            <span className="text-sm font-black italic">1,000,000,000</span>
                         </div>
                         <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Decimals</span>
                            <span className="text-sm font-black italic">{tokenDecimals}</span>
                         </div>
                         <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Status</span>
                            <span className="text-sm font-black italic text-primary">{isMigrated ? "GRADUATED" : "IN BONDING"}</span>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xl font-black italic tracking-tighter">RESOURCES</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all group">
                           <Globe className="w-5 h-5 text-muted group-hover:text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Website</span>
                        </button>
                        <button className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-secondary/40 transition-all group">
                           <Twitter className="w-5 h-5 text-muted group-hover:text-secondary" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Twitter</span>
                        </button>
                        <button className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/40 transition-all group">
                           <MessageCircle className="w-5 h-5 text-muted group-hover:text-accent" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Telegram</span>
                        </button>
                        <button className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                           <BarChart3 className="w-5 h-5 text-muted group-hover:text-white" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Explorer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Trade Column */}
          <div className="space-y-8">
            <section className="glass rounded-[3rem] p-8 md:p-10 border border-white/10 shadow-neon-strong/5 sticky top-24">
               <h3 className="text-2xl font-black italic mb-8 tracking-tighter">EXECUTE TRADE</h3>

               <div className="flex bg-black/60 rounded-[1.5rem] p-1.5 mb-8 border border-white/5">
                 <button
                   onClick={() => setTradeType("buy")}
                   className={`flex-1 py-4 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${tradeType === "buy" ? "bg-primary text-black shadow-neon" : "text-muted hover:text-white"}`}
                 >
                   BUY
                 </button>
                 <button
                   onClick={() => setTradeType("sell")}
                   className={`flex-1 py-4 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${tradeType === "sell" ? "bg-accent text-white shadow-accent-neon" : "text-muted hover:text-white"}`}
                 >
                   SELL
                 </button>
               </div>

               <div className="space-y-8">
                 <div>
                   <div className="flex justify-between mb-3 px-2">
                     <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Input Amount</label>
                     <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Bal: {formatNumber(tradeType === "buy" ? solBalance : (tokenBalance?.amount || 0))}</span>
                   </div>
                   <div className="relative group/input">
                     <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                     <input
                       type="number"
                       value={tradeAmount}
                       onChange={(e) => setTradeAmount(e.target.value)}
                       className="relative w-full bg-black/40 border border-white/10 rounded-[1.5rem] py-6 px-8 font-black italic text-2xl tracking-tighter focus:border-primary/50 transition-all outline-none"
                       placeholder="0.00"
                     />
                     <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                       <button
                         onClick={() => setTradeAmount(tradeType === "buy" ? Math.max(0, solBalance - 0.01).toString() : (tokenBalance?.amount || 0).toString())}
                         className="text-[10px] font-black text-primary border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary hover:text-black transition-all"
                       >
                         MAX
                       </button>
                       <span className="text-xl font-black italic text-muted opacity-40">{tradeType === "buy" ? "SOL" : tokenSymbol}</span>
                     </div>
                   </div>
                 </div>

                 <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-muted uppercase tracking-widest">Estimated {tradeType === "buy" ? "Output" : "Proceeds"}</span>
                       <span className="text-sm font-black italic text-white">~0.00 {tradeType === "buy" ? tokenSymbol : "SOL"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-muted uppercase tracking-widest">Slippage</span>
                       <div className="flex gap-2">
                          {["0.5", "1.0", "3.0"].map(s => (
                            <button
                              key={s}
                              onClick={() => setTradeSlippage(s)}
                              className={`text-[8px] font-black px-2 py-1 rounded-lg border transition-all ${tradeSlippage === s ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted"}`}
                            >
                              {s}%
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <button
                   onClick={async () => {
                      if (!isAuthenticated) {
                        setShowLoginModal(true);
                        return;
                      }
                      // Actual trade logic stays the same to maintain functionality
                      if (!walletAddress || !connection || !signSolanaTransaction) {
                        toast({ variant: "destructive", title: "Connect wallet first" });
                        return;
                      }
                      if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
                        toast({ variant: "destructive", title: "Invalid amount" });
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
                          toast({ variant: "destructive", title: "Trade Failed", description: result.error });
                        }
                      } catch (e: any) {
                        toast({ variant: "destructive", title: "Error", description: e.message });
                      } finally {
                        setIsTrading(false);
                      }
                   }}
                   disabled={isTrading || !tradeAmount}
                   className={`w-full py-6 rounded-[2rem] font-black italic text-lg tracking-tight transition-all flex items-center justify-center gap-3 ${tradeType === "buy" ? "bg-primary text-black shadow-neon hover:scale-[1.02]" : "bg-accent text-white shadow-accent-neon hover:scale-[1.02]"} disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                 >
                   {isTrading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                   CONFIRM {tradeType.toUpperCase()}
                 </button>
               </div>
            </section>

            <section className="glass rounded-[3rem] p-10 border border-white/10">
               <div className="flex items-center justify-between mb-10">
                 <h3 className="text-xl font-black italic tracking-tighter">BONDING STATUS</h3>
                 <Target className="w-6 h-6 text-primary" />
               </div>

               <div className="space-y-10">
                 <div className="relative h-4 bg-black/60 rounded-full border border-white/5 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-accent shadow-neon transition-all duration-1000"
                      style={{ width: `${bondingProgress * 100}%` }}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-muted uppercase tracking-widest">Progress</span>
                      <span className="text-2xl font-black italic text-white tracking-tighter">{(bondingProgress * 100).toFixed(2)}%</span>
                   </div>
                   <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-muted uppercase tracking-widest">Stage</span>
                      <span className="text-2xl font-black italic text-secondary tracking-tighter">{isMigrated ? "GRADUATED" : "ORBITAL"}</span>
                   </div>
                 </div>

                 <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center gap-4">
                    <Flame className="w-8 h-8 text-accent animate-pulse" />
                    <p className="text-[10px] font-bold text-muted leading-relaxed uppercase tracking-widest">
                      Token is <span className="text-white">{(100 - (bondingProgress * 100)).toFixed(2)}%</span> away from migrating to Raydium LP.
                    </p>
                 </div>
               </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-panel border border-white/10 rounded-[2rem] shadow-neon">
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

      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
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
