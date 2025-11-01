import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createHmac } from 'crypto';

/**
 * Verify Telegram authentication
 * POST /api/auth/telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    if (!id || !auth_date || !hash) {
      return NextResponse.json(
        { error: 'Missing required Telegram auth data' },
        { status: 400 }
      );
    }

    // Verify the hash
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error('Telegram bot token not configured');
      return NextResponse.json(
        { error: 'Telegram authentication not configured' },
        { status: 500 }
      );
    }

    // Create data check string
    const dataCheckString = Object.keys(body)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${body[key]}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
      logger.warn('Invalid Telegram auth hash', { received: hash, calculated: calculatedHash });
      return NextResponse.json(
        { error: 'Invalid authentication hash' },
        { status: 401 }
      );
    }

    // Check if auth_date is recent (within 24 hours)
    const authDate = parseInt(auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (timeDiff > 86400) { // 24 hours
      logger.warn('Telegram auth expired', { authDate, currentTime, timeDiff });
      return NextResponse.json(
        { error: 'Authentication expired' },
        { status: 401 }
      );
    }

    // TODO: Create Turnkey user and wallet here
    // This would integrate with Turnkey to create a user account and wallet

    return NextResponse.json({
      success: true,
      user: {
        id: id.toString(),
        name: `${first_name} ${last_name || ''}`.trim(),
        telegramId: id.toString(),
        username,
        avatar: photo_url,
      },
      // In production, return a secure session token instead
    });
  } catch (error) {
    logger.error('Telegram auth error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

