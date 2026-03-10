/**
 * Mobula API Endpoint Test Script
 * Tests both GET (basic views) and POST (custom views) endpoints
 */

import axios from "axios";

const API_KEY = "67a2ba93-2d56-4522-8301-7482ff07877f";

const MOBULA_GET_API = "https://api.mobula.io/api/2/pulse";
const MOBULA_POST_API = "https://pulse-v2-api.mobula.io/api/2/pulse";

const SOLANA_POOL_TYPES = [
  "pumpfun",
  "meteora",
  "moonshot",
  "jupiter",
  "raydium",
  "moonit",
  "letsbonk",
];

const headers = {
  Authorization: API_KEY,
  "Content-Type": "application/json",
};

function ok(label: string, count: number, ms: number) {
  console.log(`  ✅ ${label}: ${count} tokens [${ms}ms]`);
}

function fail(label: string, err: any) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message || err?.message || "Unknown error";
  console.log(`  ❌ ${label}: HTTP ${status ?? "N/A"} — ${msg}`);
}

async function testGet() {
  console.log("\n📡 GET /api/2/pulse (basic views: new, bonding, bonded)");
  const params = new URLSearchParams({
    assetMode: "true",
    chainId: "solana:solana",
    poolTypes: SOLANA_POOL_TYPES.join(","),
    limit: "20",
    offset: "0",
  });
  const url = `${MOBULA_GET_API}?${params}`;
  const t0 = Date.now();
  try {
    const res = await axios.get(url, { headers, timeout: 15000 });
    const data = res.data;
    ok("new",     (data.new?.data     || []).length, Date.now() - t0);
    ok("bonding", (data.bonding?.data || []).length, Date.now() - t0);
    ok("bonded",  (data.bonded?.data  || []).length, Date.now() - t0);
    // Show sample token from "new" if available
    const sample = data.new?.data?.[0];
    if (sample) {
      console.log(`\n  Sample token (new): ${sample.symbol} — $${sample.price?.toFixed(6)} | MC: $${sample.marketCap ?? sample.market_cap}`);
    }
  } catch (e) {
    fail("GET /api/2/pulse", e);
  }
}

async function testPost() {
  console.log("\n📡 POST /api/2/pulse (custom views: trending, quality-tokens, high-volume, price-gainers)");
  const payload = {
    assetMode: true,
    views: [
      {
        name: "trending",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 20,
      },
      {
        name: "quality-tokens",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 20,
        filters: {
          volume_24h: { gte: 5000 },
          holders_count: { gte: 50 },
          dexscreenerListed: true,
        },
      },
      {
        name: "high-volume",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 20,
        filters: {
          volume_1h: { gte: 1000 },
          market_cap: { gte: 5000, lte: 50000 },
          trades_1h: { gte: 10 },
        },
      },
      {
        name: "price-gainers",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "price_change_24h",
        sortOrder: "desc",
        limit: 20,
      },
    ],
  };

  const t0 = Date.now();
  try {
    const res = await axios.post(MOBULA_POST_API, payload, { headers, timeout: 20000 });
    const data = res.data;
    ok("trending",      (data.trending?.data            || []).length, Date.now() - t0);
    ok("quality-tokens",(data["quality-tokens"]?.data   || []).length, Date.now() - t0);
    ok("high-volume",   (data["high-volume"]?.data      || []).length, Date.now() - t0);
    ok("price-gainers", (data["price-gainers"]?.data    || []).length, Date.now() - t0);
    // Show pool type breakdown for trending
    const trending = data.trending?.data || [];
    const byPool: Record<string, number> = {};
    for (const t of trending) {
      byPool[t.type || "unknown"] = (byPool[t.type || "unknown"] || 0) + 1;
    }
    console.log(`\n  Pool type breakdown (trending): ${JSON.stringify(byPool)}`);
  } catch (e) {
    fail("POST /api/2/pulse", e);
  }
}

async function testAlternateDomain() {
  console.log("\n📡 POST (alternate domain) — pulse-v2-api.mobula.io");
  const t0 = Date.now();
  const payload = {
    assetMode: true,
    views: [
      {
        name: "trending",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 5,
      },
    ],
  };
  try {
    const res = await axios.post(MOBULA_POST_API, payload, { headers, timeout: 15000 });
    ok("trending (alt domain)", (res.data.trending?.data || []).length, Date.now() - t0);
  } catch (e) {
    fail("POST (alt domain)", e);
    // Try main domain as fallback
    console.log("  ↪ Trying main api.mobula.io as fallback...");
    const t1 = Date.now();
    try {
      const res2 = await axios.post("https://api.mobula.io/api/2/pulse", payload, { headers, timeout: 15000 });
      ok("trending (main domain fallback)", (res2.data.trending?.data || []).length, Date.now() - t1);
    } catch (e2) {
      fail("POST (main domain fallback)", e2);
    }
  }
}

(async () => {
  console.log("🔑 API Key:", API_KEY.slice(0, 8) + "...");
  console.log("================================================================");
  await testGet();
  await testPost();
  await testAlternateDomain();
  console.log("\n================================================================");
  console.log("Done.");
})();
