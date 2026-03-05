"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { Copy, CheckCircle2, X } from "lucide-react";
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md sm:w-96">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No wallet address available</p>
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
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md sm:w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Deposit SOL</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              Send SOL to this address to deposit to your wallet
            </p>
            
            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={address}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Address */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-300 break-all flex-1 text-left">
                  {address}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Only send SOL to this address. Sending other tokens may result in permanent loss.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

