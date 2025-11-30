/**
 * Jupiter Swap API Integration
 * Handles token swaps (buy/sell) using Jupiter Aggregator
 * API Documentation: https://docs.jup.ag/
 */

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

export interface JupiterSwapQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
  priorityFeeLamports?: number;
}

export interface SwapParams {
  inputMint: string; // Token mint address (use "So11111111111111111111111111111111111112" for SOL)
  outputMint: string; // Token mint address (use "So11111111111111111111111111111111111112" for SOL)
  amount: number; // Amount in smallest unit (lamports for SOL, or token decimals)
  slippageBps?: number; // Slippage in basis points (default: 50 = 0.5%)
  onlyDirectRoutes?: boolean; // Only use direct routes (default: false)
  asLegacyTransaction?: boolean; // Use legacy transaction format (default: false)
  wrapUnwrapSOL?: boolean; // Wrap/unwrap SOL automatically (default: true)
}

export interface SwapInstructions {
  transaction: VersionedTransaction;
  lastValidBlockHeight: number;
  priorityFeeLamports?: number;
}

export class JupiterSwapService {
  private readonly quoteApiUrl = "https://quote-api.jup.ag/v6";
  private readonly swapApiUrl = "https://quote-api.jup.ag/v6";
  private readonly solanaRpcUrl = "https://api.mainnet-beta.solana.com";
  private connection: Connection;

  constructor(rpcUrl?: string) {
    this.connection = new Connection(
      rpcUrl || this.solanaRpcUrl,
      "confirmed"
    );
  }

  /**
   * SOL mint address constant
   */
  static readonly SOL_MINT = "So11111111111111111111111111111111111112";

  /**
   * Get a quote for a token swap
   * @param params Swap parameters
   * @returns Quote with route information
   */
  async getQuote(params: SwapParams): Promise<JupiterSwapQuote | null> {
    try {
      const {
        inputMint,
        outputMint,
        amount,
        slippageBps = 50, // 0.5% default slippage
        onlyDirectRoutes = false,
        asLegacyTransaction = false,
        wrapUnwrapSOL = true,
      } = params;

      // Build query parameters
      const queryParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: onlyDirectRoutes.toString(),
        asLegacyTransaction: asLegacyTransaction.toString(),
        wrapUnwrapSOL: wrapUnwrapSOL.toString(),
      });

