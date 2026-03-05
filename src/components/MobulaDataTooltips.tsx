"use client";

import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Shield,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Zap,
  Target,
  Lock,
  Unlock,
  Percent,
  Clock,
  Flame,
  Star,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TokenData } from "@/types/token";
import { cn } from "@/lib/utils";

interface MobulaDataTooltipsProps {
  token: TokenData;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

export function MobulaDataTooltips({
  token,
  className,
  size = "md",
  showLabels = false,
}: MobulaDataTooltipsProps) {
  const data = token._mobulaData;
  if (!data) return null;

  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 18;
  const iconClass = cn(
    "text-gray-400 hover:text-white transition-colors cursor-help",
    size === "sm" && "w-3.5 h-3.5",
    size === "md" && "w-4 h-4",
    size === "lg" && "w-5 h-5"
  );

  const tooltipItems: Array<{
    icon: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
    color?: string;
    show?: boolean;
  }> = [];

  // Smart Money Indicators
  if (data.smartTradersCount > 0) {
    tooltipItems.push({
      icon: <Brain className={iconClass} />,
      label: "Smart Traders",
      value: `${data.smartTradersCount} smart traders tracking this token`,
      color: "text-blue-400",
      show: true,
    });
  }

  if (data.proTradersCount > 0) {
    tooltipItems.push({
      icon: <Star className={iconClass} />,
      label: "Pro Traders",
      value: `${data.proTradersCount} professional traders active`,
      color: "text-purple-400",
      show: true,
    });
  }

  // Red Flags
  if (data.bundlersHoldings > 80) {
    tooltipItems.push({
      icon: <AlertTriangle className={iconClass} />,
      label: "Bundler Alert",
      value: `⚠️ ${data.bundlersHoldings.toFixed(1)}% held by bundlers (high risk)`,
      color: "text-red-400",
      show: true,
    });
  }

  if (data.top10Holdings > 90) {
    tooltipItems.push({
      icon: <AlertTriangle className={iconClass} />,
      label: "Whale Concentration",
      value: `⚠️ Top 10 holders own ${data.top10Holdings.toFixed(1)}% (high risk)`,
      color: "text-red-400",
      show: true,
    });
  }

  // Security
  if (data.security) {
    if (data.security.noMintAuthority) {
      tooltipItems.push({
        icon: <Lock className={iconClass} />,
        label: "Mint Revoked",
        value: "✅ Mint authority removed - cannot create more tokens",
        color: "text-green-400",
        show: true,
      });
    }

    if (data.security.balanceMutable) {
      tooltipItems.push({
        icon: <Unlock className={iconClass} />,
        label: "Mutable Balances",
        value: "⚠️ Token balances can be changed (security risk)",
        color: "text-red-400",
        show: true,
      });
    }

    if (data.security.transferPausable) {
      tooltipItems.push({
        icon: <AlertTriangle className={iconClass} />,
        label: "Pausable Transfers",
        value: "⚠️ Transfers can be paused by contract owner",
        color: "text-red-400",
        show: true,
      });
    }

    const buyTax = parseFloat(data.security.buyTax || "0");
    const sellTax = parseFloat(data.security.sellTax || "0");
    if (buyTax > 0 || sellTax > 0) {
      tooltipItems.push({
        icon: <Percent className={iconClass} />,
        label: "Taxes",
        value: `Buy: ${buyTax}% | Sell: ${sellTax}%`,
        color: buyTax > 5 || sellTax > 10 ? "text-red-400" : "text-yellow-400",
        show: true,
      });
    }
  }

  // Buy/Sell Pressure
  if (data.volumeBuy1h > 0 && data.volumeSell1h > 0) {
    const ratio = data.volumeBuy1h / data.volumeSell1h;
    const pressure =
      ratio > 1.2 ? "bullish" : ratio < 0.8 ? "bearish" : "neutral";
    tooltipItems.push({
      icon:
        pressure === "bullish" ? (
          <ArrowUpRight className={iconClass} />
        ) : pressure === "bearish" ? (
          <ArrowDownRight className={iconClass} />
        ) : (
          <Minus className={iconClass} />
        ),
      label: "Buy/Sell Pressure",
      value: `${pressure === "bullish" ? "🐂" : pressure === "bearish" ? "🐻" : "➡️"} Buy/Sell ratio: ${ratio.toFixed(2)}x`,
      color:
        pressure === "bullish"
          ? "text-green-400"
          : pressure === "bearish"
            ? "text-red-400"
            : "text-gray-400",
      show: true,
    });
  }

  // Trending Score
  if (data.trendingScore1h > 0) {
    tooltipItems.push({
      icon: <Flame className={iconClass} />,
      label: "Trending Score",
      value: `🔥 Trending score: ${data.trendingScore1h.toLocaleString()}`,
      color: "text-orange-400",
      show: data.trendingScore1h > 1000,
    });
  }

  // Bonding Status
  if (data.bondingPercentage > 0 && data.bondingPercentage < 100) {
    tooltipItems.push({
      icon: <Target className={iconClass} />,
      label: "Bonding Progress",
      value: `🎓 ${data.bondingPercentage.toFixed(1)}% bonded (${(100 - data.bondingPercentage).toFixed(1)}% remaining)`,
      color: "text-orange-400",
      show: true,
    });
  }

  if (data.bonded) {
    tooltipItems.push({
      icon: <Zap className={iconClass} />,
      label: "Graduated",
      value: "✅ Token has graduated from bonding curve",
      color: "text-green-400",
      show: true,
    });
  }

  // Holder Distribution
  if (data.holdersCount > 0) {
    tooltipItems.push({
      icon: <Users className={iconClass} />,
      label: "Holders",
      value: `${data.holdersCount.toLocaleString()} holders`,
      color: "text-blue-400",
      show: true,
    });
  }

  // Trade Activity
  if (data.trades1h > 0) {
    tooltipItems.push({
      icon: <Activity className={iconClass} />,
      label: "Trades (1h)",
      value: `${data.trades1h.toLocaleString()} trades in last hour`,
      color: "text-green-400",
      show: data.trades1h > 50,
    });
  }

  // Volume
  if (data.volume1h > 0) {
    tooltipItems.push({
      icon: <BarChart3 className={iconClass} />,
      label: "Volume (1h)",
      value: `$${formatNumber(data.volume1h)}`,
      color: "text-blue-400",
      show: true,
    });
  }

  // Price Change
  if (data.priceChange24h !== 0) {
    const isPositive = data.priceChange24h > 0;
    tooltipItems.push({
      icon: isPositive ? (
        <TrendingUp className={iconClass} />
      ) : (
        <TrendingDown className={iconClass} />
      ),
      label: "Price Change (24h)",
      value: `${isPositive ? "+" : ""}${data.priceChange24h.toFixed(2)}%`,
      color: isPositive ? "text-green-400" : "text-red-400",
      show: Math.abs(data.priceChange24h) > 5,
    });
  }

  // Dexscreener Status
  if (data.dexscreenerListed) {
    tooltipItems.push({
      icon: <Eye className={iconClass} />,
      label: "Dexscreener Listed",
      value: "✅ Listed on Dexscreener",
      color: "text-green-400",
      show: true,
    });
  }

  const visibleItems = tooltipItems.filter((item) => item.show);

  if (visibleItems.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {visibleItems.map((item, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <div className={cn(item.color)}>{item.icon}</div>
                {showLabels && (
                  <span className="text-xs text-gray-400">{item.label}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-panel border border-gray-700 text-white"
            >
              <div className="space-y-1">
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-xs text-gray-300">{item.value}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}
