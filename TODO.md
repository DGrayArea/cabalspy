# CabalSpy TODOs

## Authentication & Session Management
- [x] **Fix Google Session Persistence**: Investigate and fix the issue where signing out of one Google account and into another causes the first account to be incorrectly restored. Ensure Google OAuth state and cookies are fully cleared on logout.
- [x] **Adjust Session Duration**: Change the session expiration time from 7 days down to 3 days.
- [x] **Fix Auth UI Flashes**: Eliminate the flashes of the sign-in page that occur when finalizing a session or during the sign-out process.

## BSC Integration & UI
- [ ] **Index Page BSC Tokens**: Ensure that BSC tokens are properly integrated and displayed on the main index page when BSC is enabled.
- [ ] **Filter Buttons**: Implement or verify the filter buttons for BSC tokens on both the index page and the portfolio page so users can easily toggle or sort between Solana and BSC assets.
- [ ] **Turnkey Wallet Support**: Continue monitoring the Turnkey BNB/BSC wallet generation to ensure it reliably syncs for all users alongside their Solana wallets.

## General
- [ ] Verify the kill-switch (`NEXT_PUBLIC_ENABLE_BSC`) cleanly disables all BSC background calls and UI elements if turned off.
- [ ] Add transaction confirmation waiting — show pending state until on-chain confirmation is received, not just until broadcast.
- [ ] Add better loading states across token feed, portfolio, and trading panel for slow API responses.
- [ ] Add account recovery / sign-in flow resilience (lost session, expired wallet, re-link flow).
- [ ] Add rate-limit handling and fallback routing for embedded charts (GeckoTerminal/DexScreener iframes).
- [ ] Chart fallback messaging — finish production-grade fallback UI and alternate chart links when embed fails.
- [ ] Token pair selector and better swap UX in TradingPanel (currently only SOL↔token, no pair switching).
- [ ] Mobile/responsive polish for the full trade flow (TradingPanel, token detail page).
- [ ] CORS proxy validation — confirm all third-party API calls are proxied correctly in production and won't fail due to CORS or missing headers.
- [ ] Add app-level test coverage for trading flow and chart embeds.

---

## SOL Integration — Audit Gaps (priority order)

### Critical

- [ ] **TradingPanel missing `addTrade` call** (`src/components/TradingPanel.tsx:196-215`): `handleExecute` calls `refreshPortfolio()` on success but never records the trade to the DB. Trades from the main listing and pulse pages are silently unrecorded. Mirror what `src/app/[chain]/[tokenAddress]/page.tsx:345-383` does — import `useTradeHistory` and call `addTrade` on success inside `handleExecute`.

- [ ] **`/api/turnkey/sign-transaction` has no auth guard** (`src/app/api/turnkey/sign-transaction/route.ts:37-39`): There's a `// TODO` comment acknowledging this. Any caller with a `walletId/accountId` can request a backend signature. Add `getSession(request)` and return 401 if no valid session.

- [ ] **`/api/auth/google` is a dead stub** (`src/app/api/auth/google/route.ts:63-66`): POST handler has `// TODO: Create Turnkey user and wallet here` and returns raw Google userInfo without creating a session, cookie, or DB user. Either wire it up fully or remove it to avoid confusion.

### Per-User Stats & Recording

- [ ] **Add missing fields to `TradeHistory` Prisma schema** (`prisma/schema.prisma:50-67`): Schema is missing `feesSOL`/`feesBps` (needed for true net PnL) and `outAmountUsd` (USD value of output at execution time). Win/loss logic in `src/hooks/useTradeHistory.ts:172-179` is per-mint only with no realized PnL in USD.

- [ ] **Realized PnL aggregation missing from portfolio page** (`src/app/portfolio/page.tsx`): Currently only shows `totalPnL24hUsd` (24h mark-to-market from Helius). `PnLCalendar` and `TradeHistoryList` are wired up but no aggregated realized profit/loss across full trade history is computed or displayed.

- [ ] **Ensure all `addTrade` callers include `tokenMint`** (`src/hooks/useTradeHistory.ts:141-146`): Server route at `src/app/api/trades/route.ts:50-56` expects `tokenMint` and saves `null` if missing. The detail page includes it; verify all other call sites do too.

### Auth / Session Safety

- [ ] **Session inactivity enforcement is client-side only** (`src/context/AuthContext.tsx:401-431`): 4-hour inactivity timer is pure browser-side. Sessions in DB expire after 3 days regardless of inactivity — direct API calls with the cookie bypass the timer. Consider adding server-side last-active tracking if stricter enforcement is needed.

- [ ] **Add rate limiting to trade, watchlist, and Turnkey endpoints**: `/api/trades`, `/api/watchlist`, `/api/turnkey/*` have no rate limiting. Mobula/PumpFun routes have it — apply the same to sensitive endpoints.

### Page-Level Gaps

- [ ] **`/[chain]/[tokenAddress]` doesn't validate the `chain` param**: Page always executes SOL/SPL swaps regardless of the chain in the URL. Fine for now (SOL-only), but add a chain guard before BSC/ETH go live or swaps will silently misbehave for non-SOL tokens.

- [ ] **Hardcoded public RPC in `jupiter-swap.ts`** (`src/services/jupiter-swap.ts:64`): `https://api.mainnet-beta.solana.com` is hardcoded and ignores `NEXT_PUBLIC_SOLANA_RPC_URL`. Used for quote fetching — will hit rate limits in production. The actual swap execution already uses the env var; align quote fetching to match.

### Minor / Polish

- [ ] **`TurnkeySolanaContext` fallback RPC is hardcoded** (`src/context/TurnkeySolanaContext.tsx:336`): Falls back to public mainnet RPC instead of `NEXT_PUBLIC_SOLANA_RPC_URL`.

