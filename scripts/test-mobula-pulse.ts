import axios from "axios";

/*
 * MOBULA PULSE API ANALYSIS & IMPLEMENTATION STRATEGY
 * ====================================================
 *
 * WHAT TRADING TERMINALS LIKE XFRACTAL, AXIOM, APEING USE:
 * ---------------------------------------------------------
 * 1. WebSocket Connections (wss://pulse-v2-api.mobula.io)
 *    - Real-time data streaming
 *    - Multiple views simultaneously (up to 10 views per connection)
 *    - Automatic updates without polling
 *    - Lower latency (~50-200ms vs 500ms+ HTTP)
 *    - Reduced bandwidth (only send updates, not full datasets)
 *
 * 2. Multiple View Management
 *    - Trending tokens view (sorted by volume_1h)
 *    - New tokens view (sorted by created_at)
 *    - Bonding phase view (sorted by bonding_percentage)
 *    - Bonded tokens view (sorted by bonded_at)
 *    - Custom filtered views (by market_cap, liquidity, etc.)
 *
 * 3. Advanced Filtering
 *    - Security filters (buyTax, sellTax, isBlacklisted, noMintAuthority)
 *    - Holdings filters (top10HoldingsPercentage, devHoldingsPercentage, etc.)
 *    - Social filters (twitter, telegram, dexscreenerListed)
 *    - Organic metrics (excluding bot activity)
 *    - Trader category filters (insidersCount, snipersCount, proTradersCount)
 *
 * YOUR CURRENT IMPLEMENTATION (HTTP POST):
 * ----------------------------------------
 * Pros:
 * - Simple to implement and debug
 * - No connection management complexity
 * - Works with standard HTTP libraries
 * - Easy to test and mock
 * - No websocket overhead
 *
 * Cons:
 * - Higher latency (each request ~500ms+)
 * - More bandwidth usage (full payload each time)
 * - More expensive (rate limits apply per request)
 * - Can't receive real-time updates
 * - Need to poll for changes
 *
 * RATE LIMITS & STABILITY CONSIDERATIONS:
 * ---------------------------------------
 * HTTP API:
 * - Growth Plan: 9007199254740991 requests/day (essentially unlimited)
 * - Cost: 1 credit per request
 * - Pagination: Max 100 items per request
 * - Best for: Initial data loads, on-demand queries
 *
 * WebSocket API:
 * - Connection-based (maintains single connection)
 * - Lower total cost (1 connection vs 100s of requests)
 * - Automatic updates without polling
 * - Better for: Real-time dashboards, live monitoring
 * - View limits: Max 10 views, 100 tokens per view, 1000 total tokens
 *
 * HOW TO MAKE YOUR PLATFORM BETTER & MORE UNIQUE:
 * ------------------------------------------------
 * 1. HYBRID APPROACH (RECOMMENDED)
 *    - Use HTTP for initial data load & pagination
 *    - Use WebSocket for real-time updates
 *    - Fallback to HTTP if WebSocket fails
 *    - Cache data locally with Redis/in-memory
 *
 * 2. UNIQUE FEATURES TO IMPLEMENT
 *    A. Advanced Analytics
 *       - Combine multiple metrics (volume + holders + organic trades)
 *       - Smart money tracking (insider/pro trader movements)
 *       - Token graduation predictions (bonding curve analysis)
 *       - Risk scoring (dev holdings + security + liquidity)
 *
 *    B. Better Filtering & Discovery
 *       - AI-powered token recommendations
 *       - Pattern recognition (similar to past successful tokens)
 *       - Social sentiment analysis (twitter rename tracking)
 *       - Deployer reputation scoring (deployerMigrationsCount)
 *
 *    C. Enhanced UX
 *       - Multi-chain unified view (Solana + Base + others)
 *       - Custom alerts (price thresholds, holder changes)
 *       - Portfolio tracking integration
 *       - Quick trade execution (direct swap integration)
 *
 *    D. Data Enrichment
 *       - Organic vs bot volume comparison
 *       - Trader category breakdown (fresh/pro/smart traders)
 *       - Historical bonding curve data
 *       - Top holder analysis with PnL tracking
 *
 * 3. COMPETITIVE ADVANTAGES TO BUILD
 *    - Faster data updates (optimize WebSocket usage)
 *    - Better filtering UI (combine multiple filter types)
 *    - More accurate risk assessment (security + holdings)
 *    - Integration with your existing Turnkey wallet system
 *    - One-click trading from discover page
 *    - Custom watchlists with smart alerts
 *
 * RECOMMENDED IMPLEMENTATION STRATEGY:
 * ------------------------------------
 * Phase 1: Keep HTTP for now (what you have)
 * - Good for prototyping and testing
 * - Easy to debug and iterate
 * - Lower complexity initially
 *
 * Phase 2: Add WebSocket layer
 * - Create WebSocket service wrapper
 * - Implement reconnection logic
 * - Handle view management
 * - Add compression support
 *
 * Phase 3: Hybrid optimization
 * - HTTP for pagination & historical data
 * - WebSocket for real-time updates
 * - Smart caching strategy
 * - Rate limit optimization
 *
 * DATA YOU'RE MISSING FROM HTTP APPROACH:
 * ----------------------------------------
 * 1. Real-time price updates (you get stale data)
 * 2. Instant new token notifications
 * 3. Live volume/trade changes
 * 4. Immediate holder count updates
 * 5. Bonding curve progression in real-time
 *
 * UNIQUE FEATURES YOU COULD BUILD:
 * --------------------------------
 * 1. Smart Filters
 *    - "Safe tokens" (no honeypot + LP locked + mint disabled)
 *    - "Early gems" (low market cap + high organic volume + growing holders)
 *    - "Graduation candidates" (bonding 80%+ + high volume)
 *
 * 2. Advanced Analytics
 *    - Token velocity (how fast it's trading)
 *    - Whale concentration alerts
 *    - Fresh vs pro trader ratio
 *    - Organic volume percentage
 *
 * 3. Social Intelligence
 *    - Twitter rename detection
 *    - Multiple deployments by same address
 *    - Social link verification
 *
 * 4. Risk Scoring
 *    - Combine security, holdings, volume, liquidity
 *    - Flag suspicious patterns
 *    - Deployer history check
 *
 * COST COMPARISON:
 * ----------------
 * Your HTTP Polling (every 5 seconds):
 * - 17,280 requests/day per view
 * - ~$X cost (depends on pricing)
 *
 * WebSocket Approach:
 * - 1 connection
 * - Multiple views (up to 10)
 * - Significantly lower cost
 * - Better performance
 *
 * RECOMMENDATION:
 * ---------------
 * 1. Start with HTTP (current approach) for MVP
 * 2. Plan WebSocket integration for production
 * 3. Focus on unique filtering and analytics
 * 4. Integrate with your Turnkey wallet for quick trades
 * 5. Build better risk assessment than competitors
 * 6. Add AI-powered recommendations
 * 7. Create custom alert system
 * 8. Optimize for mobile (they don't focus on this)
 *
 * YOUR COMPETITIVE EDGE:
 * ----------------------
 * - Integration with Turnkey (secure wallet management)
 * - Better mobile experience
 * - AI-powered insights (not just raw data)
 * - Risk scoring & safety features
 * - One-click trading integration
 * - Portfolio tracking + discovery in one platform
 */

