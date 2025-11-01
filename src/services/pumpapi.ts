'use client';

import axios, { AxiosInstance } from 'axios';

export interface PumpApiConfig {
  baseUrl: string;
}

export interface QuoteRequest {
  mint: string; // token mint/address
  side: 'buy' | 'sell';
  amount: string; // amount in SOL for buy, in tokens for sell
  slippageBps?: number; // basis points
  walletAddress: string;
}

export interface QuoteResponse {
  expectedOut: string;
  priceImpactPct?: number;
  route?: any;
  tx?: any; // optional prebuilt tx if API provides it
}

export interface TradeRequest extends QuoteRequest {
  // If API performs custody/submit, this is enough
  // If API returns a tx to sign, we will sign client-side with Turnkey and submit back
  signature?: string;
}

export interface TradeResponse {
  txId?: string;
  status: 'submitted' | 'confirmed' | 'failed';
  message?: string;
}

class PumpApiService {
  private http: AxiosInstance;
  private tradingFeePct = 0.25; // per docs

  constructor(config?: PumpApiConfig) {
    // Public API – no key required per docs
    const baseURL = config?.baseUrl || process.env.NEXT_PUBLIC_PUMPAPI_BASE_URL || 'https://pumpapi.io';
    this.http = axios.create({ baseURL });
  }

  getTradingFeePct(): number {
    return this.tradingFeePct;
  }

  async getQuote(payload: QuoteRequest): Promise<QuoteResponse> {
    // Endpoint naming may vary; keep configurable
    const { data } = await this.http.post('/v1/quote', payload);
    return data as QuoteResponse;
  }

  async buyToken(payload: TradeRequest): Promise<TradeResponse> {
    const { data } = await this.http.post('/v1/trade/buy', payload);
    return data as TradeResponse;
  }

  async sellToken(payload: TradeRequest): Promise<TradeResponse> {
    const { data } = await this.http.post('/v1/trade/sell', payload);
    return data as TradeResponse;
  }
}

export const pumpApiService = new PumpApiService();


