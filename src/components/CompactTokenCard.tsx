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
import { formatPercent, formatPercentCompact } from "@/utils/format";
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
      toast({ variant: "destructive", title: "Invalid quick buy amount" });
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
        toast({ variant: "destructive", title: `Failed to buy ${token.symbol}`, description: result.error });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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

  const priceChange24h = token.priceChange24h ?? (token.percentages?.[token.percentages.length - 1] ?? 0);
  const isPositive = priceChange24h >= 0;
  const isTrending = token.volume > 1000;
  const mobulaData = (token as any)._mobulaData;

  const isTokenMigrated = (token as any).isMigrated === true || (token as any).raydiumPool || (token as any).bondingProgress >= 1.0;

  const bondingProgress = isTokenMigrated ? 1.0 : (token as any).bondingProgress || 0;
  const chainRoute = token.chain === "bsc" ? "bsc" : "sol";
  const tokenAddress = token.id.includes(':') ? token.id.split(':')[1] : token.id;

  const platformInfo = useMemo(() => {
    const detectedPlatform = aiPlatformDetector.detectPlatform({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      image: token.image,
      source: (token as any).source,
      protocol: (token as any).protocol,
      chain: token.chain,
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
        className="block group relative transition-all duration-500 rounded-[2.5rem] p-6 glass border border-white/10 hover:border-primary/40 hover:shadow-neon shadow-2xl bg-gradient-to-br from-white/[0.02] to-transparent"
      >
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500 rounded-[2.5rem]" />
        
        <div className="relative z-10 flex items-start gap-5">
          <div className="flex-shrink-0 relative">
            <div className={`w-14 h-14 ${displaySettings?.circleImages ? "rounded-full" : "rounded-3xl"} overflow-hidden relative bg-panel-elev border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
              {token.image && !imageError ? (
                <Image src={token.image} alt={token.symbol} fill className="object-cover" onError={() => setImageError(true)} unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xl font-black bg-panel-elev italic text-gradient">
                  {token.symbol?.charAt(0)}
                </div>
              )}
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
              <span className="text-[9px] text-muted font-black flex items-center gap-1 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 text-primary" />
                {typeof currentTime === "object" ? currentTime.display : currentTime}
              </span>
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
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <div className={`text-[11px] font-black px-3 py-1 rounded-xl italic tracking-tighter ${isPositive ? "bg-primary/10 text-primary shadow-neon" : "bg-accent/10 text-accent shadow-accent-neon"}`}>
              {isPositive ? "+" : ""}{formatPercent(priceChange24h)}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center px-1">
               <span className="text-[8px] font-black text-muted uppercase tracking-widest">Progress</span>
               <span className="text-[8px] font-black text-primary uppercase tracking-widest">{Math.round(bondingProgress * 100)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary shadow-neon transition-all duration-1000"
                style={{ width: `${bondingProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowTradingPanel(true);
              }}
              className="px-6 py-2.5 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 italic"
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

        {/* Floating Tooltip Data */}
        <div className="mt-6 flex flex-wrap gap-2">
           {mobulaData?.security?.noMintAuthority && (
             <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> MINT REVOKED
             </div>
           )}
           {mobulaData?.smartTradersCount > 0 && (
             <div className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Brain className="w-2.5 h-2.5" /> {mobulaData.smartTradersCount} SM
             </div>
           )}
           {isTokenMigrated && (
             <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> GRADUATED
             </div>
           )}
        </div>
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
