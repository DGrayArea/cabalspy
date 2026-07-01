/**
 * Helius / Solana RPC token data service
 * Provides: top holders, token supply
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
   * Uses the dedicated Helius endpoint which supports filtering
   */
  async getTopHolders(mint: string): Promise<TokenHolder[]> {
    // SOL itself is not a token — skip
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    if (mint === SOL_MINT || mint.toLowerCase() === "sol") return [];

    try {
      // getTokenLargestAccounts returns up to 20 largest holders — safe and fast
      const result = (await this.rpcCall("getTokenLargestAccounts", [
        mint,
        { commitment: "confirmed" },
      ])) as { value: Array<{ address: string; amount: string; decimals: number; uiAmount: number }> };

      const holders = result?.value || [];
      if (holders.length === 0) return [];

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
   * Format a wallet address for display
   */
  formatAddress(address: string, chars = 4): string {
    if (!address || address.length < chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  }

}

export const heliusTokenDataService = new HeliusTokenDataService();
