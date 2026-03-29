import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Initiate Discord authentication
 * GET /api/auth/discord/init
 *
 * This endpoint redirects the user to Discord's OAuth2 authorization page.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    
    // Determine the base URL for the callback (must match the one used in init)
    const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    // Safety: strip any trailing slashes to prevent // in the path
    const baseUrl = rawBaseUrl.replace(/\/$/, "");
    
    // Prioritize the specific redirect URI if provided, otherwise construct it
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || `${baseUrl}/api/auth/discord/callback`;
    
    if (!clientId) {
      logger.error("Discord auth configuration missing: client ID is required");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    // Scopes needed: identify (for user info) and guilds.members.read (to check roles)
    const scope = "identify guilds.members.read";
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scope,
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    logger.info("Discord auth initiated");

    return NextResponse.json({
      success: true,
      authUrl: discordAuthUrl,
    });
  } catch (error) {
    logger.error("Failed to initiate Discord auth", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}
