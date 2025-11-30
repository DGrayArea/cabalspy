# Vercel Environment Variables Setup

This document lists all environment variables needed for your Vercel deployment.

## How to Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable below
4. Make sure to set them for the appropriate environments (Production, Preview, Development)

---

## Required Environment Variables

### Turnkey (Required for Wallet Operations)

```
TURNKEY_API_PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_TURNKEY_ORG_ID=your_org_id_here
NEXT_PUBLIC_TURNKEY_API_KEY=your_public_key_here
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=your_auth_proxy_config_id_here
```

**How to get these:**
- Go to [Turnkey Dashboard](https://dashboard.turnkey.com)
- Organization ID: Found in your user/organization settings
- API Keys: Create in "API Keys" section (save private key immediately - it won't be shown again!)
- Auth Proxy Config ID: Found in "Auth Proxy Config" section

### Google OAuth (Required for Google Login)

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

**How to get this:**
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create OAuth 2.0 Client ID
- Add authorized redirect URI: `https://auth.turnkey.com/oauth/callback` (or your Turnkey callback URI)

---

## Optional Environment Variables (Have Defaults)

### Turnkey Configuration

```
NEXT_PUBLIC_TURNKEY_BASE_URL=https://api.turnkey.com
```

### PumpPortal (Solana Token Feeds)

```
NEXT_PUBLIC_PUMPAPI_WS_URL=wss://pumpportal.fun/api/data
NEXT_PUBLIC_PUMPAPI_URL=https://pumpportal.fun
NEXT_PUBLIC_PUMPPORTAL_API_KEY=  # Optional: for PumpSwap data access
```

### BSC Token Feeds (forr.meme)

```
NEXT_PUBLIC_FORRMEME_WS_URL=wss://api.forr.meme/ws
NEXT_PUBLIC_FORRMEME_API_URL=https://api.forr.meme
```

### Blockchain RPC

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_WS_URL=  # Optional: WebSocket URL for subscriptions
NEXT_PUBLIC_PUMP_FUN_PROGRAM_ID=6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

### OAuth (Optional - Only if implementing custom auth)

```
GOOGLE_CLIENT_ID=  # Server-side only
GOOGLE_CLIENT_SECRET=  # Server-side only
TELEGRAM_BOT_TOKEN=  # Optional
NEXTAUTH_SECRET=  # Optional
NEXTAUTH_URL=https://your-domain.vercel.app  # Your Vercel deployment URL
```

### Redirect URI (Optional)

```
NEXT_PUBLIC_REDIRECT_URI=https://your-domain.vercel.app
```

**Note:** If not set, it will default to your Vercel deployment URL automatically.

---

## Quick Copy-Paste for Vercel

### Minimum Required (Copy these first):

```
TURNKEY_API_PRIVATE_KEY=
NEXT_PUBLIC_TURNKEY_ORG_ID=
NEXT_PUBLIC_TURNKEY_API_KEY=
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

### Recommended (For better performance):

```
NEXT_PUBLIC_SOLANA_RPC_URL=  # Use a private RPC like Helius, QuickNode, or Alchemy for better reliability
```

---

## Important Notes

1. **Private Keys**: Never commit `TURNKEY_API_PRIVATE_KEY` to git. Only add it in Vercel's environment variables.

2. **NEXT_PUBLIC_ prefix**: Variables with this prefix are exposed to the browser. Only use it for non-sensitive values.

3. **Redeploy**: After adding environment variables, you need to redeploy your Vercel project for changes to take effect.

4. **Environment-specific**: You can set different values for Production, Preview, and Development environments in Vercel.

5. **Turnkey Redirect URI**: Make sure to add your Vercel domain to Google Cloud Console's authorized redirect URIs if using Google OAuth.

---

## Verification

After adding variables, check your Vercel deployment logs to ensure:
- No "Missing required environment variables" errors
- Turnkey wallet operations work correctly
- OAuth login works (if configured)

