"use client";

import * as React from "react";
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  Transaction,
  TransactionMessage,
} from "@solana/web3.js";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { TurnkeySigner } from "@turnkey/solana";
import { useAuth } from "./AuthContext";
import { Buffer } from "buffer";

// Types matching Turnkey's wallet structure
interface TurnkeyAccount {
  address: string;
  addressFormat?: string;
  pathFormat?: string;
  path?: string;
  accountId?: string;
  organizationId?: string; // Each wallet account has its own organizationId
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
  // Multi-wallet support
  allWallets: Array<{
    walletId: string;
    walletName: string;
    address: string;
    accountId?: string;
  }>;
  selectedWalletId: string | null;
  selectWallet: (walletId: string) => void;
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
  // TurnkeySigner for signing Solana transactions
  signer: TurnkeySigner | null;
  // Helper to sign a Solana Transaction or VersionedTransaction
  signSolanaTransaction:
    | ((
        transaction: Transaction | VersionedTransaction
      ) => Promise<VersionedTransaction>)
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
    httpClient,
  } = useTurnkey();

  // Initialize Solana connection with a reliable RPC endpoint
  const connection = React.useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpcUrl) {
      // console.warn(
      //   "NEXT_PUBLIC_SOLANA_RPC_URL is not set. Solana connection will be unavailable in TurnkeySolanaContext."
      // );
      return null;
    }
    try {
      return new Connection(rpcUrl, "confirmed");
    } catch (e) {
      // console.error("Failed to create Solana connection:", e);
      return null;
    }
  }, []);

  const [selectedWalletId, setSelectedWalletIdState] = React.useState<string | null>(null);

  // Load active wallet selection from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cabalspy_active_wallet_id");
      if (saved) setSelectedWalletIdState(saved);
    }
  }, []);

  const selectWallet = React.useCallback((id: string) => {
    setSelectedWalletIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("cabalspy_active_wallet_id", id);
    }
  }, []);

  // Derive ALL embedded Solana wallets
  const allSolanaWalletsItems = React.useMemo(() => {
    if (!wallets || wallets.length === 0) return [];
    const items: Array<{
      wallet: TurnkeyWallet;
      account: TurnkeyAccount;
      address: string;
      walletId: string;
      walletName: string;
      accountId: string;
      organizationId?: string;
    }> = [];

    for (const wallet of wallets as TurnkeyWallet[]) {
      const isEmbedded = wallet.source === "embedded" || !wallet.source;
      if (!isEmbedded || wallet.imported || wallet.source === "imported" || wallet.source === "connected") continue;
      if (wallet.walletId === "solflare" || wallet.walletName?.toLowerCase() === "solflare") continue;

      const solanaAccount = wallet.accounts?.find(
        (acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
      );

      if (solanaAccount?.address) {
        items.push({
          wallet,
          account: solanaAccount,
          address: solanaAccount.address,
          walletId: wallet.walletId,
          walletName: wallet.walletName || "Solana Wallet",
          accountId: (solanaAccount as any).walletAccountId || solanaAccount.accountId || "",
          organizationId: solanaAccount.organizationId,
        });
      }
    }
    return items;
  }, [wallets]);

  // Derive currently active embedded Solana wallet
  const embeddedSolanaWallet = React.useMemo(() => {
    if (allSolanaWalletsItems.length === 0) return null;
    if (selectedWalletId) {
      const found = allSolanaWalletsItems.find((w) => w.walletId === selectedWalletId);
      if (found) return found;
    }
    return allSolanaWalletsItems[0];
  }, [allSolanaWalletsItems, selectedWalletId]);

  const { user } = useAuth();

  // Derived values
  const address = embeddedSolanaWallet?.address || user?.walletAddress || null;
  const walletId = embeddedSolanaWallet?.walletId || null;
  const walletName = embeddedSolanaWallet?.walletName || null;
  const isLoading = clientState === "loading";
  const isAuthenticated = authState === "authenticated" && turnkeyUser;

  // Get organizationId from the wallet account
  // Each wallet account has its own organizationId (sub-organization for each user)
  const organizationId = React.useMemo(() => {
    const walletOrgId = embeddedSolanaWallet?.organizationId || null;

    // console.log("🔍 OrganizationId from wallet account:", {
    //   hasWallet: !!embeddedSolanaWallet,
    //   hasOrgId: !!walletOrgId,
    //   orgId: walletOrgId,
    //   walletAddress: embeddedSolanaWallet?.address,
    // });

    return walletOrgId;
  }, [embeddedSolanaWallet]);

  // Create PublicKey from address
  const publicKey = React.useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch (e) {
      // console.error("Failed to create PublicKey:", e);
      return null;
    }
  }, [address]);

  // Build wallet account object for signing
  const walletAccount: SolanaWalletAccount | null = React.useMemo(() => {
    if (!embeddedSolanaWallet) return null;

    // The accountId might be called walletAccountId in the account object
    const accountId =
      embeddedSolanaWallet.accountId ||
      (embeddedSolanaWallet.account as any)?.walletAccountId;

    // console.log("🔍 Building wallet account for signing:", {
    //   hasEmbeddedWallet: !!embeddedSolanaWallet,
    //   accountId: accountId,
    //   address: embeddedSolanaWallet.address,
    //   walletId: embeddedSolanaWallet.walletId,
    //   account: embeddedSolanaWallet.account,
    //   walletAccountId: (embeddedSolanaWallet.account as any)?.walletAccountId,
    // });

    if (!accountId) {
      // console.warn(
      //   "⚠️ AccountId is missing from embeddedSolanaWallet. This may cause signing to fail.",
      //   {
      //     account: embeddedSolanaWallet.account,
      //     embeddedSolanaWallet,
      //   }
      // );
    }

    return {
      address: embeddedSolanaWallet.address,
      walletId: embeddedSolanaWallet.walletId,
      walletName: embeddedSolanaWallet.walletName,
      accountId: accountId,
      addressFormat: "ADDRESS_FORMAT_SOLANA",
    };
  }, [embeddedSolanaWallet]);

  // Create TurnkeySigner for Solana transactions
  const signer = React.useMemo(() => {
    if (!httpClient || !organizationId || !walletAccount) {
      // console.log("⚠️ TurnkeySigner not created - missing:", {
      //   hasHttpClient: !!httpClient,
      //   hasOrganizationId: !!organizationId,
      //   hasWalletAccount: !!walletAccount,
      // });
      return null;
    }
    try {
      // TurnkeySigner constructor might accept accountId, but based on docs it only needs organizationId and client
      // The accountId (signWith) is passed when signing, not when creating the signer
      const signerInstance = new TurnkeySigner({
        organizationId,
        client: httpClient as any, // Type assertion to handle version mismatch between @turnkey packages
        // Note: accountId is passed when calling signTransaction, not in constructor
      });
      // console.log("✅ TurnkeySigner created successfully");
      return signerInstance;
    } catch (e) {
      // console.error("Failed to create TurnkeySigner:", e);
      return null;
    }
  }, [httpClient, organizationId, walletAccount]);

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

      // console.log("🔏 Signing transaction with Turnkey...", {
      //   walletAddress: walletAccount.address,
      //   transactionLength: unsignedTransaction.length,
      // });

      // Use the Turnkey SDK's signTransaction method
      // The walletAccount needs to match what Turnkey expects
      const signedTx = await turnkeySignTransaction({
        walletAccount: walletAccount as any,
        unsignedTransaction,
        transactionType: "TRANSACTION_TYPE_SOLANA",
      });

      // console.log("✅ Transaction signed successfully");
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
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.mainnet-beta.solana.com";

      // console.log("🔏 Signing and sending transaction with Turnkey...", {
      //   walletAddress: walletAccount.address,
      //   rpcUrl: solanaRpcUrl,
      // });

      // Use the Turnkey SDK's signAndSendTransaction method
      const txSignature = await turnkeySignAndSendTransaction({
        walletAccount: walletAccount as any,
        unsignedTransaction,
        transactionType: "TRANSACTION_TYPE_SOLANA",
        rpcUrl: solanaRpcUrl,
      });

      // console.log("✅ Transaction signed and sent:", txSignature);
      return txSignature;
    },
    [walletAccount, turnkeySignAndSendTransaction, connection]
  );

  // Helper to sign a Solana Transaction or VersionedTransaction
  // Use turnkeySignTransaction from useTurnkey
  // Note: turnkeySignTransaction expects hex input and returns hex output
  const signSolanaTransaction = React.useCallback(
    async (
      transaction: Transaction | VersionedTransaction
    ): Promise<VersionedTransaction> => {
      if (!walletAccount || !turnkeySignTransaction) {
        throw new Error("Wallet account or signing not available");
      }

      // Convert Transaction to VersionedTransaction if needed
      let versionedTx: VersionedTransaction;
      if (transaction instanceof VersionedTransaction) {
        versionedTx = transaction;
      } else {
        // Convert legacy Transaction to VersionedTransaction
        const message = transaction.compileMessage();
        versionedTx = new VersionedTransaction(message);
      }

      // console.log("🔏 Signing Solana transaction with Turnkey...", {
      //   transactionType: "VersionedTransaction",
      //   walletAddress: walletAccount.address,
      // });

      // Serialize transaction to hex for Turnkey
      // Turnkey API expects hex-encoded transaction strings
      const unsignedTxHex = Buffer.from(versionedTx.serialize()).toString(
        "hex"
      );

      // console.log("📤 Sending transaction to Turnkey (hex format):", {
      //   hexLength: unsignedTxHex.length,
      //   firstChars: unsignedTxHex.substring(0, 20),
      // });

      // Use turnkeySignTransaction which expects hex and returns hex
      const signedTxHex = await turnkeySignTransaction({
        walletAccount: walletAccount as any,
        unsignedTransaction: unsignedTxHex,
        transactionType: "TRANSACTION_TYPE_SOLANA",
      });

      // console.log("📥 Received signed transaction from Turnkey (hex format):", {
      //   hexLength: signedTxHex.length,
      //   firstChars: signedTxHex.substring(0, 20),
      // });

      // Deserialize the signed transaction from hex
      const signedTransaction = VersionedTransaction.deserialize(
        Buffer.from(signedTxHex, "hex")
      );

      // console.log("✅ Transaction signed successfully", {
      //   signaturesCount: signedTransaction.signatures.length,
      //   payerSignaturePresent: !signedTransaction.signatures[0]?.every(
      //     (b) => b === 0
      //   ),
      // });

      return signedTransaction;
    },
    [walletAccount, turnkeySignTransaction]
  );

  const value = React.useMemo(
    () => ({
      address,
      publicKey,
      connection,
      walletId,
      walletName,
      allWallets: allSolanaWalletsItems.map((item) => ({
        walletId: item.walletId,
        walletName: item.walletName,
        address: item.address,
        accountId: item.accountId,
      })),
      selectedWalletId: embeddedSolanaWallet?.walletId || null,
      selectWallet,
      walletAccount,
      error: error || null,
      isLoading,
      signer: signer || null,
      signTransaction: signer ? signTransaction : null,
      signAndSendTransaction: signer ? signAndSendTransaction : null,
      signSolanaTransaction: signer ? signSolanaTransaction : null,
    }),
    [
      address,
      publicKey,
      connection,
      walletId,
      walletName,
      allSolanaWalletsItems,
      embeddedSolanaWallet,
      walletAccount,
      error,
      isLoading,
      signer,
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
