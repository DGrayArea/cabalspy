/**
 * Simplified Jupiter Swap with Turnkey Wallet Signing
 * Uses Jupiter Lite API with instruction-based approach
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  AddressLookupTableAccount,
} from "@solana/web3.js";

const JUPITER_LITE_API = "https://quote-api.jup.ag/v6";

export interface JupiterSwapParams {
  inputMint: string; // Token mint address (use "So11111111111111111111111111111111111111112" for SOL)
  outputMint: string; // Token mint address
  amount: number; // Amount in human-readable units (e.g., 0.1 SOL or 100 tokens)
  inputDecimals?: number; // Decimals for input token (default: 9 for SOL, 6 for tokens)
  outputDecimals?: number; // Decimals for output token (default: 6)
  userPublicKey: string; // User's wallet public key
  slippageBps?: number; // Slippage in basis points (default: 150 = 1.5%)
  connection: Connection; // Solana connection
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>; // Turnkey signing function (returns signed VersionedTransaction)
}

export interface JupiterSwapResult {
  success: boolean;
  signature?: string;
  error?: string;
  outAmount?: string; // Human-readable output amount
  outAmountRaw?: string; // Raw output amount from Jupiter
}

/**
 * Get quote from Jupiter API
 */
async function getJupiterQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 150,
}: {
  inputMint: string;
  outputMint: string;
  amount: string; // Amount in raw units (lamports/token smallest unit)
  slippageBps?: number;
}) {
  const quoteUrl = `${JUPITER_LITE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true`;

  const response = await fetch(quoteUrl);
  const quote = await response.json();

  if (!response.ok || quote.error) {
    throw new Error(`Quote failed: ${quote.error || "Unknown error"}`);
  }

  return quote;
}

/**
 * Get token decimals from mint address
 * Tries multiple methods: blockchain fetch, Jupiter token list, then defaults
 */
async function getTokenDecimals(
  connection: Connection,
  mintAddress: string
): Promise<number> {
  // SOL always has 9 decimals
  if (mintAddress === "So11111111111111111111111111111111111111112") {
    return 9;
  }

  // Method 1: Try fetching from blockchain
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);

    if (mintInfo.value) {
      const parsed = mintInfo.value.data;
      if ("parsed" in parsed && "info" in parsed.parsed) {
        const decimals = (parsed.parsed.info as any).decimals;
        if (decimals !== undefined && decimals !== null) {
          return decimals;
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch decimals from blockchain for ${mintAddress}:`, error);
  }

  // Method 2: Try fetching from Jupiter token list API
  try {
    const jupiterTokenListUrl = "https://token.jup.ag/all";
    const response = await fetch(jupiterTokenListUrl);
    if (response.ok) {
      const tokenList = await response.json();
      const token = tokenList.find((t: any) => t.address === mintAddress);
      if (token && token.decimals !== undefined) {
        return token.decimals;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch decimals from Jupiter token list for ${mintAddress}:`, error);
  }

  // Method 3: Try Jupiter tokens API v2 (if API key available)
  try {
    const apiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY;
    if (apiKey) {
      const jupiterTokensUrl = `https://api.jup.ag/tokens/v2/search?mints=${mintAddress}`;
      const response = await fetch(jupiterTokensUrl, {
        headers: {
          "X-API-KEY": apiKey,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.tokens && data.tokens.length > 0) {
          const token = data.tokens[0];
          if (token.decimals !== undefined) {
            return token.decimals;
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch decimals from Jupiter API v2 for ${mintAddress}:`, error);
  }

  // Last resort: Default to 6 (most common for SPL tokens)
  // But log a warning so we know we're guessing
  console.warn(
    `⚠️ Could not determine decimals for token ${mintAddress}, defaulting to 6. This may cause incorrect calculations.`
  );
  return 6;
}

/**
 * Get swap instructions from Jupiter API
 */
async function getJupiterSwapInstructions({
  quoteResponse,
  userPublicKey,
}: {
  quoteResponse: any;
  userPublicKey: string;
}) {
  const instructionsResponse = await fetch(
    `${JUPITER_LITE_API}/swap-instructions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
      }),
    }
  );

  const instructions = await instructionsResponse.json();

  if (instructions.error) {
    throw new Error("Failed to get swap instructions: " + instructions.error);
  }

  return instructions;
}

/**
 * Deserialize instruction from Jupiter API format
 */
function deserializeInstruction(instruction: any): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

/**
 * Get address lookup table accounts
 */
async function getAddressLookupTableAccounts(
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }
    return acc;
  }, new Array<AddressLookupTableAccount>());
}

