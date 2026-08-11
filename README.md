# Cabalspy

Real-time token tracking and trading platform (Solana-first, BSC/ETH coming).

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create `.env.local`

```bash
# ── Database (required) ──────────────────────────────────────────────
# Postgres connection string. Without it the app cannot start.
DATABASE_URL=postgresql://user:pass@host:5432/postgres

# ── App URL (required) ───────────────────────────────────────────────
# Used to build OAuth callback URLs. Must match the deployed origin.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Turnkey / embedded wallets (required) ────────────────────────────
TURNKEY_API_PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_TURNKEY_ORG_ID=your_org_id_here
NEXT_PUBLIC_TURNKEY_API_KEY=your_public_key_here
NEXT_PUBLIC_TURNKEY_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_ORGANIZATION_ID=your_turnkey_org_id
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=your_auth_proxy_config_id

# ── Solana RPC (required in production — the public endpoint rate-limits) ──
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-provider.com
# If unset, the WS URL is derived by rewriting the HTTP URL to wss://,
# which is not valid for every provider. Set it explicitly.
NEXT_PUBLIC_SOLANA_WS_URL=wss://your-rpc-provider.com

# ── Market data (required) ───────────────────────────────────────────
NEXT_PUBLIC_MOBULA_API_KEY=your_mobula_key
# Server-side only. Used automatically when the primary key returns 401/403.
MOBULA_FALLBACK_API_KEY=your_fallback_key
NEXT_PUBLIC_USE_MOBULA=true

# ── Jupiter / swaps ──────────────────────────────────────────────────
# Without an API key, swap requests are unauthenticated and rate-limited.
NEXT_PUBLIC_JUPITER_API_KEY=your_jupiter_key
NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT=your_referral_account
# Fee charged per swap in bps. 125 = 1.25%, of which Jupiter keeps 20%.
# Fees are only collected once referral token accounts exist —
# see scripts/setup-referral.ts.
NEXT_PUBLIC_JUPITER_REFERRAL_FEE=125

# ── Access control (required for the Discord gate) ───────────────────
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_GUILD_ID=your_server_id
DISCORD_BOT_TOKEN=your_bot_token          # bot must be a member of the guild
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
# Comma-separated role IDs that grant access. Defaults to Holder + Pre-Sale
# (see src/lib/accessRoles.ts) — set this to change who gets in, no deploy.
NEXT_PUBLIC_DISCORD_ALLOWED_ROLE_IDS=

# ── Admin ────────────────────────────────────────────────────────────
# Auto-promoted to admin on sign-in, can never be demoted, and is the only
# account allowed to change roles. Other admins are view-only.
SUPER_ADMIN_EMAIL=you@example.com
# Set to "false" only to test the Discord gate with the super-admin account.
SUPER_ADMIN_AUTO_PROMOTE=true

# ── Google sign-in ───────────────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# ── Telegram sign-in ─────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
# The login widget reads the PUBLIC var — without it the button won't render.
# The bot's domain must also be registered via BotFather /setdomain.
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username

# ── Error monitoring (recommended) ───────────────────────────────────
# Sentry is wired up in next.config.ts but reports nothing without a DSN.
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=

# ── PumpPortal WebSocket (free, no key needed) ───────────────────────
NEXT_PUBLIC_PUMPAPI_URL=wss://pumpportal.fun/api/data

# ── BSC (disabled — Solana-only for now) ─────────────────────────────
NEXT_PUBLIC_ENABLE_BSC=false
```

### 3. Set Up Database

```bash
pnpm prisma db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Telegram Authentication Setup

### Create a Bot

1. Open Telegram → search **@BotFather** → send `/newbot`
2. Choose a name and username for your bot
3. Save the bot token → set as `TELEGRAM_BOT_TOKEN`

> Use separate bots for dev and production (`TELEGRAM_BOT_TOKEN_DEV` for local).

### Set the Webhook

**Development** (requires a tunnel like [ngrok](https://ngrok.com/)):

```bash
# Start tunnel first, then:
curl -X POST http://localhost:3000/api/telegram/webhook/setup \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/api/telegram/webhook"}'
```

**Production** (after deploying):

```bash
curl -X POST https://yourdomain.com/api/telegram/webhook/setup
```

Check webhook status:

```bash
curl https://yourdomain.com/api/telegram/webhook/setup
```

Or use the helper script:

```bash
./scripts/setup-webhook.sh dev        # development
./scripts/setup-webhook.sh production # production
```

### How Auth Works

1. User clicks "Login with Telegram" → redirected to your bot with a unique token
2. Bot sends an "Authenticate" button linking back to the site
3. Site verifies the hash, creates a session, and auto-creates Turnkey wallets

### Transaction Signing for Telegram Users

Telegram users sign transactions server-side via `/api/turnkey/sign-transaction` (the Turnkey SDK signs with API keys — private keys never leave Turnkey). Google/OAuth users sign client-side via the Turnkey browser SDK.

### Production Checklist

- [ ] All env vars set in Vercel Dashboard
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] Webhook set with HTTPS URL
- [ ] `TELEGRAM_WEBHOOK_SECRET` configured
- [ ] Auth flow tested end-to-end

---

## Turnkey API Keys

1. Sign up at [Turnkey Dashboard](https://dashboard.turnkey.com)
2. Create organization → go to **API Keys** → **Create API Key** → choose "In-browser"
3. Copy both keys immediately:
   - **API Public Key** → `NEXT_PUBLIC_TURNKEY_API_KEY`
   - **API Private Key** → `TURNKEY_API_PRIVATE_KEY` (never commit this)
4. Copy **Organization ID** → `NEXT_PUBLIC_TURNKEY_ORG_ID`

---

## Features

- Real-time Solana token feed (Mobula Pulse + PumpFun WebSocket)
- Embedded wallet via Turnkey (Google + Telegram auth)
- Jupiter Ultra swaps with trade history recording
- Portfolio view with holdings, trade history, and PnL tracking
- Watchlist and token comparison
- Admin dashboard with user management
- Discord + Telegram account linking
