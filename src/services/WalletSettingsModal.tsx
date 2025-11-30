"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  X,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { Connection, PublicKey } from "@solana/web3.js";

interface TurnkeyAccount {
  addressFormat?: string;
  pathFormat?: string;
  path?: string;
  address?: string;
  accountId?: string;
}

interface TurnkeyWallet {
  source?: string;
  imported?: boolean;
  walletId?: string;
  walletName?: string;
  accounts?: TurnkeyAccount[];
}

export function WalletSettingsModal({
  slippage,
  setSlippage,
  quickBuyAmount,
  setQuickBuyAmount,
  onClose,
}: {
  slippage: string;
  setSlippage: (value: string) => void;
  quickBuyAmount: string;
  setQuickBuyAmount: (value: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { user: turnkeyUser, wallets: turnkeyWallets } = useTurnkey();
  const {
    address: solWallet,
    publicKey,
    connection,
    walletId,
    accountId,
    error: solanaError,
    isLoading: isLoadingSolana,
  } = useTurnkeySolana();

  // Debug logging for wallet state
  useEffect(() => {
    console.log("🔍 WalletSettingsModal - Wallet state:", {
      solWallet,
      walletId,
      accountId,
      isLoadingSolana,
      solanaError: solanaError?.message,
      turnkeyWalletsCount: turnkeyWallets?.length || 0,
    });
  }, [
    solWallet,
    walletId,
    accountId,
    isLoadingSolana,
    solanaError,
    turnkeyWallets,
  ]);
  const [solBalance, setSolBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { createWallet } = useTurnkey();

  // Check if user is authenticated (either via custom auth or Turnkey)
  const isAuthenticated = user || turnkeyUser;

  // Fetch SOL balance using the address from TurnkeySolanaContext
  useEffect(() => {
    if (!solWallet || !connection) {
      setSolBalance("0");
      return;
    }

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      try {
        // Try multiple RPC endpoints
        const rpcEndpoints = [
          "https://api.mainnet-beta.solana.com",
          "https://solana-api.projectserum.com",
          "https://rpc.ankr.com/solana",
        ];

        let balance = null;

        for (const endpoint of rpcEndpoints) {
          try {
            const conn = new Connection(endpoint, "confirmed");
            const pubKey = new PublicKey(solWallet);
            const lamports = await conn.getBalance(pubKey);
            balance = lamports / 1e9; // Convert lamports to SOL
            console.log(`✅ Balance fetched from ${endpoint}:`, balance);
            break;
          } catch (err) {
            console.warn(`⚠️ Failed to fetch balance from ${endpoint}:`, err);
            continue;
          }
        }

        if (balance !== null) {
          setSolBalance(balance.toFixed(4));
        } else {
          console.error("❌ All RPC endpoints failed");
          setSolBalance("N/A");
        }
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
        setSolBalance("N/A");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [solWallet, connection]);

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateWallet = async () => {
    if (!createWallet || !turnkeyUser) {
      console.error(
        "Cannot create wallet: createWallet function or user not available"
      );
      alert(
        "Cannot create wallet: Please ensure you are logged in with Turnkey."
      );
      return;
    }

    // Check if a Turnkey-managed Solana wallet already exists
    // Turnkey-managed wallets have source: "embedded" or no source property
    // Connected wallets (like Solflare) have source: "connected"
    const existingSolanaWallet = turnkeyWallets?.find(
      (wallet: TurnkeyWallet) => {
        // Explicitly exclude connected wallets
        if (wallet.source === "connected") {
          return false;
        }
        // Explicitly exclude Solflare
        if (
          wallet.walletId === "solflare" ||
          wallet.walletName?.toLowerCase() === "solflare"
        ) {
          return false;
        }
        // Exclude imported wallets
        if (wallet.imported || wallet.source === "imported") {
          return false;
        }
        // Accept wallets that are embedded OR have no source (default to embedded)
        const isTurnkeyManaged = wallet.source === "embedded" || !wallet.source;

        if (!isTurnkeyManaged) {
          return false;
        }

        // Check if it has Solana accounts
        return wallet.accounts?.some(
          (account: TurnkeyAccount) =>
            account.addressFormat === "ADDRESS_FORMAT_SOLANA" ||
            account.pathFormat === "PATH_FORMAT_SOLANA" ||
            (account.path && account.path.includes("501"))
        );
      }
    );

    if (existingSolanaWallet) {
      console.log("✅ Existing Solana wallet detected:", {
        walletId: existingSolanaWallet.walletId,
        walletName: existingSolanaWallet.walletName,
        source: existingSolanaWallet.source,
        accountsCount: existingSolanaWallet.accounts?.length || 0,
        accounts: existingSolanaWallet.accounts?.map((acc: TurnkeyAccount) => ({
          addressFormat: acc.addressFormat,
          pathFormat: acc.pathFormat,
          path: acc.path,
          address: acc.address,
        })),
      });

      alert(
        "You already have a Turnkey-managed Solana wallet!\n\n" +
          `Wallet: ${existingSolanaWallet.walletName || "Unnamed"}\n\n` +
          "The wallet should appear automatically. If it doesn't, check the console for details."
      );
      return;
    }

    setIsCreatingWallet(true);
    try {
      console.log("🔄 Creating Turnkey-managed Solana wallet...");

      // Generate a unique wallet name to avoid conflicts
      const baseName = `${turnkeyUser.userName || "My"}'s Solana Wallet`;
      const timestamp = Date.now();
      const uniqueWalletName = `${baseName} (${timestamp})`;

      // Note: @turnkey/react-wallet-kit's createWallet accepts address format strings
      // The underlying account structure will be:
      // - curve: CURVE_ED25519
      // - pathFormat: PATH_FORMAT_SLIP10
      // - path: m/44'/501'/0'/0' (Solana standard HD path)
      // - addressFormat: ADDRESS_FORMAT_SOLANA
      const wallet = await createWallet({
        walletName: uniqueWalletName,
        accounts: ["ADDRESS_FORMAT_SOLANA"],
      });
      console.log("✅ Turnkey Solana wallet created:", wallet);
      // The context will automatically pick up the new wallet
      // Force a refresh by waiting a bit
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        (error as { message?: string; code?: number })?.message ||
        String(error);
      const errorCode = (error as { code?: number })?.code;
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("CORS") ||
        errorMessage.includes("502") ||
        errorMessage.includes("Bad Gateway");
      const isDuplicateError =
        errorMessage.includes("wallet label must be unique") ||
        errorMessage.includes("unique") ||
        errorCode === 3;

      console.error("❌ Error creating Turnkey Solana wallet:", error);

      if (isDuplicateError) {
        alert(
          "A wallet with a similar name already exists.\n\n" +
            "Please check your existing wallets or try again with a different name."
        );
      } else if (isNetworkError) {
        alert(
          "Turnkey API is temporarily unavailable (502 Bad Gateway).\n\n" +
            "This is usually a temporary issue. Please:\n" +
            "1. Wait a few moments and try again\n" +
            "2. Check Turnkey's status page\n" +
            "3. Refresh the page"
        );
      } else {
        alert(
          `Failed to create wallet: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`
        );
      }
    } finally {
      setIsCreatingWallet(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      {/* Modal - Fixed positioning, centered */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-panel border border-gray-800/50 rounded-xl shadow-2xl z-[101] overflow-hidden">
        <div className="p-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Trading Wallets</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-panel-elev rounded transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 cursor-pointer" />
            </button>
          </div>

          {/* Chain Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-800/50 pb-2">
            <button className="px-3 py-1 text-sm font-medium text-primary border-b-2 border-primary cursor-pointer">
              Solana
            </button>
            <button className="px-3 py-1 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">
              Perps
            </button>
          </div>

          {/* Total Value */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">Total value</div>
            {!isAuthenticated ? (
              <div className="text-sm text-gray-500">
                Sign in to view balance
              </div>
            ) : isLoadingSolana || isLoadingBalance ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="text-xl font-bold">
                {solBalance && solBalance !== "0" && solBalance !== "N/A"
                  ? `${solBalance} SOL`
                  : "$0"}
              </div>
            )}
          </div>

          {/* Quick Buy Amount */}
          <div className="mb-4 pb-4 border-b border-gray-800/50">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 flex-shrink-0" />
              Quick Buy Amount
            </div>
            <div className="flex flex-wrap gap-2">
              {["0.1", "0.5", "1", "2", "5", "10"].map((value) => (
                <button
                  key={value}
                  onClick={() => setQuickBuyAmount(value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 cursor-pointer ${
                    quickBuyAmount === value
                      ? "bg-primary-dark text-white"
                      : "bg-panel-elev text-gray-400 hover:text-white"
                  }`}
                >
                  {value} SOL
                </button>
              ))}
              <input
                type="number"
                value={quickBuyAmount}
                onChange={(e) => setQuickBuyAmount(e.target.value)}
                placeholder="Custom"
                step="0.1"
                min="0"
                className="min-w-0 flex-1 px-2 py-1.5 bg-panel-elev border border-gray-800/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="mb-4 pb-4 border-b border-gray-800/50">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <BarChart3 className="w-3 h-3 flex-shrink-0" />
              Slippage Tolerance
            </div>
            <div className="flex flex-wrap gap-2">
              {["0.1", "0.5", "1.0"].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 cursor-pointer ${
                    slippage === value
                      ? "bg-primary-dark text-white"
                      : "bg-panel-elev text-gray-400 hover:text-white"
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Custom"
                step="0.1"
                min="0"
                max="100"
                className="min-w-0 flex-1 px-2 py-1.5 bg-panel-elev border border-gray-800/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Wallet List */}
          <div className="space-y-3">
            {/* SOL Wallet */}
            <div className="bg-panel-elev/50 rounded-lg p-3 border border-gray-800/30">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium">Solana Wallet</div>
                    {solWallet && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                        Turnkey
                      </span>
                    )}
                    {isAuthenticated && !isLoadingSolana && !solWallet && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                        No Wallet
                      </span>
                    )}
                  </div>
                  {!isAuthenticated ? (
                    <div className="text-xs text-gray-500">Sign in to view</div>
                  ) : isLoadingSolana ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : solWallet ? (
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {solWallet}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-400">
                      No Turnkey wallet found. Click &quot;Create&quot; to
                      create one.
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!solWallet && isAuthenticated && (
                    <button
                      onClick={() => {
                        console.log("🔄 Manual refresh triggered");
                        window.location.reload();
                      }}
                      className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0 cursor-pointer"
                      title="Refresh wallet detection"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-400 hover:text-primary cursor-pointer" />
                    </button>
                  )}
                  {solWallet && (
                    <button
                      onClick={() => copyToClipboard(solWallet, "sol")}
                      className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0 cursor-pointer"
                      title="Copy address"
                    >
                      {copied === "sol" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 cursor-pointer" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 cursor-pointer" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Balance:</span>
                {isLoadingBalance ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (
                  <span className="font-medium">
                    {solBalance && solBalance !== "N/A"
                      ? `${solBalance} SOL`
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Deposit
            </button>
            <button className="px-4 py-2 bg-panel-elev hover:bg-panel text-gray-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Withdraw
            </button>
            <button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet || !turnkeyUser || !createWallet}
              className="px-4 py-2 bg-primary-dark hover:bg-primary-darker disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isCreatingWallet ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </button>
            <button className="px-4 py-2 bg-panel-elev hover:bg-panel text-gray-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Import
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
