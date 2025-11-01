import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Google OAuth callback handler
 * POST /api/auth/google
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri || process.env.NEXTAUTH_URL || 'http://localhost:3000',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      logger.error('Google OAuth token exchange failed', new Error(JSON.stringify(error)));
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      logger.error('Failed to fetch Google user info');
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 400 }
      );
    }

    const userInfo = await userResponse.json();

    // TODO: Create Turnkey user and wallet here
    // This would integrate with Turnkey to create a user account and wallet
    
    // For now, return user info (in production, create session/token)
    return NextResponse.json({
      success: true,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
      },
      // In production, return a secure session token instead
    });
  } catch (error) {
    logger.error('Google OAuth error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google
 */
export async function GET(request: NextRequest) {
  const redirectUri = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', `${redirectUri}/api/auth/google/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.json({ authUrl: authUrl.toString() });
}

