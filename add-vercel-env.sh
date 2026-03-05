#!/bin/bash

# Script to add environment variables to Vercel
# Usage: ./add-vercel-env.sh

echo "🔧 Adding environment variables to Vercel..."
echo ""

# Check if project is linked
if ! vercel env ls &>/dev/null; then
    echo "❌ Project not linked to Vercel. Please run: vercel link"
    exit 1
fi

# Required variables
REQUIRED_VARS=(
    "TURNKEY_API_PRIVATE_KEY"
    "NEXT_PUBLIC_TURNKEY_ORG_ID"
    "NEXT_PUBLIC_TURNKEY_API_KEY"
    "NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID"
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
)

# Optional variables (with defaults, but you can override)
OPTIONAL_VARS=(
    "NEXT_PUBLIC_TURNKEY_BASE_URL"
    "NEXT_PUBLIC_SOLANA_RPC_URL"
    "NEXT_PUBLIC_REDIRECT_URI"
    "GOOGLE_CLIENT_SECRET"
    "TELEGRAM_BOT_TOKEN"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "NEXT_PUBLIC_MOBULA_API_KEY"
    "NEXT_PUBLIC_USE_MOBULA"
    "NEXT_PUBLIC_JUPITER_API_KEY"
)

echo "📋 Required Environment Variables:"
echo "These will be added for Production, Preview, and Development environments"
echo ""

# Add required variables
for var in "${REQUIRED_VARS[@]}"; do
    echo "Adding: $var"
    echo "Enter value for $var (or press Enter to skip):"
    read -r value
    if [ -n "$value" ]; then
        # Add to all environments
        echo "$value" | vercel env add "$var" production
        echo "$value" | vercel env add "$var" preview
        echo "$value" | vercel env add "$var" development
        echo "✅ Added $var"
    else
        echo "⏭️  Skipped $var"
    fi
    echo ""
done

echo ""
echo "📋 Optional Environment Variables:"
echo "Press Enter to skip any you don't need"
echo ""

# Add optional variables
for var in "${OPTIONAL_VARS[@]}"; do
    echo "Add $var? (y/n, default: n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Enter value for $var:"
        read -r value
        if [ -n "$value" ]; then
            echo "$value" | vercel env add "$var" production
            echo "$value" | vercel env add "$var" preview
            echo "$value" | vercel env add "$var" development
            echo "✅ Added $var"
        fi
    fi
    echo ""
done

echo ""
echo "✅ Done! Review your environment variables with: vercel env ls"
echo "🔄 Redeploy your project for changes to take effect: vercel --prod"

