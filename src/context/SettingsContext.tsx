"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export interface DisplaySettings {
  showChart: boolean;
  showLiquidity: boolean;
  showMarketCap: boolean;
  showVolume: boolean;
  showTransactions: boolean;
  metricsSize: "small" | "large";
  quickBuySize: "small" | "large" | "mega" | "ultra";
  grey: boolean;
  noDecimals: boolean;
  circleImages: boolean;
  progressBar: boolean;
  showSearchBar: boolean;
  showHiddenTokens: boolean;
  unhideOnMigrated: boolean;
  spacedTables: boolean;
}

const defaultSettings: DisplaySettings = {
  showChart: true,
  showLiquidity: true,
  showMarketCap: true,
  showVolume: true,
  showTransactions: true,
  metricsSize: "small",
  quickBuySize: "small",
  grey: false,
  noDecimals: false,
  circleImages: true,
  progressBar: false,
  showSearchBar: true,
  showHiddenTokens: false,
  unhideOnMigrated: true,
  spacedTables: false,
};

interface SettingsContextType {
  displaySettings: DisplaySettings;
  setDisplaySettings: (settings: Partial<DisplaySettings> | ((prev: DisplaySettings) => DisplaySettings)) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [displaySettings, setDisplaySettingsState] = useState<DisplaySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cabalspy_settings");
    if (saved) {
      try {
        setDisplaySettingsState((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error("Failed to parse local settings", e);
      }
    }
    setIsLoading(false);
  }, []);

  // Sync from DB when user logs in
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetch("/api/user/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data === "object" && !data.error) {
            setDisplaySettingsState((prev) => ({ ...prev, ...data }));
            // Also update LocalStorage to match DB
            localStorage.setItem("cabalspy_settings", JSON.stringify({ ...displaySettings, ...data }));
          }
        })
        .catch((err) => console.error("Failed to sync settings from DB", err))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  const setDisplaySettings = useCallback((update: Partial<DisplaySettings> | ((prev: DisplaySettings) => DisplaySettings)) => {
    setDisplaySettingsState((prev) => {
      const next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      
      // Save to LocalStorage
      localStorage.setItem("cabalspy_settings", JSON.stringify(next));
      
      // Sync to DB if logged in (debounced-ish via individual calls for now, or we could add a proper debounce)
      if (user) {
        fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch((err) => console.error("Failed to save settings to DB", err));
      }
      
      return next;
    });
  }, [user]);

  return (
    <SettingsContext.Provider value={{ displaySettings, setDisplaySettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
