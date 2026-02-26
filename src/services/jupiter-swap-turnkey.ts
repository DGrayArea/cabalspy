/**
 * Jupiter Ultra Swap Integration
 * Uses Jupiter Ultra API (https://api.jup.ag/ultra/v1) for best-in-class routing,
 * MEV protection, and automatic fee collection.
 *
 * Fee structure:
 *   referralFee = 125 bps → Jupiter keeps 20% (25 bps), platform nets 100 bps (1%)
 */

import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

const JUPITER_ULTRA_API = "https://api.jup.ag/ultra/v1";
const JUPITER_API_KEY =
  process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
const REFERRAL_ACCOUNT =
  process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || "";
// 125 bps → Jupiter takes 20% (25 bps), platform nets 100 bps (1%)
const REFERRAL_FEE_BPS =
  parseInt(process.env.NEXT_PUBLIC_JUPITER_REFERRAL_FEE || "125", 10);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JupiterSwapParams {
  inputMint: string;       // Token mint address ("So11111111111111111111111111111111111111112" for SOL)
  outputMint: string;      // Token mint address
  amount: number;          // Human-readable amount (e.g. 0.1 SOL or 100 tokens)
  inputDecimals?: number;  // Decimals for input token (default: 9 for SOL, 6 for others)
  outputDecimals?: number; // Decimals for output token (default: 6)
  userPublicKey: string;   // User's wallet public key
  slippageBps?: number;    // Ignored — Ultra manages slippage dynamically (kept for API compat)
  connection: Connection;  // Solana connection (used for token decimal lookup)
  signTransaction: (
    transaction: VersionedTransaction
  ) => Promise<VersionedTransaction>; // Turnkey signing function
}

export interface JupiterSwapResult {
  success: boolean;
  signature?: string;
  error?: string;
  outAmount?: string;    // Human-readable output amount
  outAmountRaw?: string; // Raw output amount from Jupiter
}

interface UltraOrderResponse {
  requestId: string;
  transaction: string; // Base64-encoded transaction
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  feeMint?: string;  // Which token Ultra is collecting fees in
  feeBps?: number;   // Actual fee bps (matches referralFee when token account is set up)
  error?: string;
}

interface UltraExecuteResponse {
  status: "Success" | "Failed";
  signature?: string;
  error?: string;
  code?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ultraHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (JUPITER_API_KEY) headers["x-api-key"] = JUPITER_API_KEY;
  return headers;
}

/**
 * Get token decimals from mint address.
 * Tries blockchain → Jupiter token list → defaults to 6.
 */
async function getTokenDecimals(
  connection: Connection,
  mintAddress: string
): Promise<number> {
  // SOL always has 9 decimals
  if (mintAddress === "So11111111111111111111111111111111111111112") {
    return 9;
  }

  // Method 1: Blockchain
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
    if (mintInfo.value) {
      const parsed = mintInfo.value.data;
      if ("parsed" in parsed && "info" in parsed.parsed) {
        const decimals = (parsed.parsed.info as any).decimals;
        if (decimals !== undefined && decimals !== null) return decimals;
      }
    }
  } catch {
    // fall through
  }

  // Method 2: Jupiter token list
  try {
    const response = await fetch("https://token.jup.ag/all");
    if (response.ok) {
      const tokenList = await response.json();
      const token = tokenList.find((t: any) => t.address === mintAddress);
      if (token?.decimals !== undefined) return token.decimals;
    }
  } catch {
    // fall through
  }

  console.warn(
    `⚠️ Could not determine decimals for ${mintAddress}, defaulting to 6`
  );
  return 6;
}

// ─── Ultra API calls ──────────────────────────────────────────────────────────

/**
 * Step 1 — Get an Ultra order (pre-built transaction + requestId).
 */
