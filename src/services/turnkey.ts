import { TurnkeyClient } from '@turnkey/http';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { logger } from '@/lib/logger';

export interface TurnkeyConfig {
  baseUrl: string;
  apiKey: string;
  apiPrivateKey: string;
}

export class TurnkeyService {
  private client: TurnkeyClient;

  constructor(config: TurnkeyConfig) {
    // Initialize the API key stamper
    const stamper = new ApiKeyStamper({
      apiPrivateKey: config.apiPrivateKey,
      apiPublicKey: config.apiKey,
    });

    // Initialize the Turnkey client
    this.client = new TurnkeyClient(
      {
        baseUrl: config.baseUrl,
      },
      stamper
    );

    // Note: We don't initialize the browser SDK here since this service is used
    // from client components and we only require the typed HTTP client for now.
  }

  /**
   * Create a new wallet for a user
   * Defaults to Solana for Pump.fun compatibility
   */
  async createWallet(userId: string, walletName: string, chain: 'solana' | 'ethereum' = 'solana'): Promise<string> {
    try {
      const accounts = chain === 'solana'
        ? [
            {
              curve: 'CURVE_ED25519',
              pathFormat: 'PATH_FORMAT_SLIP10',
              path: "m/44'/501'/0'/0'",
              addressFormat: 'ADDRESS_FORMAT_SOLANA',
            },
          ]
        : [
            {
              curve: 'CURVE_SECP256K1',
              pathFormat: 'PATH_FORMAT_BIP32',
              path: "m/44'/60'/0'/0/0",
              addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
            },
          ];

      const response = await this.client.createWallet({
        walletName: walletName || `Wallet for ${userId}`,
        accounts,
      } as never);

      // Response structure may vary, handle different response formats
      const walletId = (response as { wallet?: { walletId?: string } }).wallet?.walletId 
        || (response as { walletId?: string }).walletId
        || (response as { activity?: { result?: { wallet?: { walletId?: string } } } }).activity?.result?.wallet?.walletId;

      if (walletId) {
        return walletId;
      }
      
      throw new Error('Failed to create wallet: No wallet returned from Turnkey');
    } catch (error) {
      logger.error('Error creating wallet', error, { userId, walletName, chain });
      throw error;
    }
  }

  /**
   * Get wallet information
   */
  async getWallet(walletId: string) {
    try {
      const response = await this.client.getWallet({
        path: {
          walletId,
        },
      });

      return response.wallet;
    } catch (error) {
      logger.error('Error getting wallet', error, { walletId });
      throw error;
    }
  }

  /**
   * Get wallet addresses
   */
  async getWalletAddresses(walletId: string) {
    try {
      const response = await this.client.getWalletAccounts({
        path: {
          walletId,
        },
      });

      return response.accounts;
    } catch (error) {
      logger.error('Error getting wallet addresses', error, { walletId });
      throw error;
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(walletId: string, accountId: string, unsignedTransaction: string) {
    try {
      const response = await this.client.signTransaction({
        body: {
          type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
          organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORG_ID || '',
          parameters: {
            type: 'SIGN_TRANSACTION_V2',
            unsignedTransaction,
          },
        },
      });

      return response.activity;
    } catch (error) {
      logger.error('Error signing transaction', error, { walletId, accountId });
      throw error;
    }
  }

  /**
   * Get wallet balance - fetches real balance from blockchain RPC
   */
  async getWalletBalance(address: string, network: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' = 'solana') {
    try {
      // For Solana (default for Pump.fun)
      if (network === 'solana') {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address]
          })
        });
        
        const data = await response.json();
        const lamports = data.result?.value || 0;
        const sol = lamports / 1e9;
        
        return {
          address,
          balance: sol.toFixed(4),
          network: 'solana',
          currency: 'SOL'
        };
      }
      
      // For Ethereum networks (EVM)
      const rpcUrl = network === 'polygon' 
        ? (process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com')
        : network === 'arbitrum'
        ? (process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc')
        : (process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com');
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      });
      
      const data = await response.json();
      const wei = BigInt(data.result || '0');
      const eth = Number(wei) / 1e18;
      
      return {
        address,
        balance: eth.toFixed(4),
        network,
        currency: network === 'polygon' ? 'MATIC' : network === 'arbitrum' ? 'ETH' : 'ETH'
      };
    } catch (error) {
      logger.error('Error getting wallet balance', error, { address, network });
      throw error;
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(
    walletId: string,
    accountId: string,
    to: string,
    value: string,
    data?: string
  ) {
    try {
      // This would construct and sign the transaction
      const transaction = {
        to,
        value,
        data: data || '0x',
        gasLimit: '21000',
        gasPrice: '20000000000', // 20 gwei
      };

      const signedTx = await this.signTransaction(
        walletId,
        accountId,
        JSON.stringify(transaction)
      );

      return signedTx;
    } catch (error) {
      logger.error('Error sending transaction', error, { walletId, accountId, to, value });
      throw error;
    }
  }
}

// Export a singleton instance
// Note: apiKey (public key) is optional if using private key authentication
export const turnkeyService = new TurnkeyService({
  baseUrl: process.env.NEXT_PUBLIC_TURNKEY_BASE_URL || 'https://api.turnkey.com',
  apiKey: process.env.NEXT_PUBLIC_TURNKEY_API_KEY || '',
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY || '',
});
