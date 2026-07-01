import { createHash, createHmac } from "crypto";

/**
 * Verification for Telegram Login Widget payloads
 * (https://core.telegram.org/widgets/login#checking-authorization).
 *
 * Login Widget scheme: secret_key = SHA256(bot_token).
 * (HMAC with "WebAppData" is the Mini App initData scheme — not valid here.)
 */

export interface TelegramLoginPayload {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 86400; // 24 hours

export type TelegramVerifyResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export function verifyTelegramLogin(
  payload: Record<string, unknown>,
  botToken: string
): TelegramVerifyResult {
  const { hash, ...fields } = payload;

  if (!payload.id || !payload.auth_date || !hash) {
    return {
      ok: false,
      error: "Missing required Telegram auth data",
      status: 400,
    };
  }

  const dataCheckString = Object.keys(fields)
    .filter((key) => fields[key] !== undefined && fields[key] !== null)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    return { ok: false, error: "Invalid authentication hash", status: 401 };
  }

  const authDate = parseInt(String(payload.auth_date), 10);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "Authentication expired", status: 401 };
  }

  return { ok: true };
}
