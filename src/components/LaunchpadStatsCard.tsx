"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Rocket, Sparkles } from "lucide-react";
import { getPlatformLogo, getPlatformIcon } from "@/utils/platformLogos";

interface LaunchpadStats {
  launchpad: string;
  stats1d: {
    mints: number;
    graduates: number;
    volume: number;
    runners: number;
    traders: number;
    marketShare: number;
  };
  stats7d: {
    mints: number;
    graduates: number;
    volume: number;
    runners: number;
    traders: number;
    marketShare: number;
  };
  stats30d: {
    mints: number;
    graduates: number;
    volume: number;
    runners: number;
    traders: number;
    marketShare: number;
  };
}

interface LaunchpadStatsData {
  launchpads: LaunchpadStats[];
}

const launchpadDisplayNames: Record<string, string> = {
  "pump.fun": "Pump.fun",
  "moonshot": "Moonshot",
  "moonit": "Moonit",
  "jup-studio": "Jupiter Studio",
  "raydium-launchlab": "Raydium Launchlab",
  "letsbonk.fun": "LetsBonk.fun",
  "met-dbc": "Meteora DBC",
  "bags.fun": "BAGS",
  "america.fun": "America.fun",
  "daos.fun": "DAOs.fun",
  "heaven": "Heaven",
  "boop": "Boop",
};

export default function LaunchpadStatsCard() {
  const [stats, setStats] = useState<LaunchpadStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1d" | "7d" | "30d">("1d");
  const [selectedLaunchpads, setSelectedLaunchpads] = useState<string[]>([
    "pump.fun",
    "moonshot",
    "moonit",
    "jup-studio",
    "raydium-launchlab",
    "letsbonk.fun",
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("https://datapi.jup.ag/v3/launchpads/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch launchpad stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch launchpad stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="bg-gradient-to-br from-panel via-panel-elev/50 to-panel border border-gray-800/50 rounded-xl p-4 shadow-lg">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-4 bg-gray-800/50 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-800/30 rounded w-48"></div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-8 bg-gray-800/30 rounded-md"></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 bg-gray-800/30 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredLaunchpads = stats.launchpads
    .filter((lp) => selectedLaunchpads.includes(lp.launchpad))
    .sort((a, b) => {
      const aStats = a[`stats${selectedTimeframe}` as keyof LaunchpadStats] as LaunchpadStats['stats1d'];
      const bStats = b[`stats${selectedTimeframe}` as keyof LaunchpadStats] as LaunchpadStats['stats1d'];
      return bStats.volume - aStats.volume; // Sort by volume
    })
    .slice(0, 6); // Show top 6

  const getStatsForTimeframe = (lp: LaunchpadStats) => {
    switch (selectedTimeframe) {
      case "1d":
        return lp.stats1d;
      case "7d":
        return lp.stats7d;
      case "30d":
        return lp.stats30d;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="bg-gradient-to-br from-panel via-panel-elev/50 to-panel border border-gray-800/50 rounded-xl p-4 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Launchpad Stats</h2>
          <p className="text-xs text-gray-500 mt-0.5">Performance metrics across top platforms</p>
        </div>
        <div className="flex gap-1 bg-panel-elev/50 p-1 rounded-lg border border-gray-800/50">
          {(["1d", "7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedTimeframe === tf
                  ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-sm shadow-purple-500/20 border border-purple-500/40"
                  : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {filteredLaunchpads.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No stats available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredLaunchpads.map((lp, index) => {
            const timeframeStats = getStatsForTimeframe(lp);
            const displayName = launchpadDisplayNames[lp.launchpad] || lp.launchpad;
            const platformLogo = getPlatformLogo(lp.launchpad);
            const platformIcon = getPlatformIcon(lp.launchpad);

            return (
              <div
                key={lp.launchpad}
                className="group relative bg-gradient-to-br from-panel-elev/80 via-panel-elev/60 to-panel-elev/80 border border-gray-800/40 rounded-xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-blue-500/0 to-green-500/0 group-hover:from-purple-500/5 group-hover:via-blue-500/5 group-hover:to-green-500/5 transition-all pointer-events-none" />
                
                {/* Rank badge */}
                <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full flex items-center justify-center text-[10px] font-bold text-purple-300 shadow-sm">
                  #{index + 1}
                </div>

                {/* Header with logo and name */}
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className="relative w-7 h-7 flex-shrink-0">
                    {platformLogo ? (
                      <img
                        src={platformLogo}
                        alt={displayName}
                        className="w-full h-full rounded-lg object-cover ring-1 ring-gray-800/50 group-hover:ring-purple-500/50 transition-all"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs fallback-icon ring-1 ring-gray-800/50 group-hover:ring-purple-500/50 transition-all"
                      style={{ display: platformLogo ? 'none' : 'flex' }}
                    >
                      {platformIcon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 transition-all">
                      {displayName}
                    </h3>
                    <div className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-[9px] font-semibold text-purple-300 inline-block mt-1">
                      {formatPercent(timeframeStats.marketShare)}
                    </div>
                  </div>
                </div>

                {/* Stats grid - improved spacing */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 group-hover:border-blue-500/40 transition-all">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Mints</span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-300">
                      {timeframeStats.mints >= 1000
                        ? `${(timeframeStats.mints / 1000).toFixed(1)}K`
                        : timeframeStats.mints.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20 group-hover:border-green-500/40 transition-all">
                    <div className="flex items-center gap-1.5">
                      <Rocket className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Grads</span>
                    </div>
                    <span className="text-[11px] font-bold text-green-300">
                      {timeframeStats.graduates.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20 group-hover:border-purple-500/40 transition-all">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Volume</span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-300 truncate ml-1">
                      {formatNumber(timeframeStats.volume)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20 group-hover:border-orange-500/40 transition-all">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Traders</span>
                    </div>
                    <span className="text-[11px] font-bold text-orange-300">
                      {timeframeStats.traders >= 1000
                        ? `${(timeframeStats.traders / 1000).toFixed(1)}K`
                        : timeframeStats.traders.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
