import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { turnkeyService } from "@/services/turnkey";

/**
 * Get wallet addresses for a user's wallets
 * POST /api/turnkey/wallet-addresses
 *
 * Returns wallet addresses for Solana and BSC wallets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletIds } = body;

    if (!walletIds || !walletIds.solana || !walletIds.bsc) {
      return NextResponse.json(
        { error: "walletIds with solana and bsc are required" },
        { status: 400 }
      );
    }

    // Get addresses for both wallets
    const [solanaAddresses, bscAddresses] = await Promise.all([
      turnkeyService.getWalletAddresses(walletIds.solana).catch((err) => {
        logger.error("Error getting Solana addresses", err);
        return [];
      }),
      turnkeyService.getWalletAddresses(walletIds.bsc).catch((err) => {
        logger.error("Error getting BSC addresses", err);
        return [];
      }),
    ]);

    // Extract first address from each wallet
    const solanaAddress = solanaAddresses?.[0]?.address || null;
    const bscAddress = bscAddresses?.[0]?.address || null;

    // Get balances
    const [solanaBalance, bscBalance] = await Promise.all([
      solanaAddress
        ? turnkeyService
            .getWalletBalance(solanaAddress, "solana")
            .catch(() => null)
        : Promise.resolve(null),
      bscAddress
        ? turnkeyService
            .getWalletBalance(bscAddress, "ethereum")
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      wallets: {
        solana: {
          address: solanaAddress,
          balance: solanaBalance?.balance || "0",
          currency: "SOL",
        },
        bsc: {
          address: bscAddress,
          balance: bscBalance?.balance || "0",
          currency: "BNB",
        },
      },
    });
  } catch (error) {
    logger.error("Error getting wallet addresses", error);
    return NextResponse.json(
      {
        error: "Failed to get wallet addresses",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
