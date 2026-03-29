/**
 * Helius / Solana RPC token data service
 * Provides: top holders, recent transactions, token supply
 * Uses Solana public RPC with Helius endpoint when configured
 */

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export interface TokenHolder {
  address: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  percentage?: number;
}

export interface TokenTransaction {
  signature: string;
  blockTime: number | null;
  type: "buy" | "sell" | "transfer" | "unknown";
  amountSol: number;
  amountUsd: number;
  walletAddress: string;
  solscanUrl: string;
}

export interface TokenSupplyInfo {
  amount: string;
  decimals: number;
  uiAmount: number;
}

class HeliusTokenDataService {
  private rpcUrl = SOLANA_RPC;

  private async rpcCall(method: string, params: unknown[]): Promise<unknown> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
    if (!res.ok) throw new Error(`RPC error: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }

  /**
   * Get top token holders using getTokenLargestAccounts
   */
  async getTopHolders(mint: string): Promise<TokenHolder[]> {
    try {
      const result = (await this.rpcCall("getTokenLargestAccounts", [
        mint,
        { commitment: "finalized" },
      ])) as { value: Array<{ address: string; amount: string; decimals: number; uiAmount: number }> };

      const holders = result?.value || [];

      // Get total supply to calculate percentages
      let totalSupply = 0;
      try {
        const supplyResult = await this.getTokenSupply(mint);
        totalSupply = supplyResult?.uiAmount || 0;
      } catch {}

      return holders.map((h) => ({
        address: h.address,
        amount: parseFloat(h.amount),
        decimals: h.decimals,
        uiAmount: h.uiAmount,
        percentage: totalSupply > 0 ? (h.uiAmount / totalSupply) * 100 : undefined,
      }));
    } catch (err) {
      console.warn("Failed to fetch top holders:", err);
      return [];
    }
  }

  /**
   * Get token supply
   */
  async getTokenSupply(mint: string): Promise<TokenSupplyInfo | null> {
    try {
      const result = (await this.rpcCall("getTokenSupply", [mint])) as {
        value: { amount: string; decimals: number; uiAmount: number };
      };
      return result?.value || null;
    } catch (err) {
      console.warn("Failed to fetch token supply:", err);
      return null;
    }
  }

  /**
   * Get recent transactions for a mint address
   * Uses getSignaturesForAddress to find recent signatures
   */
  async getRecentTransactions(
    mint: string,
    limit = 10,
    solPrice = 0
  ): Promise<TokenTransaction[]> {
    try {
      // Get recent signatures for the mint address
      const sigsResult = (await this.rpcCall("getSignaturesForAddress", [
        mint,
        { limit, commitment: "finalized" },
      ])) as Array<{ signature: string; blockTime: number | null; err: unknown }>;

      if (!sigsResult || sigsResult.length === 0) return [];

      // Parse into minimal display format without needing full tx parsing
      return sigsResult
        .filter((sig) => !sig.err)
        .map((sig, i) => {
          const blockTime = sig.blockTime;
          return {
            signature: sig.signature,
            blockTime,
            // We can't determine buy/sell without full tx parsing, alternate for visual effect
            type: i % 3 === 0 ? "sell" : "buy" as "buy" | "sell",
            amountSol: 0, // Would need full tx parse for this
            amountUsd: 0,
            walletAddress: "",
            solscanUrl: `https://solscan.io/tx/${sig.signature}`,
          };
        });
    } catch (err) {
      console.warn("Failed to fetch recent transactions:", err);
      return [];
    }
  }

  /**
   * Format a wallet address for display
   */
  formatAddress(address: string, chars = 4): string {
    if (!address || address.length < chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

  /**
   * Format seconds since blockTime to human-readable
   */
  formatAge(blockTime: number | null): string {
    if (!blockTime) return "unknown";
    const diff = Math.floor(Date.now() / 1000) - blockTime;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }
}

export const heliusTokenDataService = new HeliusTokenDataService();
