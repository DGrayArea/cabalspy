"use client";

import * as React from "react";
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  Transaction,
} from "@solana/web3.js";
import { useTurnkey } from "@turnkey/react-wallet-kit";

// Types matching Turnkey's wallet structure
interface TurnkeyAccount {
  address: string;
  addressFormat?: string;
  pathFormat?: string;
  path?: string;
  accountId?: string;
}

interface TurnkeyWallet {
  walletId: string;
  walletName: string;
  source?: "embedded" | "connected" | "imported";
  imported?: boolean;
  accounts?: TurnkeyAccount[];
}

// The wallet account object needed for signing
interface SolanaWalletAccount {
  address: string;
  walletId: string;
  walletName: string;
  accountId?: string;
  addressFormat: string;
}

type TTurnkeySolanaContextValue = {
  // Wallet info
  address: string | null;
  publicKey: PublicKey | null;
  connection: Connection | null;
  walletId: string | null;
  walletName: string | null;
  // The raw wallet account object (needed for signing)
  walletAccount: SolanaWalletAccount | null;
  // State
  error: Error | null;
  isLoading: boolean;
  // Signing methods from Turnkey
  signTransaction: ((unsignedTransaction: string) => Promise<string>) | null;
  signAndSendTransaction:
    | ((unsignedTransaction: string, rpcUrl?: string) => Promise<string>)
    | null;
  // Helper to serialize and sign a Solana transaction
  signSolanaTransaction:
    | ((transaction: Transaction | VersionedTransaction) => Promise<string>)
    | null;
} | null;

const TurnkeySolanaContext =
  React.createContext<TTurnkeySolanaContextValue>(null);

