import { NextRequest, NextResponse } from 'next/server';
import { axiomService } from '@/services/axiom';
import { logger } from '@/lib/logger';

/**
 * API route to fetch tokens from Axiom
 * GET /api/tokens
 */
export async function GET(request: NextRequest) {
  try {
    const tokens = await axiomService.fetchTokens();
    return NextResponse.json({ tokens });
  } catch (error) {
    logger.error('Failed to fetch tokens', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

