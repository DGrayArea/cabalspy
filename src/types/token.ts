export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  image?: string;
  time: string;
  marketCap: number;
  volume: number;
  fee: number;
  transactions: number;
  percentages: number[];
  price: number;
  activity: {
    Q: number;
    views: number;
    holders: number;
    trades: number;
  };
  // Multi-chain support
  chain?: "solana" | "bsc" | "ethereum" | "base";
  source?: string; // e.g., "pumpapi", "forr.meme"
  // DexScreener enriched data
  dexscreener?: {
    logo?: string;
    priceUsd?: number;
    priceNative?: number;
    priceChange24h?: number;
    priceChange1h?: number;
    priceChange5m?: number;
    volume24h?: number;
    liquidity?: number;
    fdv?: number;
    socials?: Array<{ type: string; url: string }>;
    websites?: Array<{ label: string; url: string }>;
    dexUrl?: string;
    isPaid?: boolean;
  };
}

export interface TokenRowProps {
  token: TokenData;
}
