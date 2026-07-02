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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-overlay">
        <div className="glass bg-panel border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center relative overflow-hidden modal-panel">
          <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
          <h3 className="text-xl font-bold tracking-tighter uppercase text-white mb-2">Loading Wallet</h3>
          <p className="text-muted text-sm font-bold">
            Please wait while we initialize your wallet
          </p>
        </div>
      </div>
    );
  }

  if (!address || !connection || !signSolanaTransaction) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-overlay">
        <div className="glass bg-panel border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center relative overflow-hidden modal-panel">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <h3 className="text-xl font-bold tracking-tighter uppercase text-white mb-2">Wallet Not Ready</h3>
          <p className="text-sm font-bold text-muted mb-2">
            {missingItems.length > 0
              ? `Missing: ${missingItems.join(", ")}`
              : "Please ensure your Turnkey wallet is fully loaded"}
          </p>
          <p className="text-[11px] font-bold text-muted/60 mb-6 uppercase tracking-widest">
            If you just authenticated, wait a moment for initialization.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-bold uppercase tracking-wider text-sm border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-overlay">
      <div className="glass bg-panel border border-white/10 shadow-2xl rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto relative overflow-hidden modal-panel">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20" />

        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold tracking-tighter uppercase text-white drop-shadow-accent-neon">
              Withdraw SOL
            </h3>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Balance Info */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent to-purple-500" />
              <div className="text-[10px] font-bold text-muted mb-1 uppercase tracking-widest">Available Balance</div>
              <div className="text-3xl font-bold text-white tracking-tighter drop-shadow-neon">
                {formatNumber(solBalance)} <span className="text-lg text-muted">SOL</span>
              </div>
              <div className="text-[10px] font-bold text-accent mt-2 uppercase tracking-widest bg-accent/10 px-2 py-1 rounded inline-block">
                Reserve ~0.01 SOL for gas
              </div>
            </div>

            {/* Low Balance Warning */}
            {solBalance <= 0.01 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-xs font-bold text-blue-400/90 leading-relaxed">
                    Balance is {formatNumber(solBalance)} SOL. You must keep at least 0.01 SOL for fees. Deposit more to withdraw.
                  </p>
                </div>
              </div>
            )}

            {/* Recipient Address */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted ml-1">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana address..."
                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-white font-mono text-xs transition-colors"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted ml-1">
                Amount (SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-white font-bold text-lg transition-colors pr-20"
                />
                <button
                  onClick={handleMax}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Transaction Summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                <h4 className="text-[10px] font-bold text-white mb-3 uppercase tracking-widest">Transaction Details</h4>
                <div className="space-y-2 text-xs font-bold">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Amount</span>
                    <span className="text-white bg-black/40 px-2 py-0.5 rounded">{formatNumber(parseFloat(amount))} SOL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Network Fee</span>
                    <span className="text-white bg-black/40 px-2 py-0.5 rounded">~0.000005 SOL</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-muted">Total Deducted</span>
                    <span className="text-accent font-bold text-sm">
                      {formatNumber(parseFloat(amount) + 0.000005)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Remaining Balance</span>
                    <span className="text-muted/80 font-mono">
                      {formatNumber(solBalance - parseFloat(amount) - 0.000005)} SOL
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-yellow-500/90 leading-relaxed">
                    You can only withdraw SOL. Trade tokens for SOL before withdrawing them.
                  </p>
                  <p className="text-[10px] font-medium text-yellow-500/70 leading-relaxed">
                    Note: For your security, Cabalspy uses Turnkey secure enclaves. Your private keys can never be exported or exposed. To move your funds off-platform, you must use this withdrawal interface.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold uppercase tracking-widest text-xs border border-white/5 active:scale-95"
              >
                Cancel
              </button>
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
                className="flex-1 py-4 px-4 bg-accent/20 hover:bg-accent/30 disabled:bg-white/5 disabled:text-muted disabled:border-white/5 border border-accent/50 text-accent rounded-2xl transition-all font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed hover:shadow-accent-neon active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  "Withdraw"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