const API_URL = "https://pulse-v2-api.mobula.io/api/2/pulse";
const AUTHORIZATION = "7b7ba456-f454-4a42-a80e-897319cb0ac1";

// Axiom coin prices (only public endpoint that works)
const AXIOM_PRICES_URL = "https://axiom.trade/api/coin-prices";

interface View {
  name: string;
  model?: string;
  chainId: string[];
  sortBy?: string;
  sortOrder?: string;
  filters?: {
    dexscreenerListed?: boolean;
  };
}

interface Payload {
  assetMode: boolean;
  compressed: boolean;
  views: View[];
}

async function testMobulaPulse() {
  const payload: Payload = {
    assetMode: true,
    compressed: false,
    views: [
      {
        name: "new",
        model: "new",
        chainId: ["solana:solana"],
      },
      {
        name: "bonding",
        model: "bonding",
        chainId: ["solana:solana"],
      },
      {
        name: "bonded",
        model: "bonded",
        chainId: ["solana:solana"],
      },
    ],
  };

  try {
    console.log("Testing Mobula Pulse API endpoint...\n");
    console.log("Request URL:", API_URL);
    console.log("Request Method: POST");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("\nSending request...\n");

    const response = await axios.post(API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTHORIZATION,
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        Origin: "https://www.xfractal.fun",
        Referer: "https://www.xfractal.fun/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
    });

    console.log("✅ Request successful!\n");
    console.log("Status Code:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log("\nResponse Data:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Request failed!\n");
      console.error("Status Code:", error.response?.status);
      console.error("Status Text:", error.response?.statusText);
      console.error("\nError Response Headers:");
      if (error.response?.headers) {
        Object.entries(error.response.headers).forEach(([key, value]) => {
          console.error(`  ${key}: ${value}`);
        });
      }
      console.error("\nError Response Data:");
      console.error(JSON.stringify(error.response?.data, null, 2));
      console.error("\nError Message:", error.message);
    } else {
      console.error("❌ Unexpected error:", error);
    }
    process.exit(1);
  }
}

