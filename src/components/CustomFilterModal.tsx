"use client";

import { useState } from "react";
import {
  X,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
} from "lucide-react";
import { PROTOCOLS_LIST } from "@/utils/protocolLogos";
import Image from "next/image";

export interface CustomFilterConfig {
  protocols: string[];
  volume?: {
    timeframe: "1h" | "4h" | "24h";
    min?: number;
    max?: number;
  };
  marketCap?: {
    min?: number;
    max?: number;
  };
  priceChange?: {
    timeframe: "1h" | "4h" | "24h";
    min?: number;
    max?: number;
  };
  holders?: {
    min?: number;
    max?: number;
  };
  trades?: {
    timeframe: "1h" | "24h";
    min?: number;
  };
  liquidity?: {
    min?: number;
    max?: number;
  };
  smartTraders?: {
    min?: number;
  };
  topHoldingsPercentage?: {
    max?: number;
  };
  sortBy:
    | "volume_1h"
    | "volume_24h"
    | "price_change_1h"
    | "price_change_24h"
    | "market_cap"
    | "liquidity"
    | "trades_1h"
    | "holders_count"
    | "trendingScore1h";
  sortOrder: "asc" | "desc";
  limit: number;
}

interface CustomFilterModalProps {
  onClose: () => void;
  onApply: (config: CustomFilterConfig) => void;
  initialConfig?: CustomFilterConfig;
}

const DEFAULT_CONFIG: CustomFilterConfig = {
  protocols: ["pumpfun"],
  sortBy: "volume_1h",
  sortOrder: "desc",
  limit: 100,
};

// Use protocols from utility file
const PROTOCOLS = PROTOCOLS_LIST;

