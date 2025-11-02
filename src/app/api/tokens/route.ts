import { NextRequest, NextResponse } from 'next/server';
import { axiomService } from '@/services/axiom';
import { logger } from '@/lib/logger';

/**
 * API route to fetch tokens from Axiom
 * GET /api/tokens
 * Cached for 15 seconds to reduce external API calls
 */
export async function GET(_request: NextRequest) {
  try {
    const tokens = await axiomService.fetchTokens();
    
    // Cache response for 15 seconds
    return NextResponse.json(
      { tokens },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to fetch tokens', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

