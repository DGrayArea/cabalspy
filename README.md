# Cabalspy

Real-time token tracking and trading platform (Solana-first, BSC/ETH coming).

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create `.env.local`

```bash
# Turnkey (required)
TURNKEY_API_PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_TURNKEY_ORG_ID=your_org_id_here
NEXT_PUBLIC_TURNKEY_API_KEY=your_public_key_here
NEXT_PUBLIC_TURNKEY_BASE_URL=https://api.turnkey.com

# Solana RPC (required in production — public endpoint rate-limits)
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-provider.com
NEXT_PUBLIC_SOLANA_WS_URL=wss://your-rpc-provider.com

# Mobula (required)
NEXT_PUBLIC_MOBULA_API_KEY=your_mobula_key
NEXT_PUBLIC_MOBULA_FALLBACK_API_KEY=your_fallback_key

# Jupiter (optional — unauthenticated requests have lower rate limits)
NEXT_PUBLIC_JUPITER_API_KEY=your_jupiter_key
NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT=your_referral_account

# PumpPortal WebSocket (free, no key needed)
NEXT_PUBLIC_PUMPAPI_URL=wss://pumpportal.fun/api/data

# Telegram bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
NEXTAUTH_URL=http://localhost:3000

# Discord (optional)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# BSC (disabled by default)
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
