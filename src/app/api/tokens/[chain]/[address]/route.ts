import { NextRequest, NextResponse } from "next/server";
import { multiChainTokenService } from "@/services/multichain-tokens";
import { dexscreenerService } from "@/services/dexscreener";
import { pumpFunService } from "@/services/pumpfun";
import { logger } from "@/lib/logger";

/**
 * GET /api/tokens/[chain]/[address]
 * Fetch detailed token information by chain and address
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chain: string; address: string }> }
) {
  try {
    const { chain, address } = await params;

    if (!chain || !address) {
      return NextResponse.json(
        { error: "Chain and address are required" },
        { status: 400 }
      );
    }

    // Validate chain
    const validChains = ["sol", "solana", "bsc"];
    const normalizedChain = chain.toLowerCase();
    if (!validChains.includes(normalizedChain)) {
      return NextResponse.json(
        { error: `Invalid chain. Must be one of: ${validChains.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch token data from multiple sources
    const tokenData: {
      base?: unknown;
      pumpfun?: unknown;
      dexscreener?: unknown;
      transactions?: unknown[];
      holders?: unknown[];
    } = {};

    // For Solana tokens, try pump.fun first
    if (normalizedChain === "sol" || normalizedChain === "solana") {
      try {
        const pumpFunData = await pumpFunService.fetchTokenInfo(address);
        if (pumpFunData) {
          tokenData.pumpfun = pumpFunData;
        }
      } catch (error) {
        logger.warn("Failed to fetch pump.fun data", { error: String(error) });
      }
    }

    // Fetch DexScreener data (works for both Solana and BSC)
    try {
      const dexScreenerChain =
        normalizedChain === "sol" || normalizedChain === "solana"
          ? "solana"
          : "bsc";
      const dexScreenerData = await dexscreenerService.fetchTokenInfo(
        dexScreenerChain,
        address
      );
      if (dexScreenerData) {
        tokenData.dexscreener = dexScreenerData;
      }
    } catch (error) {
      logger.warn("Failed to fetch DexScreener data", { error: String(error) });
    }

    // Get token from multi-chain service cache
    const allTokens = [
      ...multiChainTokenService.getSolanaTokens(),
      ...multiChainTokenService.getBSCTokens(),
    ];
    const cachedToken = allTokens.find(
      (t) => t.id.toLowerCase() === address.toLowerCase()
    );
    if (cachedToken) {
      tokenData.base = cachedToken;
    }

    // TODO: Fetch transactions and holders from blockchain or API
    // For now, return what we have

    return NextResponse.json({
      chain: normalizedChain,
      address,
      data: tokenData,
    });
  } catch (error) {
    logger.error("Failed to fetch token details", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch token details" },
      { status: 500 }
    );
  }
}

