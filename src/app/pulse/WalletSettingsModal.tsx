"use client";

import { useState } from "react";
import {
  BarChart3,
  X,
  Copy,
  CheckCircle2,
} from "lucide-react";

export function WalletSettingsModal({
  slippage,
  setSlippage,
  onClose,
}: {
  slippage: string;
  setSlippage: (value: string) => void;
  onClose: () => void;
}) {
  const [solWallet, setSolWallet] = useState<string>("");
  const [bscWallet, setBscWallet] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-panel border border-gray-800/50 rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="p-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Trading Wallets</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-panel-elev rounded transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chain Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-800/50 pb-2">
            <button className="px-3 py-1 text-sm font-medium text-primary border-b-2 border-primary">
              Solana
            </button>
            <button className="px-3 py-1 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Perps
            </button>
          </div>

          {/* Total Value */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">Total value</div>
            <div className="text-xl font-bold">$0</div>
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
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
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
                  <div className="text-sm font-medium mb-1">Solana Wallet</div>
                  <div className="text-xs text-gray-400 font-mono truncate">
                    {solWallet || "Not connected"}
                  </div>
                </div>
                {solWallet && (
                  <button
                    onClick={() => copyToClipboard(solWallet, "sol")}
                    className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied === "sol" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Balance:</span>
                <span className="font-medium">0 SOL</span>
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
                  <div className="text-xs text-gray-400 font-mono truncate">
                    {bscWallet || "Not connected"}
                  </div>
                </div>
                {bscWallet && (
                  <button
                    onClick={() => copyToClipboard(bscWallet, "bsc")}
                    className="p-1 hover:bg-panel rounded transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied === "bsc" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Balance:</span>
                <span className="font-medium">0 BNB</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors">
              Deposit
            </button>
            <button className="px-4 py-2 bg-panel-elev hover:bg-panel text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Withdraw
            </button>
            <button className="px-4 py-2 bg-primary-dark hover:bg-primary-darker text-white text-sm font-medium rounded-lg transition-colors">
              Create
            </button>
            <button className="px-4 py-2 bg-panel-elev hover:bg-panel text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Import
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