- [ ] **Network fee display is static** (`src/components/TradingPanel.tsx:527`): Shows hardcoded `~0.000005 SOL`. Should pull actual priority fee from Jupiter Ultra response.

- [ ] **Partial wallet creation fails silently** (`src/app/api/turnkey/create-wallets/route.ts:144`): If 1–3 of 4 wallets exist, the `verifiedCount === 4` check skips re-creation of missing wallets without error. Users with a partial wallet set may end up wallet-less.

- [ ] **Consolidate legacy `jupiter-swap.ts` with Ultra implementation**: `src/services/jupiter-swap.ts` (legacy v6 quote API) sits alongside the newer Ultra swap. Consider consolidating or at minimum adding an API key header to unauthenticated quote calls.

---

## Data Layer — Audit Gaps

### Critical / Correctness

- [ ] **`portfolio-analytics.ts` returns fully hardcoded fake data** (`src/services/portfolio-analytics.ts:71-77`): `totalPnLUsd: 124.50`, `totalPnLPercent: 12.5`, `bestTrade: { symbol: "SOL", roi: 45.2 }` are static values. Win/loss per trade uses `Math.random() > 0.4` — it's random garbage. This feeds `/api/analytics/performance`. Replace with real computation from `TradeHistory` records.

- [ ] **`helius-token-data.getRecentTransactions` returns fake transaction data** (`src/services/helius-token-data.ts:136`): Buy/sell type is `i % 3 === 0 ? "sell" : "buy"` (index-based, not real). `amountSol` and `amountUsd` are always `0`, `walletAddress` is always `""`. Any "recent transactions" display on token pages shows zero amounts.

- [ ] **Mobula fallback key logic sends unauthenticated requests** (`src/services/mobula.ts:311-338`): When the primary key 401s, the fallback path checks `NEXT_PUBLIC_MOBULA_FALLBACK_API_KEY` but makes the request with no Authorization header — so it also 401s. Fix the fallback to actually set the Bearer header using the fallback key.

- [ ] **API keys hardcoded in source** — two keys committed in plaintext:
  - `src/services/axiom.ts:5`: Axiom API key as a string constant — move to env var `NEXT_PUBLIC_AXIOM_API_KEY`
  - `src/app/api/mobula/route.ts:22`: Mobula API key hardcoded as a fallback string — remove and rely solely on env var

### Broken / Dead Services

- [ ] **`AxiomService` generates fake tokens on every call** (`src/services/axiom.ts:68-126`): All attempted endpoints return 404, so it silently falls back to 50 randomly-priced demo tokens with placeholder images. Verify whether any page actually uses `axiomService` — if Mobula is the real feed source, delete `axiom.ts` entirely.

- [ ] **`SolanaRPCSubscriptionService` is never connected** (`src/services/solana-rpc-subscription.ts`): The service is exported as a singleton but no page or hook ever calls `.connect()` or listens to its events. Dead infrastructure — either wire it up or remove it.

- [ ] **`/api/solana/new-tokens` is an incomplete stub**: Fetches signatures from the pump.fun program but intentionally doesn't parse transaction data (comment in code says so). No page or hook fetches this route. Either implement it or remove it.

- [ ] **`helius-token-data.ts` doesn't actually use Helius** (`src/services/helius-token-data.ts`): Despite the name, it calls a generic Solana JSON-RPC endpoint with no Helius API key or Helius-specific methods. Rename or replace with real Helius enhanced API calls (`getTokenAccounts`, enhanced transactions, etc.).

### Reliability / Rate Limiting

- [ ] **WebSocket reconnection gives up permanently after 5 attempts** (`src/services/websocket.ts:80-82`): After 5 reconnects the feed dies until hard refresh. Increase the cap or implement indefinite reconnection with a longer back-off ceiling.

- [ ] **`fetchTokenByAddress` in `mobula-pulse.ts` fetches 2000 tokens to find one** (`src/services/mobula-pulse.ts:838-920`): Scans up to 1000 trending tokens then another 1000 from basic views because Mobula Pulse has no address-filter param. Extremely wasteful in production — cache the full list or use Mobula's direct asset endpoint instead.

- [ ] **Jupiter token list fetch has no timeout** (`src/services/jupiter-swap-turnkey.ts:103`): Calls `https://token.jup.ag/all` (~50k tokens) with no timeout or size guard. Runs before every swap in the decimal-resolution path. Add a timeout and cache the result across swaps.

- [ ] **GeckoTerminal calls go direct from browser** (`src/services/geckoterminal.ts:119-135`): No server proxy route — requests go browser → `api.geckoterminal.com` directly. Works today but has no rate-limit protection and will break if GeckoTerminal adds auth or restricts CORS. Proxy through `/api/` like Mobula and PumpFun.

### Missing Env Vars (silent failures if unset)

- [ ] **`NEXT_PUBLIC_SOLANA_RPC_URL`** — falls back to public mainnet; will be rate-limited in production. Required for `TurnkeySolanaContext`, `PortfolioContext`, and all RPC calls.
- [ ] **`NEXT_PUBLIC_MOBULA_API_KEY`** — falls back to hardcoded key in source if unset.
- [ ] **`NEXT_PUBLIC_JUPITER_API_KEY`** — swap requests go unauthenticated (lower rate limits) if missing.
- [ ] **`NEXT_PUBLIC_MOBULA_FALLBACK_API_KEY`** — fallback logic currently broken regardless (see above).
- [ ] **`NEXT_PUBLIC_SOLANA_WS_URL`** — falls back to converting the HTTP RPC URL to `wss://`, which may not be valid for all RPC providers.
- [ ] **Add all required env vars to `.env.local` example in README** so they're not silently missing in new deployments.
