import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { logger } from "@/lib/logger";

export interface TurnkeyConfig {
  baseUrl: string;
  apiKey: string;
  apiPrivateKey: string;
}

export class TurnkeyService {
  private client: TurnkeyClient;

  constructor(config: TurnkeyConfig) {
    // Check if API keys are provided (optional - needed for server-side operations)
    if (!config.apiPrivateKey || !config.apiKey) {
      logger.warn(
        "Turnkey API keys not found. Server-side wallet operations will not work.\n" +
          "To enable server-side wallet creation, you need to:\n" +
          "1. Go to Turnkey Dashboard → API Keys\n" +
          "2. Create a new API key pair\n" +
          "3. Add to .env.local:\n" +
          "   TURNKEY_API_PRIVATE_KEY=your_private_key\n" +
          "   NEXT_PUBLIC_TURNKEY_API_KEY=your_public_key\n\n" +
          "Alternatively, use client-side embedded wallets via @turnkey/react-wallet-kit"
      );
      // Create a dummy client that will fail gracefully
      this.client = null as any;
      return;
    }

    // Validate key formats (basic checks)
    if (
      !config.apiPrivateKey.startsWith("0x") &&
      !config.apiPrivateKey.includes("PRIVATE")
    ) {
      logger.warn(
        "TURNKEY_API_PRIVATE_KEY format may be incorrect. Expected format: starts with '0x' or contains 'PRIVATE'"
      );
    }

    if (!config.apiKey.startsWith("0x") && !config.apiKey.includes("PUBLIC")) {
      logger.warn(
        "NEXT_PUBLIC_TURNKEY_API_KEY format may be incorrect. Expected format: starts with '0x' or contains 'PUBLIC'"
      );
    }

    try {
      // Initialize the API key stamper
      const stamper = new ApiKeyStamper({
        apiPrivateKey: config.apiPrivateKey,
        apiPublicKey: config.apiKey,
      });

      // Initialize the Turnkey client
      this.client = new TurnkeyClient(
        {
          baseUrl: config.baseUrl,
        },
        stamper
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("invalid public key") ||
        errorMessage.includes("switched")
      ) {
        throw new Error(
          `Turnkey API key configuration error: ${errorMessage}\n\n` +
            "Possible issues:\n" +
            "1. Public and private keys may be swapped - check your .env.local\n" +
            "2. Keys may be in wrong format - ensure they're valid P-256 keys\n" +
            "3. Keys may be incomplete - copy the full key from Turnkey dashboard\n\n" +
            "Verify:\n" +
            "- TURNKEY_API_PRIVATE_KEY should be your private key\n" +
            "- NEXT_PUBLIC_TURNKEY_API_KEY should be your public key"
        );
      }
      throw error;
    }

    // Note: We don't initialize the browser SDK here since this service is used
    // from client components and we only require the typed HTTP client for now.
  }

  /**
   * Create a new wallet for a user
   * Defaults to Solana for Pump.fun compatibility
   */
  async createWallet(
    userId: string,
    walletName: string,
    chain: "solana" | "ethereum" = "solana"
  ): Promise<string> {
    if (!this.client) {
      throw new Error(
        "Turnkey API keys not configured. Cannot create wallets server-side.\n" +
          "Please add TURNKEY_API_PRIVATE_KEY and NEXT_PUBLIC_TURNKEY_API_KEY to your .env.local file.\n" +
          "Get them from: Turnkey Dashboard → API Keys"
      );
    }
    try {
      // Build accounts array with explicit values to ensure proper serialization
      const accounts =
        chain === "solana"
          ? [
              {
                curve: "CURVE_ED25519",
                pathFormat: "PATH_FORMAT_SLIP10",
                path: "m/44'/501'/0'/0'",
                addressFormat: "ADDRESS_FORMAT_SOLANA",
              },
            ]
          : [
              {
                curve: "CURVE_SECP256K1",
                pathFormat: "PATH_FORMAT_BIP32",
                path: "m/44'/60'/0'/0/0",
                addressFormat: "ADDRESS_FORMAT_ETHEREUM",
              },
            ];

      // Log the accounts structure for debugging
      logger.info("Creating wallet with accounts", {
        chain,
        accountsCount: accounts.length,
        pathFormat: accounts[0]?.pathFormat,
        curve: accounts[0]?.curve,
        fullAccounts: JSON.stringify(accounts),
      });

      // Ensure accounts are properly structured - create fresh objects to avoid any serialization issues
      const accountsPayload = accounts.map((acc) => ({
        curve: acc.curve,
        pathFormat: acc.pathFormat,
        path: acc.path,
        addressFormat: acc.addressFormat,
      }));

      const response = await this.client.createWallet({
        type: "ACTIVITY_TYPE_CREATE_WALLET",
        timestampMs: Date.now().toString(),
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
        parameters: {
          walletName: walletName || `Wallet for ${userId}`,
          accounts: accountsPayload as any, // Type assertion needed due to strict union types
        },
      });

      // Response structure may vary, handle different response formats
      const walletId =
        (response as { wallet?: { walletId?: string } }).wallet?.walletId ||
        (response as { walletId?: string }).walletId ||
        (
          response as {
            activity?: { result?: { wallet?: { walletId?: string } } };
          }
        ).activity?.result?.wallet?.walletId;

      if (walletId) {
        return walletId;
      }

      throw new Error(
        "Failed to create wallet: No wallet returned from Turnkey"
      );
    } catch (error) {
      // Enhanced error logging to help debug the issue
      const errorDetails =
        error instanceof Error ? error.message : String(error);
      logger.error("Error creating wallet", error, {
        userId,
        walletName,
        chain,
        errorDetails,
        accountsStructure: JSON.stringify(accountsPayload),
      });
      throw error;
    }
  }

