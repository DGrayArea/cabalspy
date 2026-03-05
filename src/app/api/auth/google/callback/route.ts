import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { syncUserWallets } from '@/lib/walletSync';
import { randomBytes } from 'crypto';

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

    let user = await db.user.findUnique({
      where: { googleId: userInfo.id }
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: userInfo.email,
          googleId: userInfo.id,
          name: userInfo.name || userInfo.email || 'User',
          avatar: userInfo.picture,
        }
      });
    }

    // Sync all Turnkey wallets
    await syncUserWallets(user.id, user.name);

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400 * 7 * 1000); // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt
      }
    });

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Google OAuth callback error', error);
    return NextResponse.redirect(
      new URL('/?error=oauth_error', request.url)
    );
  }
}

