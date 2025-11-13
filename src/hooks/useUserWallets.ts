import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useEffect, useState, useCallback } from "react";

/**
 * Hook to access user's Turnkey wallets
 * Works with wallets created via custom auth (Telegram/Google)
 */
export function useUserWallets() {
  const { user, wallets: userWallets } = useTurnkey();
  const { user: authUser } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get wallet IDs from auth user (created via custom auth)
  // Note: Only wallet IDs are stored - keys are securely stored by Turnkey
  const getWalletIds = useCallback(() => {
    if (!authUser?.wallets) {
      // Try to load wallet IDs from localStorage (keys are with Turnkey)
      const stored = localStorage.getItem(`wallet_ids_${authUser?.id}`);
      if (stored) {
        const ids = JSON.parse(stored);
        return {
          solana: { walletId: ids.solana, network: "solana" },
          bsc: { walletId: ids.bsc, network: "bsc" },
        };
      }
      return null;
    }
    return authUser.wallets;
  }, [authUser]);

  useEffect(() => {
    const loadWallets = async () => {
      setIsLoading(true);
      try {
        // If user is authenticated with Turnkey, use their wallets
        if (user && userWallets && userWallets.length > 0) {
          setWallets(userWallets);
          setIsLoading(false);
          return;
        }

        // Otherwise, try to find wallets by ID from custom auth
        const walletIds = getWalletIds();
        if (walletIds) {
          // Note: To access wallets by ID, you'd need to use Turnkey's API
          // For now, we'll just store the IDs
          // In production, you'd fetch wallet details from Turnkey API
          setWallets(
            [
              {
                walletId: walletIds.solana?.walletId,
                walletName: "Solana Wallet",
                network: "solana",
                ...walletIds.solana,
              },
              {
                walletId: walletIds.bsc?.walletId,
                walletName: "BSC Wallet",
                network: "bsc",
                ...walletIds.bsc,
              },
            ].filter((w) => w.walletId)
          );
        }
      } catch (error) {
        console.error("Error loading wallets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (authUser) {
      loadWallets();
    } else {
      setIsLoading(false);
    }
  }, [authUser, user, userWallets, getWalletIds]);

  return {
    wallets,
    isLoading,
    hasWallets: wallets.length > 0,
  };
}
