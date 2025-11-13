#!/bin/bash

# Telegram Webhook Setup Script
# Usage: ./scripts/setup-webhook.sh [dev|preview|production]

ENVIRONMENT=${1:-dev}
BASE_URL=""
WEBHOOK_URL=""
LOCAL_BASE_URL=""

case $ENVIRONMENT in
  dev|development)
    BASE_URL="http://localhost:3000"
    echo "🔧 Setting up DEVELOPMENT webhook..."
    ;;
  preview)
    BASE_URL="${VERCEL_PREVIEW_URL:-https://your-preview-url.vercel.app}"
    echo "🔧 Setting up PREVIEW webhook..."
    ;;
  prod|production)
    BASE_URL="${VERCEL_URL:-https://yourdomain.com}"
    echo "🔧 Setting up PRODUCTION webhook..."
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: ./scripts/setup-webhook.sh [dev|preview|production]"
    exit 1
    ;;
esac

echo "📍 URL: $BASE_URL"
echo ""

# Check if server is running (for dev environment)
if [[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "development" ]]; then
  if ! curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo "❌ Development server is not running!"
    echo ""
    echo "Please start the server first:"
    echo "  pnpm run dev"
    echo ""
    echo "Then run this script again in another terminal."
    exit 1
  fi
  echo "✅ Server is running"
  
  # Check for ngrok tunnel
  echo "🔍 Checking for ngrok tunnel..."
  NGROK_URL=""
  LOCAL_BASE_URL="$BASE_URL"  # Keep localhost for API calls
  
  # Try to get ngrok URL from ngrok API (default port 4040)
  NGROK_API="http://localhost:4040/api/tunnels"
  if curl -s -f "$NGROK_API" > /dev/null 2>&1; then
    # Get HTTPS tunnel URL from ngrok API
    # Try using jq first (more reliable), fallback to grep
    if command -v jq &> /dev/null; then
      NGROK_URL=$(curl -s "$NGROK_API" 2>/dev/null | jq -r '.tunnels[] | select(.proto == "https") | .public_url' | head -1)
    else
      # Fallback: extract HTTPS URL using grep
      NGROK_URL=$(curl -s "$NGROK_API" 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    
    if [[ -n "$NGROK_URL" && "$NGROK_URL" != "null" ]]; then
      echo "✅ Found ngrok tunnel: $NGROK_URL"
      # Use ngrok URL for webhook (Telegram needs HTTPS)
      WEBHOOK_URL="${NGROK_URL}/api/telegram/webhook"
      echo "📍 Will use ngrok URL for webhook: $WEBHOOK_URL"
    else
      echo "⚠️  Ngrok is running but no HTTPS tunnel found"
      echo "   Make sure you started ngrok with: ngrok http 3000"
      WEBHOOK_URL=""
    fi
  else
    echo "⚠️  Ngrok not detected"
    echo "   Telegram requires HTTPS - use ngrok for local testing:"
    echo "   1. Run: ngrok http 3000"
    echo "   2. Then run this script again"
    WEBHOOK_URL=""
  fi
  echo ""
fi

# Set webhook
echo "🔄 Setting up webhook..."

# If we have ngrok URL, use it in the request body
if [[ -n "$WEBHOOK_URL" ]]; then
  echo "   Using ngrok URL: $WEBHOOK_URL"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$LOCAL_BASE_URL/api/telegram/webhook/setup" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$WEBHOOK_URL\"}")
else
  # No ngrok, try with auto-detected URL (will fail for HTTP localhost)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/telegram/webhook/setup" \
    -H "Content-Type: application/json")
fi

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check if successful
if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q '"success":true'; then
  echo "✅ Webhook set successfully!"
  echo ""
  echo "Webhook Info:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [[ "$HTTP_CODE" == "000" ]]; then
  echo "❌ Failed to connect to server"
  echo ""
  if [[ "$ENVIRONMENT" == "dev" || "$ENVIRONMENT" == "development" ]]; then
    echo "Make sure the development server is running:"
    echo "  npm run dev"
  else
    echo "Check that the URL is correct and the server is accessible."
  fi
  exit 1
else
  echo "❌ Failed to set webhook (HTTP $HTTP_CODE)"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  # Check if it's the HTTPS requirement error
  if echo "$BODY" | grep -q "HTTPS required" || echo "$BODY" | grep -q "bad webhook.*HTTPS"; then
    echo ""
    echo "💡 Solution: Telegram requires HTTPS even for local development."
    echo ""
    echo "Use ngrok to create an HTTPS tunnel:"
    echo "  1. Install ngrok: https://ngrok.com/"
    echo "  2. Run: ngrok http 3000"
    echo "  3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
    echo "  4. Set webhook with:"
    echo "     curl -X POST http://localhost:3000/api/telegram/webhook/setup \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"url\": \"https://your-ngrok-url.ngrok.io/api/telegram/webhook\"}'"
    echo ""
    echo "Or use the solution steps from the error response above."
  fi
  
  exit 1
fi

echo ""
echo "🔍 Verifying webhook..."

# Verify webhook (use localhost for API call)
VERIFY_URL="${LOCAL_BASE_URL:-$BASE_URL}/api/telegram/webhook/setup"
VERIFY=$(curl -s "$VERIFY_URL")
echo "$VERIFY" | jq '.' 2>/dev/null || echo "$VERIFY"

