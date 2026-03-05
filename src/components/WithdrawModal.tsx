"use client";

import { useState } from "react";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { X, Loader2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatNumber } from "@/utils/format";

interface WithdrawModalProps {
  onClose: () => void;
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const { address, connection, signSolanaTransaction, isLoading } =
    useTurnkeySolana();
  const { solBalance, refreshPortfolio } = usePortfolio();
  const { toast, dismiss } = useToast();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMax = () => {
    // Reserve ~0.01 SOL for transaction fees
    const maxAmount = Math.max(0, solBalance - 0.01);
    setAmount(maxAmount.toFixed(9));
  };

  const handleWithdraw = async () => {
    if (!address || !connection || !signSolanaTransaction) {
      toast({
        variant: "error",
        title: "Wallet not connected",
        description: "Please connect your wallet first",
      });
      return;
    }

    // Validate recipient address
    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      toast({
        variant: "error",
        title: "Invalid address",
        description: "Please enter a valid Solana address",
      });
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Please enter a valid amount",
      });
      return;
    }

    if (amountNum > solBalance) {
      toast({
        variant: "error",
        title: "Insufficient balance",
        description: `You only have ${formatNumber(solBalance)} SOL`,
      });
      return;
    }

    // Check minimum balance for fees
    if (amountNum > solBalance - 0.01) {
      toast({
        variant: "error",
        title: "Insufficient balance for fees",
        description: "Please leave at least 0.01 SOL for transaction fees",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const recipientPubkey = new PublicKey(recipientAddress);
      const senderPubkey = new PublicKey(address);

      // Convert SOL to lamports
      const lamports = Math.floor(amountNum * 1e9);

      // Show loading toast
      const loadingToastId = toast({
        variant: "info",
        title: "Sending SOL...",
        description: "Please wait while we process your transaction",
      }).id;

      // Get fresh blockhash with finalized commitment for longer validity
      const { blockhash } = await connection.getLatestBlockhash("finalized");

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports,
      });

      // Build transaction message
      const messageV0 = new TransactionMessage({
        payerKey: senderPubkey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      // Create versioned transaction
      const transaction = new VersionedTransaction(messageV0);

      // Sign transaction using TurnkeySigner
      if (!signSolanaTransaction) {
        throw new Error("Signing not available");
      }

      const signedTransaction = await signSolanaTransaction(transaction);

      // Send the signed transaction immediately to avoid blockhash expiration
      // Using "finalized" commitment gives us ~32 slots (~13 seconds) of validity
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          maxRetries: 3,
          skipPreflight: false,
        }
      );

      // Dismiss loading toast
      dismiss(loadingToastId);

      // Refresh portfolio
      await refreshPortfolio();

      toast({
        variant: "success",
        title: "Withdrawal successful!",
        description: `Sent ${formatNumber(amountNum)} SOL`,
        action: (
          <ToastAction
            altText="View transaction in explorer"
            onClick={() => {
              window.open(`https://solscan.io/tx/${signature}`, "_blank");
            }}
          >
            View in Explorer
          </ToastAction>
        ),
      });

      onClose();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({
        variant: "error",
        title: "Withdrawal failed",
        description: error.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check what's missing for better error message
  const missingItems = [];
  if (!address) missingItems.push("wallet address");
  if (!connection) missingItems.push("Solana connection");
  if (!signSolanaTransaction) missingItems.push("signing capability");

  // Show loading state if wallet is still initializing
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md sm:w-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-blue-400 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Loading Wallet...</h3>
            <p className="text-gray-400 mb-4">
              Please wait while we initialize your wallet
            </p>
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
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wallet Not Ready</h3>
            <p className="text-gray-400 mb-2">
              {missingItems.length > 0
                ? `Missing: ${missingItems.join(", ")}`
                : "Please ensure your Turnkey wallet is fully loaded"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              If you just authenticated, please wait a moment for your wallet to
              initialize, or try refreshing the page.
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
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
          <h3 className="text-lg font-semibold">Withdraw SOL</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Balance Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Available Balance</div>
            <div className="text-2xl font-semibold">
              {formatNumber(solBalance)} SOL
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Reserve ~0.01 SOL for transaction fees
            </div>
          </div>

          {/* Low Balance Warning */}
          {solBalance <= 0.01 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-400">
                  Your balance is {formatNumber(solBalance)} SOL or below. You
                  cannot withdraw because you need to keep at least 0.01 SOL for
                  transaction fees. Please deposit more SOL to enable
                  withdrawals.
                </p>
              </div>
            </div>
          )}

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Enter Solana address"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (SOL)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white pr-20"
              />
              <button
                onClick={handleMax}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transaction Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">Transaction Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span>{formatNumber(parseFloat(amount))} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee:</span>
                  <span>~0.000005 SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="font-semibold">
                    {formatNumber(parseFloat(amount) + 0.000005)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Remaining:</span>
                  <span>
                    {formatNumber(solBalance - parseFloat(amount) - 0.000005)}{" "}
                    SOL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">
                You can only withdraw SOL. To cash out tokens, trade them for
                SOL first.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleWithdraw}
              disabled={
                isSubmitting ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !recipientAddress ||
                parseFloat(amount) > solBalance - 0.01 ||
                solBalance <= 0.01
              }
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw SOL"
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
