import { db } from "@/lib/db";
import { turnkeyService } from "@/services/turnkey";
import { logger } from "@/lib/logger";
import { Wallet } from "@prisma/client";

interface WalletCheckResult {
  solana?: { walletId: string; network: string; accountId: string; address: string };
  ethereum?: { walletId: string; network: string; accountId: string; address: string };
  bnb?: { walletId: string; network: string; accountId: string; address: string };
  base?: { walletId: string; network: string; accountId: string; address: string };
}

interface TurnkeyAccount {
  path: string;
  address: string;
  addressFormat: string;
  curve: string;
  pathFormat: string;
}

/**
 * Creates/Syncs Turnkey wallets for a user across Solana, Ethereum, BNB, and Base.
 * Saves the wallets to the Prisma database if they are newly generated.
 */
export async function syncUserWallets(userId: string, userName: string) {
  try {
    const existingWallets = await db.wallet.findMany({
      where: { userId }
    });

    const hasSolana = existingWallets.some((w: Wallet) => w.network === "solana");
    const hasEthereum = existingWallets.some((w: Wallet) => w.network === "ethereum");
    const hasBnb = existingWallets.some((w: Wallet) => w.network === "bnb");
    const hasBase = existingWallets.some((w: Wallet) => w.network === "base");

    // Skip if all wallets exist
    if (hasSolana && hasEthereum && hasBnb && hasBase) {
      return existingWallets;
    }

    const solanaWalletName = `${userName}'s Solana Wallet`;
    const ethereumWalletName = `${userName}'s Ethereum Wallet`;
    const bnbWalletName = `${userName}'s BNB Wallet`;
    const baseWalletName = `${userName}'s Base Wallet`;

    const errors: string[] = [];

    // Wallet generation helpers
    const ensureWallet = async (network: string, walletName: string, chainType: "solana" | "ethereum") => {
      try {
        const walletId = await turnkeyService.createWallet(userId, walletName, chainType);
        
        // Use any because Turnkey's OpenAPI types are sometimes incorrect or missing fields
        const accounts = (await turnkeyService.getWalletAddresses(walletId)) as any[];
        
        // Turnkey SDK accounts don't directly have an `accountId`, they use the address as the identifier
        // for signing when passing to signTransaction
        let address = "";

        if (chainType === "solana") {
            const solanaAccount = accounts.find(acc => acc.path === "m/44'/501'/0'/0'");
            address = solanaAccount?.address || accounts[0]?.address;
        } else {
            const ethAccount = accounts.find(acc => acc.path === "m/44'/60'/0'/0/0");
            address = ethAccount?.address || accounts[0]?.address;
        }

        if (address) {
            await db.wallet.create({
              data: {
                userId,
                turnkeyWalletId: walletId,
                turnkeyAccountId: address, // In Turnkey, the address is often used as the signWith identifier
                address,
                network
              }
            });
            logger.info(`${network} wallet synced`, { userId, walletId });
        } else {
            throw new Error(`Failed to extract address from Turnkey response for ${network}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to create ${network} wallet`, error, { userId });
        errors.push(`${network}: ${msg}`);
      }
    };

    if (!hasSolana) await ensureWallet("solana", solanaWalletName, "solana");
    if (!hasEthereum) await ensureWallet("ethereum", ethereumWalletName, "ethereum");
    if (!hasBnb) await ensureWallet("bnb", bnbWalletName, "ethereum");
    if (!hasBase) await ensureWallet("base", baseWalletName, "ethereum");

    if (errors.length > 0) {
      logger.warn("Some wallets failed to sync", { userId, errors });
    }

    return await db.wallet.findMany({ where: { userId } });
  } catch (err) {
    logger.error("Critical error in syncUserWallets", err);
    throw err;
  }
}