/**
 * Execute Jupiter swap using Turnkey wallet signing
 */
export async function executeJupiterSwap({
  inputMint,
  outputMint,
  amount,
  inputDecimals,
  outputDecimals,
  userPublicKey,
  slippageBps = 150,
  connection,
  signTransaction,
}: JupiterSwapParams): Promise<JupiterSwapResult> {
  try {
    // Validate inputs
    if (!inputMint || !outputMint || !amount || amount <= 0) {
      throw new Error("Invalid input parameters");
    }

    // Get token decimals if not provided (fetch in parallel for speed)
    // This is critical: tokens can have different decimals (6, 9, 2, 8, etc.)
    // Priority: Use provided decimals > Fetch from blockchain/Jupiter APIs
    // If decimals are provided, use them directly (they likely came from the token API response)
    const [inputTokenDecimals, outputTokenDecimals] = await Promise.all([
      inputDecimals !== undefined
        ? Promise.resolve(inputDecimals)
        : getTokenDecimals(connection, inputMint),
      outputDecimals !== undefined
        ? Promise.resolve(outputDecimals)
        : getTokenDecimals(connection, outputMint),
    ]);

    // Convert human-readable amount to raw units using the correct decimals
    // Example: 0.1 SOL with 9 decimals = 100,000,000 lamports
    // Example: 100 tokens with 6 decimals = 100,000,000 raw units
    const amountInRawUnits = Math.floor(
      amount * Math.pow(10, inputTokenDecimals)
    ).toString();

    // Get quote
    const quoteResponse = await getJupiterQuote({
      inputMint,
      outputMint,
      amount: amountInRawUnits,
      slippageBps,
    });

    // Get swap instructions
    const instructionsResponse = await getJupiterSwapInstructions({
      quoteResponse,
      userPublicKey,
    });

    const {
      setupInstructions,
      swapInstruction: swapInstructionPayload,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = instructionsResponse;

    // Deserialize instructions
    const instructions: TransactionInstruction[] = [
      ...(setupInstructions?.map(deserializeInstruction) || []),
      deserializeInstruction(swapInstructionPayload),
      ...(cleanupInstruction
        ? [deserializeInstruction(cleanupInstruction)]
        : []),
    ];

    // Get address lookup table accounts if needed
    const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    if (addressLookupTableAddresses?.length > 0) {
      addressLookupTableAccounts.push(
        ...(await getAddressLookupTableAccounts(
          connection,
          addressLookupTableAddresses
        ))
      );
    }

    // Get latest blockhash
    const blockhash = (await connection.getLatestBlockhash()).blockhash;

    // Build transaction message
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(userPublicKey),
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(addressLookupTableAccounts);

    // Create versioned transaction
    const transaction = new VersionedTransaction(messageV0);

    // Sign transaction using Turnkey (returns signed VersionedTransaction directly)
    const signedTransaction = await signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        maxRetries: 3,
        skipPreflight: false,
      }
    );

    // Convert output amount to human-readable format using the correct decimals
    // Example: 100,000,000 raw units with 6 decimals = 100 tokens
    // Example: 1,000,000,000 raw units with 9 decimals = 1 SOL
    const outAmountRaw = parseInt(quoteResponse.outAmount || "0");
    const outAmountHuman = outAmountRaw / Math.pow(10, outputTokenDecimals);

    return {
      success: true,
      signature,
      outAmount: outAmountHuman.toString(),
      outAmountRaw: quoteResponse.outAmount,
    };
  } catch (error: any) {
    console.error("Jupiter swap failed:", error);
    return {
      success: false,
      error: error.message || "Swap failed",
    };
  }
}
