import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Google OAuth callback handler
 * Handles the redirect from Google OAuth
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      logger.warn('Google OAuth error', { error });
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=missing_code', request.url)
      );
    }

    // Exchange code for tokens
    const redirectUri = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${redirectUri}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      logger.error('Failed to exchange Google OAuth code');
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      logger.error('Failed to fetch Google user info');
      return NextResponse.redirect(
        new URL('/?error=user_fetch_failed', request.url)
      );
    }

    const userInfo = await userResponse.json();

    // TODO: Create Turnkey user and wallet
    // TODO: Create session token
    // For now, redirect with user data (in production, set secure cookie)
    
    // This is a simplified flow - in production, you'd:
    // 1. Create/update user in database
    // 2. Create Turnkey wallet if new user
    // 3. Generate JWT session token
    // 4. Set secure httpOnly cookie
    // 5. Redirect to home page

    const userData = {
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
    };

    // Redirect with user data (temporary - use session in production)
    return NextResponse.redirect(
      new URL(`/?authSuccess=true&user=${encodeURIComponent(JSON.stringify(userData))}`, request.url)
    );
  } catch (error) {
    logger.error('Google OAuth callback error', error);
    return NextResponse.redirect(
      new URL('/?error=oauth_error', request.url)
    );
  }
}

