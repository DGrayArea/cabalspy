"use client";

import {
  Brain,
  AlertTriangle,
  Lock,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Flame,
  Target,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TokenData } from "@/types/token";
import { cn } from "@/lib/utils";

interface MobulaDataBadgesProps {
  token: TokenData;
  className?: string;
  maxBadges?: number;
}

/**
 * Compact badge-style display of key Mobula data points
 * Shows most important indicators as badges with tooltips
 */
export function MobulaDataBadges({
  token,
  className,
  maxBadges = 4,
}: MobulaDataBadgesProps) {
  const data = token._mobulaData;
  if (!data) return null;

  const badges: Array<{
    icon: React.ReactNode;
    label: string;
    tooltip: string;
    color: string;
    bgColor: string;
    priority: number;
  }> = [];

  // Priority 1: Red Flags (always show)
  if (data.bundlersHoldings > 80) {
    badges.push({
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Bundler",
      tooltip: `⚠️ ${data.bundlersHoldings.toFixed(1)}% held by bundlers - High risk!`,
      color: "text-red-400",
      bgColor: "bg-red-500/20 border-red-500/50",
      priority: 1,
    });
  }

  if (data.top10Holdings > 90) {
    badges.push({
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Whale",
      tooltip: `⚠️ Top 10 holders own ${data.top10Holdings.toFixed(1)}% - High concentration risk!`,
      color: "text-red-400",
      bgColor: "bg-red-500/20 border-red-500/50",
      priority: 1,
    });
  }

  // Priority 2: Security (high priority)
  if (data.security?.noMintAuthority) {
    badges.push({
      icon: <Lock className="w-3 h-3" />,
      label: "Safe",
      tooltip: "✅ Mint authority revoked - Cannot create more tokens",
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/50",
      priority: 2,
    });
  }

  if (data.security?.balanceMutable) {
    badges.push({
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Risky",
      tooltip: "⚠️ Token balances can be changed - Security risk!",
      color: "text-red-400",
      bgColor: "bg-red-500/20 border-red-500/50",
      priority: 1,
    });
  }

  // Priority 3: Smart Money (high value)
  if (data.smartTradersCount >= 10) {
    badges.push({
      icon: <Brain className="w-3 h-3" />,
      label: "Smart",
      tooltip: `🧠 ${data.smartTradersCount} smart traders tracking this token`,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20 border-blue-500/50",
      priority: 3,
    });
  }

  // Priority 4: Buy/Sell Pressure
  if (data.volumeBuy1h > 0 && data.volumeSell1h > 0) {
    const ratio = data.volumeBuy1h / data.volumeSell1h;
    if (ratio > 1.3) {
      badges.push({
        icon: <ArrowUpRight className="w-3 h-3" />,
        label: "Bull",
        tooltip: `🐂 Strong buy pressure - ${ratio.toFixed(2)}x more buys than sells`,
        color: "text-green-400",
        bgColor: "bg-green-500/20 border-green-500/50",
        priority: 4,
      });
    } else if (ratio < 0.7) {
      badges.push({
        icon: <ArrowDownRight className="w-3 h-3" />,
        label: "Bear",
        tooltip: `🐻 Sell pressure - ${ratio.toFixed(2)}x more sells than buys`,
        color: "text-red-400",
        bgColor: "bg-red-500/20 border-red-500/50",
        priority: 4,
      });
    }
  }

  // Priority 5: Trending
  if (data.trendingScore1h > 5000) {
    badges.push({
      icon: <Flame className="w-3 h-3" />,
      label: "Hot",
      tooltip: `🔥 Very high trending score: ${data.trendingScore1h.toLocaleString()}`,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20 border-orange-500/50",
      priority: 5,
    });
  }

  // Priority 6: Bonding Status
  if (data.bondingPercentage >= 80 && data.bondingPercentage < 100) {
    badges.push({
      icon: <Target className="w-3 h-3" />,
      label: `${Math.round(data.bondingPercentage)}%`,
      tooltip: `🎓 ${data.bondingPercentage.toFixed(1)}% bonded - Graduating soon!`,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20 border-orange-500/50",
      priority: 6,
    });
  }

  if (data.bonded) {
    badges.push({
      icon: <Zap className="w-3 h-3" />,
      label: "Grad",
      tooltip: "✅ Token has graduated from bonding curve",
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/50",
      priority: 6,
    });
  }

  // Priority 7: Activity
  if (data.trades1h > 1000) {
    badges.push({
      icon: <Activity className="w-3 h-3" />,
      label: "Active",
      tooltip: `⚡ ${data.trades1h.toLocaleString()} trades in last hour`,
      color: "text-green-400",
      bgColor: "bg-green-500/20 border-green-500/50",
      priority: 7,
    });
  }

  // Priority 8: Dexscreener
  if (data.dexscreenerListed) {
    badges.push({
      icon: <Eye className="w-3 h-3" />,
      label: "Listed",
      tooltip: "✅ Listed on Dexscreener",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20 border-blue-500/50",
      priority: 8,
    });
  }

  // Sort by priority and limit
  const sortedBadges = badges
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxBadges);

  if (sortedBadges.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {sortedBadges.map((badge, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium transition-colors cursor-help",
                  badge.bgColor,
                  badge.color
                )}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs bg-panel border border-gray-700 text-white z-50"
            >
              <p className="text-sm">{badge.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
