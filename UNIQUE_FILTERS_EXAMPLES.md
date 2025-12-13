# Unique Filter Examples for Your Platform

These filters will make your platform stand out from competitors like xfractal, Axiom, and apeing.

---

## 1. Safe Tokens Filter 🛡️

**What it does**: Only shows tokens that pass comprehensive safety checks

```typescript
const safeTokensPayload = {
  assetMode: true,
  compressed: false,
  views: [
    {
      name: "safe-tokens",
      chainId: ["solana:solana"],
      sortBy: "volume_1h",
      sortOrder: "desc",
      limit: 50,
      filters: {
        // Volume & Market Cap
        volume_1h: { gte: 5000 },
        market_cap: { gte: 10000 },
        liquidity: { gte: 5000 },

        // Security Checks
        "security.honeypot": false,
        "security.noMintAuthority": true,
        "security.buyTax": { lte: "1.0" },
        "security.sellTax": { lte: "5.0" },

        // Holdings Distribution
        top_10_holdings_percentage: { lte: 35 },
        dev_holdings_percentage: { lte: 10 },

        // Listing Status
        dexscreener_listed: true,
      },
    },
  ],
};
```

**UI Badge**: `🛡️ SAFE` (green badge)

**Why users love it**: Peace of mind - no honeypots, low taxes, no rug risk

---

## 2. Early Gems Filter 💎

**What it does**: Finds promising low-cap tokens before they moon

```typescript
const earlyGemsPayload = {
  assetMode: true,
  views: [
    {
      name: "early-gems",
      chainId: ["solana:solana"],
      sortBy: "organic_volume_1h",
      sortOrder: "desc",
      limit: 30,
      filters: {
        // Sweet spot market cap
        market_cap: { gte: 5000, lte: 100000 },

        // Growing community
        holders_count: { gte: 50, lte: 500 },

        // Real organic activity
        organic_volume_1h: { gte: 2000 },
        organic_traders_1h: { gte: 20 },

        // Decentralized holdings
        top_10_holdings_percentage: { lte: 25 },
        dev_holdings_percentage: { lte: 10 },

        // Pro interest
        pro_traders_count: { gte: 3 },

        // Safety
        "security.honeypot": false,
      },
    },
  ],
};
```

**UI Badge**: `💎 EARLY GEM` (purple badge)

**Why users love it**: Get in early on potential 10-100x tokens

---

## 3. Smart Money Tracker 🧠

**What it does**: Shows tokens that professional traders are accumulating

```typescript
const smartMoneyPayload = {
  assetMode: true,
  views: [
    {
      name: "smart-money",
      chainId: ["solana:solana"],
      sortBy: "smart_traders_buys",
      sortOrder: "desc",
      limit: 30,
      filters: {
        // Smart trader activity
        smart_traders_count: { gte: 5 },
        smart_traders_buys: { gte: 10 },

        // Pro trader interest
        pro_traders_count: { gte: 3 },
        pro_traders_buys: { gte: 5 },

        // Minimum size
        volume_1h: { gte: 5000 },
        market_cap: { gte: 10000 },

        // Fresh activity (last hour)
        fresh_traders_buys: { gte: 5 },
      },
    },
  ],
};
```

**UI Badge**: `🧠 SMART MONEY` (blue badge)

**Why users love it**: Follow successful traders, copy their moves

---

## 4. Graduation Watch 🎓

**What it does**: Shows tokens about to complete bonding curve (often pumps after)

```typescript
const graduationPayload = {
  assetMode: true,
  views: [
    {
      name: "graduation-watch",
      chainId: ["solana:solana"],
      sortBy: "bonding_percentage",
      sortOrder: "desc",
      limit: 20,
      filters: {
        // Almost bonded
        bonded: false,
        bonding_percentage: { gte: 80, lt: 100 },

        // Strong momentum
        volume_1h: { gte: 3000 },
        organic_volume_1h: { gte: 2000 },

        // Growing community
        holders_count: { gte: 100 },

        // Recent activity
        trades_1h: { gte: 50 },
      },
    },
  ],
};
```

**UI Badge**: `🎓 GRADUATING` (orange badge with percentage)

**Why users love it**: Catch tokens right before they graduate and pump

---

## 5. Organic Volume Leaders 🌱

**What it does**: Shows highest organic (non-bot) volume tokens

