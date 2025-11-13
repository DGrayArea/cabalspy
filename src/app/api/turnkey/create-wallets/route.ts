import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { turnkeyService } from "@/services/turnkey";

/**
 * Get or create Turnkey wallets for a user
 * POST /api/turnkey/create-wallets
 *
 * This endpoint:
 * - Checks if wallets already exist for the user (by wallet name pattern)
 * - Returns existing wallets if found
 * - Creates new wallets only if they don't exist (new user/signup)
 *
 * Wallets are created in your existing organization (NEXT_PUBLIC_ORGANIZATION_ID).
 * These wallets can be accessed via Turnkey's API and will persist across devices.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName } = body;

    if (!userId || !userName) {
      return NextResponse.json(
        { error: "userId and userName are required" },
        { status: 400 }
      );
    }

    const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;
    if (!organizationId) {
      logger.error("NEXT_PUBLIC_ORGANIZATION_ID not configured");
      return NextResponse.json(
        { error: "Turnkey organization not configured" },
        { status: 500 }
      );
    }

    const solanaWalletName = `${userName}'s Solana Wallet`;
    const bscWalletName = `${userName}'s BSC Wallet`;

    logger.info("Getting or creating Turnkey wallets", {
      userId,
      userName,
      organizationId,
    });

    // Check if existing wallet IDs were provided (from localStorage)
    // If provided, verify they exist and return them (existing user/login)
    const { existingWalletIds } = body;

    if (existingWalletIds?.solana && existingWalletIds?.bsc) {
      // Verify existing wallets exist in Turnkey
      try {
        await Promise.all([
          turnkeyService.getWallet(existingWalletIds.solana),
          turnkeyService.getWallet(existingWalletIds.bsc),
        ]);

        logger.info("Returning existing wallets", {
          userId,
          solanaWalletId: existingWalletIds.solana,
          bscWalletId: existingWalletIds.bsc,
        });

        return NextResponse.json({
          success: true,
          isNewUser: false,
          organizationId,
          wallets: {
            solana: {
              walletId: existingWalletIds.solana,
              network: "solana",
            },
            bsc: {
              walletId: existingWalletIds.bsc,
              network: "bsc",
            },
          },
        });
      } catch (error) {
        // Wallets don't exist or are invalid, create new ones
        logger.warn("Existing wallet IDs invalid, creating new wallets", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall through to create new wallets
      }
    }

    // No existing wallets or verification failed - create new wallets (new user/signup)
    logger.info("Creating new wallets for user", { userId, userName });

    const solanaWalletId = await turnkeyService.createWallet(
      userId,
      solanaWalletName,
      "solana"
    );

    const bscWalletId = await turnkeyService.createWallet(
      userId,
      bscWalletName,
      "ethereum" // BSC uses Ethereum address format
    );

    logger.info("Wallets created successfully", {
      userId,
      organizationId,
      solanaWalletId,
      bscWalletId,
      isNewUser: true,
    });

    return NextResponse.json({
      success: true,
      isNewUser: true,
      organizationId,
      wallets: {
        solana: {
          walletId: solanaWalletId,
          network: "solana",
        },
        bsc: {
          walletId: bscWalletId,
          network: "bsc",
        },
      },
    });
  } catch (error) {
    logger.error("Error getting/creating Turnkey wallets", error);
    return NextResponse.json(
      {
        error: "Failed to get or create wallets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