async function getUltraOrder({
  inputMint,
  outputMint,
  amountRaw,
  taker,
}: {
  inputMint: string;
  outputMint: string;
  amountRaw: string;
  taker: string;
}): Promise<UltraOrderResponse> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw,
    taker,
  });

  // Only attach referral params when a referral account is configured
  if (REFERRAL_ACCOUNT) {
    params.set("referralAccount", REFERRAL_ACCOUNT);
    params.set("referralFee", REFERRAL_FEE_BPS.toString());
  }

  const url = `${JUPITER_ULTRA_API}/order?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: ultraHeaders(),
  });

  const data: UltraOrderResponse = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Ultra order failed: ${data.error ?? response.statusText}`);
  }

  return data;
}

/**
 * Step 2 — Submit the signed transaction to Jupiter's executor.
 */
async function executeUltraOrder({
  signedTransaction,
  requestId,
}: {
  signedTransaction: string; // Base64-encoded signed transaction
  requestId: string;
}): Promise<UltraExecuteResponse> {
  const response = await fetch(`${JUPITER_ULTRA_API}/execute`, {
    method: "POST",
    headers: ultraHeaders(),
    body: JSON.stringify({ signedTransaction, requestId }),
  });

  const data: UltraExecuteResponse = await response.json();

  if (!response.ok) {
    throw new Error(
      `Ultra execute failed: ${data.error ?? response.statusText}`
    );
  }

  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a token swap via Jupiter Ultra.
 *
 * Drop-in replacement for the previous `executeJupiterSwap` — same parameter
 * shape, same return shape.
 */
export async function executeJupiterSwap({
  inputMint,
  outputMint,
  amount,
  inputDecimals,
  outputDecimals,
  userPublicKey,
  // slippageBps is accepted but ignored — Ultra manages slippage dynamically
  connection,
  signTransaction,
}: JupiterSwapParams): Promise<JupiterSwapResult> {
  try {
    if (!inputMint || !outputMint || !amount || amount <= 0) {
      throw new Error("Invalid input parameters");
    }

    // Resolve decimals (use provided values or fetch from chain/Jupiter)
    const [inputTokenDecimals, outputTokenDecimals] = await Promise.all([
      inputDecimals !== undefined
        ? Promise.resolve(inputDecimals)
        : getTokenDecimals(connection, inputMint),
      outputDecimals !== undefined
        ? Promise.resolve(outputDecimals)
        : getTokenDecimals(connection, outputMint),
    ]);

    // Convert human-readable → raw units
    const amountRaw = Math.floor(
      amount * Math.pow(10, inputTokenDecimals)
    ).toString();

    // ── Step 1: Get order ──────────────────────────────────────────────────
    const order = await getUltraOrder({
      inputMint,
      outputMint,
      amountRaw,
      taker: userPublicKey,
    });

    // ── Step 2: Deserialize & sign ─────────────────────────────────────────
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(order.transaction, "base64")
    );

    const signedTx = await signTransaction(transaction);
    const signedTransactionB64 = Buffer.from(signedTx.serialize()).toString(
      "base64"
    );

    // Log fee info so you can verify collection is working
    if (order.feeMint) {
      const collecting = order.feeBps === REFERRAL_FEE_BPS;
      console.log(
        `[Ultra] feeMint=${order.feeMint} feeBps=${order.feeBps ?? 0}` +
          (collecting ? " ✅ fee collected" : " ⚠️ no token account for this mint — fee skipped")
      );
    }

    // ── Step 3: Execute via Jupiter ────────────────────────────────────────
    const result = await executeUltraOrder({
      signedTransaction: signedTransactionB64,
      requestId: order.requestId,
    });

    if (result.status !== "Success" || !result.signature) {
      throw new Error(result.error ?? "Ultra execute returned non-success status");
    }

    // Convert raw output → human-readable
    const outAmountRaw = parseInt(order.outAmount || "0");
    const outAmountHuman = outAmountRaw / Math.pow(10, outputTokenDecimals);

    return {
      success: true,
      signature: result.signature,
      outAmount: outAmountHuman.toString(),
      outAmountRaw: order.outAmount,
    };
  } catch (error: any) {
    console.error("Jupiter Ultra swap failed:", error);
    return {
      success: false,
      error: error.message || "Swap failed",
    };
  }
}