export function CustomFilterModal({
  onClose,
  onApply,
  initialConfig,
}: CustomFilterModalProps) {
  const [config, setConfig] = useState<CustomFilterConfig>(
    initialConfig || DEFAULT_CONFIG
  );
  const [activeTab, setActiveTab] = useState<
    "protocols" | "volume" | "market" | "traders" | "advanced"
  >("protocols");

  const updateConfig = (updates: Partial<CustomFilterConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const toggleProtocol = (protocol: string) => {
    const protocols = config.protocols.includes(protocol)
      ? config.protocols.filter((p) => p !== protocol)
      : [...config.protocols, protocol];
    updateConfig({ protocols });
  };

  const handleApply = () => {
    onApply(config);
    onClose();
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-51 p-4">
        <div className="w-full max-w-3xl bg-panel border-2 border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-panel-elev">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Filter className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Custom Filter</h3>
                <p className="text-sm text-gray-400">
                  Build your perfect token discovery query
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-panel rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-6 pt-4 border-b border-gray-700/30">
            {[
              { id: "protocols", label: "Protocols", icon: Activity },
              { id: "volume", label: "Volume & MC", icon: TrendingUp },
              { id: "market", label: "Price & Liquidity", icon: DollarSign },
              { id: "traders", label: "Traders", icon: Users },
              { id: "advanced", label: "Advanced", icon: Filter },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === id
                    ? "text-primary border-primary"
                    : "text-gray-400 hover:text-white border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* PROTOCOLS TAB */}
            {activeTab === "protocols" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Select Protocols to Monitor
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PROTOCOLS.map((protocol) => (
                      <button
                        key={protocol.id}
                        onClick={() => toggleProtocol(protocol.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          config.protocols.includes(protocol.id)
                            ? "border-primary bg-primary/10 text-white"
                            : "border-gray-700/50 hover:border-gray-600 text-gray-400 hover:text-white"
                        }`}
                      >
                        <div className="relative w-7 h-7 shrink-0 rounded-full overflow-hidden bg-panel-elev flex items-center justify-center">
                          {protocol.logo ? (
                            <Image
                              src={protocol.logo}
                              alt={protocol.name}
                              width={28}
                              height={28}
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                // Fallback to icon emoji if image fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.textContent = protocol.icon || "🪙";
                                }
                              }}
                            />
                          ) : (
                            <span className="text-lg">
                              {protocol.icon || "🪙"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="font-semibold text-sm leading-tight">
                            {protocol.name}
                          </span>
                          {protocol.description && (
                            <span className="text-xs text-gray-500 leading-tight mt-0.5">
                              {protocol.description
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {config.protocols.length === 0 && (
                    <p className="text-sm text-red-400 mt-2">
                      ⚠️ Select at least one protocol
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateConfig({ protocols: ["pumpfun"] })}
                      className="px-4 py-2 bg-panel-elev hover:bg-gray-700/50 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      Pump.fun Only
                    </button>
                    <button
                      onClick={() =>
                        updateConfig({
                          protocols: ["meteora", "raydium", "jupiter"],
                        })
                      }
                      className="px-4 py-2 bg-panel-elev hover:bg-gray-700/50 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      DEX Protocols
                    </button>
                    <button
                      onClick={() =>
                        updateConfig({
                          protocols: PROTOCOLS.map((p) => p.id),
                        })
                      }
                      className="px-4 py-2 bg-panel-elev hover:bg-gray-700/50 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      All Protocols
                    </button>
                    <button
                      onClick={() => updateConfig({ protocols: [] })}
                      className="px-4 py-2 bg-panel-elev hover:bg-gray-700/50 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VOLUME & MC TAB */}
            {activeTab === "volume" && (
              <div className="space-y-6">
                {/* Volume Filter */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Trading Volume
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(["1h", "4h", "24h"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() =>
                            updateConfig({
                              volume: { ...config.volume, timeframe: tf },
                            })
                          }
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.volume?.timeframe === tf
                              ? "bg-primary text-white"
                              : "bg-panel-elev text-gray-400 hover:text-white"
                          }`}
                        >
                          {tf.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                          Min Volume (USD)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g., 1000"
                          value={config.volume?.min || ""}
                          onChange={(e) =>
                            updateConfig({
                              volume: {
                                ...config.volume,
                                timeframe: config.volume?.timeframe || "1h",
                                min: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                          Max Volume (USD)
                        </label>
                        <input
                          type="number"
                          placeholder="No limit"
                          value={config.volume?.max || ""}
                          onChange={(e) =>
                            updateConfig({
                              volume: {
                                ...config.volume,
                                timeframe: config.volume?.timeframe || "1h",
                                max: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Cap Filter */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Market Cap
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Min Market Cap (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 5000"
                        value={config.marketCap?.min || ""}
                        onChange={(e) =>
                          updateConfig({
                            marketCap: {
                              ...config.marketCap,
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Max Market Cap (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 100000"
                        value={config.marketCap?.max || ""}
                        onChange={(e) =>
                          updateConfig({
                            marketCap: {
                              ...config.marketCap,
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() =>
                        updateConfig({
                          marketCap: { min: 5000, max: 50000 },
                        })
                      }
                      className="px-3 py-1.5 bg-panel-elev hover:bg-gray-700/50 rounded text-xs font-medium text-white"
                    >
                      $5K - $50K
                    </button>
                    <button
                      onClick={() =>
                        updateConfig({
                          marketCap: { min: 50000, max: 500000 },
                        })
                      }
                      className="px-3 py-1.5 bg-panel-elev hover:bg-gray-700/50 rounded text-xs font-medium text-white"
                    >
                      $50K - $500K
                    </button>
                    <button
                      onClick={() =>
                        updateConfig({
                          marketCap: { min: 500000 },
                        })
                      }
                      className="px-3 py-1.5 bg-panel-elev hover:bg-gray-700/50 rounded text-xs font-medium text-white"
                    >
                      $500K+
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PRICE & LIQUIDITY TAB */}
            {activeTab === "market" && (
              <div className="space-y-6">
                {/* Price Change Filter */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Price Change (%)
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(["1h", "4h", "24h"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() =>
                            updateConfig({
                              priceChange: {
                                ...config.priceChange,
                                timeframe: tf,
                              },
                            })
                          }
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.priceChange?.timeframe === tf
                              ? "bg-primary text-white"
                              : "bg-panel-elev text-gray-400 hover:text-white"
                          }`}
                        >
                          {tf.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                          Min Change (%)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g., 10"
                          value={config.priceChange?.min || ""}
                          onChange={(e) =>
                            updateConfig({
                              priceChange: {
                                ...config.priceChange,
                                timeframe:
                                  config.priceChange?.timeframe || "1h",
                                min: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                          Max Change (%)
                        </label>
                        <input
                          type="number"
                          placeholder="No limit"
                          value={config.priceChange?.max || ""}
                          onChange={(e) =>
                            updateConfig({
                              priceChange: {
                                ...config.priceChange,
                                timeframe:
                                  config.priceChange?.timeframe || "1h",
                                max: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Liquidity Filter */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Liquidity
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Min Liquidity (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 10000"
                        value={config.liquidity?.min || ""}
                        onChange={(e) =>
                          updateConfig({
                            liquidity: {
                              ...config.liquidity,
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Max Liquidity (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={config.liquidity?.max || ""}
                        onChange={(e) =>
                          updateConfig({
                            liquidity: {
                              ...config.liquidity,
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRADERS TAB */}
            {activeTab === "traders" && (
              <div className="space-y-6">
                {/* Holders */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Holder Count
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Min Holders
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 50"
                        value={config.holders?.min || ""}
                        onChange={(e) =>
                          updateConfig({
                            holders: {
                              ...config.holders,
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Max Holders
                      </label>
                      <input
                        type="number"
                        placeholder="No limit"
                        value={config.holders?.max || ""}
                        onChange={(e) =>
                          updateConfig({
                            holders: {
                              ...config.holders,
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Trades */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Trade Activity
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {(["1h", "24h"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() =>
                            updateConfig({
                              trades: { ...config.trades, timeframe: tf },
                            })
                          }
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            config.trades?.timeframe === tf
                              ? "bg-primary text-white"
                              : "bg-panel-elev text-gray-400 hover:text-white"
                          }`}
                        >
                          {tf.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Min Trades
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 10"
                        value={config.trades?.min || ""}
                        onChange={(e) =>
                          updateConfig({
                            trades: {
                              ...config.trades,
                              timeframe: config.trades?.timeframe || "1h",
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Smart Traders */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Smart Money Filter
                  </label>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Min Smart Traders
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 5"
                      value={config.smartTraders?.min || ""}
                      onChange={(e) =>
                        updateConfig({
                          smartTraders: {
                            min: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Tokens with smart trader activity
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === "advanced" && (
              <div className="space-y-6">
                {/* Top Holdings */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Holder Distribution
                  </label>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Max Top 10 Holdings (%)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 50"
                      value={config.topHoldingsPercentage?.max || ""}
                      onChange={(e) =>
                        updateConfig({
                          topHoldingsPercentage: {
                            max: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Filter out tokens where top 10 holders own more than this
                      %
                    </p>
                  </div>
                </div>

                {/* Sort */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Sort Results
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Sort By
                      </label>
                      <select
                        value={config.sortBy}
                        onChange={(e) =>
                          updateConfig({
                            sortBy: e.target
                              .value as CustomFilterConfig["sortBy"],
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-primary"
                      >
                        <option value="volume_1h">Volume (1h)</option>
                        <option value="volume_24h">Volume (24h)</option>
                        <option value="price_change_1h">
                          Price Change (1h)
                        </option>
                        <option value="price_change_24h">
                          Price Change (24h)
                        </option>
                        <option value="market_cap">Market Cap</option>
                        <option value="liquidity">Liquidity</option>
                        <option value="trades_1h">Trades (1h)</option>
                        <option value="holders_count">Holder Count</option>
                        <option value="trendingScore1h">Trending Score</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Order
                      </label>
                      <select
                        value={config.sortOrder}
                        onChange={(e) =>
                          updateConfig({
                            sortOrder: e.target.value as "asc" | "desc",
                          })
                        }
                        className="w-full px-3 py-2 bg-panel-elev border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-primary"
                      >
                        <option value="desc">Highest First</option>
                        <option value="asc">Lowest First</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Limit */}
                <div className="pt-4 border-t border-gray-700/30">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Result Limit
                  </label>
                  <div className="flex gap-2">
                    {[30, 50, 100, 200].map((limit) => (
                      <button
                        key={limit}
                        onClick={() => updateConfig({ limit })}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          config.limit === limit
                            ? "bg-primary text-white"
                            : "bg-panel-elev text-gray-400 hover:text-white"
                        }`}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700/50 bg-panel-elev">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-panel-elev hover:bg-gray-700/50 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={config.protocols.length === 0}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
