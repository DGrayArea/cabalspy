import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { turnkeyService } from "@/services/turnkey";

/**
 * Sign a transaction using Turnkey (backend signing)
 * POST /api/turnkey/sign-transaction
 *
 * This endpoint is used for Telegram-authenticated users who don't have
 * a Turnkey session. Transactions are signed server-side using API keys.
 *
 * According to Turnkey's recommendations:
 * - Telegram auth users should use @turnkey/sdk-server (or HTTP client) for backend signing
 * - This is because Turnkey doesn't support Telegram auth as part of a session
 *
 * Alternative approach: Generate OIDC tokens from Telegram auth that Turnkey can verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletId,
      accountId,
      unsignedTransaction,
      transactionType = "TRANSACTION_TYPE_SOLANA",
    } = body;

    if (!walletId || !accountId || !unsignedTransaction) {
      return NextResponse.json(
        {
          error: "walletId, accountId, and unsignedTransaction are required",
        },
        { status: 400 }
      );
    }

    // Verify user is authenticated (you should add proper session verification here)
    // For now, we'll rely on the frontend to only call this when authenticated
    // In production, verify the session token or user ID

    logger.info("Signing transaction via backend", {
      walletId,
      accountId,
      transactionType,
    });

    // Sign the transaction using Turnkey's backend API
    const signedTransaction = await turnkeyService.signTransaction(
      walletId,
      accountId,
      unsignedTransaction,
      transactionType as "TRANSACTION_TYPE_SOLANA" | "TRANSACTION_TYPE_ETHEREUM"
    );

    return NextResponse.json({
      success: true,
      signedTransaction,
    });
  } catch (error) {
    logger.error("Error signing transaction", error);
    return NextResponse.json(
      {
        error: "Failed to sign transaction",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
