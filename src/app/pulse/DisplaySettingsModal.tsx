"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface DisplaySettingsModalProps {
  onClose: () => void;
  displaySettings: {
    metricsSize: "small" | "large";
    quickBuySize: "small" | "large" | "mega" | "ultra";
    grey: boolean;
    showSearchBar: boolean;
    noDecimals: boolean;
    showHiddenTokens: boolean;
    unhideOnMigrated: boolean;
    circleImages: boolean;
    progressBar: boolean;
    spacedTables: boolean;
  };
  setDisplaySettings: (settings: any) => void;
}

export function DisplaySettingsModal({
  onClose,
  displaySettings,
  setDisplaySettings,
}: DisplaySettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "layout" | "metrics" | "row" | "extras"
  >("layout");

  const updateSetting = (key: string, value: any) => {
    setDisplaySettings({ ...displaySettings, [key]: value });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      {/* Modal */}
      <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-panel border-2 border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
        <div className="p-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-700/50">
            <h3 className="text-lg font-bold text-white">Display</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-panel-elev rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b-2 border-gray-700/50 pb-1">
            {[
              { id: "layout", label: "Layout" },
              { id: "metrics", label: "Metrics" },
              { id: "row", label: "Row" },
              { id: "extras", label: "Extras" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`px-4 py-2 text-sm font-semibold transition-all cursor-pointer border-b-2 ${
                  activeTab === id
                    ? "text-primary border-primary"
                    : "text-gray-400 hover:text-white border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-5">
            {activeTab === "layout" && (
              <>
                {/* Metrics Size */}
                <div className="pb-4 border-b border-gray-700/30">
                  <div className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                    MC 77K
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSetting("metricsSize", "small")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-2 flex-shrink-0 ${
                        displaySettings.metricsSize === "small"
                          ? "bg-primary-dark text-white border-primary"
                          : "bg-panel-elev text-gray-400 hover:text-white border-gray-700/50 hover:border-gray-600"
                      }`}
                    >
                      Small
                    </button>
                    <button
                      onClick={() => updateSetting("metricsSize", "large")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-2 flex-shrink-0 ${
                        displaySettings.metricsSize === "large"
                          ? "bg-primary-dark text-white border-primary"
                          : "bg-panel-elev text-gray-400 hover:text-white border-gray-700/50 hover:border-gray-600"
                      }`}
                    >
                      Large
                    </button>
                  </div>
                </div>

                {/* Quick Buy Size */}
                <div className="pb-4 border-b border-gray-700/30">
                  <div className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                    Quick Buy
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["small", "large", "mega", "ultra"].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSetting("quickBuySize", size)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border-2 flex items-center gap-2 ${
                          displaySettings.quickBuySize === size
                            ? "bg-primary-dark text-white border-primary"
                            : "bg-panel-elev text-gray-400 hover:text-white border-gray-700/50 hover:border-gray-600"
                        }`}
                      >
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                          47
                        </span>
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Option */}
                <div className="pb-4 border-b border-gray-700/30">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.grey}
                        onChange={(e) => updateSetting("grey", e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.grey
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.grey && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Grey
                    </span>
                  </label>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.showSearchBar}
                        onChange={(e) =>
                          updateSetting("showSearchBar", e.target.checked)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.showSearchBar
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.showSearchBar && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Show Search Bar
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.noDecimals}
                        onChange={(e) =>
                          updateSetting("noDecimals", e.target.checked)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.noDecimals
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.noDecimals && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      # No Decimals
                    </span>
                  </label>
                </div>
              </>
            )}

            {activeTab === "metrics" && (
              <div className="text-sm text-gray-400">
                Metrics customization coming soon
              </div>
            )}

            {activeTab === "row" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-gray-700/30">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="radio"
                        name="hiddenTokens"
                        checked={displaySettings.showHiddenTokens}
                        onChange={() => updateSetting("showHiddenTokens", true)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                          displaySettings.showHiddenTokens
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.showHiddenTokens && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Show Hidden Tokens
                    </span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="radio"
                        name="unhideMigrated"
                        checked={displaySettings.unhideOnMigrated}
                        onChange={() => updateSetting("unhideOnMigrated", true)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                          displaySettings.unhideOnMigrated
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.unhideOnMigrated && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Unhide on Migrated
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "extras" && (
              <div className="space-y-4">
                <div className="space-y-3 pb-4 border-b border-gray-700/30">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.circleImages}
                        onChange={(e) =>
                          updateSetting("circleImages", e.target.checked)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.circleImages
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.circleImages && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Circle Images
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.progressBar}
                        onChange={(e) =>
                          updateSetting("progressBar", e.target.checked)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.progressBar
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.progressBar && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Progress Bar
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={displaySettings.spacedTables}
                        onChange={(e) =>
                          updateSetting("spacedTables", e.target.checked)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          displaySettings.spacedTables
                            ? "bg-primary border-primary"
                            : "bg-panel-elev border-gray-600 group-hover:border-gray-500"
                        }`}
                      >
                        {displaySettings.spacedTables && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Spaced Tables
                    </span>
                  </label>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                    Customize rows
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Image Reuse",
                      "Market Cap",
                      "Volume",
                      "Fees",
                      "TX",
                      "Socials",
                      "Holders",
                      "Pro Traders",
                      "KOLs",
                      "Dev Migrations",
                      "Dev Creations",
                      "Top 10 Holders",
                    ].map((item) => (
                      <button
                        key={item}
                        className="px-3 py-1.5 text-xs font-medium bg-panel-elev hover:bg-panel rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-all cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