  /**
   * Get wallet information
   */
  async getWallet(walletId: string) {
    if (!this.client) {
      throw new Error("Turnkey API keys not configured. Cannot get wallet.");
    }
    try {
      const response = await this.client.getWallet({
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
        walletId,
      });

      return response.wallet;
    } catch (error) {
      logger.error("Error getting wallet", error, { walletId });
      throw error;
    }
  }

  /**
   * Get wallet addresses
   */
  async getWalletAddresses(walletId: string) {
    if (!this.client) {
      throw new Error(
        "Turnkey API keys not configured. Cannot get wallet addresses."
      );
    }
    try {
      const response = await this.client.getWalletAccounts({
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
        walletId,
      });

      return response.accounts;
    } catch (error) {
      logger.error("Error getting wallet addresses", error, { walletId });
      throw error;
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(
    walletId: string,
    accountId: string,
    unsignedTransaction: string,
    transactionType:
      | "TRANSACTION_TYPE_SOLANA"
      | "TRANSACTION_TYPE_ETHEREUM" = "TRANSACTION_TYPE_SOLANA"
  ) {
    if (!this.client) {
      throw new Error(
        "Turnkey API keys not configured. Cannot sign transactions."
      );
    }
    try {
      const response = await this.client.signTransaction({
        type: "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
        timestampMs: Date.now().toString(),
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
        parameters: {
          signWith: accountId,
          unsignedTransaction,
          type: transactionType,
        },
      });

      return response.activity;
    } catch (error) {
      logger.error("Error signing transaction", error, { walletId, accountId });
      throw error;
    }
  }

  /**
   * Get wallet balance - fetches real balance from blockchain RPC
   */
  async getWalletBalance(
    address: string,
    network: "ethereum" | "polygon" | "arbitrum" | "solana" = "solana"
  ) {
    try {
      // For Solana (default for Pump.fun)
      if (network === "solana") {
        const rpcUrl =
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.mainnet-beta.solana.com";
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBalance",
            params: [address],
          }),
        });

        const data = await response.json();
        const lamports = data.result?.value || 0;
        const sol = lamports / 1e9;

        return {
          address,
          balance: sol.toFixed(4),
          network: "solana",
          currency: "SOL",
        };
      }

      // For Ethereum networks (EVM)
      const rpcUrl =
        network === "polygon"
          ? process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"
          : network === "arbitrum"
            ? process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
              "https://arb1.arbitrum.io/rpc"
            : process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
              "https://eth.llamarpc.com";

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      });

      const data = await response.json();
      const wei = BigInt(data.result || "0");
      const eth = Number(wei) / 1e18;

      return {
        address,
        balance: eth.toFixed(4),
        network,
        currency:
          network === "polygon"
            ? "MATIC"
            : network === "arbitrum"
              ? "ETH"
              : "ETH",
      };
    } catch (error) {
      logger.error("Error getting wallet balance", error, { address, network });
      throw error;
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(
    walletId: string,
    accountId: string,
    to: string,
    value: string,
    data?: string
  ) {
    try {
      // This would construct and sign the transaction
      const transaction = {
        to,
        value,
        data: data || "0x",
        gasLimit: "21000",
        gasPrice: "20000000000", // 20 gwei
      };

      const signedTx = await this.signTransaction(
        walletId,
        accountId,
        JSON.stringify(transaction)
      );

      return signedTx;
    } catch (error) {
      logger.error("Error sending transaction", error, {
        walletId,
        accountId,
        to,
        value,
      });
      throw error;
    }
  }
}

// Export a singleton instance
// Note: apiKey (public key) is optional if using private key authentication
export const turnkeyService = new TurnkeyService({
  baseUrl:
    process.env.NEXT_PUBLIC_TURNKEY_BASE_URL || "https://api.turnkey.com",
  apiKey: process.env.NEXT_PUBLIC_TURNKEY_API_KEY || "",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY || "",
});
