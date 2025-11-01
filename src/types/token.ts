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
}

export interface TokenRowProps {
  token: TokenData;
}

