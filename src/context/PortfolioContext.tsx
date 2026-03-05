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
  logoUrl?: string;
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
  const { address: walletAddress } = useTurnkeySolana();
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

  // const walletAddress = "7gGTyuUDnAVSPFCxybjUHkvMC8QYWASivEFDrHNBcJod";

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
        result?.nativeBalance?.lamports !== undefined
          ? result.nativeBalance.lamports / 1e9
          : 0;

      // Fetch SOL price for USD conversion
      const solPrice = await fetchSolPrice();
      const solBalanceUsd = solBalance * solPrice;

      // Extract SPL token balances
      const balancesMap: Record<string, TokenBalance> = {};

      if (result.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          const tokenInfo = item?.token_info;
          if (!tokenInfo || !tokenInfo.balance) continue;

          const mint = item?.id;
          if (!mint) continue;

          const rawBalance = tokenInfo.balance;
          const decimals = tokenInfo.decimals ?? 0;
          const amount = rawBalance / Math.pow(10, decimals);

          if (amount === 0) continue;

          // Get symbol from token_info first, then fallback to metadata
          const symbol = tokenInfo.symbol || item?.content?.metadata?.symbol;
          // Get name from metadata
          const name = item?.content?.metadata?.name;

          // Get logo URL (prefer cdn_uri, then uri, then links.image)
          const logoUrl =
            item?.content?.files?.[0]?.cdn_uri ||
            item?.content?.files?.[0]?.uri ||
            item?.content?.links?.image ||
            undefined;

          // Get price from Helius price_info if available
          const heliusPricePerToken = tokenInfo.price_info?.price_per_token;
          const heliusTotalPrice = tokenInfo.price_info?.total_price;

          const existing = balancesMap[mint];
          const totalAmount = (existing?.amount || 0) + amount;

          // If we have Helius price info, use it; otherwise we'll fetch from Jupiter later
          const priceUsd =
            heliusPricePerToken ?? existing?.priceUsd ?? undefined;
          const valueUsd =
            heliusTotalPrice ??
            (priceUsd
              ? priceUsd * totalAmount
              : (existing?.valueUsd ?? undefined));

          balancesMap[mint] = {
            mint,
            amount: totalAmount,
            decimals,
            symbol,
            name,
            priceUsd,
            valueUsd,
            logoUrl: logoUrl || existing?.logoUrl,
          };
        }
      }

      let tokenBalances = Object.values(balancesMap);

      // Step 1: Fetch token info (prices, logos) from Jupiter Tokens API V2
      // Only for tokens that don't have Helius price_info
      const tokensNeedingInfo = tokenBalances.filter(
        (t) => t.priceUsd === undefined || !t.logoUrl
      );

      if (tokensNeedingInfo.length > 0) {
        const jupiterApiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY;

        if (jupiterApiKey) {
          try {
            // Rate limiting: wait 1 second before making the request
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Batch tokens in groups of 100 (Jupiter's limit)
            const batchSize = 100;
            const batches: string[][] = [];
            for (let i = 0; i < tokensNeedingInfo.length; i += batchSize) {
              batches.push(
                tokensNeedingInfo.slice(i, i + batchSize).map((t) => t.mint)
              );
            }

            // Fetch all batches
            const tokenInfoMap: Record<
              string,
              { usdPrice?: number; icon?: string }
            > = {};

            for (const batch of batches) {
              try {
                const query = batch.join(",");
                const searchResponse = await fetch(
                  `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
                  {
                    headers: {
                      "x-api-key": jupiterApiKey,
                    },
                  }
                );

                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  if (Array.isArray(searchData)) {
                    for (const tokenInfo of searchData) {
                      if (tokenInfo.id) {
                        tokenInfoMap[tokenInfo.id] = {
                          usdPrice: tokenInfo.usdPrice,
                          icon: tokenInfo.icon,
                        };
                      }
                    }
                  }
                }
              } catch (batchErr) {
                console.warn(
                  "Failed to fetch token info from Jupiter for batch:",
                  batchErr
                );
              }
            }

            // Update token balances with Jupiter data
            tokenBalances = tokenBalances.map((token) => {
              const jupiterInfo = tokenInfoMap[token.mint];

              // Prefer Helius price if available, otherwise use Jupiter
              const priceUsd =
                token.priceUsd ?? jupiterInfo?.usdPrice ?? undefined;

              // Prefer Helius logo if available, otherwise use Jupiter
              const logoUrl = token.logoUrl ?? jupiterInfo?.icon ?? undefined;

              const valueUsd = priceUsd ? priceUsd * token.amount : undefined;

              return {
                ...token,
                priceUsd,
                valueUsd,
                logoUrl,
              };
            });
          } catch (err) {
            console.warn("Failed to fetch token info from Jupiter:", err);
            // Fallback to old Jupiter price API if Tokens API fails
            try {
              const tokensNeedingPrice = tokenBalances.filter(
                (t) => t.priceUsd === undefined
              );
              if (tokensNeedingPrice.length > 0) {
                const ids = tokensNeedingPrice.map((t) => t.mint).join(",");
                const priceResponse = await fetch(
                  `https://price.jup.ag/v4/price?ids=${encodeURIComponent(ids)}`
                );
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json();
                  const priceMap: Record<
                    string,
                    { price: number | undefined }
                  > = priceData.data || {};

                  tokenBalances = tokenBalances.map((token) => {
                    if (token.priceUsd !== undefined) {
                      return token;
                    }
                    const entry = priceMap[token.mint];
                    const priceUsd = entry?.price ?? undefined;
                    const valueUsd = priceUsd
                      ? priceUsd * token.amount
                      : undefined;
                    return {
                      ...token,
                      priceUsd,
                      valueUsd,
                    };
                  });
                }
              }
            } catch (fallbackErr) {
              console.warn(
                "Failed to fetch token prices from Jupiter fallback:",
                fallbackErr
              );
            }
          }
        } else {
          // No API key, try fallback to old Jupiter price API
          try {
            const tokensNeedingPrice = tokenBalances.filter(
              (t) => t.priceUsd === undefined
            );
            if (tokensNeedingPrice.length > 0) {
              const ids = tokensNeedingPrice.map((t) => t.mint).join(",");
              const priceResponse = await fetch(
                `https://price.jup.ag/v4/price?ids=${encodeURIComponent(ids)}`
              );
              if (priceResponse.ok) {
                const priceData = await priceResponse.json();
                const priceMap: Record<string, { price: number | undefined }> =
                  priceData.data || {};

                tokenBalances = tokenBalances.map((token) => {
                  if (token.priceUsd !== undefined) {
                    return token;
                  }
                  const entry = priceMap[token.mint];
                  const priceUsd = entry?.price ?? undefined;
                  const valueUsd = priceUsd
                    ? priceUsd * token.amount
                    : undefined;
                  return {
                    ...token,
                    priceUsd,
                    valueUsd,
                  };
                });
              }
            }
          } catch (fallbackErr) {
            console.warn(
              "Failed to fetch token prices from Jupiter fallback:",
              fallbackErr
            );
          }
        }
      }

      // Step 2: Fetch additional data from DexScreener for tokens without prices
      // DexScreener provides liquidity, volume, and more accurate prices for DEX-listed tokens
      const tokensNeedingDexScreener = tokenBalances.filter(
        (t) => t.priceUsd === undefined || t.priceUsd === 0
      );

      if (tokensNeedingDexScreener.length > 0) {
        try {
          // Batch fetch from DexScreener (limit 30 tokens per request)
          const batchSize = 30;
          for (let i = 0; i < tokensNeedingDexScreener.length; i += batchSize) {
            const batch = tokensNeedingDexScreener.slice(i, i + batchSize);
            const addresses = batch.map((t) => t.mint).join(",");
            
            try {
              const dexResponse = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${addresses}`
              );
              
              if (dexResponse.ok) {
                const dexData = await dexResponse.json();
                const pairs = dexData.pairs || [];
                
                // Create a map of token address to best pair (highest liquidity)
                const tokenToBestPair: Record<string, any> = {};
                for (const pair of pairs) {
                  const baseToken = pair.baseToken?.address?.toLowerCase();
                  if (baseToken) {
                    const existing = tokenToBestPair[baseToken];
                    const currentLiquidity = pair.liquidity?.usd || 0;
                    const existingLiquidity = existing?.liquidity?.usd || 0;
                    
                    if (!existing || currentLiquidity > existingLiquidity) {
                      tokenToBestPair[baseToken] = pair;
                    }
                  }
                }
                
                // Update token balances with DexScreener data
                tokenBalances = tokenBalances.map((token) => {
                  const pair = tokenToBestPair[token.mint.toLowerCase()];
                  if (pair && pair.priceUsd) {
                    const priceUsd = parseFloat(pair.priceUsd);
                    const valueUsd = priceUsd * token.amount;
                    
                    return {
                      ...token,
                      priceUsd: token.priceUsd || priceUsd, // Prefer existing price
                      valueUsd: token.valueUsd || valueUsd,
                    };
                  }
                  return token;
                });
              }
              
              // Rate limit: wait 1 second between batches
              if (i + batchSize < tokensNeedingDexScreener.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (batchErr) {
              console.warn("Failed to fetch from DexScreener for batch:", batchErr);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch token data from DexScreener:", err);
        }
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

      // console.log("✅ Portfolio updated:", result);
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
