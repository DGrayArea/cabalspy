import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * API route to fetch new tokens via Solana RPC
 * GET /api/solana/new-tokens
 *
 * This endpoint uses direct Solana RPC calls (similar to pumpfun-bonkfun-bot)
 * to detect new tokens without relying on third-party APIs.
 *
 * Based on: https://github.com/chainstacklabs/pumpfun-bonkfun-bot
 */

const PUMP_FUN_PROGRAM_ID =
  process.env.NEXT_PUBLIC_PUMP_FUN_PROGRAM_ID ||
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export async function GET(request: NextRequest) {
  try {
    // Get recent transactions from pump.fun program
    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [
          PUMP_FUN_PROGRAM_ID,
          {
            limit: 100, // Get last 100 transactions
            commitment: "confirmed",
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Solana RPC error: ${response.status}`);
    }

    const data = await response.json();
    const signatures = (data.result || []).filter(
      (sig: { err: unknown }) => !sig.err
    );

    // For each signature, we would need to:
    // 1. Get transaction details (getTransaction)
    // 2. Parse for new token mints
    // 3. Extract token metadata
    //
    // This is simplified - full implementation would parse each transaction
    // See: https://github.com/chainstacklabs/pumpfun-bonkfun-bot for full parsing logic

    logger.info("Fetched Solana token signatures", {
      count: signatures.length,
      programId: PUMP_FUN_PROGRAM_ID,
    });

    return NextResponse.json({
      success: true,
      signatures: signatures.slice(0, 50), // Return top 50
      count: signatures.length,
      note:
        "Full implementation would parse transactions to extract token details. " +
        "See pumpfun-bonkfun-bot repo for reference.",
    });
  } catch (error) {
    logger.error("Failed to fetch new tokens via Solana RPC", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tokens",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
