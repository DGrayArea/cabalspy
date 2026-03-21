"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { multiChainTokenService } from "@/services/multichain-tokens";
import { toast } from "@/components/ui/use-toast";

export interface WatchlistToken {
  mint: string;
  symbol: string;
  name: string;
  image: string;
  network: string;
}

interface WatchlistContextType {
  watchlist: WatchlistToken[];
  addToWatchlist: (token: WatchlistToken) => void;
  removeFromWatchlist: (mint: string) => void;
  isInWatchlist: (mint: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);
  const { user } = useAuth();
  const lastPrices = useRef<Record<string, number>>({});

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cabalspy_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse watchlist", e);
      }
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem("cabalspy_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  // Real-time Price Alerts
  useEffect(() => {
    const handleUpdate = (token: any) => {
      if (watchlist.some(t => t.mint === token.id)) {
        const lastPrice = lastPrices.current[token.id];
        const currentPrice = token.price || 0;
        
        if (lastPrice && currentPrice > 0) {
          const change = ((currentPrice - lastPrice) / lastPrice) * 100;
          
          if (Math.abs(change) >= 5) { // 5% threshold
            toast({
              title: `${token.symbol} MOVEMENT`,
              description: `${token.symbol} is ${change > 0 ? "UP" : "DOWN"} ${Math.abs(change).toFixed(1)}% ($${currentPrice.toFixed(6)})`,
              variant: "default",
            });
          }
        }
        
        lastPrices.current[token.id] = currentPrice;
      }
    };

    multiChainTokenService.on("tokenUpdate", handleUpdate);
    return () => {
      multiChainTokenService.off("tokenUpdate", handleUpdate);
    };
  }, [watchlist]);

  // Sync from DB when user logs in
  useEffect(() => {
    if (user) {
      fetch("/api/watchlist")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            // Merge logic: DB data takes precedence, but we can keep unique local items
            setWatchlist((prev) => {
              const dbMints = new Set(data.map(t => t.mint));
              const localUnique = prev.filter(t => !dbMints.has(t.mint));
              
              // If we have local unique items, push them to DB
              if (localUnique.length > 0) {
                localUnique.forEach(token => {
                  fetch("/api/watchlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(token),
                  });
                });
              }
              
              return [...data, ...localUnique];
            });
          }
        })
        .catch((err) => console.error("Failed to sync watchlist from DB", err));
    }
  }, [user]);

  const addToWatchlist = useCallback((token: WatchlistToken) => {
    setWatchlist((prev) => {
      if (prev.some((t) => t.mint === token.mint)) return prev;
      return [...prev, token];
    });
    
    // Sync to DB if logged in
    if (user) {
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      }).catch(err => console.error("Failed to add to DB watchlist", err));
    }
  }, [user]);

  const removeFromWatchlist = useCallback((mint: string) => {
    setWatchlist((prev) => prev.filter((t) => t.mint !== mint));
    
    // Sync to DB if logged in
    if (user) {
      fetch(`/api/watchlist?mint=${mint}`, { 
        method: "DELETE" 
      }).catch(err => console.error("Failed to remove from DB watchlist", err));
    }
  }, [user]);

  const isInWatchlist = useCallback((mint: string) => {
    return watchlist.some((t) => t.mint === mint);
  }, [watchlist]);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