export function TurnkeySolanaContextProvider(props: {
  children: React.ReactNode;
}) {
  const {
    wallets,
    clientState,
    authState,
    user: turnkeyUser,
    signTransaction: turnkeySignTransaction,
    signAndSendTransaction: turnkeySignAndSendTransaction,
  } = useTurnkey();

  // Initialize Solana connection with a reliable RPC endpoint
  const connection = React.useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpcUrl) {
      console.warn(
        "NEXT_PUBLIC_SOLANA_RPC_URL is not set. Solana connection will be unavailable in TurnkeySolanaContext."
      );
      return null;
    }
    try {
      return new Connection(rpcUrl, "confirmed");
    } catch (e) {
      console.error("Failed to create Solana connection:", e);
      return null;
    }
  }, []);

  // Derive embedded Solana wallet directly from useTurnkey wallets
  // Filter: source === "embedded" (or no source) AND has ADDRESS_FORMAT_SOLANA account
  const embeddedSolanaWallet = React.useMemo(() => {
    if (!wallets || wallets.length === 0) {
      return null;
    }

    // console.log("🔍 TurnkeySolanaContext - Searching wallets:", {
    //   totalWallets: wallets.length,
    //   wallets: wallets.map((w: TurnkeyWallet) => ({
    //     walletId: w.walletId,
    //     walletName: w.walletName,
    //     source: w.source,
    //     imported: w.imported,
    //     accountsCount: w.accounts?.length || 0,
    //     solanaAccounts: w.accounts
    //       ?.filter((acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA")
    //       .map((acc) => acc.address),
    //   })),
    // });

    // Find wallet with source: "embedded" (or no source) that has a Solana account
    for (const wallet of wallets as TurnkeyWallet[]) {
      // Must be embedded (not connected/imported)
      const isEmbedded = wallet.source === "embedded" || !wallet.source;
      if (!isEmbedded) continue;

      // Exclude explicitly imported wallets
      if (wallet.imported || wallet.source === "imported") continue;

      // Exclude connected wallets like Solflare
      if (wallet.source === "connected") continue;
      if (
              wallet.walletId === "solflare" ||
              wallet.walletName?.toLowerCase() === "solflare"
      )
        continue;

      // Find Solana account with ADDRESS_FORMAT_SOLANA
      const solanaAccount = wallet.accounts?.find(
        (acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
      );

      if (solanaAccount?.address) {
        // console.log("✅ Found embedded Solana wallet:", {
        //   walletId: wallet.walletId,
        //   walletName: wallet.walletName,
        //   address: solanaAccount.address,
        //   addressFormat: solanaAccount.addressFormat,
        // });

        return {
          wallet,
          account: solanaAccount,
          address: solanaAccount.address,
          walletId: wallet.walletId,
          walletName: wallet.walletName,
          accountId: solanaAccount.accountId,
        };
      }
    }

    console.log(
      "📭 No embedded Solana wallet found with ADDRESS_FORMAT_SOLANA"
    );
    return null;
  }, [wallets]);

  // Derived values
  const address = embeddedSolanaWallet?.address || null;
  const walletId = embeddedSolanaWallet?.walletId || null;
  const walletName = embeddedSolanaWallet?.walletName || null;
  const isLoading = clientState === "loading";
  const isAuthenticated = authState === "authenticated" && turnkeyUser;

  // Create PublicKey from address
  const publicKey = React.useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch (e) {
      console.error("Failed to create PublicKey:", e);
      return null;
    }
  }, [address]);

  // Build wallet account object for signing
  const walletAccount: SolanaWalletAccount | null = React.useMemo(() => {
    if (!embeddedSolanaWallet) return null;
    return {
      address: embeddedSolanaWallet.address,
      walletId: embeddedSolanaWallet.walletId,
      walletName: embeddedSolanaWallet.walletName,
      accountId: embeddedSolanaWallet.accountId,
      addressFormat: "ADDRESS_FORMAT_SOLANA",
    };
  }, [embeddedSolanaWallet]);

  // Error state
  const [error, setError] = React.useState<Error | null>(null);

  // Log state changes
  // React.useEffect(() => {
  //   console.log("🔄 TurnkeySolanaContext state:", {
  //     address,
  //     walletId,
  //     walletName,
  //     isLoading,
  //     isAuthenticated,
  //     clientState,
  //     authState,
  //     hasWalletAccount: !!walletAccount,
  //     walletsCount: wallets?.length || 0,
  //   });

  //   // Clear error when wallet is found
  //   if (address) {
  //     setError(null);
  //   }
  // }, [
  //   address,
  //   walletId,
  //   walletName,
  //   isLoading,
  //   isAuthenticated,
  //   clientState,
  //   authState,
  //   walletAccount,
  //   wallets,
  // ]);

  // Create signing methods that use the Turnkey SDK
  const signTransaction = React.useCallback(
    async (unsignedTransaction: string): Promise<string> => {
      if (!walletAccount) {
        throw new Error("No wallet account available for signing");
      }

      console.log("🔏 Signing transaction with Turnkey...", {
        walletAddress: walletAccount.address,
        transactionLength: unsignedTransaction.length,
      });

      // Use the Turnkey SDK's signTransaction method
      // The walletAccount needs to match what Turnkey expects
      const signedTx = await turnkeySignTransaction({
        walletAccount: walletAccount as any,
        unsignedTransaction,
        transactionType: "TRANSACTION_TYPE_SOLANA",
      });

      console.log("✅ Transaction signed successfully");
      return signedTx;
    },
    [walletAccount, turnkeySignTransaction]
  );

  const signAndSendTransaction = React.useCallback(
    async (unsignedTransaction: string, rpcUrl?: string): Promise<string> => {
      if (!walletAccount) {
        throw new Error("No wallet account available for signing");
      }

      const solanaRpcUrl =
        rpcUrl ||
        connection?.rpcEndpoint ||
        "https://api.mainnet-beta.solana.com";

      console.log("🔏 Signing and sending transaction with Turnkey...", {
        walletAddress: walletAccount.address,
        rpcUrl: solanaRpcUrl,
      });

      // Use the Turnkey SDK's signAndSendTransaction method
      const txSignature = await turnkeySignAndSendTransaction({
        walletAccount: walletAccount as any,
        unsignedTransaction,
        transactionType: "TRANSACTION_TYPE_SOLANA",
        rpcUrl: solanaRpcUrl,
      });

      console.log("✅ Transaction signed and sent:", txSignature);
      return txSignature;
    },
    [walletAccount, turnkeySignAndSendTransaction, connection]
  );

  // Helper to serialize and sign a Solana Transaction or VersionedTransaction
  const signSolanaTransaction = React.useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<string> => {
      if (!walletAccount) {
        throw new Error("No wallet account available for signing");
      }

      // Serialize the transaction to base64
      let serialized: string;
      if (transaction instanceof VersionedTransaction) {
        serialized = Buffer.from(transaction.serialize()).toString("base64");
      } else {
        serialized = Buffer.from(
          transaction.serialize({ requireAllSignatures: false })
        ).toString("base64");
      }

      console.log("🔏 Signing Solana transaction...", {
        transactionType:
          transaction instanceof VersionedTransaction
            ? "VersionedTransaction"
            : "Transaction",
        serializedLength: serialized.length,
      });

      return signTransaction(serialized);
    },
    [walletAccount, signTransaction]
  );

  const value = React.useMemo(
    () => ({
      address,
      publicKey,
      connection,
      walletId,
      walletName,
      walletAccount,
      error,
      isLoading,
      signTransaction: walletAccount ? signTransaction : null,
      signAndSendTransaction: walletAccount ? signAndSendTransaction : null,
      signSolanaTransaction: walletAccount ? signSolanaTransaction : null,
    }),
    [
      address,
      publicKey,
      connection,
      walletId,
      walletName,
      walletAccount,
      error,
      isLoading,
      signTransaction,
      signAndSendTransaction,
      signSolanaTransaction,
    ]
  );

  return (
    <TurnkeySolanaContext.Provider value={value}>
      {props.children}
    </TurnkeySolanaContext.Provider>
  );
}

export function useTurnkeySolana(): NonNullable<TTurnkeySolanaContextValue> {
  const value = React.useContext(TurnkeySolanaContext);
  if (value == null) {
    throw new Error(
      `TurnkeySolanaContext wasn't initialized. Did you forget to put a \`<TurnkeySolanaContextProvider>\` ancestor?`
    );
  }
  return value;
}