```typescript
const organicLeadersPayload = {
  assetMode: true,
  views: [
    {
      name: "organic-leaders",
      chainId: ["solana:solana"],
      sortBy: "organic_volume_1h",
      sortOrder: "desc",
      limit: 40,
      filters: {
        // High organic activity
        organic_volume_1h: { gte: 5000 },
        organic_traders_1h: { gte: 30 },

        // Organic vs total ratio > 70%
        // (You'd calculate this client-side)

        // Minimum market cap
        market_cap: { gte: 10000 },

        // Good liquidity
        liquidity: { gte: 5000 },
      },
    },
  ],
};
```

**UI Badge**: `🌱 ORGANIC` (green badge)

**Why users love it**: Real traders, not bots - authentic interest

---

## 6. Low-Risk Plays 🟢

**What it does**: Conservative options with multiple safety factors

```typescript
const lowRiskPayload = {
  assetMode: true,
  views: [
    {
      name: "low-risk",
      chainId: ["solana:solana"],
      sortBy: "volume_24h",
      sortOrder: "desc",
      limit: 30,
      filters: {
        // Already bonded (safer)
        bonded: true,

        // Good size
        market_cap: { gte: 50000 },
        liquidity: { gte: 10000 },

        // Security
        "security.honeypot": false,
        "security.noMintAuthority": true,

        // Decentralized
        top_10_holdings_percentage: { lte: 30 },
        dev_holdings_percentage: { lte: 5 },

        // Active trading
        volume_24h: { gte: 50000 },
        holders_count: { gte: 200 },
      },
    },
  ],
};
```

**UI Badge**: `🟢 LOW RISK` (green badge)

**Why users love it**: Sleep well at night with safer investments

---

## 7. Viral Potential 📈

**What it does**: Tokens showing signs of going viral

```typescript
const viralPotentialPayload = {
  assetMode: true,
  views: [
    {
      name: "viral-potential",
      chainId: ["solana:solana"],
      sortBy: "holders_count",
      sortOrder: "desc",
      limit: 30,
      filters: {
        // Rapid growth
        price_change_1h: { gte: 20 },
        volume_change_1h: { gte: 50 }, // If available

        // Growing fast
        holders_count: { gte: 100 },
        trades_1h: { gte: 100 },

        // Fresh organic activity
        fresh_traders_count: { gte: 20 },
        fresh_traders_buys: { gte: 30 },

        // Small but growing
        market_cap: { gte: 10000, lte: 500000 },
      },
    },
  ],
};
```

**UI Badge**: `📈 VIRAL` (pink badge)

**Why users love it**: Catch trends before they explode

---

## 8. Whale-Free Zone 🐋

**What it does**: Tokens without whale concentration risk

```typescript
const whaleFreePayload = {
  assetMode: true,
  views: [
    {
      name: "whale-free",
      chainId: ["solana:solana"],
      sortBy: "volume_1h",
      sortOrder: "desc",
      limit: 40,
      filters: {
        // Decentralized holdings
        top_10_holdings_percentage: { lte: 20 },
        top_50_holdings_percentage: { lte: 50 },

        // No whales
        dev_holdings_percentage: { lte: 5 },
        insiders_holdings_percentage: { lte: 5 },

        // Good distribution
        holders_count: { gte: 150 },

        // Active trading
        volume_1h: { gte: 3000 },
        market_cap: { gte: 20000 },
      },
    },
  ],
};
```

**UI Badge**: `🐋 NO WHALES` (cyan badge)

**Why users love it**: Reduced dump risk from large holders

---

## 9. Sniper-Proof 🎯

**What it does**: Tokens with low sniper holdings (fair launch)

```typescript
const sniperProofPayload = {
  assetMode: true,
  views: [
    {
      name: "sniper-proof",
      chainId: ["solana:solana"],
      sortBy: "created_at",
      sortOrder: "desc",
      limit: 30,
      filters: {
        // Low sniper presence
        snipers_holdings_percentage: { lte: 5 },
        snipers_count: { lte: 3 },

        // Fair distribution
        bundlers_holdings_percentage: { lte: 5 },
        bundlers_count: { lte: 2 },

        // Growing organically
        holders_count: { gte: 50 },
        organic_traders_1h: { gte: 15 },

        // Recent launch
        // created_at within last 24h (you'd need to calculate)
      },
    },
  ],
};
```

**UI Badge**: `🎯 FAIR LAUNCH` (yellow badge)

**Why users love it**: Everyone gets fair entry, not just snipers

---

## 10. Combo Filter: The Perfect Token 🏆

