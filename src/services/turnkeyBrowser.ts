'use client';

import { init } from '@turnkey/sdk-browser';

export interface TurnkeyBrowserConfig {
  apiBaseUrl?: string;
  defaultOrganizationId?: string;
  rpId?: string;
  iframeUrl?: string;
}

/**
 * Turnkey Browser SDK service for client-side authentication
 * Handles passkey/WebAuthn authentication through Turnkey's browser SDK
 */
export class TurnkeyBrowserService {
  private initialized = false;
  private config: TurnkeyBrowserConfig;

  constructor(config?: TurnkeyBrowserConfig) {
    this.config = {
      apiBaseUrl: config?.apiBaseUrl || process.env.NEXT_PUBLIC_TURNKEY_BASE_URL || 'https://api.turnkey.com',
      defaultOrganizationId: config?.defaultOrganizationId || process.env.NEXT_PUBLIC_TURNKEY_ORG_ID,
      rpId: config?.rpId || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
      iframeUrl: config?.iframeUrl || 'https://auth.turnkey.com',
      ...config
    };
  }

  /**
   * Initialize the Turnkey browser SDK
   * Must be called before using authentication methods
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await init({
        apiBaseUrl: this.config.apiBaseUrl!,
        defaultOrganizationId: this.config.defaultOrganizationId!,
        rpId: this.config.rpId!,
        iframeUrl: this.config.iframeUrl!
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Turnkey browser SDK:', error);
      throw error;
    }
  }

  /**
   * Authenticate with Turnkey using passkey/WebAuthn
   * This requires the SDK to be initialized first
   */
  async authenticate(): Promise<{ userId: string; organizationId: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Note: Actual authentication flow would use Turnkey's auth methods
    // This is a placeholder that needs to be implemented with real Turnkey SDK calls
    // Based on Turnkey docs, you'd use methods like:
    // - authIframeClient.loginWithEmail()
    // - authIframeClient.loginWithPasskey()
    // - authIframeClient.loginWithOAuth()

    throw new Error('Turnkey authentication not fully implemented. Please use Turnkey SDK auth methods directly in components.');
  }

  /**
   * Check if Turnkey SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance (client-side only)
export const turnkeyBrowserService = typeof window !== 'undefined' 
  ? new TurnkeyBrowserService()
  : null;