      const url = `${this.quoteApiUrl}/quote?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Jupiter quote API error: ${response.status} ${response.statusText}`,
          errorText
        );
        return null;
      }

      const quote: JupiterSwapQuote = await response.json();
      return quote;
    } catch (error) {
      console.error("Failed to get Jupiter quote:", error);
      return null;
    }
  }

  /**
   * Get swap instructions/transaction
   * @param quote Quote from getQuote()
   * @param userPublicKey User's wallet public key
   * @param wrapAndUnwrapSol Whether to wrap/unwrap SOL (default: true)
   * @returns Swap transaction ready to sign
   */
  async getSwapInstructions(
    quote: JupiterSwapQuote,
    userPublicKey: string,
    wrapAndUnwrapSol: boolean = true
  ): Promise<SwapInstructions | null> {
    try {
      const publicKey = new PublicKey(userPublicKey);

      const swapParams = {
        quoteResponse: quote,
        userPublicKey: userPublicKey,
        wrapAndUnwrapSol,
        // Optional: Add priority fee
        // priorityLevelWithMaxLamports: {
        //   maxLamports: 1000000, // 0.001 SOL
        // },
        // Optional: Add dynamic compute unit limit
        // dynamicComputeUnitLimit: true,
        // Optional: Add platform fee
        // platformFee: quote.platformFee,
      };

      const response = await fetch(`${this.swapApiUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(swapParams),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Jupiter swap API error: ${response.status} ${response.statusText}`,
          errorText
        );
        return null;
      }

      const swapResponse: JupiterSwapResponse = await response.json();

      // Decode base64 transaction
      const transactionBuffer = Buffer.from(
        swapResponse.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      return {
        transaction,
        lastValidBlockHeight: swapResponse.lastValidBlockHeight,
        priorityFeeLamports: swapResponse.priorityFeeLamports,
      };
    } catch (error) {
      console.error("Failed to get swap instructions:", error);
      return null;
    }
  }

  /**
   * Buy tokens (swap SOL for tokens)
   * @param tokenMint Token mint address to buy
   * @param solAmount Amount of SOL to spend (in SOL, not lamports)
   * @param userPublicKey User's wallet public key
   * @param slippageBps Slippage tolerance in basis points (default: 50 = 0.5%)
   * @returns Swap instructions ready to sign and send
   */
  async buyToken(
    tokenMint: string,
    solAmount: number,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<SwapInstructions | null> {
    try {
      // Convert SOL to lamports (1 SOL = 1e9 lamports)
      const amountInLamports = Math.floor(solAmount * 1e9);

      // Get quote: SOL -> Token
      const quote = await this.getQuote({
        inputMint: JupiterSwapService.SOL_MINT,
        outputMint: tokenMint,
        amount: amountInLamports,
        slippageBps,
      });

      if (!quote) {
        console.error("Failed to get quote for buy");
        return null;
      }

      // Get swap instructions
      const swapInstructions = await this.getSwapInstructions(
        quote,
        userPublicKey
      );

      return swapInstructions;
    } catch (error) {
      console.error("Failed to buy token:", error);
      return null;
    }
  }

  /**
   * Sell tokens (swap tokens for SOL)
   * @param tokenMint Token mint address to sell
   * @param tokenAmount Amount of tokens to sell (in token units, accounting for decimals)
   * @param tokenDecimals Token decimals (default: 6 for most tokens, 9 for SOL)
   * @param userPublicKey User's wallet public key
   * @param slippageBps Slippage tolerance in basis points (default: 50 = 0.5%)
   * @returns Swap instructions ready to sign and send
   */
  async sellToken(
    tokenMint: string,
    tokenAmount: number,
    tokenDecimals: number = 6,
    userPublicKey: string,
    slippageBps: number = 50
  ): Promise<SwapInstructions | null> {
    try {
      // Convert token amount to smallest unit
      const amountInSmallestUnit = Math.floor(
        tokenAmount * Math.pow(10, tokenDecimals)
      );

      // Get quote: Token -> SOL
      const quote = await this.getQuote({
        inputMint: tokenMint,
        outputMint: JupiterSwapService.SOL_MINT,
        amount: amountInSmallestUnit,
        slippageBps,
      });

      if (!quote) {
        console.error("Failed to get quote for sell");
        return null;
      }

      // Get swap instructions
      const swapInstructions = await this.getSwapInstructions(
        quote,
        userPublicKey
      );

      return swapInstructions;
    } catch (error) {
      console.error("Failed to sell token:", error);
      return null;
    }
  }

  /**
   * Get estimated output amount for a swap (without executing)
   * Useful for displaying "You will receive approximately X tokens"
   * @param params Swap parameters
   * @returns Estimated output amount and price impact
   */
  async getEstimatedOutput(params: SwapParams): Promise<{
    estimatedOutput: string;
    priceImpact: string;
    routePlan: JupiterSwapQuote["routePlan"];
  } | null> {
    const quote = await this.getQuote(params);
    if (!quote) {
      return null;
    }

    return {
      estimatedOutput: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      routePlan: quote.routePlan,
    };
  }

  /**
   * Get token decimals from mint address
   * @param mintAddress Token mint address
   * @returns Token decimals
   */
  async getTokenDecimals(mintAddress: string): Promise<number | null> {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPublicKey);

      if (!mintInfo.value) {
        return null;
      }

      const parsed = mintInfo.value.data;
      if ("parsed" in parsed && "info" in parsed.parsed) {
        return (parsed.parsed.info as any).decimals || 6;
      }

      return 6; // Default to 6 decimals
    } catch (error) {
      console.error("Failed to get token decimals:", error);
      return 6; // Default to 6 decimals on error
    }
  }
}

// Singleton instance
export const jupiterSwapService = new JupiterSwapService();

