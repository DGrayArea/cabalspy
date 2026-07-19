# CabalSpy TODOs

## Deferred — Telegram production setup (do before launch)
- [ ] Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` in Vercel env (widget reads the public var, not `TELEGRAM_BOT_USERNAME`)
- [ ] Run BotFather `/setdomain` for the production domain so the login widget renders
- [ ] Test login + profile "Connect Telegram" linking end-to-end in production
- [ ] Consider the reverse link direction (add Google/Turnkey to a Telegram-first account)

## Admin & Access Control (2026-07-02)
- [x] **Super admin**: `alexodey79@gmail.com` (env `SUPER_ADMIN_EMAIL`) auto-promotes to admin on sign-in, can never be demoted; only the super admin can change roles — other admins are view-only (`src/lib/adminAuth.ts`).
- [x] **Discord role gating**: guild membership + Holder/Pre-Sale role IDs centralized in `src/lib/accessRoles.ts`, overridable via `NEXT_PUBLIC_DISCORD_ALLOWED_ROLE_IDS`.
- [x] **Discord connect/re-verify from profile settings** (overrides own linked Discord); callback no longer demotes admins to holder.
- [x] **Admin metrics**: fee card shows real collected referral fees (`feesSOL`) with 1% estimate fallback.
- [ ] **After the Discord gate test**: remove `SUPER_ADMIN_AUTO_PROMOTE=false` from `.env.local` and sign in once to restore admin.
- [ ] Developer-bypass whitelist in the Discord callback is empty — add Discord IDs if wanted.
- [ ] Consider a "Disconnect Discord" option (currently only re-link/switch is possible).

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

- [x] **TradingPanel missing `addTrade` call** (`src/components/TradingPanel.tsx`): `handleExecute` now records trades (success and failure) via `useTradeHistory`/`addTrade`, mirroring the token detail page.

- [x] **`/api/turnkey/sign-transaction` has no auth guard** (`src/app/api/turnkey/sign-transaction/route.ts`): Now checks `getSession(request)` and returns 401 without a valid session. Verified Telegram auth sets the same `session` cookie, so Telegram users are unaffected.

- [x] **`/api/auth/google` is a dead stub**: Removed — all Google sign-in goes through Turnkey (`handleGoogleOauth`/`handleLogin`); the route had no callers. (`/api/auth/google/callback` left in place.)

### Per-User Stats & Recording

- [x] **Add missing fields to `TradeHistory` Prisma schema**: Added `feesSOL`, `feesBps`, `outAmountUsd` (db pushed 2026-07-01). Wired through `/api/trades`, `useTradeHistory`, both trade call sites (via `src/lib/tradeMetrics.ts`), and `portfolio-analytics` now prefers recorded USD values for cost basis and proceeds.

- [x] **Realized PnL aggregation missing from portfolio page**: Summary card now shows aggregated realized PnL, PnL %, and win rate from `/api/analytics/performance` alongside the 24h mark-to-market figures.

- [x] **Ensure all `addTrade` callers include `tokenMint`**: Verified — both call sites (token detail page and TradingPanel) always set `tokenMint` (TradingPanel derives it from the non-SOL side of the swap).

### Auth / Session Safety

- [ ] **Session inactivity enforcement is client-side only** (`src/context/AuthContext.tsx:401-431`): 4-hour inactivity timer is pure browser-side. Sessions in DB expire after 3 days regardless of inactivity — direct API calls with the cookie bypass the timer. Consider adding server-side last-active tracking if stricter enforcement is needed.

- [x] **Add rate limiting to trade, watchlist, and Turnkey endpoints**: All handlers guarded via `createRouteLimiter` in `src/lib/rateLimit.ts` (reads 60/min, writes 30/min, signing 20/min per IP). Verified live: request 61 returns 429.

### Page-Level Gaps

- [ ] **`/[chain]/[tokenAddress]` doesn't validate the `chain` param**: Page always executes SOL/SPL swaps regardless of the chain in the URL. Fine for now (SOL-only), but add a chain guard before BSC/ETH go live or swaps will silently misbehave for non-SOL tokens.

- [x] **Hardcoded public RPC in `jupiter-swap.ts`**: Quote path now prefers `NEXT_PUBLIC_SOLANA_RPC_URL` with public mainnet as last resort.

### Minor / Polish

- [x] **`TurnkeySolanaContext` fallback RPC is hardcoded**: Fallback chain now includes `NEXT_PUBLIC_SOLANA_RPC_URL` before public mainnet.

- [ ] **Network fee display is static** (`src/components/TradingPanel.tsx:527`): Shows hardcoded `~0.000005 SOL`. Should pull actual priority fee from Jupiter Ultra response.

- [x] **Partial wallet creation fails silently**: The `/api/turnkey/create-wallets` route had no callers and was removed — all wallet creation goes through `src/lib/walletSync.ts` (`syncUserWallets`), which already creates each missing network wallet individually.

- [ ] **Consolidate legacy `jupiter-swap.ts` with Ultra implementation**: `src/services/jupiter-swap.ts` (legacy v6 quote API) sits alongside the newer Ultra swap. Consider consolidating or at minimum adding an API key header to unauthenticated quote calls.

---

## Data Layer — Audit Gaps

### Critical / Correctness

- [x] **`portfolio-analytics.ts` returns fully hardcoded fake data**: Rewritten to compute realized PnL, win rate, and best/worst trade from `TradeHistory` records (average-cost basis per mint, replayed chronologically). `/api/analytics/performance` now passes `session.userId` instead of the wallet address.

- [x] **`helius-token-data.getRecentTransactions` returns fake transaction data**: Removed — the method (and `TokenTransaction`/`formatAge` support code) had no callers anywhere. If a recent-transactions display is wanted later, implement it with real tx parsing (e.g. Helius enhanced API).

- [x] **Mobula fallback key logic sends unauthenticated requests**: Key fallback moved to where the key actually lives — the `/api/mobula` proxy now retries 401/403 with `MOBULA_FALLBACK_API_KEY`. (Client-side retry in `mobula.ts` remains as a transient-failure retry against the proxy.)

- [x] **API keys hardcoded in source** — won't fix, intentional per decision (2026-07-01): the keys in `src/services/axiom.ts` and `src/app/api/mobula/route.ts` stay hardcoded.

### Broken / Dead Services

- [x] **`AxiomService` fake tokens**: Verified nothing renders it — its only importer was the unused `useTokens` hook (now deleted). `axiom.ts` itself is kept intentionally (hardcoded key stays per decision), but it is currently unreferenced.

- [x] **`SolanaRPCSubscriptionService` is never connected**: Removed — no importers.

- [x] **`/api/solana/new-tokens` is an incomplete stub**: Removed — no callers.

- [ ] **`helius-token-data.ts` doesn't actually use Helius** (`src/services/helius-token-data.ts`): Despite the name, it calls a generic Solana JSON-RPC endpoint with no Helius API key or Helius-specific methods. Rename or replace with real Helius enhanced API calls (`getTokenAccounts`, enhanced transactions, etc.).

### Reliability / Rate Limiting

- [x] **WebSocket reconnection gives up permanently after 5 attempts**: Moot — `src/services/websocket.ts` had no importers anywhere and was removed (live feeds use `mobula-pulse`/`multichain-tokens`).

- [ ] **`fetchTokenByAddress` in `mobula-pulse.ts` fetches 2000 tokens to find one** (`src/services/mobula-pulse.ts:838-920`): Scans up to 1000 trending tokens then another 1000 from basic views because Mobula Pulse has no address-filter param. Extremely wasteful in production — cache the full list or use Mobula's direct asset endpoint instead.

- [x] **Jupiter token list fetch has no timeout**: Now fetched at most once per session with a 10s abort timeout, cached across swaps (failed fetches retry next swap).

- [ ] **GeckoTerminal calls go direct from browser** (`src/services/geckoterminal.ts:119-135`): No server proxy route — requests go browser → `api.geckoterminal.com` directly. Works today but has no rate-limit protection and will break if GeckoTerminal adds auth or restricts CORS. Proxy through `/api/` like Mobula and PumpFun.

### Missing Env Vars (silent failures if unset)

- [ ] **`NEXT_PUBLIC_SOLANA_RPC_URL`** — falls back to public mainnet; will be rate-limited in production. Required for `TurnkeySolanaContext`, `PortfolioContext`, and all RPC calls.
- [ ] **`NEXT_PUBLIC_MOBULA_API_KEY`** — falls back to hardcoded key in source if unset.
- [ ] **`NEXT_PUBLIC_JUPITER_API_KEY`** — swap requests go unauthenticated (lower rate limits) if missing.
- [ ] **`NEXT_PUBLIC_MOBULA_FALLBACK_API_KEY`** — fallback logic currently broken regardless (see above).
- [ ] **`NEXT_PUBLIC_SOLANA_WS_URL`** — falls back to converting the HTTP RPC URL to `wss://`, which may not be valid for all RPC providers.
- [ ] **Add all required env vars to `.env.local` example in README** so they're not silently missing in new deployments.
