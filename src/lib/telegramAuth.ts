/**
 * Telegram Bot-to-Website Authentication Service
 *
 * This service manages temporary authentication tokens for the Telegram bot flow.
 * In production, consider using Redis or a database for token storage.
 */

interface AuthToken {
  token: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory token storage (use Redis in production)
// Use global to persist across hot reloads in development
const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Use global store to persist across hot reloads in Next.js dev mode
const getTokenStore = (): Map<string, AuthToken> => {
  if (typeof global !== "undefined") {
    if (!(global as any).__telegramTokenStore) {
      (global as any).__telegramTokenStore = new Map<string, AuthToken>();
    }
    return (global as any).__telegramTokenStore;
  }
  // Fallback for environments without global
  if (!(globalThis as any).__telegramTokenStore) {
    (globalThis as any).__telegramTokenStore = new Map<string, AuthToken>();
  }
  return (globalThis as any).__telegramTokenStore;
};

/**
 * Generate a new authentication token
 */
export function generateAuthToken(): string {
  const store = getTokenStore();
  // Use crypto.randomUUID() if available, otherwise generate random string
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const now = Date.now();

  store.set(token, {
    token,
    createdAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS,
    used: false,
  });

  // Clean up expired tokens periodically
  cleanupExpiredTokens();

  return token;
}

/**
 * Verify and consume an authentication token
 */
export function verifyAndConsumeToken(token: string): boolean {
  const store = getTokenStore();
  const authToken = store.get(token);

  if (!authToken) {
    // Debug: Log token store state
    if (process.env.NODE_ENV === "development") {
      console.log("[Token Debug] Token not found:", token);
      console.log("[Token Debug] Store size:", store.size);
      console.log(
        "[Token Debug] Store keys:",
        Array.from(store.keys()).slice(0, 5)
      );
    }
    return false;
  }

  if (authToken.used) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Token Debug] Token already used:", token);
    }
    return false;
  }

  const now = Date.now();
  if (now > authToken.expiresAt) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Token Debug] Token expired:", {
        token,
        now,
        expiresAt: authToken.expiresAt,
        age: now - authToken.createdAt,
      });
    }
    store.delete(token);
    return false;
  }

  // Mark as used
  authToken.used = true;
  return true;
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const store = getTokenStore();
  const now = Date.now();
  for (const [token, authToken] of store.entries()) {
    if (now > authToken.expiresAt) {
      store.delete(token);
    }
  }
}

/**
 * Get bot username from environment or return default
 */
export function getBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME || "your_bot_username";
}

/**
 * Generate Telegram bot deep link
 */
export function generateBotLink(token: string): string {
  const botUsername = getBotUsername();
  return `https://t.me/${botUsername}?start=${token}`;
}
