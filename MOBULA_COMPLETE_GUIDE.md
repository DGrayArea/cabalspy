# Mobula Integration - Complete Guide

**Complete documentation for Mobula Pulse API integration, custom filters, and unique filter examples**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Implementation](#core-implementation)
3. [Custom Filter Modal](#custom-filter-modal)
4. [Unique Filter Presets](#unique-filter-presets)
5. [Integration Examples](#integration-examples)
6. [API Reference](#api-reference)

---

## Overview

This guide covers the complete Mobula Pulse V2 integration for your token discovery platform. Mobula provides real-time data for Solana tokens across multiple protocols (Pump.fun, Raydium, Meteora, Jupiter, Moonshot, Moonit, LetsBonk).

### What Was Built

- **`mobula-pulse.ts`** - Core service with GET/POST endpoints + custom filters
- **`useMobulaPulse.ts`** - React hook for basic auto-refresh integration
- **`useCustomFilter.ts`** - React hook for advanced custom filters
- **`CustomFilterModal.tsx`** - Full-featured filter UI component
- **`protocolLogos.ts`** - Protocol metadata and logos

### Key Features

- ✅ **Auto-refresh** (30s intervals with smart merging)
- ✅ **100+ data fields** per token (price changes, volume, smart traders, etc.)
- ✅ **Custom filters** with UI modal
- ✅ **Pagination/infinite scroll**
- ✅ **Protocol logos** and visual selection
- ✅ **7 Solana protocols** supported

---

## Core Implementation

### 1. GET Endpoint (Basic Views)

Returns 3 views automatically: `new`, `bonding`, `bonded`

**Mapped to your filters:**

- `new` → "new" filter (New Pairs)
- `bonding` → "finalStretch" filter (Final Stretch)
- `bonded` → "graduated" filter (Graduated)

**Usage:**

```typescript
import { useMobulaPulse } from "@/hooks/useMobulaPulse";

const { tokens, isLoading, loadMore } = useMobulaPulse();

// Access specific views
const newTokens = tokens.new;
const bondingTokens = tokens.finalStretch;
const graduatedTokens = tokens.graduated;
```

### 2. POST Endpoint (Custom Views)

Returns 4 custom views: `trending`, `quality-tokens`, `high-volume`, `price-gainers`

**Mapped to your filters:**

- `trending` → "trending" filter (Trending)
- `quality-tokens` → "featured" filter (Featured)
- `high-volume` → "marketCap" filter (Top MC)
- `price-gainers` → "latest" filter (Price Gainers)

**Usage:**

```typescript
const trendingTokens = tokens.trending;
const featuredTokens = tokens.featured;
const highVolumeTokens = tokens.marketCap;
const gainersTokens = tokens.latest;
```

### 3. Token Data Structure

Every token includes:

```typescript
{
  // Basic Info
  name: "Token Name",
  symbol: "TKN",
  address: "...",
  price: 0.0001,
  marketCap: 10000,

  // Mobula Rich Data
  _mobula: true,
  _mobulaData: {
    // Price Changes (7 timeframes)
    priceChange1min: -99.97,
    priceChange5min: -99.97,
    priceChange1h: -99.94,
    priceChange4h: -99.94,
    priceChange6h: -99.94,
    priceChange12h: -99.94,
    priceChange24h: -99.94,

    // Volume Data (8 timeframes)
    volume1min: 0,
    volume5min: 0.00064,
    volume15min: 566829,
    volume1h: 6088534,
    volume4h: 6290614,
    volume6h: 6290614,
    volume12h: 6290614,
    volume24h: 6290614,

    // Buy/Sell Breakdown
    volumeBuy1h: 3056571,
    volumeSell1h: 3031963,
    volumeBuy24h: 3180465,
    volumeSell24h: 3110148,

    // Trade Activity
    trades1h: 7285,
    trades24h: 7494,
    buys1h: 4294,
    sells1h: 2991,

    // Smart Money 🧠 (UNIQUE!)
    smartTradersCount: 4,
    proTradersCount: 2,
    freshTradersCount: 0,
    insidersCount: 4,
    bundlersCount: 3,      // 🚩 RED FLAG
    snipersCount: 0,

    // Holdings Distribution
    holdersCount: 12,
    top10Holdings: 100,    // 🚩 RED FLAG
    top50Holdings: 100,
    top100Holdings: 100,
    devHoldings: 0,
    insidersHoldings: 4.39,
    bundlersHoldings: 99.99, // 🚩 RED FLAG!

    // Security Analysis
    security: {
      buyTax: "0.0000",
      sellTax: "0.0000",
      burnRate: "0.0000",
      noMintAuthority: true,  // ✅ Good
      transferPausable: false, // ✅ Good
      balanceMutable: false,   // ✅ Good
      isBlacklisted: false,
    },

    // Bonding (Pump.fun)
    bonded: false,
    bondingPercentage: 0,
    bondedAt: null,

    // ATH/ATL
    ath: 0.000103688,
    atl: 0.000042535,
    athDate: "2025-12-17T01:37:47.500Z",
    atlDate: "2025-12-17T01:08:30.700Z",

    // Trending Scores
    trendingScore1min: 0.65,
    trendingScore5min: 1.23,
    trendingScore15min: 2286.59,
    trendingScore1h: 19644.18,
    trendingScore24h: 20171.86,

    // Social & Listing
    socials: {
      twitter: "...",
      website: "...",
      telegram: "...",
    },
    dexscreenerListed: false,
    dexscreenerBoosted: false,

    // Pool Info
    poolAddress: "...",
    poolType: "pumpswap",
    deployer: "...",
    totalSupply: 999999508,
    circulatingSupply: 999999508,
  }
}
```

### 4. Filter Mapping

| Your Filter      | Mobula View    | Method | Description            |
| ---------------- | -------------- | ------ | ---------------------- |
| **trending**     | trending       | POST   | Top trending by volume |
| **new**          | new            | GET    | Newly created tokens   |
| **finalStretch** | bonding        | GET    | Bonding 80-100%        |
| **graduated**    | bonded         | GET    | 100% bonded            |
| **featured**     | quality-tokens | POST   | Quality filtered       |
| **marketCap**    | high-volume    | POST   | High volume            |
| **latest**       | price-gainers  | POST   | Top gainers 24h        |

### 5. Auto-Refresh & Merging

```typescript
// Automatically refreshes every 30 seconds
mobulaPulseManager.startAutoRefresh(() => {
  console.log("🔄 Data refreshed");
  updateTokens();
});

// Smart merging prevents duplicates
// - Compares by token ID
// - Adds new tokens
// - Updates existing tokens
```

### 6. Pagination/Infinite Scroll

```typescript
// Load more tokens for a filter
const { loadMore } = useMobulaPulse();

// When user scrolls to bottom
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      loadMore(filter);
    }
  };
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, [filter, loadMore]);
```

---

## Custom Filter Modal

A comprehensive UI modal that lets users build advanced queries with 100+ filter options.

### Features

#### 5 Organized Tabs

1. **Protocols** - Select DEXs/launchpads (with logos!)

   - Pump.fun 🚀
   - Meteora 🌠
   - Moonshot 🌙
   - Jupiter 🪐
   - Raydium ⚡
   - Moonit 🌙
   - LetsBonk 🐕

2. **Volume & Market Cap**

   - Volume filters (1h/4h/24h) with min/max
   - Market cap filters with min/max
   - Quick presets ($5K-$50K, $50K-$500K, $500K+)

3. **Price & Liquidity**

   - Price change % filters (1h/4h/24h)
   - Liquidity filters with min/max

4. **Traders**

   - Holder count filters
   - Trade activity filters (1h/24h)
   - **Smart Money filter** 🧠 (min smart traders)

5. **Advanced**
   - Top 10 holdings % (avoid whale concentration)
   - 9 sort options
   - Result limit (30/50/100/200)

### Integration

```typescript
import { CustomFilterModal } from "@/components/CustomFilterModal";
import { useCustomFilter } from "@/hooks/useCustomFilter";

export default function PulsePage() {
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const {
    tokens: customFilterTokens,
    isLoading,
    hasMore,
    applyFilter,
    loadMore,
    clearFilter,
    hasActiveFilter,
  } = useCustomFilter();

  return (
    <>
      {/* Filter Button */}
      <button onClick={() => setShowCustomFilter(true)}>
        <Filter className="w-4 h-4" />
        Custom Filter
        {hasActiveFilter && <span>✓</span>}
      </button>

      {/* Modal */}
      {showCustomFilter && (
        <CustomFilterModal
          onClose={() => setShowCustomFilter(false)}
          onApply={applyFilter}
        />
      )}

      {/* Display Results */}
      {hasActiveFilter ? (
        customFilterTokens.map(token => <TokenCard token={token} />)
      ) : (
        normalTokens.map(token => <TokenCard token={token} />)
      )}
    </>
  );
}
```

### Example Filters

#### 1. Early Gems 💎

```typescript
{
  protocols: ["pumpfun"],
  marketCap: { min: 5000, max: 50000 },
  holders: { min: 50 },
  volume: { timeframe: "1h", min: 1000 },
  smartTraders: { min: 5 },
  topHoldingsPercentage: { max: 50 },
  sortBy: "volume_1h",
  sortOrder: "desc",
}
```

#### 2. Smart Money Plays 🧠

```typescript
{
  protocols: ["pumpfun", "moonshot"],
  smartTraders: { min: 10 },
  volume: { timeframe: "1h", min: 5000 },
  topHoldingsPercentage: { max: 40 },
  sortBy: "trendingScore1h",
  sortOrder: "desc",
}
```

#### 3. Established Momentum 📈

```typescript
{
  protocols: ["jupiter", "raydium", "meteora"],
  marketCap: { min: 100000 },
  liquidity: { min: 50000 },
  priceChange: { timeframe: "24h", min: 10 },
  holders: { min: 200 },
  sortBy: "price_change_24h",
  sortOrder: "desc",
}
```

---

## Unique Filter Presets

Pre-built filters that make your platform stand out from competitors.

### 1. Safe Tokens 🛡️

**Shows tokens that pass comprehensive safety checks**

```typescript
{
  name: "safe-tokens",
  filters: {
    // Security ✅
    "security.honeypot": false,
    "security.noMintAuthority": true,
    "security.buyTax": { lte: "1.0" },
    "security.sellTax": { lte: "5.0" },

    // Distribution ✅
    top_10_holdings_percentage: { lte: 35 },
    dev_holdings_percentage: { lte: 10 },

    // Minimum Activity ✅
    volume_1h: { gte: 5000 },
    market_cap: { gte: 10000 },
    liquidity: { gte: 5000 },
    dexscreener_listed: true,
  },
}
```

**UI Badge**: `🛡️ SAFE` (green)

### 2. Early Gems 💎

**Finds promising low-cap tokens before they moon**

```typescript
{
  name: "early-gems",
  filters: {
    // Sweet spot 💎
    market_cap: { gte: 5000, lte: 100000 },
    holders_count: { gte: 50, lte: 500 },

    // Growing community 📈
    organic_volume_1h: { gte: 2000 },
    organic_traders_1h: { gte: 20 },

    // Decentralized ✅
    top_10_holdings_percentage: { lte: 25 },
    dev_holdings_percentage: { lte: 10 },

    // Pro interest 🧠
    pro_traders_count: { gte: 3 },

    // Safety ✅
    "security.honeypot": false,
  },
}
```

**UI Badge**: `💎 EARLY GEM` (purple)

### 3. Smart Money Tracker 🧠

**Tokens that professional traders are accumulating**

```typescript
{
  name: "smart-money",
  filters: {
    // Smart trader activity 🧠
    smart_traders_count: { gte: 5 },
    smart_traders_buys: { gte: 10 },
    pro_traders_count: { gte: 3 },
    pro_traders_buys: { gte: 5 },

    // Minimum size 📊
    volume_1h: { gte: 5000 },
    market_cap: { gte: 10000 },

    // Fresh activity 🆕
    fresh_traders_buys: { gte: 5 },
  },
  sortBy: "smart_traders_buys",
}
```

**UI Badge**: `🧠 SMART MONEY` (blue)

### 4. Graduation Watch 🎓

**Tokens about to complete bonding curve (often pump after)**

```typescript
{
  name: "graduation-watch",
  filters: {
    // Almost bonded 🎓
    bonded: false,
    bonding_percentage: { gte: 80, lt: 100 },

    // Strong momentum 🚀
    volume_1h: { gte: 3000 },
    organic_volume_1h: { gte: 2000 },

    // Growing community 📈
    holders_count: { gte: 100 },
    trades_1h: { gte: 50 },
  },
  sortBy: "bonding_percentage",
}
```

**UI Badge**: `🎓 GRADUATING 85%` (orange with %)

### 5. Organic Volume Leaders 🌱

**Highest organic (non-bot) volume tokens**

```typescript
{
  name: "organic-leaders",
  filters: {
    // High organic activity 🌱
    organic_volume_1h: { gte: 5000 },
    organic_traders_1h: { gte: 30 },

    // Minimum size 📊
    market_cap: { gte: 10000 },
    liquidity: { gte: 5000 },
  },
  sortBy: "organic_volume_1h",
}
```

**UI Badge**: `🌱 ORGANIC` (green)

### 6. Low-Risk Plays 🟢

**Conservative options with multiple safety factors**

```typescript
{
  name: "low-risk",
  filters: {
    // Already bonded ✅
    bonded: true,

    // Good size 📊
    market_cap: { gte: 50000 },
    liquidity: { gte: 10000 },

    // Security ✅
    "security.honeypot": false,
    "security.noMintAuthority": true,

    // Decentralized ✅
    top_10_holdings_percentage: { lte: 30 },
    dev_holdings_percentage: { lte: 5 },

    // Active 📈
    volume_24h: { gte: 50000 },
    holders_count: { gte: 200 },
  },
}
```

**UI Badge**: `🟢 LOW RISK` (green)

### 7. Viral Potential 📈

**Tokens showing signs of going viral**

```typescript
{
  name: "viral-potential",
  filters: {
    // Rapid growth 🚀
    price_change_1h: { gte: 20 },

    // Growing fast 📈
    holders_count: { gte: 100 },
    trades_1h: { gte: 100 },

    // Fresh activity 🆕
    fresh_traders_count: { gte: 20 },
    fresh_traders_buys: { gte: 30 },

    // Small but growing 💎
    market_cap: { gte: 10000, lte: 500000 },
  },
  sortBy: "holders_count",
}
```

**UI Badge**: `📈 VIRAL` (pink)

### 8. Whale-Free Zone 🐋

**Tokens without whale concentration risk**

```typescript
{
  name: "whale-free",
  filters: {
    // Decentralized 🌊
    top_10_holdings_percentage: { lte: 20 },
    top_50_holdings_percentage: { lte: 50 },
    dev_holdings_percentage: { lte: 5 },
    insiders_holdings_percentage: { lte: 5 },

    // Good distribution ✅
    holders_count: { gte: 150 },

    // Active 📈
    volume_1h: { gte: 3000 },
    market_cap: { gte: 20000 },
  },
}
```

**UI Badge**: `🐋 NO WHALES` (cyan)

### 9. Sniper-Proof 🎯

**Tokens with low sniper holdings (fair launch)**

```typescript
{
  name: "sniper-proof",
  filters: {
    // Low sniper presence 🎯
    snipers_holdings_percentage: { lte: 5 },
    snipers_count: { lte: 3 },
    bundlers_holdings_percentage: { lte: 5 },
    bundlers_count: { lte: 2 },

    // Fair distribution ✅
    holders_count: { gte: 50 },
    organic_traders_1h: { gte: 15 },
  },
  sortBy: "created_at",
}
```

**UI Badge**: `🎯 FAIR LAUNCH` (yellow)

### 10. The Perfect Token 🏆

**Combines all the best criteria**

```typescript
{
  name: "perfect-tokens",
  filters: {
    // Security ✅
    "security.honeypot": false,
    "security.noMintAuthority": true,
    "security.buyTax": { lte: "1.0" },
    "security.sellTax": { lte: "5.0" },

    // Distribution ✅
    top_10_holdings_percentage: { lte: 25 },
    dev_holdings_percentage: { lte: 5 },
    snipers_holdings_percentage: { lte: 5 },

    // Smart Money ✅
    smart_traders_count: { gte: 3 },
    pro_traders_count: { gte: 2 },

    // Activity ✅
    organic_volume_1h: { gte: 3000 },
    organic_traders_1h: { gte: 20 },
    holders_count: { gte: 100 },

    // Size ✅
    market_cap: { gte: 10000, lte: 200000 },
    liquidity: { gte: 5000 },
  },
}
```

**UI Badge**: `🏆 PERFECT` (gold)

---

## Integration Examples

### Complete Page Integration

```typescript
"use client";

import { useState, useMemo, useEffect } from "react";
import { Filter } from "lucide-react";
import { useMobulaPulse } from "@/hooks/useMobulaPulse";
import { useCustomFilter } from "@/hooks/useCustomFilter";
import { CustomFilterModal } from "@/components/CustomFilterModal";

export default function PulsePage() {
  // Basic filters (auto-refresh)
  const {
    tokens: mobulaTokens,
    isLoading: mobulaLoading,
    loadMore: loadMoreMobula
  } = useMobulaPulse();

  // Custom filter
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const {
    tokens: customFilterTokens,
    isLoading: customFilterLoading,
    hasMore,
    applyFilter,
    loadMore: loadMoreCustom,
    clearFilter,
    hasActiveFilter,
    currentConfig,
  } = useCustomFilter();

  // Active filter
  const [filter, setFilter] = useState("trending");

  // Determine which tokens to display
  const tokensToDisplay = useMemo(() => {
    if (hasActiveFilter) {
      return customFilterTokens;
    }

    switch (filter) {
      case "trending":
        return mobulaTokens.trending;
      case "new":
        return mobulaTokens.new;
      case "finalStretch":
        return mobulaTokens.finalStretch;
      case "graduated":
        return mobulaTokens.graduated;
      case "featured":
        return mobulaTokens.featured;
      case "marketCap":
        return mobulaTokens.marketCap;
      case "latest":
        return mobulaTokens.latest;
      default:
        return [];
    }
  }, [hasActiveFilter, customFilterTokens, filter, mobulaTokens]);

  // Infinite scroll
  useEffect(() => {
    if (hasActiveFilter && !hasMore) return;

    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (hasActiveFilter) {
          loadMoreCustom();
        } else {
          loadMoreMobula(filter as any);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasActiveFilter, hasMore, filter, loadMoreCustom, loadMoreMobula]);

  return (
    <div className="p-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        {/* Basic Filters */}
        <div className="flex gap-2">
          {[
            { id: "trending", label: "🔥 Trending" },
            { id: "new", label: "🆕 New" },
            { id: "finalStretch", label: "⏰ Final Stretch" },
            { id: "graduated", label: "🎓 Graduated" },
            { id: "featured", label: "⭐ Featured" },
            { id: "marketCap", label: "📊 Top MC" },
            { id: "latest", label: "📈 Gainers" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setFilter(id);
                if (hasActiveFilter) clearFilter();
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === id && !hasActiveFilter
                  ? "bg-primary text-white"
                  : "bg-panel-elev text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Filter Button */}
        <button
          onClick={() => setShowCustomFilter(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-semibold"
        >
          <Filter className="w-4 h-4" />
          Custom Filter
          {hasActiveFilter && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
              Active
            </span>
          )}
        </button>

        {/* Clear Filter */}
        {hasActiveFilter && (
          <button
            onClick={clearFilter}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-semibold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Active Filter Info */}
      {hasActiveFilter && currentConfig && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white mb-1">
                Custom Filter Active
              </h4>
              <p className="text-sm text-gray-400">
                {currentConfig.protocols.length} protocols • {customFilterTokens.length} tokens • Sorted by {currentConfig.sortBy}
              </p>
            </div>
            <button
              onClick={() => setShowCustomFilter(true)}
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              Edit Filter
            </button>
          </div>
        </div>
      )}

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokensToDisplay.map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </div>

      {/* Loading */}
      {(mobulaLoading || customFilterLoading) && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Custom Filter Modal */}
      {showCustomFilter && (
        <CustomFilterModal
          onClose={() => setShowCustomFilter(false)}
          onApply={applyFilter}
          initialConfig={currentConfig || undefined}
        />
      )}
    </div>
  );
}
```

### Token Card with Rich Data

```typescript
function TokenCard({ token }: { token: TokenData }) {
  const data = token._mobulaData;

  // Calculate buy/sell pressure
  const buySellRatio = data.volumeBuy1h / (data.volumeSell1h || 1);
  const pressure = buySellRatio > 1.2 ? "bullish" : buySellRatio < 0.8 ? "bearish" : "neutral";

  // Detect red flags
  const hasRedFlags =
    data.bundlersHoldings > 80 ||
    data.top10Holdings > 90 ||
    data.security?.balanceMutable ||
    data.security?.transferPausable;

  return (
    <div className="p-4 bg-panel-elev rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <img src={token.icon} className="w-10 h-10 rounded-full" />
        <div>
          <h3 className="font-bold text-white">{token.symbol}</h3>
          <p className="text-sm text-gray-400">{token.name}</p>
        </div>
      </div>

      {/* Price & Change */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-white">
          ${token.price.toFixed(8)}
        </div>
        <div className={`text-sm font-medium ${
          data.priceChange24h > 0 ? "text-green-500" : "text-red-500"
        }`}>
          {data.priceChange24h > 0 ? "+" : ""}{data.priceChange24h.toFixed(2)}% (24h)
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {data.smartTradersCount > 10 && (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded">
            🧠 Smart Money
          </span>
        )}

        {pressure === "bullish" && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
            🐂 Buy Pressure
          </span>
        )}

        {data.security?.noMintAuthority && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
            ✅ Mint Revoked
          </span>
        )}

        {hasRedFlags && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
            ⚠️ Red Flag
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-400">Market Cap:</span>
          <span className="text-white ml-1">${(token.marketCap / 1000).toFixed(1)}K</span>
        </div>
        <div>
          <span className="text-gray-400">Volume (1h):</span>
          <span className="text-white ml-1">${(data.volume1h / 1000).toFixed(1)}K</span>
        </div>
        <div>
          <span className="text-gray-400">Holders:</span>
          <span className="text-white ml-1">{data.holdersCount}</span>
        </div>
        <div>
          <span className="text-gray-400">Trades (1h):</span>
          <span className="text-white ml-1">{data.trades1h}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## API Reference

### Service Functions

```typescript
// Fetch basic views (GET)
fetchBasicViews(limit: number, offset: number): Promise<{
  new: TokenData[];
  bonding: TokenData[];
  bonded: TokenData[];
}>

// Fetch custom views (POST)
fetchCustomViews(limit: number, offset: number): Promise<{
  trending: TokenData[];
  "quality-tokens": TokenData[];
  "high-volume": TokenData[];
  "price-gainers": TokenData[];
}>

// Fetch single view (for pagination)
fetchSingleView(
  viewName: "trending" | "quality-tokens" | "high-volume" | "price-gainers",
  limit: number,
  offset: number
): Promise<TokenData[]>

// Fetch with custom filter
fetchCustomFilter(
  options: CustomFilterOptions,
  offset: number
): Promise<TokenData[]>
```

### React Hooks

```typescript
// Basic auto-refresh hook
useMobulaPulse(): {
  tokens: Record<FilterType, TokenData[]>;
  isLoading: boolean;
  error: string | null;
  loadMore: (filter: FilterType) => Promise<void>;
  refresh: () => void;
  enabled: boolean;
}

// Custom filter hook
useCustomFilter(): {
  tokens: TokenData[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  applyFilter: (config: CustomFilterOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  clearFilter: () => void;
  hasActiveFilter: boolean;
  currentConfig: CustomFilterOptions | null;
}
```

### Custom Filter Options

```typescript
interface CustomFilterOptions {
  protocols: string[]; // ["pumpfun", "raydium", ...]

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
```

---

## Why This Beats Competitors

| Feature            | Competitors | Your Platform      |
| ------------------ | ----------- | ------------------ |
| Filter Options     | 3-5 basic   | 100+ comprehensive |
| Smart Trader Data  | ❌ None     | ✅ Full access     |
| Multi-Protocol     | ❌ Limited  | ✅ 7 protocols     |
| Custom Filters     | ❌ None     | ✅ Full UI modal   |
| Timeframe Options  | 24h only    | 1h/4h/24h          |
| Red Flag Detection | ❌ None     | ✅ Automatic       |
| Buy/Sell Pressure  | ❌ None     | ✅ Real-time       |
| Whale Detection    | ❌ None     | ✅ Holdings %      |
| Auto-Refresh       | ❌ Manual   | ✅ Every 30s       |
| API Keys Required  | ✅ Yes      | ✅ Yes (included)  |

---

## Next Steps

1. ✅ Core service implemented
2. ✅ Custom filter modal created
3. ✅ Protocol logos added
4. ⏳ Integrate into your page.tsx
5. ⏳ Test with real data
6. ⏳ Add filter presets UI
7. ⏳ Add preset save/share (future)

**Ready to integrate? Use the examples above to get started!** 🚀
