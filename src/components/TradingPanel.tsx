"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTurnkeySolana } from "@/context/TurnkeySolanaContext";
import { usePortfolio } from "@/context/PortfolioContext";
import { TokenData } from "@/types/token";
import {
  ArrowDownUp,
  DollarSign,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { executeJupiterSwap } from "@/services/jupiter-swap-turnkey";
import { jupiterSwapService } from "@/services/jupiter-swap";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { TokenSelectorModal, TokenInfo } from "./TokenSelectorModal";
import Image from "next/image";

const SOL_MINT = "So11111111111111111111111111111111111111112";

const SOL_TOKEN_INFO: TokenInfo = {
  address: SOL_MINT,
  symbol: "SOL",
  name: "Solana",
  decimals: 9,
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
};

interface TradingPanelProps {
  token: TokenData;
  onClose: () => void;
  initialAmount?: string;
  initialTradeType?: "buy" | "sell";
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
  const { solBalance, getTokenBalance, refreshPortfolio } = usePortfolio();

  const pageTokenInfo: TokenInfo = useMemo(
    () => ({
      address: token.id,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals || 6,
      logoURI:
        token.icon &&
        typeof token.icon === "string" &&
        token.icon.startsWith("http")
          ? token.icon
          : undefined,
    }),
    [token],
  );

  const [inputToken, setInputToken] = useState<TokenInfo>(
    initialTradeType === "buy" ? SOL_TOKEN_INFO : pageTokenInfo,
  );
  const [outputToken, setOutputToken] = useState<TokenInfo>(
    initialTradeType === "buy" ? pageTokenInfo : SOL_TOKEN_INFO,
  );

  const [amount, setAmount] = useState(initialAmount || "");
  const [slippage, setSlippage] = useState("0.5");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  // Phantom-like flow: "Review Order" state before executing
  const [isReviewing, setIsReviewing] = useState(false);

  // Token Selector State
  const [selectingTarget, setSelectingTarget] = useState<
    "input" | "output" | null
  >(null);

  const swapDirection = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setAmount("");
    setQuote(null);
    setIsReviewing(false);
  };

  const getBalance = (tokenAddress: string) => {
    if (tokenAddress === SOL_MINT) return solBalance;
    return getTokenBalance(tokenAddress)?.amount || 0;
  };

  const inputBalance = getBalance(inputToken.address);

  // Fetch Quote
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      setIsFetchingQuote(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsFetchingQuote(true);
        setQuoteError(null);

        const numericAmount = parseFloat(amount);
        const amountRaw = Math.floor(
          numericAmount * Math.pow(10, inputToken.decimals),
        );

        const quoteResponse = await jupiterSwapService.getQuote({
          inputMint: inputToken.address,
          outputMint: outputToken.address,
          amount: amountRaw,
          slippageBps: Math.round(parseFloat(slippage) * 100),
        });

        if (!quoteResponse) {
          setQuote(null);
          setQuoteError(
            "Unable to fetch quote, please verify the amount and retry.",
          );
          return;
        }

        setQuote(quoteResponse);
      } catch (error: any) {
        setQuote(null);
        setQuoteError(error?.message || "Quote unavailable");
      } finally {
        setIsFetchingQuote(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [amount, inputToken, outputToken, slippage]);

  const handleReview = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ variant: "error", title: "Enter a valid amount" });
      return;
    }
    if (numAmount > inputBalance) {
      toast({
        variant: "error",
        title: `Insufficient ${inputToken.symbol} balance`,
      });
      return;
    }
    if (!quote) {
      toast({ variant: "error", title: "Wait for a valid quote" });
      return;
    }
    setIsReviewing(true);
  };

  const handleExecute = async () => {
    if (!quote) return;
    try {
      setIsSubmitting(true);

      const loadingToast = toast({
        variant: "info",
        title: `Swapping ${inputToken.symbol} for ${outputToken.symbol}...`,
        className: "loading",
      });

      const result = await executeJupiterSwap({
        inputMint: inputToken.address,
        outputMint: outputToken.address,
        amount: parseFloat(amount),
        inputDecimals: inputToken.decimals,
        outputDecimals: outputToken.decimals,
        userPublicKey: address!,
        slippageBps: Math.round(parseFloat(slippage) * 100),
        connection: connection!,
        signTransaction: signSolanaTransaction!,
      });

      dismiss(loadingToast.id);

      if (result.success && result.signature) {
        toast({
          variant: "success",
          title: `Swap successful!`,
          action: (
            <ToastAction
              altText="View transaction"
              onClick={() =>
                window.open(
                  `https://solscan.io/tx/${result.signature}`,
                  "_blank",
                )
              }
            >
              View
            </ToastAction>
          ),
        });
        refreshPortfolio();
        onClose();
      } else {
        toast({
          variant: "error",
          title: `Swap failed`,
          description: result.error,
        });
      }
    } catch (error: any) {
      toast({
        variant: "error",
        title: `Failed to swap`,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!turnkeyUser || !address) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-panel border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-bold mb-2 text-white">
              Wallet Required
            </h3>
            <p className="text-gray-400 mb-6 text-sm">
              Please sign in to start trading.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-panel border border-gray-800 rounded-3xl p-5 w-full max-w-md shadow-2xl relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {isReviewing ? "Review Order" : "Swap"}
            </h3>
            {!isSubmitting && (
              <button
                onClick={() =>
                  isReviewing ? setIsReviewing(false) : onClose()
                }
                className="text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full p-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>

          {!isReviewing ? (
            <div className="space-y-2 relative">
              {/* Input Box */}
              <div className="bg-panel-elev rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    You pay
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Bal: {inputBalance.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectingTarget("input")}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pr-3 rounded-xl transition-colors border border-white/5 cursor-pointer shrink-0"
                  >
                    {inputToken.logoURI ? (
                      <Image
                        src={inputToken.logoURI}
                        alt={inputToken.symbol}
                        width={24}
                        height={24}
                        className="rounded-full bg-black"
                        unoptimized
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] font-bold border border-white/10">
                        {inputToken.symbol[0]}
                      </div>
                    )}
                    <span className="font-bold text-white">
                      {inputToken.symbol}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-right text-2xl sm:text-3xl font-black text-white focus:outline-none placeholder-gray-600 truncate"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() =>
                      setAmount(
                        inputToken.address === SOL_MINT
                          ? Math.max(0, inputBalance - 0.01).toString()
                          : inputBalance.toString(),
                      )
                    }
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Swap Button */}
              <div className="absolute left-1/2 top-[120px] -translate-x-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={swapDirection}
                  className="bg-panel-elev border-[4px] border-panel p-2.5 rounded-2xl hover:text-primary hover:bg-white/10 text-gray-400 transition-all active:scale-95 shadow-xl"
                >
                  <ArrowDownUp className="w-4 h-4" />
                </button>
              </div>

              {/* Output Box */}
              <div className="bg-panel-elev rounded-2xl p-4 border border-white/5 transition-colors pt-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    You receive
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    Bal: {getBalance(outputToken.address).toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectingTarget("output")}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-2 pr-3 rounded-xl transition-colors border border-white/5 cursor-pointer shrink-0"
                  >
                    {outputToken.logoURI ? (
                      <Image
                        src={outputToken.logoURI}
                        alt={outputToken.symbol}
                        width={24}
                        height={24}
                        className="rounded-full bg-black"
                        unoptimized
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] font-bold border border-white/10">
                        {outputToken.symbol[0]}
                      </div>
                    )}
                    <span className="font-bold text-white">
                      {outputToken.symbol}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <div className="flex-1 text-right text-2xl sm:text-3xl font-black text-gray-300 truncate">
                    {isFetchingQuote ? (
                      <span className="animate-pulse">...</span>
                    ) : quote ? (
                      (
                        parseFloat(quote.outAmount) /
                        Math.pow(10, outputToken.decimals)
                      ).toLocaleString(undefined, { maximumFractionDigits: 6 })
                    ) : (
                      "0"
                    )}
                  </div>
                </div>
              </div>

              {/* Settings / Slippage */}
              <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Slippage
                </span>
                <div className="flex gap-1.5">
                  {["0.5", "1.0"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${slippage === val ? "bg-primary text-black" : "bg-white/5 text-gray-400 hover:text-white"}`}
                    >
                      {val}%
                    </button>
                  ))}
                  <input
                    type="number"
                    step="0.1"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="Auto"
                    className="w-16 text-[10px] px-2 py-1 bg-white/5 rounded-md text-right text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              {quoteError && amount && !isFetchingQuote && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{quoteError}</span>
                </div>
              )}

              <button
                onClick={handleReview}
                disabled={
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  !quote ||
                  isFetchingQuote ||
                  !!quoteError ||
                  parseFloat(amount) > inputBalance
                }
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-black py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:bg-white/5 disabled:text-gray-500 disabled:active:scale-100 disabled:cursor-not-allowed"
              >
                {!amount
                  ? "Enter an amount"
                  : parseFloat(amount) > inputBalance
                    ? "Insufficient Balance"
                    : isFetchingQuote
                      ? "Fetching Quote..."
                      : "Review Order"}
              </button>
            </div>
          ) : (
            // REVIEW ORDER STATE
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-panel-elev rounded-2xl p-5 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                  You Pay
                </div>
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  {amount} {inputToken.symbol}
                </div>
              </div>

              <div className="flex justify-center -my-6 relative z-10 pointer-events-none">
                <div className="bg-panel p-2 rounded-full border border-white/5">
                  <ArrowDownUp className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              <div className="bg-panel-elev rounded-2xl p-5 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                  You Receive
                </div>
                <div className="text-3xl font-black text-primary flex items-center gap-2">
                  {(
                    parseFloat(quote.outAmount) /
                    Math.pow(10, outputToken.decimals)
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  {outputToken.symbol}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price Impact</span>
                  <span
                    className={`font-mono font-bold ${parseFloat(quote.priceImpactPct) > 2 ? "text-red-400" : "text-green-400"}`}
                  >
                    {parseFloat(quote.priceImpactPct).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum Received</span>
                  <span className="font-mono text-white">
                    {(
                      parseFloat(quote.otherAmountThreshold) /
                      Math.pow(10, outputToken.decimals)
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{" "}
                    {outputToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="font-mono text-white">~0.000005 SOL</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-3 mt-1">
                  <span className="text-gray-400">Route</span>
                  <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Jupiter (Auto)
                  </span>
                </div>
              </div>

              {parseFloat(quote.priceImpactPct) > 5 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200 font-medium">
                  ⚠️ Price impact is extremely high. You will lose a significant
                  portion of value. Proceed with caution.
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={isSubmitting}
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-black py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Swapping...
                  </>
                ) : (
                  "Confirm Trade"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <TokenSelectorModal
        isOpen={selectingTarget !== null}
        onClose={() => setSelectingTarget(null)}
        onSelect={(t) => {
          if (selectingTarget === "input") {
            if (t.address === outputToken.address) swapDirection();
            else setInputToken(t);
          } else {
            if (t.address === inputToken.address) swapDirection();
            else setOutputToken(t);
          }
        }}
      />
    </>
  );
}
