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
 *
 * IMPORTANT: For Telegram-authenticated users:
 * - Wallets are created server-side (this endpoint)
 * - Transactions must be signed server-side via /api/turnkey/sign-transaction
 * - This is because Turnkey doesn't support Telegram auth as part of a session
 * - Alternative: Generate OIDC tokens from Telegram auth that Turnkey can verify
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
    const ethereumWalletName = `${userName}'s Ethereum Wallet`;
    const bnbWalletName = `${userName}'s BNB Wallet`;
    const baseWalletName = `${userName}'s Base Wallet`;

    logger.info("Getting or creating Turnkey wallets", {
      userId,
      userName,
      organizationId,
    });

    // Check if existing wallet IDs were provided (from localStorage)
    // If provided, verify they exist and return them (existing user/login)
    const { existingWalletIds } = body;

    // Check if we have at least some existing wallets
    const hasExistingWallets =
      existingWalletIds?.solana ||
      existingWalletIds?.ethereum ||
      existingWalletIds?.bnb ||
      existingWalletIds?.base;

    if (hasExistingWallets) {
      // Verify existing wallets exist in Turnkey
      const walletChecks: Promise<void>[] = [];
      const verifiedWallets: {
        solana?: { walletId: string; network: string };
        ethereum?: { walletId: string; network: string };
        bnb?: { walletId: string; network: string };
        base?: { walletId: string; network: string };
      } = {};

      if (existingWalletIds?.solana) {
        walletChecks.push(
          turnkeyService
            .getWallet(existingWalletIds.solana)
            .then(() => {
              verifiedWallets.solana = {
                walletId: existingWalletIds.solana,
                network: "solana",
              };
            })
            .catch(() => {
              // Wallet doesn't exist, will create new one
            })
        );
      }

      if (existingWalletIds?.ethereum) {
        walletChecks.push(
          turnkeyService
            .getWallet(existingWalletIds.ethereum)
            .then(() => {
              verifiedWallets.ethereum = {
                walletId: existingWalletIds.ethereum,
                network: "ethereum",
              };
            })
            .catch(() => {
              // Wallet doesn't exist, will create new one
            })
        );
      }

      if (existingWalletIds?.bnb) {
        walletChecks.push(
          turnkeyService
            .getWallet(existingWalletIds.bnb)
            .then(() => {
              verifiedWallets.bnb = {
                walletId: existingWalletIds.bnb,
                network: "bnb",
              };
            })
            .catch(() => {
              // Wallet doesn't exist, will create new one
            })
        );
      }

      if (existingWalletIds?.base) {
        walletChecks.push(
          turnkeyService
            .getWallet(existingWalletIds.base)
            .then(() => {
              verifiedWallets.base = {
                walletId: existingWalletIds.base,
                network: "base",
              };
            })
            .catch(() => {
              // Wallet doesn't exist, will create new one
            })
        );
      }

      await Promise.allSettled(walletChecks);

      // If we have all 4 wallets verified, return them
      const verifiedCount = Object.keys(verifiedWallets).length;
      if (verifiedCount === 4) {
        logger.info("Returning existing wallets", {
          userId,
          wallets: verifiedWallets,
        });

        return NextResponse.json({
          success: true,
          isNewUser: false,
          organizationId,
          wallets: verifiedWallets,
        });
      }

      // If some wallets are missing, log and continue to create missing ones
      if (verifiedCount > 0) {
        logger.info("Some wallets exist, creating missing ones", {
          userId,
          existing: Object.keys(verifiedWallets),
        });
      }
    }

    // No existing wallets or verification failed - create new wallets (new user/signup)
    logger.info("Creating new wallets for user", { userId, userName });

    // Create wallets with individual error handling
    // All EVM chains (Ethereum, BNB, Base) use secp256k1 curve and Ethereum address format
    // According to Turnkey: https://www.turnkey.com/blog/our-approach-to-multichain-support-at-turnkey
    // All EVM chains are supported out-of-the-box via secp256k1 curve
    let solanaWalletId: string | null = null;
    let ethereumWalletId: string | null = null;
    let bnbWalletId: string | null = null;
    let baseWalletId: string | null = null;
    const errors: string[] = [];

    // Create Solana wallet (uses Ed25519 curve)
    if (!existingWalletIds?.solana) {
      try {
        solanaWalletId = await turnkeyService.createWallet(
          userId,
          solanaWalletName,
          "solana"
        );
        logger.info("Solana wallet created", { solanaWalletId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to create Solana wallet", error, {
          userId,
          walletName: solanaWalletName,
        });
        errors.push(`Solana: ${errorMsg}`);
      }
    } else {
      solanaWalletId = existingWalletIds.solana;
    }

    // Create Ethereum wallet (uses secp256k1 curve)
    if (!existingWalletIds?.ethereum) {
      try {
        ethereumWalletId = await turnkeyService.createWallet(
          userId,
          ethereumWalletName,
          "ethereum"
        );
        logger.info("Ethereum wallet created", { ethereumWalletId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to create Ethereum wallet", error, {
          userId,
          walletName: ethereumWalletName,
        });
        errors.push(`Ethereum: ${errorMsg}`);
      }
    } else {
      ethereumWalletId = existingWalletIds.ethereum;
    }

    // Create BNB (BSC) wallet (uses secp256k1 curve, same as Ethereum)
    if (!existingWalletIds?.bnb) {
      try {
        bnbWalletId = await turnkeyService.createWallet(
          userId,
          bnbWalletName,
          "ethereum" // BNB/BSC uses Ethereum address format (secp256k1)
        );
        logger.info("BNB wallet created", { bnbWalletId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to create BNB wallet", error, {
          userId,
          walletName: bnbWalletName,
        });
        errors.push(`BNB: ${errorMsg}`);
      }
    } else {
      bnbWalletId = existingWalletIds.bnb;
    }

    // Create Base wallet (uses secp256k1 curve, same as Ethereum)
    if (!existingWalletIds?.base) {
      try {
        baseWalletId = await turnkeyService.createWallet(
          userId,
          baseWalletName,
          "ethereum" // Base uses Ethereum address format (secp256k1)
        );
        logger.info("Base wallet created", { baseWalletId });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to create Base wallet", error, {
          userId,
          walletName: baseWalletName,
        });
        errors.push(`Base: ${errorMsg}`);
      }
    } else {
      baseWalletId = existingWalletIds.base;
    }

    // If all wallets failed, return error
    if (!solanaWalletId && !ethereumWalletId && !bnbWalletId && !baseWalletId) {
      return NextResponse.json(
        {
          error: "Failed to create wallets",
          details: errors.join("; "),
        },
        { status: 500 }
      );
    }

    // Build wallets object with all created wallets
    const wallets: {
      solana?: { walletId: string; network: string };
      ethereum?: { walletId: string; network: string };
      bnb?: { walletId: string; network: string };
      base?: { walletId: string; network: string };
    } = {};

    if (solanaWalletId) {
      wallets.solana = { walletId: solanaWalletId, network: "solana" };
    }

    if (ethereumWalletId) {
      wallets.ethereum = { walletId: ethereumWalletId, network: "ethereum" };
    }

    if (bnbWalletId) {
      wallets.bnb = { walletId: bnbWalletId, network: "bnb" };
    }

    if (baseWalletId) {
      wallets.base = { walletId: baseWalletId, network: "base" };
    }

    logger.info("Wallets created", {
      userId,
      organizationId,
      solanaWalletId,
      ethereumWalletId,
      bnbWalletId,
      baseWalletId,
      isNewUser: true,
      errors: errors.length > 0 ? errors : undefined,
    });

    return NextResponse.json({
      success: true,
      isNewUser: true,
      organizationId,
      wallets,
      warnings: errors.length > 0 ? errors : undefined,
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
