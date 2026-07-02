"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { Copy, CheckCircle2, X, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { address } = useTurnkeySolana();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      variant: "success",
      title: "Address copied!",
      description: "Wallet address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-overlay">
        <div className="glass bg-panel border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center relative overflow-hidden modal-panel">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none -mt-10 -mr-10" />
          <p className="font-bold text-muted mb-6 relative">Wallet not ready</p>
          <button
            onClick={onClose}
            className="w-full relative py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-bold uppercase tracking-wider text-sm border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-overlay">
      <div className="glass bg-panel border border-white/10 shadow-2xl rounded-2xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden modal-panel">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mt-20 -ml-20" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold tracking-tighter uppercase text-white drop-shadow-neon">
                Deposit SOL
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm font-bold text-muted mb-6">
                Scan QR or copy address to fund your trading wallet.
              </p>
              
              {/* QR Code Container */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-3xl border-4 border-white/10 shadow-[0_0_30px_rgba(var(--primary),0.15)] transition-transform hover:scale-105 duration-300">
                  <QRCodeSVG
                    value={address}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Address Container */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3 group hover:border-primary/30 transition-colors">
                <code className="text-xs sm:text-sm font-mono text-gray-300 break-all flex-1 text-left select-all">
                  {address}
                </code>
                <button
                  onClick={copyAddress}
                  className="w-10 h-10 bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/50 text-muted hover:text-primary rounded-xl flex items-center justify-center transition-all shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                <p className="text-xs font-bold text-primary/80 text-left leading-relaxed">
                  Only send SOL to this address on the Solana network. Sending other assets might result in permanent loss.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold uppercase tracking-widest text-sm border border-white/5 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

