"use client";

import * as React from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

type TTurnkeySolanaContextValue = {
  address: string | null;
  publicKey: PublicKey | null;
  connection: Connection | null;
  walletId: string | null;
  accountId: string | null;
  error: Error | null;
  isLoading: boolean;
} | null;

const TurnkeySolanaContext = React.createContext<TTurnkeySolanaContextValue>(
  null
);

export function TurnkeySolanaContextProvider(props: {
  children: React.ReactNode;
}) {
  const { wallets: turnkeyWallets, organizationId, user: turnkeyUser, authState, clientState } = useTurnkey();
  const [address, setAddress] = React.useState<string | null>(null);
  const [publicKey, setPublicKey] = React.useState<PublicKey | null>(null);
  const [walletId, setWalletId] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState(0);

  // Initialize Solana connection
  const connection = React.useMemo(() => {
    // Use public RPC endpoints with fallbacks
    const rpcEndpoints = [
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
      "https://rpc.ankr.com/solana",
    ];

    try {
      return new Connection(rpcEndpoints[0], "confirmed");
    } catch (e) {
      console.error("Failed to create Solana connection:", e);
      return null;
    }
  }, []);

  React.useEffect(() => {
    console.log("🔄 TurnkeySolanaContext useEffect triggered", {
      walletsCount: turnkeyWallets?.length || 0,
      organizationId: !!organizationId,
      authState,
      clientState,
      hasTurnkeyUser: !!turnkeyUser,
      walletDetails: turnkeyWallets?.map((w: any) => ({
        walletId: w.walletId,
        walletName: w.walletName,
        source: w.source,
        accountsCount: w.accounts?.length || 0,
      })),
    });
    
    // Reset retry count when wallets change
    if (turnkeyWallets && turnkeyWallets.length > 0) {
      setRetryCount(0);
    }
    
    const fetchSolanaWallet = async () => {
      setIsLoading(true);
      setError(null);

      // Check if Turnkey is still initializing
      const isInitializing = clientState === "Initializing" || authState === "Authenticating";
      const isAuthenticated = authState === "Authenticated" && turnkeyUser;
      const isFullyInitialized = clientState !== "Initializing" && authState !== "Authenticating";
      
      console.log("🔍 Turnkey state:", {
        authState,
        clientState,
        isAuthenticated,
        isInitializing,
        isFullyInitialized,
        walletsCount: turnkeyWallets?.length || 0,
        hasOrganizationId: !!organizationId,
        allWalletIds: turnkeyWallets?.map((w: any) => w.walletId),
        allWalletNames: turnkeyWallets?.map((w: any) => w.walletName),
      });

      // Check if Turnkey wallets are available
      if (!turnkeyWallets || turnkeyWallets.length === 0) {
        // If user is authenticated but Turnkey is still initializing, keep loading
        // This handles the case where wallets exist but haven't loaded yet after page refresh
        if (isAuthenticated && isInitializing) {
          console.log("📭 No Turnkey wallets available yet, but user is authenticated and Turnkey is still initializing - keeping loading state");
          setIsLoading(true);
          return;
        }
        
        // If user is not authenticated OR Turnkey is fully initialized with no wallets, stop loading
        if (!isAuthenticated || isFullyInitialized) {
          console.log("📭 No Turnkey wallets available (user not authenticated or Turnkey fully initialized with no wallets)");
          setIsLoading(false);
          return;
        }
        
        // Default: keep loading if we're not sure
        console.log("📭 No Turnkey wallets available yet - keeping loading state");
        setIsLoading(true);
        return;
      }

      try {
        // IMPORTANT: ONLY use Turnkey-managed wallets, ignore connected wallets (like Solflare)
        // Turnkey-managed wallets have source: "embedded" (created via Turnkey SDK) or no source property
        // Connected wallets have source: "connected" (external wallets like Solflare extension)
        // Filter to accept wallets that are NOT connected - these are Turnkey-managed
        const turnkeyManagedWallets =
          turnkeyWallets?.filter(
            (wallet: any) => {
              // Explicitly exclude connected wallets (like Solflare extension)
              if (wallet.source === "connected") {
                return false;
              }
              // Explicitly exclude Solflare by ID or name
              if (wallet.walletId === "solflare" || wallet.walletName?.toLowerCase() === "solflare") {
                return false;
              }
              // Exclude imported wallets
              if (wallet.imported || wallet.source === "imported") {
                return false;
              }
              // Accept wallets that are embedded OR have no source (default to embedded)
              // This handles wallets created via Turnkey SDK that might not have source set
              return wallet.source === "embedded" || !wallet.source;
            }
          ) || [];

        console.log(
          "📦 ALL wallets before filtering:",
          turnkeyWallets?.map((w: any) => ({
            walletId: w.walletId,
            walletName: w.walletName,
            source: w.source,
            imported: w.imported,
            accountsCount: w.accounts?.length || 0,
          }))
        );
        
        console.log(
          "📦 Turnkey-managed wallets (after filtering - source: embedded, excluding connected/imported):",
          turnkeyManagedWallets.map((w: any) => ({
            walletId: w.walletId,
            walletName: w.walletName,
            source: w.source,
            imported: w.imported,
            accountsCount: w.accounts?.length || 0,
            accounts: w.accounts?.map((acc: any) => ({
              addressFormat: acc.addressFormat,
              pathFormat: acc.pathFormat,
              path: acc.path,
              address: acc.address,
            })),
          }))
        );
        console.log(
          "🚫 Filtered out wallets (connected/imported/Solflare):",
          turnkeyWallets?.filter(
            (wallet: any) =>
              wallet.source === "connected" ||
              wallet.imported ||
              wallet.source === "imported" ||
              wallet.walletId === "solflare" ||
              wallet.walletName?.toLowerCase() === "solflare"
          ).map((w: any) => ({
            walletId: w.walletId,
            walletName: w.walletName,
            source: w.source,
            imported: w.imported,
          }))
        );

        // Find Solana wallet - prioritize by name, then by accounts
        // Accept wallets with "Solana" in the name even if accounts aren't loaded yet
        const solanaWallet = turnkeyManagedWallets.find(
          (wallet: any) => {
            // First check by wallet name (most reliable - works even if accounts aren't loaded)
            const nameMatch = wallet.walletName?.toLowerCase().includes("solana");
            
            // Then check by account format/path (only if accounts exist)
            const accountMatch = wallet.accounts && wallet.accounts.length > 0 && wallet.accounts.some(
              (account: any) =>
                account.addressFormat === "ADDRESS_FORMAT_SOLANA" ||
                account.pathFormat === "PATH_FORMAT_SOLANA" ||
                (account.path && account.path.includes("501"))
            );
            
            console.log(`🔍 Checking wallet "${wallet.walletName}":`, {
              walletId: wallet.walletId,
              nameMatch,
              accountMatch,
              hasAccounts: !!wallet.accounts,
              accountsCount: wallet.accounts?.length || 0,
              accounts: wallet.accounts?.map((acc: any) => ({
                addressFormat: acc.addressFormat,
                pathFormat: acc.pathFormat,
                path: acc.path,
                address: acc.address,
              })),
            });
            
            // Accept if name matches OR accounts match
            // Name match is sufficient even without accounts (they might load later)
            return nameMatch || accountMatch;
          }
        );

        if (!solanaWallet) {
          console.warn(
            "⚠️ No Turnkey-managed Solana wallet found. Only connected/imported wallets available.",
            {
              totalWallets: turnkeyWallets?.length || 0,
              managedWallets: turnkeyManagedWallets.length,
              allWalletNames: turnkeyWallets?.map((w: any) => w.walletName),
            }
          );
          setAddress(null);
          setPublicKey(null);
          setWalletId(null);
          setAccountId(null);
          setIsLoading(false);
          return;
        }

        console.log("✅ Found Turnkey-managed Solana wallet:", {
          walletId: solanaWallet.walletId,
          walletName: solanaWallet.walletName,
          source: solanaWallet.source,
        });

        // Find Solana account - check all possible ways to identify a Solana account
        const solanaAccount = solanaWallet.accounts?.find(
          (account: any) => {
            const hasSolanaAddressFormat = account.addressFormat === "ADDRESS_FORMAT_SOLANA";
            const hasSolanaPathFormat = account.pathFormat === "PATH_FORMAT_SOLANA";
            const hasSolanaPath = account.path && (
              account.path.includes("501") ||
              account.path === "m/44'/501'/0'/0'" ||
              account.path.startsWith("m/44'/501'")
            );
            const hasAddress = !!account.address;
            
            const isMatch = hasSolanaAddressFormat || hasSolanaPathFormat || hasSolanaPath;
            
            console.log(`  🔍 Checking account:`, {
              address: account.address,
              addressFormat: account.addressFormat,
              pathFormat: account.pathFormat,
              path: account.path,
              hasSolanaAddressFormat,
              hasSolanaPathFormat,
              hasSolanaPath,
              hasAddress,
              isMatch,
            });
            
            return isMatch;
          }
        );

        console.log("🔍 Solana account search result:", {
          walletName: solanaWallet.walletName,
          walletId: solanaWallet.walletId,
          accountsCount: solanaWallet.accounts?.length || 0,
          allAccounts: solanaWallet.accounts?.map((acc: any) => ({
            addressFormat: acc.addressFormat,
            pathFormat: acc.pathFormat,
            path: acc.path,
            address: acc.address,
            accountId: acc.accountId,
          })),
          foundAccount: solanaAccount ? {
            address: solanaAccount.address,
            accountId: solanaAccount.accountId,
            addressFormat: solanaAccount.addressFormat,
            pathFormat: solanaAccount.pathFormat,
            path: solanaAccount.path,
          } : null,
        });

        if (!solanaAccount?.address) {
          // If wallet exists but no account address, it might still be loading
          // Check if accounts array exists but is empty (still loading) vs doesn't exist (no accounts)
          if (!solanaWallet.accounts || solanaWallet.accounts.length === 0) {
            console.warn(
              "⚠️ Solana wallet found but accounts array is empty or missing - accounts may still be loading",
              {
                walletId: solanaWallet.walletId,
                walletName: solanaWallet.walletName,
                hasAccounts: !!solanaWallet.accounts,
                accountsLength: solanaWallet.accounts?.length || 0,
                retryCount,
              }
            );
            
            // Retry up to 5 times (10 seconds total) waiting for accounts to load
            if (retryCount < 5) {
              console.log(`🔄 Will retry wallet account detection (attempt ${retryCount + 1}/5)...`);
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
              }, 2000);
              setIsLoading(true);
              return;
            } else {
              console.error("❌ Solana wallet found but accounts never loaded after multiple retries");
              setError(new Error("Solana wallet found but accounts are not available. Please try refreshing the page."));
              setIsLoading(false);
              return;
            }
          }
          
          // Accounts exist but none match Solana criteria
          console.error(
            "❌ Solana wallet found but no Solana account found in accounts",
            {
              walletId: solanaWallet.walletId,
              walletName: solanaWallet.walletName,
              accounts: solanaWallet.accounts.map((acc: any) => ({
                addressFormat: acc.addressFormat,
                pathFormat: acc.pathFormat,
                path: acc.path,
                address: acc.address,
              })),
            }
          );
          throw new Error(
            "Solana wallet found but no Solana account address found. Wallet may need account creation."
          );
        }

        const walletAddress = solanaAccount.address;
        
        if (!walletAddress) {
          console.error("❌ Solana account found but has no address!", {
            account: solanaAccount,
            wallet: solanaWallet,
          });
          throw new Error("Solana account found but address is missing");
        }
        
        const pubKey = new PublicKey(walletAddress);

        console.log("✅ Setting Solana wallet address:", {
          address: walletAddress,
          walletId: solanaWallet.walletId,
          accountId: solanaAccount.accountId || solanaAccount.address,
        });

        setAddress(walletAddress);
        setPublicKey(pubKey);
        setWalletId(solanaWallet.walletId);
        setAccountId(solanaAccount.accountId || solanaAccount.address);

        console.log("✅ Solana wallet address loaded and set in context:", walletAddress);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const isNetworkError =
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("CORS") ||
          error.message?.includes("502") ||
          error.message?.includes("Bad Gateway");

        if (isNetworkError) {
          console.warn(
            "⚠️ Turnkey API temporarily unavailable. Retrying may help.",
            error.message
          );
          // Set a network error but don't block the UI completely
          setError(
            new Error(
              "Turnkey API is temporarily unavailable. Please try again later."
            )
          );
        } else {
          console.error("❌ Error fetching Solana wallet:", error);
          setError(error);
        }

        setAddress(null);
        setPublicKey(null);
        setWalletId(null);
        setAccountId(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have organization ID
    // If user is authenticated, we should wait for wallets even if they're not loaded yet
    if (organizationId) {
      fetchSolanaWallet();
    } else {
      // If no organization ID, only stop loading if we're sure Turnkey is initialized
      if (clientState !== "Initializing" && authState !== "Authenticating") {
        setIsLoading(false);
      }
    }
  }, [turnkeyWallets, organizationId, turnkeyUser, authState, clientState, retryCount]);

  const value = React.useMemo(
    () => ({
      address,
      publicKey,
      connection,
      walletId,
      accountId,
      error,
      isLoading,
    }),
    [address, publicKey, connection, walletId, accountId, error, isLoading]
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