async function testMobulaPulseBonded() {
  const payload: Payload = {
    assetMode: true,
    compressed: false,
    views: [
      {
        name: "bonded",
        chainId: ["solana:solana"],
        sortBy: "volume_24h",
        sortOrder: "desc",
        filters: {
          dexscreenerListed: true,
        },
      },
    ],
  };

  try {
    console.log("Testing Mobula Pulse API endpoint (Bonded View)...\n");
    console.log("Request URL:", API_URL);
    console.log("Request Method: POST");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("\nSending request...\n");

    const response = await axios.post(API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTHORIZATION,
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        Origin: "https://www.xfractal.fun",
        Referer: "https://www.xfractal.fun/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      },
    });

    console.log("✅ Request successful!\n");
    console.log("Status Code:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("\nResponse Headers:");
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log("\nResponse Data:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Request failed!\n");
      console.error("Status Code:", error.response?.status);
      console.error("Status Text:", error.response?.statusText);
      console.error("\nError Response Headers:");
      if (error.response?.headers) {
        Object.entries(error.response.headers).forEach(([key, value]) => {
          console.error(`  ${key}: ${value}`);
        });
      }
      console.error("\nError Response Data:");
      console.error(JSON.stringify(error.response?.data, null, 2));
      console.error("\nError Message:", error.message);
    } else {
      console.error("❌ Unexpected error:", error);
    }
    process.exit(1);
  }
}

/*
 * EXAMPLE: WEBSOCKET IMPLEMENTATION (FOR FUTURE)
 * -----------------------------------------------
 * This is how you would implement the WebSocket version
 * for real-time data (more efficient than HTTP polling)
 */
async function testMobulaWebSocket() {
  console.log("\n\n=== WebSocket Implementation Example ===\n");
  console.log("To implement WebSocket (recommended for production):");
  console.log("\n1. Install ws package: pnpm add ws");
  console.log("\n2. Create WebSocket connection:");
  console.log(`
import WebSocket from 'ws';

const ws = new WebSocket('wss://pulse-v2-api.mobula.io');

ws.on('open', () => {
  // Subscribe to multiple views
  ws.send(JSON.stringify({
    type: 'pulse-v2',
    authorization: 'YOUR_API_KEY',
    payload: {
      assetMode: true,
      compressed: false,
      views: [
        {
          name: 'safe-tokens',
          chainId: ['solana:solana'],
          sortBy: 'volume_1h',
          sortOrder: 'desc',
          limit: 50,
          filters: {
            volume_1h: { gte: 5000 },
            market_cap: { gte: 10000 },
            'security.honeypot': false,
            'security.noMintAuthority': true,
            dexscreener_listed: true
          }
        },
        {
          name: 'early-gems',
          chainId: ['solana:solana'],
          sortBy: 'organic_volume_1h',
          sortOrder: 'desc',
          limit: 30,
          filters: {
            market_cap: { gte: 5000, lte: 50000 },
            holders_count: { gte: 50 },
            organic_volume_1h: { gte: 1000 },
            top_10_holdings_percentage: { lte: 30 }
          }
        }
      ]
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  switch(message.type) {
    case 'init':
      console.log('Initial data:', message.payload);
      break;
    case 'new-token':
      console.log('New token:', message.payload.token);
      // Trigger notification/alert
      break;
    case 'update-token':
      console.log('Token update:', message.payload.token);
      // Update UI
      break;
    case 'remove-token':
      console.log('Token removed:', message.payload.tokenKey);
      break;
  }
});

// Keep connection alive
setInterval(() => {
  ws.send(JSON.stringify({ event: 'ping' }));
}, 30000);
  `);

  console.log("\n3. Benefits:");
  console.log("   - Real-time updates (no polling)");
  console.log("   - Lower bandwidth usage");
  console.log("   - Lower API costs");
  console.log("   - Multiple views in one connection");
  console.log("   - Instant new token alerts");
}

