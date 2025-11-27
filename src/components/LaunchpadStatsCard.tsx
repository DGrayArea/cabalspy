"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Coins, Rocket, BarChart3, Sparkles } from "lucide-react";
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
      <div className="bg-panel border border-gray-800/50 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-800/50 rounded w-1/3 mb-3"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-800/30 rounded-lg"></div>
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
    <div className="bg-panel border border-gray-800/50 rounded-lg p-3 hover:border-gray-700/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <h2 className="text-xs font-semibold text-white">Launchpad Stats</h2>
        </div>
        <div className="flex gap-1">
          {(["1d", "7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                selectedTimeframe === tf
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-panel-elev text-gray-500 hover:text-gray-400 border border-gray-800/50"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {filteredLaunchpads.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-xs">No stats available</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredLaunchpads.map((lp) => {
            const timeframeStats = getStatsForTimeframe(lp);
            const displayName = launchpadDisplayNames[lp.launchpad] || lp.launchpad;
            const platformLogo = getPlatformLogo(lp.launchpad);
            const platformIcon = getPlatformIcon(lp.launchpad);

            return (
              <div
                key={lp.launchpad}
                className="bg-panel-elev/50 border border-gray-800/30 rounded-lg p-2 hover:border-gray-700/50 hover:bg-panel-elev/70 transition-all group"
              >
                {/* Header with logo and name */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="relative w-4 h-4 flex-shrink-0">
                    {platformLogo ? (
                      <img
                        src={platformLogo}
                        alt={displayName}
                        className="w-4 h-4 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span
                      className="text-sm fallback-icon"
                      style={{ display: platformLogo ? 'none' : 'block' }}
                    >
                      {platformIcon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] font-semibold text-white truncate group-hover:text-purple-400 transition-colors leading-tight">
                      {displayName}
                    </h3>
                    <p className="text-[9px] text-gray-500 leading-tight">
                      {formatPercent(timeframeStats.marketShare)}
                    </p>
                  </div>
                </div>

                {/* Stats grid - more compact */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[9px] text-gray-500">Mints</span>
                    </div>
                    <span className="text-[10px] font-semibold text-white">
                      {timeframeStats.mints >= 1000
                        ? `${(timeframeStats.mints / 1000).toFixed(1)}K`
                        : timeframeStats.mints.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Rocket className="w-2.5 h-2.5 text-green-400" />
                      <span className="text-[9px] text-gray-500">Grads</span>
                    </div>
                    <span className="text-[10px] font-semibold text-green-400">
                      {timeframeStats.graduates.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5 text-purple-400" />
                      <span className="text-[9px] text-gray-500">Vol</span>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-400 truncate ml-1">
                      {formatNumber(timeframeStats.volume)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-orange-400" />
                      <span className="text-[9px] text-gray-500">Traders</span>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-400">
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
