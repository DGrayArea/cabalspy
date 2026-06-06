import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { syncUserWallets } from "@/lib/walletSync";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

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
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Determine the base URL for the callback (must match the one used in init)
    const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    // Safety: strip any trailing slashes to prevent // in the path
    const baseUrl = rawBaseUrl.replace(/\/$/, "");
    
    // Prioritize the specific redirect URI if provided, otherwise construct it (MUST match init exactly)
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || `${baseUrl}/api/auth/discord/callback`;

    if (!clientId || !clientSecret || !guildId || !botToken) {
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
    const DEVELOPER_IDS = new Set(["762720209529864212"]); // Whitelisted dev IDs
    const hasAllowedRole = roles.some(role => ALLOWED_ROLES.has(role));
    const isDeveloper = DEVELOPER_IDS.has(userData.id);

    logger.info("Discord Role Check", { 
        userId: userData.id, 
        username: userData.username, 
        roles, 
        hasAllowedRole, 
        isDeveloper 
    });

    if (!hasAllowedRole && !isDeveloper) {
        logger.warn(`Access Denied: User ${userData.id} lacks roles and is not a whitelisted developer.`);
        return NextResponse.redirect(new URL("/access-denied?error=missing_role", request.url));
    }

    // 5. Identify or Link User
    const existingSession = await getSession(request);
    let user;

    // Check if this Discord ID is already linked to SOME user
    const userWithDiscord = await db.user.findUnique({
      where: { discordId: userData.id },
    });

    if (existingSession) {
      // LINKING FLOW: User is already logged in (e.g. via Google/TG)
      const currentUserId = existingSession.userId;
      
      if (userWithDiscord && userWithDiscord.id !== currentUserId) {
        // This Discord account is already linked to DIFFERENT user
        logger.warn("Discord account already linked to another user", { 
          discordId: userData.id, 
          currentUserId, 
          linkedUserId: userWithDiscord.id 
        });
        return NextResponse.redirect(new URL("/access-denied?error=already_linked", request.url));
      }

      // Update current user with Discord info
      user = await db.user.update({
        where: { id: currentUserId },
        data: {
          discordId: userData.id,
          name: userData.username,
          avatar: userData.avatar
            ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            : undefined,
          accessLevel: "holder", // Grant access since roles are verified
        },
      });
      logger.info("Discord linked to existing session", { userId: user.id });
    } else {
      // LOGIN FLOW: Standard Discord login or first-time signup
      if (userWithDiscord) {
        // Update existing user's profile
        user = await db.user.update({
          where: { id: userWithDiscord.id },
          data: {
            name: userData.username,
            avatar: userData.avatar
              ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
              : userWithDiscord.avatar,
            accessLevel: "holder",
          },
        });
      } else {
        // Create new user
        user = await db.user.create({
          data: {
            discordId: userData.id,
            name: userData.username,
            avatar: userData.avatar
              ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
              : null,
            accessLevel: "holder",
          },
        });
      }
    }

    // 6. Sync Turnkey wallets for this user (if applicable)
    await syncUserWallets(user.id, user.name);

    // 7. Create session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400 * 3 * 1000); // 3 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    // 8. Prepare user data for frontend
    const frontendUser = {
        id: user.id,
        discordId: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: user.avatar,
        roles: roles
    };

    const encodedData = encodeURIComponent(JSON.stringify(frontendUser));
    
    // 9. Redirect to frontend
    const frontendUrl = new URL("/", baseUrl);
    frontendUrl.searchParams.set("discord_auth", "success");
    frontendUrl.searchParams.set("data", encodedData);

    const response = NextResponse.redirect(frontendUrl);
    
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 3,
      path: '/',
    });

    logger.info("Discord auth successful", { userId: userData.id, username: userData.username });

    return response;

  } catch (error) {
    logger.error("Discord callback error", error);
    return NextResponse.redirect(new URL("/?error=server_error", request.url));
  }
}