/*
 * PERFORMANCE COMPARISON
 * ----------------------
 */
async function compareApproaches() {
  console.log("\n\n=== APPROACH COMPARISON ===\n");

  console.log("HTTP POST (Current):");
  console.log("  Latency: ~500-1000ms per request");
  console.log("  Updates: Manual polling required");
  console.log("  Cost: 1 credit per request");
  console.log("  Best for: Initial loads, pagination, on-demand queries");
  console.log("  Complexity: Low (easy to implement)");

  console.log("\nWebSocket (Recommended):");
  console.log("  Latency: ~50-200ms for updates");
  console.log("  Updates: Automatic real-time");
  console.log("  Cost: 1 connection (much cheaper)");
  console.log("  Best for: Live dashboards, real-time monitoring");
  console.log("  Complexity: Medium (connection management)");

  console.log("\nHybrid Approach (Optimal):");
  console.log("  - HTTP for pagination & historical data");
  console.log("  - WebSocket for real-time updates");
  console.log("  - Cache layer (Redis) for performance");
  console.log("  - Fallback logic for reliability");

  console.log("\n\nYOUR COMPETITIVE ADVANTAGES:");
  console.log("  ✓ Turnkey wallet integration (secure trading)");
  console.log("  ✓ Better mobile UX");
  console.log("  ✓ AI-powered token recommendations");
  console.log("  ✓ Advanced risk scoring");
  console.log("  ✓ One-click trading");
  console.log("  ✓ Portfolio + discovery unified");
  console.log("  ✓ Custom alert system");
  console.log("  ✓ Smart money tracking");
}

/*
 * AXIOM COIN PRICES (FREE - NO AUTH)
 * ----------------------------------
 */
async function testAxiomCoinPrices() {
  console.log("\n\n=== AXIOM COIN PRICES ===\n");
  console.log("Endpoint: " + AXIOM_PRICES_URL);
  console.log("Auth Required: NO (Free!)");
  console.log("\nFetching prices...\n");

  try {
    const response = await axios.get(AXIOM_PRICES_URL, { timeout: 5000 });

    console.log("✅ Request successful!\n");
    console.log("Status Code:", response.status);
    console.log("\nCoin Prices:");

    if (response.data?.data) {
      Object.entries(response.data.data).forEach(([coin, price]) => {
        console.log(`  ${coin}: $${price}`);
      });

      console.log("\n💡 Use Cases:");
      console.log("  1. Header ticker (BTC, ETH, SOL, BNB prices)");
      console.log("  2. Portfolio value calculation");
      console.log("  3. Conversion rates for token prices");
      console.log("  4. Reference prices for charts");
      console.log("  5. Trading pair context");

      console.log("\n📊 Integration Ideas:");
      console.log(
        "  • Show in navbar: 'BTC: $90,370 | ETH: $3,118 | SOL: $133'"
      );
      console.log("  • Use for portfolio total calculation");
      console.log("  • Display alongside token prices");
      console.log("  • Calculate % vs major coins");

      return response.data.data;
    } else {
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Request failed!\n");
      console.error("Status Code:", error.response?.status);
      console.error("Error:", error.message);
    } else {
      console.error("❌ Unexpected error:", error);
    }
  }
}

/*
 * UNIQUE FILTER EXAMPLES
 * ----------------------
 */
