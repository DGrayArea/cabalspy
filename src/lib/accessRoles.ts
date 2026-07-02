/**
 * Discord role IDs that grant site access (Holder + Pre-Sale by default).
 * Override with NEXT_PUBLIC_DISCORD_ALLOWED_ROLE_IDS as a comma-separated
 * list of role IDs — no code change needed to adjust who gets in.
 * Shared by the Discord callback (server) and the client access guard.
 */
const DEFAULT_ALLOWED_DISCORD_ROLE_IDS = [
  "1440085206785720413", // Holder
  "1386648661391441920", // Pre-Sale
];

const fromEnv = (process.env.NEXT_PUBLIC_DISCORD_ALLOWED_ROLE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const ALLOWED_DISCORD_ROLE_IDS: string[] =
  fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_DISCORD_ROLE_IDS;
