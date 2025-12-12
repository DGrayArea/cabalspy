"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  X,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wallet,
  ExternalLink,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatNumber } from "@/utils/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

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

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
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
  const {
    user: turnkeyUser,
    wallets: turnkeyWallets,
    clientState,
    authState,
  } = useTurnkey();

  // Derive the embedded Solana wallet directly from useTurnkey wallets
  // Filter: source === "embedded" (or no source) AND has ADDRESS_FORMAT_SOLANA account
  const embeddedSolanaWallet = useMemo(() => {
    if (!turnkeyWallets || turnkeyWallets.length === 0) {
      return null;
    }

    // Find wallet with source: "embedded" (or no source) that has a Solana account
    const wallet = turnkeyWallets.find((w: TurnkeyWallet) => {
      // Must be embedded (not connected/imported)
      const isEmbedded = w.source === "embedded" || !w.source;
      if (!isEmbedded) return false;

      // Exclude explicitly imported wallets
      if (w.imported || w.source === "imported") return false;

      // Exclude connected wallets like Solflare
      if (w.source === "connected") return false;
      if (
        w.walletId === "solflare" ||
        w.walletName?.toLowerCase() === "solflare"
      )
        return false;

      // Must have a Solana account with ADDRESS_FORMAT_SOLANA
      return w.accounts?.some(
        (acc: TurnkeyAccount) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
      );
    }) as TurnkeyWallet | undefined;

    if (!wallet) return null;

    // Find the Solana account within the wallet
    const solanaAccount = wallet.accounts?.find(
      (acc: TurnkeyAccount) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
    );

    if (!solanaAccount?.address) return null;

    return {
      wallet,
      account: solanaAccount,
      address: solanaAccount.address,
      walletId: wallet.walletId,
      walletName: wallet.walletName,
    };
  }, [turnkeyWallets]);

  // Derived values
  const solWallet = embeddedSolanaWallet?.address || null;
  const walletId = embeddedSolanaWallet?.walletId || null;
  const isLoadingSolana = clientState === "loading";

  // Debug logging for wallet state
  // useEffect(() => {
  //   console.log("🔍 WalletSettingsModal - Direct wallet detection:", {
  //     solWallet,
  //     walletId,
  //     walletName: embeddedSolanaWallet?.walletName,
  //     isLoadingSolana,
  //     clientState,
  //     authState,
  //     turnkeyWalletsCount: turnkeyWallets?.length || 0,
  //     allWallets: turnkeyWallets?.map((w: TurnkeyWallet) => ({
  //       walletId: w.walletId,
  //       walletName: w.walletName,
  //       source: w.source,
  //       imported: w.imported,
  //       accountsCount: w.accounts?.length || 0,
  //       solanaAccounts: w.accounts
  //         ?.filter(
  //           (acc: TurnkeyAccount) =>
  //             acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
  //         )
  //         .map((acc: TurnkeyAccount) => acc.address),
  //     })),
  //   });
  // }, [
  //   solWallet,
  //   walletId,
  //   embeddedSolanaWallet,
  //   isLoadingSolana,
  //   clientState,
  //   authState,
  //   turnkeyWallets,
  // ]);

  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { createWallet, refreshWallets, handleExportWallet } = useTurnkey();
  
  // Use portfolio context for balance data
  const {
    solBalance,
    solBalanceUsd,
    totalValueUsd,
    isLoading: isLoadingPortfolio,
    refreshPortfolio,
  } = usePortfolio();

  // Check if user is authenticated (either via custom auth or Turnkey)
  const isAuthenticated = user || turnkeyUser;

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRefreshWallets = async () => {
    try {
      console.log("🔄 Refreshing wallets...");
      await refreshWallets();
      console.log("✅ Wallets refreshed");
    } catch (error) {
      console.error("❌ Failed to refresh wallets:", error);
    }
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

    // Check if an embedded Solana wallet already exists
    if (embeddedSolanaWallet) {
      // console.log("✅ Existing embedded Solana wallet detected:", {
      //   walletId: embeddedSolanaWallet.walletId,
      //   walletName: embeddedSolanaWallet.walletName,
      //   address: embeddedSolanaWallet.address,
      // });

      alert(
        "You already have a Turnkey-managed Solana wallet!\n\n" +
          `Wallet: ${embeddedSolanaWallet.walletName || "Unnamed"}\n` +
          `Address: ${embeddedSolanaWallet.address}\n\n` +
          "The wallet is already displayed."
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
      // console.log("✅ Turnkey Solana wallet created:", wallet);

      // Refresh wallets to pick up the new wallet
      await refreshWallets();
      console.log("✅ Wallets refreshed after creation");
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
        // Try to refresh to show existing wallet
        await refreshWallets();
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

  const handleExportWalletClick = () => {
    if (!embeddedSolanaWallet?.walletId) {
      alert(
        "Cannot export wallet: No wallet found. Please create a wallet first."
      );
      return;
    }

    if (!handleExportWallet) {
      alert(
        "Export function not available. Please ensure you are logged in with Turnkey."
      );
      return;
    }

    // Show export dialog first (it will appear above the wallet modal via portal)
    setShowExportDialog(true);
  };

  const confirmExport = async () => {
    if (!handleExportWallet || !embeddedSolanaWallet?.walletId) {
      return;
    }

    // Close both dialogs
    setShowExportDialog(false);
    onClose();
    
    // Small delay to ensure dialogs close before opening export window
    setTimeout(async () => {
      const maxRetries = 2;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Exporting wallet (attempt ${attempt}/${maxRetries})...`, {
            walletId: embeddedSolanaWallet.walletId,
          });

          // handleExportWallet opens a new window to export.turnkey.com
          await handleExportWallet({
            walletId: embeddedSolanaWallet.walletId,
          });

          console.log("✅ Wallet export initiated");
          // Note: The CORS/origin mismatch warnings are expected and can be ignored
          // The export will complete in the new window that opens
          return; // Success, exit retry loop
        } catch (error: unknown) {
          lastError = error;
          const errorMessage =
            (error as { message?: string })?.message || String(error);
          console.error(`❌ Error exporting wallet (attempt ${attempt}):`, error);

          // If it's a CORS/origin issue, don't retry
          if (errorMessage.includes("origin") || errorMessage.includes("CORS")) {
            console.log("CORS error detected, not retrying");
            return;
          }

          // If this is the last attempt, show error
          if (attempt === maxRetries) {
            alert(
              `Failed to export wallet after ${maxRetries} attempts: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`
            );
          } else {
            // Wait before retrying (exponential backoff: 500ms, 1000ms)
            const delay = 500 * attempt;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    }, 300);
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
            <div className="text-xs text-gray-400 mb-1">Total Portfolio Value</div>
            {!isAuthenticated ? (
              <div className="text-sm text-gray-500">
                Sign in to view balance
              </div>
            ) : isLoadingPortfolio ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="text-xl font-bold">
                {formatCurrency(totalValueUsd)}
              </div>
            )}
            {isAuthenticated && !isLoadingPortfolio && (
              <Link
                href="/portfolio"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark mt-2 transition-colors"
              >
                <Wallet className="w-3 h-3" />
                <span>View Full Portfolio</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
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
                className="w-16 px-2 py-1.5 bg-panel-elev border border-gray-800/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Wallet List */}
          <div className="space-y-3">
            {/* SOL Wallet */}
            <div className="bg-panel-elev/50 rounded-lg p-3 border border-gray-800/30">
              <div className="flex items-start gap-2 mb-2">
                <div className="relative w-6 h-6 flex-shrink-0 mt-0.5">
                  <img
                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                    alt="SOL"
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.parentElement?.querySelector(".sol-fallback-modal") as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="sol-fallback-modal w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold absolute inset-0 hidden">
                    S
                  </div>
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
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        handleRefreshWallets();
                        refreshPortfolio();
                      }}
                      className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0 cursor-pointer"
                      title="Refresh portfolio"
                    >
                      <RefreshCw
                        className={`w-4 h-4 text-gray-400 hover:text-primary cursor-pointer ${isLoadingPortfolio ? "animate-spin" : ""}`}
                      />
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
                <span className="text-gray-400">SOL Balance:</span>
                {isLoadingPortfolio ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (
                  <div className="text-right">
                    <div className="font-medium">
                      {formatNumber(solBalance)} SOL
                    </div>
                    {solBalanceUsd > 0 && (
                      <div className="text-gray-400 text-xs">
                        {formatCurrency(solBalanceUsd)}
                      </div>
                    )}
                  </div>
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
            <button
              onClick={handleExportWalletClick}
              disabled={!embeddedSolanaWallet?.walletId}
              className="px-4 py-2 bg-panel-elev hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Export Wallet Confirmation Dialog - Higher z-index to appear above wallet modal */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogPortal>
          <DialogOverlay className="!z-[200]" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[201] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-panel border border-gray-800/50 rounded-lg p-6 text-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            )}
          >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">
              ⚠️ Security Warning
            </DialogTitle>
            <DialogDescription className="sr-only">
              Exporting your wallet will reveal your private key or seed phrase. This allows anyone with access to control your wallet and funds.
            </DialogDescription>
            <div className="text-gray-300 pt-2 space-y-3">
              <p className="font-semibold">
                Exporting your wallet will reveal your private key or seed phrase.
              </p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-200">
                  Anyone with access to your exported credentials can:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                  <li>Control your wallet and funds</li>
                  <li>Transfer all assets</li>
                  <li>Access your transaction history</li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-gray-200">
                  Only export if you:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-2">
                  <li>Understand the security risks</li>
                  <li>Will store it securely</li>
                  <li>Trust the device you're using</li>
                </ul>
              </div>

              <p className="text-xs text-yellow-400 pt-2 border-t border-gray-700">
                Note: The export will open in a new window. CORS warnings in the console are expected and can be ignored.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowExportDialog(false)}
              className="px-4 py-2 bg-panel-elev hover:bg-panel text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmExport}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              I Understand, Export Wallet
            </button>
          </DialogFooter>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