**What it does**: Combines all the best criteria

```typescript
const perfectTokenPayload = {
  assetMode: true,
  views: [
    {
      name: "perfect-tokens",
      chainId: ["solana:solana"],
      sortBy: "organic_volume_1h",
      sortOrder: "desc",
      limit: 10,
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
    },
  ],
};
```

**UI Badge**: `🏆 PERFECT` (gold badge)

**Why users love it**: The cream of the crop

---

## Implementation Tips

### Display the Score

```typescript
function calculateTokenScore(token: any) {
  let score = 0;

  // Security (30 points)
  if (!token.security?.honeypot) score += 10;
  if (token.security?.noMintAuthority) score += 10;
  if (parseFloat(token.security?.sellTax || "100") <= 5) score += 10;

  // Distribution (25 points)
  if (token.top10HoldingsPercentage <= 25) score += 15;
  if (token.devHoldingsPercentage <= 5) score += 10;

  // Smart Money (25 points)
  if (token.smartTradersCount >= 3) score += 15;
  if (token.proTradersCount >= 2) score += 10;

  // Activity (20 points)
  if (token.organic_volume_1h >= 3000) score += 10;
  if (token.holdersCount >= 100) score += 10;

  return score; // 0-100 scale
}
```

### Color-Code the Badges

```typescript
const badgeColors = {
  safe: "bg-green-500",
  earlyGem: "bg-purple-500",
  smartMoney: "bg-blue-500",
  graduating: "bg-orange-500",
  organic: "bg-emerald-500",
  lowRisk: "bg-green-600",
  viral: "bg-pink-500",
  whaleFree: "bg-cyan-500",
  sniperProof: "bg-yellow-500",
  perfect: "bg-amber-500",
};
```

### Show Why It Matches

```typescript
function getMatchReasons(token: any, filterName: string) {
  const reasons = [];

  if (filterName === "safe-tokens") {
    if (!token.security?.honeypot) reasons.push("✓ Not a honeypot");
    if (token.security?.noMintAuthority) reasons.push("✓ Mint disabled");
    if (token.top10HoldingsPercentage <= 35) reasons.push("✓ Decentralized");
  }

  return reasons;
}
```

---

## Advanced: Combine Filters

```typescript
// Let users combine multiple filters
const combinedPayload = {
  assetMode: true,
  views: [
    {
      name: "safe-early-gems",
      chainId: ["solana:solana"],
      sortBy: "organic_volume_1h",
      sortOrder: "desc",
      limit: 20,
      filters: {
        // Safe criteria
        "security.honeypot": false,
        "security.noMintAuthority": true,

        // Early gem criteria
        market_cap: { gte: 5000, lte: 100000 },
        holders_count: { gte: 50, lte: 500 },

        // Smart money
        smart_traders_count: { gte: 3 },
      },
    },
  ],
};
```

This creates a "Safe Early Gems" category that's better than either alone!

---

## React Component Example

```typescript
'use client';

import { useState } from 'react';

type FilterPreset = 'safe' | 'gems' | 'smart-money' | 'graduating' | 'all';

export function TokenDiscovery() {
  const [activeFilter, setActiveFilter] = useState<FilterPreset>('safe');

  const filterPresets = {
    safe: {
      name: '🛡️ Safe Tokens',
      description: 'Verified safe with low risk',
      payload: safeTokensPayload
    },
    gems: {
      name: '💎 Early Gems',
      description: 'Low cap with potential',
      payload: earlyGemsPayload
    },
    'smart-money': {
      name: '🧠 Smart Money',
      description: 'Follow pro traders',
      payload: smartMoneyPayload
    },
    graduating: {
      name: '🎓 Graduating',
      description: 'About to complete bonding',
      payload: graduationPayload
    },
    all: {
      name: '🔥 All Tokens',
      description: 'Everything trending',
      payload: { /* ... */ }
    }
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {Object.entries(filterPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key as FilterPreset)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeFilter === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-300'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Token List */}
      <div className="mt-4">
        {/* Render tokens based on activeFilter */}
      </div>
    </div>
  );
}
```

---

## Conclusion

These unique filters will make your platform **10x better** than competitors because:

1. **Users save time** - No need to manually check safety
2. **Better results** - Find gems before others do
3. **Lower risk** - Multiple safety layers
4. **Smart insights** - Follow successful traders
5. **Unique value** - Nobody else has these combinations

Start with 3-4 filters for MVP, then expand based on user feedback! 🚀
