import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Roles defined in original python app
const ALLOWED_ROLES = new Set(["1440085206785720413", "1386648661391441920"]); // Holder + Pre-Sale

/**
 * Discord auth callback
 * GET /api/auth/discord/callback?code=CODE
 *
 * Exchanges code for token, fetches user info and guild member info,
 * verifies roles, and redirects to frontend.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    
    if (!code) {
      logger.warn("Missing code in Discord callback");
      return NextResponse.redirect(new URL("/?error=missing_code", request.url));
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!clientId || !clientSecret || !redirectUri || !guildId || !botToken) {
      logger.error("Discord auth configuration missing");
      return NextResponse.redirect(new URL("/?error=server_configuration", request.url));
    }

    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        logger.error("Failed to exchange code for token", { status: tokenResponse.status, error: errorText });
        return NextResponse.redirect(new URL("/?error=invalid_code", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
        logger.error("Failed to fetch Discord user info");
        return NextResponse.redirect(new URL("/?error=user_fetch_failed", request.url));
    }

    const userData = await userResponse.json();

    // 3. Fetch guild member info to check roles
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userData.id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (memberResponse.status === 404) {
        logger.warn(`User ${userData.id} is not a member of guild ${guildId}`);
        return NextResponse.redirect(new URL("/?error=not_in_server", request.url));
    }

    if (!memberResponse.ok) {
        logger.error("Failed to fetch guild member info", { status: memberResponse.status });
        return NextResponse.redirect(new URL("/?error=member_fetch_failed", request.url));
    }

    const memberData = await memberResponse.json();
    const roles: string[] = memberData.roles || [];

    // 4. Verify roles
    const hasAllowedRole = roles.some(role => ALLOWED_ROLES.has(role));

    if (!hasAllowedRole) {
        logger.warn(`User ${userData.id} does not have required roles. Roles: ${roles.join(", ")}`);
        return NextResponse.redirect(new URL("/?error=missing_role", request.url));
    }

    // 5. Prepare user data for frontend
    const frontendUser = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : null,
        roles: roles
    };

    const encodedData = encodeURIComponent(JSON.stringify(frontendUser));
    
    // 6. Redirect to frontend
    // Determine the base URL for the callback
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const frontendUrl = new URL("/", baseUrl);
    frontendUrl.searchParams.set("discord_auth", "success");
    frontendUrl.searchParams.set("data", encodedData);

    logger.info("Discord auth successful", { userId: userData.id, username: userData.username });

    return NextResponse.redirect(frontendUrl);

  } catch (error) {
    logger.error("Discord callback error", error);
    return NextResponse.redirect(new URL("/?error=server_error", request.url));
  }
}
