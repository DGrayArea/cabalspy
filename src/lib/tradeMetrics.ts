const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface TradeExtras {
  outAmountUsd?: number;
  feesSOL?: number;
  feesBps?: number;
}

/**
 * Derive the USD value of a swap's output and the referral fee paid in SOL
 * from what's known at execution time.
 *
 * - buy  (SOL → token): output is tokens → tokens * tokenPriceUsd
 * - sell (token → SOL): output is SOL → outAmount * solPriceUsd when the SOL
 *   price is known, otherwise approximated by the USD value of tokens sold
 *
 * Jupiter Ultra collects the referral fee on the fee mint side; when that's
 * SOL, the fee equals feeBps of the SOL leg of the swap.
 */
export function computeTradeExtras(params: {
  direction: "buy" | "sell";
  amountIn: number; // human input amount (SOL on buy, tokens on sell)
  outAmount: number; // human output amount (tokens on buy, SOL on sell)
  tokenPriceUsd?: number;
  solPriceUsd?: number;
  feeMint?: string;
  feeBps?: number;
}): TradeExtras {
  const {
    direction,
    amountIn,
    outAmount,
    tokenPriceUsd,
    solPriceUsd,
    feeMint,
    feeBps,
  } = params;

  let outAmountUsd: number | undefined;
  if (direction === "buy") {
    if (tokenPriceUsd && tokenPriceUsd > 0 && outAmount > 0) {
      outAmountUsd = outAmount * tokenPriceUsd;
    }
  } else {
    if (solPriceUsd && solPriceUsd > 0 && outAmount > 0) {
      outAmountUsd = outAmount * solPriceUsd;
    } else if (tokenPriceUsd && tokenPriceUsd > 0 && amountIn > 0) {
      outAmountUsd = amountIn * tokenPriceUsd;
    }
  }

  let feesSOL: number | undefined;
  if (feeBps && feeBps > 0 && feeMint === SOL_MINT) {
    const solLeg = direction === "buy" ? amountIn : outAmount;
    if (solLeg > 0) feesSOL = (feeBps / 10000) * solLeg;
  }

  return { outAmountUsd, feesSOL, feesBps: feeBps };
}
