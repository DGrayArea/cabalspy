# Cabalspy

Real-time token tracking and trading platform.

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Turnkey API Keys

**Step-by-step:**

1. **Sign up**: Go to [Turnkey Dashboard](https://dashboard.turnkey.com) and create an account

2. **Create Organization**: After login, create your organization

3. **Get Organization ID**:
   - Click your user icon (top-right)
   - Go to "User Details" or "Organization Settings"
   - Copy your **Organization ID** (looks like `org_xxxxx`)

4. **Generate API Keys**:
   - Go to "API Keys" section in dashboard
   - Click "Create API Key"
   - Choose a name (e.g., "Production Key")
   - Select "In-browser" generation method
   - Authenticate
   - **IMPORTANT**: Copy both keys immediately:
     - **API Public Key** → `NEXT_PUBLIC_TURNKEY_API_KEY`
     - **API Private Key** → `TURNKEY_API_PRIVATE_KEY` (⚠️ Keep secret!)
   - ⚠️ Private key won't be shown again - save it now!

### 3. Create `.env.local`

```bash
# Required - Turnkey
TURNKEY_API_PRIVATE_KEY=your_private_key_here
NEXT_PUBLIC_TURNKEY_ORG_ID=your_org_id_here
NEXT_PUBLIC_TURNKEY_API_KEY=your_public_key_here

# Optional (has defaults)
NEXT_PUBLIC_TURNKEY_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_PUMPAPI_URL=wss://pumpportal.fun/api/data
```

**Note**: PumpAPI is free - no API key needed!

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- ✅ Real-time token data from Axiom API
- ✅ Responsive design (mobile-friendly)
- ✅ Token images with fallback
- ✅ Turnkey wallet integration
- ✅ Trading interface
- ✅ Pagination (15 tokens per page)

