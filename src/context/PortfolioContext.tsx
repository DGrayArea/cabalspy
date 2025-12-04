"use client";

import * as React from "react";
import { useTurnkeySolana } from "./TurnkeySolanaContext";

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface PortfolioData {
  solBalance: number;
  solBalanceUsd: number;
  tokenBalances: TokenBalance[];
  totalValueUsd: number;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}

type PortfolioContextType = PortfolioData & {
  refreshPortfolio: () => Promise<void>;
  getTokenBalance: (mint: string) => TokenBalance | null;
};

const PortfolioContext = React.createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  // const { address: walletAddress } = useTurnkeySolana();
  const [portfolio, setPortfolio] = React.useState<PortfolioData>({
    solBalance: 0,
    solBalanceUsd: 0,
    tokenBalances: [],
    totalValueUsd: 0,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  // Fetch SOL price (for USD conversion)
  const fetchSolPrice = React.useCallback(async (): Promise<number> => {
    try {
      // Try CoinGecko first
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      if (response.ok) {
        const data = await response.json();
        return data.solana?.usd || 0;
      }
    } catch (err) {
      console.warn("Failed to fetch SOL price from CoinGecko:", err);
    }

    // Fallback: Try Jupiter price API
    try {
      const response = await fetch("https://price.jup.ag/v4/price?ids=SOL");
      if (response.ok) {
        const data = await response.json();
        return data.data?.SOL?.price || 0;
      }
    } catch (err) {
      console.warn("Failed to fetch SOL price from Jupiter:", err);
    }

    return 0;
  }, []);

  const walletAddress = "7gGTyuUDnAVSPFCxybjUHkvMC8QYWASivEFDrHNBcJod";

  // Fetch portfolio data from Helius
  const fetchPortfolio = React.useCallback(async () => {
    // Only fetch when a Turnkey wallet is connected (authenticated)
    if (!walletAddress) {
      setPortfolio((prev) => ({
        ...prev,
        solBalance: 0,
        solBalanceUsd: 0,
        tokenBalances: [],
        totalValueUsd: 0,
        isLoading: false,
        error: null,
      }));
      return;
    }

    const heliusRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";

    if (!heliusRpcUrl) {
      setPortfolio((prev) => ({
        ...prev,
        error: new Error("Helius RPC URL not configured"),
        isLoading: false,
      }));
      return;
    }

    setPortfolio((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch portfolio from Helius
      const response = await fetch(heliusRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "portfolio-fetch",
          method: "searchAssets",
          params: {
            ownerAddress: walletAddress,
            tokenType: "fungible",
            displayOptions: {
              showNativeBalance: true,
              showCollectionMetadata: false,
              showInscription: false,
              showUnverifiedCollections: false,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC error");
      }

      const result = data.result;

      // Extract SOL balance
      const solBalance =
        result.nativeBalance?.lamports !== undefined
          ? result.nativeBalance.lamports / 1e9
          : 0;

      // Fetch SOL price for USD conversion
      const solPrice = await fetchSolPrice();
      const solBalanceUsd = solBalance * solPrice;

      // Extract SPL token balances
      const balancesMap: Record<string, TokenBalance> = {};

      if (result.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          const tokenInfo = item.token_info;
          if (!tokenInfo || !tokenInfo.balance) continue;

          const mint = item.id;
          const rawBalance = tokenInfo.balance;
          const decimals = tokenInfo.decimals || 0;
          const amount = rawBalance / Math.pow(10, decimals);

          if (amount === 0) continue;

          const existing = balancesMap[mint];
          const totalAmount = (existing?.amount || 0) + amount;

          balancesMap[mint] = {
            mint,
            amount: totalAmount,
            decimals,
            symbol: item.content?.metadata?.symbol,
            name: item.content?.metadata?.name,
          };
        }
      }

      let tokenBalances = Object.values(balancesMap);

      // Fetch token prices from Jupiter and compute USD values
      try {
        if (tokenBalances.length > 0) {
          const ids = tokenBalances.map((t) => t.mint).join(",");
          const priceResponse = await fetch(
            `https://price.jup.ag/v4/price?ids=${encodeURIComponent(ids)}`
          );
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            const priceMap: Record<string, { price: number | undefined }> =
              priceData.data || {};

            tokenBalances = tokenBalances.map((token) => {
              const entry = priceMap[token.mint];
              const priceUsd = entry?.price ?? 0;
              const valueUsd = priceUsd * token.amount;
              return {
                ...token,
                priceUsd,
                valueUsd,
              };
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch token prices from Jupiter:", err);
      }

      // Calculate total USD value (SOL + tokens with known prices)
      const tokensTotalUsd = tokenBalances.reduce(
        (sum, t) => sum + (t.valueUsd ?? 0),
        0
      );
      const totalValueUsd = solBalanceUsd + tokensTotalUsd;

      setPortfolio({
        solBalance,
        solBalanceUsd,
        tokenBalances,
        totalValueUsd,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      });

      console.log("✅ Portfolio updated:", {
        solBalance,
        solBalanceUsd,
        tokenCount: tokenBalances.length,
        totalValueUsd,
        address: walletAddress,
      });
    } catch (error) {
      console.error("❌ Error fetching portfolio:", error);
      setPortfolio((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
      }));
    }
  }, [walletAddress, fetchSolPrice]);

  // Auto-fetch when wallet address changes
  React.useEffect(() => {
    if (walletAddress) {
      fetchPortfolio();
    }
  }, [walletAddress, fetchPortfolio]);

  // Helper to get token balance by mint
  const getTokenBalance = React.useCallback(
    (mint: string): TokenBalance | null => {
      return (
        portfolio.tokenBalances.find(
          (token) => token.mint.toLowerCase() === mint.toLowerCase()
        ) || null
      );
    },
    [portfolio.tokenBalances]
  );

  const value = React.useMemo(
    () => ({
      ...portfolio,
      refreshPortfolio: fetchPortfolio,
      getTokenBalance,
    }),
    [portfolio, fetchPortfolio, getTokenBalance]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextType {
  const context = React.useContext(PortfolioContext);
  if (context == null) {
    throw new Error(
      "usePortfolio must be used within a PortfolioProvider. Make sure to wrap your app with <PortfolioProvider>."
    );
  }
  return context;
}
