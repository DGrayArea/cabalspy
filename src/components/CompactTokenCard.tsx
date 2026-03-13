"use client";

import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import Link from "next/link";
import Image from "next/image";
import { TokenData } from "@/types/token";
import {
  ExternalLink,
  Clock,
  Flame,
  Info,
  User,
  Search,
  Users,
  Grid3x3,
  Image as ImageIcon,
  DollarSign,
  BarChart3,
  Coins,
  Activity,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  Brain,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Percent,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Eye,
  Twitter,
  Globe,
  Send,
  Droplets,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPlatformLogo,
  getPlatformIcon,
  getChainLogo,
  getPlatformName,
} from "@/utils/platformLogos";
import { aiPlatformDetector } from "@/services/ai-platform-detector";
import { formatPercent, formatPercentCompact, formatCurrency } from "@/utils/format";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { useAuth } from "@/context/AuthContext";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthButton from "@/components/AuthButton";

const TradingPanel = lazy(() => import("@/components/TradingPanel"));

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface CompactTokenCardProps {
  token: TokenData;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  displaySettings?: {
    metricsSize?: "small" | "large";
    quickBuySize?: "small" | "large" | "mega" | "ultra";
    grey?: boolean;
    noDecimals?: boolean;
    circleImages?: boolean;
    progressBar?: boolean;
  };
  connectedGrid?: boolean;
  quickBuyAmount?: string;
}

