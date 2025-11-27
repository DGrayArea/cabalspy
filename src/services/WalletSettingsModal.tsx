"use client";

import { useState, useEffect } from "react";
import { BarChart3, X, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserWallets } from "@/hooks/useUserWallets";

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
  const { wallets, isLoading: walletsLoading } = useUserWallets();
  const [solWallet, setSolWallet] = useState<string>("");
  const [bscWallet, setBscWallet] = useState<string>("");
  const [solBalance, setSolBalance] = useState<string>("0");
  const [bscBalance, setBscBalance] = useState<string>("0");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch wallet addresses and balances when user is authenticated
  useEffect(() => {
    if (!user || !user.wallets) {
      setSolWallet("");
      setBscWallet("");
      setSolBalance("0");
      setBscBalance("0");
      return;
    }

    const fetchWalletDetails = async () => {
      setIsLoadingAddresses(true);
      try {
        const response = await fetch("/api/turnkey/wallet-addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletIds: {
              solana: user.wallets?.solana?.walletId,
              bsc: user.wallets?.bsc?.walletId,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSolWallet(data.wallets.solana.address || "");
          setBscWallet(data.wallets.bsc.address || "");
          setSolBalance(data.wallets.solana.balance || "0");
          setBscBalance(data.wallets.bsc.balance || "0");
        } else {
          console.error("Failed to fetch wallet addresses");
        }
      } catch (error) {
        console.error("Error fetching wallet details:", error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchWalletDetails();
  }, [user]);

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      {/* Modal */}
      <div className="absolute top-full mt-2 w-80 max-w-[calc(100vw-2rem)] sm:max-w-sm bg-panel border border-gray-800/50 rounded-lg shadow-xl z-50 overflow-hidden right-0 sm:right-0 left-auto sm:left-auto">
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
            {!user ? (
              <div className="text-sm text-gray-500">
                Sign in to view balance
              </div>
            ) : isLoadingAddresses ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : (
              <div className="text-xl font-bold">$0</div>
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
                  <div className="text-sm font-medium mb-1">Solana Wallet</div>
                  {!user ? (
                    <div className="text-xs text-gray-500">Sign in to view</div>
                  ) : isLoadingAddresses ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {solWallet || "Not connected"}
                    </div>
                  )}
                </div>
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Balance:</span>
                {isLoadingAddresses ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (
                  <span className="font-medium">{solBalance} SOL</span>
                )}
              </div>
            </div>

            {/* BSC Wallet */}
            <div className="bg-panel-elev/50 rounded-lg p-3 border border-gray-800/30">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">BSC Wallet</div>
                  {!user ? (
                    <div className="text-xs text-gray-500">Sign in to view</div>
                  ) : isLoadingAddresses ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {bscWallet || "Not connected"}
                    </div>
                  )}
                </div>
                {bscWallet && (
                  <button
                    onClick={() => copyToClipboard(bscWallet, "bsc")}
                    className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy address"
                  >
                    {copied === "bsc" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 cursor-pointer" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 cursor-pointer" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Balance:</span>
                {isLoadingAddresses ? (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                ) : (
                  <span className="font-medium">{bscBalance} BNB</span>
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
            <button className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Create
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
