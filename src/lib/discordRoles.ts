import { ALLOWED_DISCORD_ROLE_IDS } from "@/lib/accessRoles";
import { logger } from "@/lib/logger";

/** How long a cached role check stays fresh before we re-ask Discord. */
export const ROLE_RECHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type GuildRoleResult =
  | { status: "ok"; roles: string[] }
  | { status: "not_in_guild" }
  /** Discord was unreachable / errored — callers should fail OPEN so an
   *  outage on Discord's side never locks verified users out. */
  | { status: "unavailable" };

export function hasAllowedRole(roles: string[]): boolean {
  return roles.some((r) => ALLOWED_DISCORD_ROLE_IDS.includes(r));
}

/** Fetch a member's current roles in the configured guild. */
export async function fetchGuildRoles(
  discordId: string
): Promise<GuildRoleResult> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) {
    logger.warn("Discord guild/bot token not configured — skipping role check");
    return { status: "unavailable" };
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.status === 404) return { status: "not_in_guild" };
    if (!res.ok) {
      logger.warn("Discord member fetch failed", { status: res.status });
      return { status: "unavailable" };
    }

    const member = await res.json();
    return { status: "ok", roles: Array.isArray(member.roles) ? member.roles : [] };
  } catch (error) {
    logger.warn("Discord member fetch threw", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "unavailable" };
  }
}

/**
 * Decide the access level a Discord-linked user should have right now.
 * Admins are never downgraded. On an unavailable Discord, the current
 * level is preserved.
 */
export function resolveAccessLevel(
  currentLevel: string,
  result: GuildRoleResult
): string {
  if (currentLevel === "admin") return "admin";
  if (result.status === "unavailable") return currentLevel;
  if (result.status === "not_in_guild") return "user";
  return hasAllowedRole(result.roles) ? "holder" : "user";
}