export function CompactTokenCard({
  token,
  formatCurrency,
  formatNumber,
  displaySettings,
  connectedGrid = false,
  quickBuyAmount = "0.01",
}: CompactTokenCardProps) {
  const [imageError, setImageError] = useState(false);
  const [platformLogoError, setPlatformLogoError] = useState(false);
  const [chainLogoError, setChainLogoError] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isQuickBuying, setIsQuickBuying] = useState(false);
  const { user, turnkeyUser, turnkeySession } = useAuth();
  const isAuthenticated = user || turnkeyUser || turnkeySession;
  const { toast, dismiss } = useToast();
  const { address, connection, signSolanaTransaction } = useTurnkeySolana();

  const handleQuickBuy = async () => {
    if (!turnkeyUser || !address || !connection || !signSolanaTransaction || isQuickBuying) return;
    const amount = parseFloat(quickBuyAmount);
      if (!amount || amount <= 0) {
        toast({ variant: "error", title: "Invalid quick buy amount" });
        return;
      }

      try {
        setIsQuickBuying(true);
        const result = await executeJupiterSwap({
          inputMint: SOL_MINT,
          outputMint: token.id,
          amount,
          outputDecimals: token.decimals,
          userPublicKey: address,
          slippageBps: 150,
          connection,
          signTransaction: signSolanaTransaction,
        });

        if (result.success && result.signature) {
          toast({ variant: "success", title: `Bought ${token.symbol}!`, description: result.signature });
        } else {
          toast({ variant: "error", title: `Failed to buy ${token.symbol}`, description: result.error });
        }
      } catch (error: any) {
        toast({ variant: "error", title: "Error", description: error.message });
      } finally {
      setIsQuickBuying(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(() => {
    if (token.createdTimestamp) {
      const diff = Date.now() - token.createdTimestamp;
      let display = "";
      if (diff < 60000) display = `${Math.floor(diff / 1000)}s`;
      else if (diff < 3600000) display = `${Math.floor(diff / 60000)}m`;
      else display = `${Math.floor(diff / 3600000)}h`;
      return { baseTimestamp: token.createdTimestamp, display };
    }
    return { baseTimestamp: Date.now(), display: token.time };
  });

  const dexscreenerData = token.dexscreener;
  const mobulaData = (token as any)._mobulaData;
  const priceChange24h = dexscreenerData?.priceChange24h ?? (mobulaData?.priceChange24h || token.percentages?.[1] || 0);
  const isPositive = priceChange24h >= 0;
  
  const holders = token.activity?.holders || mobulaData?.holdersCount || 0;
  const trades = token.activity?.trades || mobulaData?.trades1h || 0;

  const isTokenMigrated = (token as any).isMigrated === true || (token as any).raydiumPool || (token as any).bondingProgress >= 1.0;

  const rawProgress = (token as any).bondingProgress ?? (mobulaData?.bondingPercentage ? mobulaData.bondingPercentage / 100 : 0);
  const bondingProgress = isTokenMigrated ? 1.0 : rawProgress;
  const chainRoute = token.chain === "bsc" ? "bsc" : "sol";
  const tokenAddress = token.id.includes(':') ? token.id.split(':')[1] : token.id;
  
  const liquidity = token.dexscreener?.liquidity ?? (mobulaData?.liquidity || 0);
  const socialLinks = useMemo(() => {
    const links: { type: 'twitter' | 'telegram' | 'website'; url: string }[] = [];
    
    // DexScreener socials
    if (token.dexscreener?.socials) {
      token.dexscreener.socials.forEach(s => {
        if (s.type === 'twitter') links.push({ type: 'twitter', url: s.url });
        if (s.type === 'telegram') links.push({ type: 'telegram', url: s.url });
      });
    }
    
    // DexScreener websites
    if (token.dexscreener?.websites) {
      token.dexscreener.websites.forEach(w => {
        links.push({ type: 'website', url: w.url });
      });
    }
    
    // Fallback/PumpFun/Mobula socials
    if (mobulaData?.offChainData?.socials) {
      mobulaData.offChainData.socials.forEach((s: any) => {
        if (s.type === 'twitter' && !links.find(l => l.type === 'twitter')) links.push({ type: 'twitter', url: s.url });
        if (s.type === 'telegram' && !links.find(l => l.type === 'telegram')) links.push({ type: 'telegram', url: s.url });
      });
    }
    
    return links;
  }, [token, mobulaData]);

  const platformInfo = useMemo(() => {
    const detectedPlatform = aiPlatformDetector.detectPlatform({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      image: token.image,
      source: (token as any).source,
      protocol: (token as any).protocol,
      chain: token.chain,
      _mobulaData: (token as any)._mobulaData,
    });
    return {
      platform: detectedPlatform,
      logo: getPlatformLogo(detectedPlatform),
      icon: getPlatformIcon(detectedPlatform),
      name: getPlatformName(detectedPlatform),
    };
  }, [token]);

  const copyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Link
        href={`/${chainRoute}/${tokenAddress}`}
        className="block group relative transition-all duration-500 rounded-[2.5rem] p-6 glass border border-white/10 hover:border-primary/40 hover:shadow-neon shadow-2xl bg-linear-to-br from-white/[0.02] to-transparent"
      >
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500 rounded-[2.5rem]" />
        
        <div className="relative z-10 flex items-start gap-5">
          <div className="flex-shrink-0 relative">
            <div className={`w-14 h-14 ${displaySettings?.circleImages ? "rounded-full" : "rounded-3xl"} relative overflow-hidden bg-panel-elev flex-shrink-0 group-hover:scale-105 transition-transform duration-500`}>
              {/* Circular Bonding Progress Border */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none">
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/5"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${26 * 2 * Math.PI}`}
                  strokeDashoffset={`${26 * 2 * Math.PI * (1 - bondingProgress)}`}
                  className={`${isTokenMigrated ? "text-primary shadow-neon" : "text-secondary"} transition-all duration-1000`}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-1 rounded-full overflow-hidden z-10">
                {token.image && !imageError ? (
                  <Image
                    src={token.image}
                    alt={token.symbol}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-panel-elev flex items-center justify-center text-xl font-black italic text-gradient">
                    {token.symbol?.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {platformInfo.logo && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-xl border border-white/10 flex items-center justify-center overflow-hidden z-30 shadow-2xl">
                <Image src={platformInfo.logo} alt={platformInfo.name || "Platform"} fill className="object-cover p-1" unoptimized />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-black text-lg tracking-tighter text-white truncate italic uppercase leading-none">
                {token.symbol}
              </h3>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-[9px] text-muted font-black uppercase tracking-widest">
                  {typeof currentTime === "object" ? currentTime.display : currentTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">MCap</span>
                <span className="text-xs font-black text-primary font-mono italic">
                  {formatCurrency(token.marketCap)}
                </span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">Volume</span>
                <span className="text-xs font-black text-secondary font-mono italic">
                  {formatCurrency(token.volume)}
                </span>
              </div>
              {liquidity > 0 && (
                <>
                  <div className="w-px h-6 bg-white/5" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-0.5">Liq</span>
                    <span className="text-xs font-black text-accent font-mono italic">
                      {formatCurrency(liquidity)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className={`text-[11px] font-black px-3 py-1 rounded-xl italic tracking-tighter ${isPositive ? "bg-primary/10 text-primary shadow-neon" : "bg-accent/10 text-accent shadow-accent-neon"}`}>
              {formatPercent(priceChange24h)}
            </div>
            
            {/* Social Icons */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                {socialLinks.map((link, idx) => (
                  <Link 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted hover:text-white transition-colors"
                  >
                    {link.type === 'twitter' && <Twitter className="w-3 h-3" />}
                    {link.type === 'telegram' && <Send className="w-3 h-3" />}
                    {link.type === 'website' && <Globe className="w-3 h-3" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-4 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-muted uppercase tracking-widest">Holders</span>
              <span className="text-[10px] font-black italic text-white">{holders.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-muted uppercase tracking-widest">Trades</span>
              <span className="text-[10px] font-black italic text-white">{trades.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTradingPanel(true);
              }}
              className="px-6 py-2.5 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 italic shadow-lg shadow-white/5"
            >
              TRADE
            </button>
            <button 
              onClick={copyAddress}
              className="p-2.5 rounded-2xl glass border border-white/10 hover:border-white/20 transition-all active:scale-90"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted" />}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center px-1">
               <span className="text-[8px] font-black text-muted uppercase tracking-widest">Bonding Curve</span>
               <span className="text-[8px] font-black text-primary uppercase tracking-widest text-glow">{Math.round(bondingProgress * 100)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className={`h-full bg-linear-to-r ${isTokenMigrated ? "from-primary to-primary-light shadow-neon" : "from-secondary to-primary"} transition-all duration-1000 rounded-full`}
                style={{ width: `${bondingProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Floating Tooltip Data - Restored with rich icons and tooltips */}
        <TooltipProvider>
          <div className="mt-6 flex flex-wrap gap-2">
            {mobulaData?.security?.noMintAuthority && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1 cursor-help">
                    <Shield className="w-2.5 h-2.5" /> MINT REVOKED
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="text-[10px] font-bold">Contract ownership renounced. No more tokens can be minted.</p>
                </TooltipContent>
              </Tooltip>
            )}

            {mobulaData?.smartTradersCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 cursor-help">
                    <Brain className="w-2.5 h-2.5" /> {mobulaData.smartTradersCount} SMART MONEY
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="text-[10px] font-bold">{mobulaData.smartTradersCount} whale/smart wallets are holding this token.</p>
                </TooltipContent>
              </Tooltip>
            )}

            {isTokenMigrated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1 cursor-help">
                    <Zap className="w-2.5 h-2.5" /> GRADUATED
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="text-[10px] font-bold">This token has launched on Raydium/DEX.</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-[8px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 cursor-help">
                    <Activity className="w-2.5 h-2.5" /> INCUBATING
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="text-[10px] font-bold">In bonding curve phase on Pump.fun.</p>
                </TooltipContent>
              </Tooltip>
            )}

            {token.volume > 50000 && (
              <Tooltip>
                <TooltipTrigger asChild>
                   <div className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[8px] font-black text-accent uppercase tracking-widest flex items-center gap-1 cursor-help">
                    <Flame className="w-2.5 h-2.5" /> HIGH VELOCITY
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="text-[10px] font-bold">Extremely high trading volume detected.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </Link>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-panel border border-white/10 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> AUTHENTICATION REQUIRED
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Zap className="w-12 h-12 text-primary animate-pulse" />
            <p className="text-muted font-bold text-sm uppercase tracking-widest">Connect your terminal to access trading.</p>
            <div className="w-full">
              <AuthButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showTradingPanel && (
        <Suspense fallback={null}>
          <TradingPanel token={token} onClose={() => setShowTradingPanel(false)} />
        </Suspense>
      )}
    </>
  );
}
