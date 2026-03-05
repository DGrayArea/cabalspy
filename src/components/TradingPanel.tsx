"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { TokenData } from "@/types/token";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface TradingPanelProps {
  token: TokenData;
  onClose: () => void;
  initialAmount?: string; // Pre-fill amount when opening panel
  initialTradeType?: "buy" | "sell"; // Pre-select trade type
}

export default function TradingPanel({
  token,
  onClose,
  initialAmount,
  initialTradeType = "buy",
}: TradingPanelProps) {
  const { turnkeyUser } = useAuth();
  const { toast, dismiss } = useToast();
  const { address, connection, signSolanaTransaction } = useTurnkeySolana();
  const [tradeType, setTradeType] = useState<"buy" | "sell">(initialTradeType);
  const [amount, setAmount] = useState(initialAmount || "");
  const [slippage, setSlippage] = useState("0.5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrade = async () => {
    if (!turnkeyUser || !address || !connection || !signSolanaTransaction) {
      toast({
        variant: "error",
        title: "Please connect your Turnkey wallet first",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "error",
        title: "Please enter a valid amount",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const slippageBps = Math.round(parseFloat(slippage) * 100); // percent -> bps

      // Determine input and output mints
      const inputMint = tradeType === "buy" ? SOL_MINT : token.id;
      const outputMint = tradeType === "buy" ? token.id : SOL_MINT;

      // Show loading toast
      const loadingToast = toast({
        variant: "info",
        title: `${tradeType === "buy" ? "Buying" : "Selling"} ${token.symbol}...`,
        className: "loading",
      });
      // Execute swap - always pass explicit decimals
      const result = await executeJupiterSwap({
        inputMint,
        outputMint,
        amount: parseFloat(amount),
        // Always pass decimals explicitly:
        // When selling: input is token (token.decimals or 6 default), output is SOL (9 decimals)
        // When buying: input is SOL (9 decimals), output is token (token.decimals or 6 default)
        inputDecimals: tradeType === "sell" ? token.decimals || 6 : 9, // SOL has 9 decimals
        outputDecimals: tradeType === "buy" ? token.decimals || 6 : 9, // SOL has 9 decimals
        userPublicKey: address,
        slippageBps,
        connection,
        signTransaction: signSolanaTransaction,
      });

      // Dismiss loading toast
      dismiss(loadingToast.id);

      if (result.success && result.signature) {
        toast({
          variant: "success",
          title: `${tradeType === "buy" ? "Buy" : "Sell"} successful!`,
          description: `Transaction: ${result.signature.slice(0, 8)}...`,
          action: (
            <ToastAction
              altText="View transaction"
              onClick={() => {
                window.open(
                  `https://solscan.io/tx/${result.signature}`,
                  "_blank"
                );
              }}
            >
              View
            </ToastAction>
          ),
        });
        onClose();
      } else {
        toast({
          variant: "error",
          title: `${tradeType === "buy" ? "Buy" : "Sell"} failed`,
          description: result.error || "Unknown error occurred",
        });
      }
    } catch (error: any) {
      console.error("Trading error:", error);
      toast({
        variant: "error",
        title: `Failed to ${tradeType === "buy" ? "buy" : "sell"} ${token.symbol}`,
        description: error.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!turnkeyUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md sm:w-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4 cursor-pointer" />
            <h3 className="text-lg font-semibold mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-400 mb-4">
              Please sign in to start trading
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!address || !connection || !signSolanaTransaction) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md sm:w-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4 cursor-pointer" />
            <h3 className="text-lg font-semibold mb-2">Wallet Required</h3>
            <p className="text-gray-400 mb-4">
              Please create a Turnkey wallet to start trading
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md sm:w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trade {token.symbol}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Token Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{token.icon}</div>
              <div>
                <div className="font-semibold">{token.name}</div>
                <div className="text-sm text-gray-400">{token.symbol}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-semibold">${token.price}</div>
                <div className="text-sm text-gray-400">
                  MC: ${token.marketCap.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Trade Type Toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setTradeType("buy")}
              className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                tradeType === "buy"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-4 h-4 cursor-pointer" />
              Buy
            </button>
            <button
              onClick={() => setTradeType("sell")}
              className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                tradeType === "sell"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingDown className="w-4 h-4 cursor-pointer" />
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount ({tradeType === "buy" ? "SOL" : token.symbol})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 pr-14 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
              <button
                onClick={() => {
                  // Set max amount (for sell, use full balance; for buy, reserve 0.01 SOL for fees)
                  if (tradeType === "sell") {
                    // TODO: Get actual token balance and set it here
                    setAmount("0");
                  } else {
                    // TODO: Get SOL balance and set max minus 0.01 for fees
                    setAmount("0");
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-primary hover:text-primary/80 bg-primary/10 rounded cursor-pointer"
              >
                Max
              </button>
            </div>
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Slippage Tolerance (%)
            </label>
            <div className="flex gap-2">
              {["0.1", "0.5", "1.0"].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-3 py-1 rounded text-sm transition-colors cursor-pointer ${
                    slippage === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                step="0.1"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Custom"
                className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
          </div>

          {/* Trade Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">Trade Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span
                    className={
                      tradeType === "buy" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {tradeType === "buy" ? "Buy" : "Sell"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>
                    {amount} {tradeType === "buy" ? "SOL" : token.symbol}
                  </span>
                </div>
                {tradeType === "buy" && token.price > 0 && (
                  <div className="flex justify-between">
                    <span>You&apos;ll receive:</span>
                    <span>
                      {(parseFloat(amount) / token.price).toFixed(6)}{" "}
                      {token.symbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>${token.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slippage:</span>
                  <span>{slippage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleTrade}
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                tradeType === "buy"
                  ? "bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  : "bg-red-600 hover:bg-red-700 disabled:bg-gray-600"
              } text-white disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 cursor-pointer" />
                  {tradeType === "buy" ? "Buy" : "Sell"} {token.symbol}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