async function testUniqueFilters() {
  console.log("\n\n=== UNIQUE FILTER EXAMPLES ===\n");

  // Example 1: Safe Tokens Filter
  const safeTokensFilter = {
    name: "safe-tokens",
    chainId: ["solana:solana"],
    sortBy: "volume_1h",
    sortOrder: "desc",
    limit: 50,
    filters: {
      volume_1h: { gte: 5000 },
      market_cap: { gte: 10000 },
      liquidity: { gte: 5000 },
      "security.honeypot": false,
      "security.noMintAuthority": true,
      "security.buyTax": { lte: "1.0" },
      "security.sellTax": { lte: "5.0" },
      top_10_holdings_percentage: { lte: 35 },
      dexscreener_listed: true,
    },
  };

  // Example 2: Early Gems Filter
  const earlyGemsFilter = {
    name: "early-gems",
    chainId: ["solana:solana"],
    sortBy: "organic_volume_1h",
    sortOrder: "desc",
    limit: 30,
    filters: {
      market_cap: { gte: 5000, lte: 100000 },
      holders_count: { gte: 50, lte: 500 },
      organic_volume_1h: { gte: 2000 },
      organic_traders_1h: { gte: 20 },
      top_10_holdings_percentage: { lte: 25 },
      dev_holdings_percentage: { lte: 10 },
      pro_traders_count: { gte: 3 },
      "security.honeypot": false,
    },
  };

  // Example 3: Graduation Candidates
  const graduationFilter = {
    name: "graduation-watch",
    chainId: ["solana:solana"],
    sortBy: "bonding_percentage",
    sortOrder: "desc",
    limit: 20,
    filters: {
      bonded: false,
      bonding_percentage: { gte: 80, lt: 100 },
      volume_1h: { gte: 3000 },
      organic_volume_1h: { gte: 2000 },
      holders_count: { gte: 100 },
    },
  };

  // Example 4: Smart Money Tracking
  const smartMoneyFilter = {
    name: "smart-money",
    chainId: ["solana:solana"],
    sortBy: "smart_traders_buys",
    sortOrder: "desc",
    limit: 30,
    filters: {
      smart_traders_count: { gte: 5 },
      smart_traders_buys: { gte: 10 },
      pro_traders_count: { gte: 3 },
      volume_1h: { gte: 5000 },
      market_cap: { gte: 10000 },
    },
  };

  console.log("1. Safe Tokens Filter:");
  console.log("   - No honeypot, low taxes, mint disabled");
  console.log("   - Good liquidity & volume");
  console.log("   - Decentralized holdings");
  console.log("   - DexScreener listed");

  console.log("\n2. Early Gems Filter:");
  console.log("   - Low-mid market cap");
  console.log("   - Growing holder base");
  console.log("   - High organic trading activity");
  console.log("   - Low concentration risk");
  console.log("   - Pro trader interest");

  console.log("\n3. Graduation Candidates:");
  console.log("   - 80%+ bonding progress");
  console.log("   - Strong volume");
  console.log("   - Good organic activity");
  console.log("   - Growing community");

  console.log("\n4. Smart Money Tracking:");
  console.log("   - Pro & smart trader activity");
  console.log("   - Recent smart money buys");
  console.log("   - Decent volume & market cap");
  console.log("   - Follow successful traders");

  console.log("\n\nThese filters make you UNIQUE vs competitors!");
}

// Run all tests
(async () => {
  console.log("=== CURRENT HTTP IMPLEMENTATION TEST ===\n");

  try {
    // Test 1: Basic endpoint
    await testMobulaPulse();

    console.log("\n\n" + "=".repeat(80) + "\n");

    // Test 2: Bonded tokens with filters
    await testMobulaPulseBonded();

    console.log("\n\n" + "=".repeat(80) + "\n");

    // Analysis and comparisons
    await compareApproaches();
    await testUniqueFilters();
    await testMobulaWebSocket();

    // Test Axiom coin prices (free endpoint)
    await testAxiomCoinPrices();
  } catch (error) {
    console.error("Test failed:", error);
  }
})();

// To run only specific tests, uncomment:
// testMobulaPulse();
// testMobulaPulseBonded();
// compareApproaches();
// testUniqueFilters();
// testMobulaWebSocket();
