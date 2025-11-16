"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface User {
  id: string;
  name: string;
  email?: string;
  telegramId?: string;
  googleId?: string;
  avatar?: string;
  walletAddress?: string;
  wallets?: {
    solana?: {
      walletId: string;
      network: string;
    };
    ethereum?: {
      walletId: string;
      network: string;
    };
    bnb?: {
      walletId: string;
      network: string;
    };
    base?: {
      walletId: string;
      network: string;
    };
  };
  createdAt: Date;
}

export interface TurnkeyUser {
  userId: string;
  userName: string;
  userEmail?: string;
  authenticators?: any[];
  apiKeys?: any[];
  userTags?: any[];
  oauthProviders?: any[];
  createdAt?: { seconds: string; nanos: string };
  updatedAt?: { seconds: string; nanos: string };
}

export interface TurnkeySession {
  sessionType?: string;
  userId?: string;
  organizationId?: string;
  expiry?: number;
  expirationSeconds?: string;
  publicKey?: string;
  token?: string;
}

interface GoogleAuthData {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  photo_url?: string;
}

type AuthData = GoogleAuthData | TelegramAuthData;

interface AuthContextType {
  user: User | null;
  turnkeyUser: TurnkeyUser | null;
  turnkeySession: TurnkeySession | null;
  isLoading: boolean;
  login: (provider: "google" | "telegram", data: AuthData) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => void;
  setTurnkeyUser: (user: TurnkeyUser | null) => void;
  setTurnkeySession: (session: TurnkeySession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [turnkeyUser, setTurnkeyUser] = useState<TurnkeyUser | null>(null);
  const [turnkeySession, setTurnkeySession] = useState<TurnkeySession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (token) {
          // In a real app, you'd verify the token with your backend
          const userData = localStorage.getItem("user_data");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            // Load wallet IDs if they exist (keys are securely stored by Turnkey)
            const walletIds = localStorage.getItem(
              `wallet_ids_${parsedUser.id}`
            );
            if (walletIds) {
              const ids = JSON.parse(walletIds);
              parsedUser.wallets = {
                solana: ids.solana
                  ? { walletId: ids.solana, network: "solana" }
                  : undefined,
                ethereum: ids.ethereum
                  ? { walletId: ids.ethereum, network: "ethereum" }
                  : undefined,
                bnb: ids.bnb
                  ? { walletId: ids.bnb, network: "bnb" }
                  : undefined,
                base: ids.base
                  ? { walletId: ids.base, network: "base" }
                  : undefined,
              };
            }
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (provider: "google" | "telegram", data: AuthData) => {
    try {
      setIsLoading(true);

      let userData: User;

      if (provider === "google") {
        const googleData = data as GoogleAuthData;
        userData = {
          id: googleData.id,
          name: googleData.name,
          email: googleData.email,
          googleId: googleData.id,
          avatar: googleData.picture,
          createdAt: new Date(),
        };
      } else {
        const telegramData = data as TelegramAuthData;
        userData = {
          id: telegramData.id.toString(),
          name: `${telegramData.first_name} ${telegramData.last_name || ""}`.trim(),
          telegramId: telegramData.id.toString(),
          avatar: telegramData.photo_url,
          createdAt: new Date(),
        };
      }

      // Get or create wallets for this user
      // Backend will create new wallets on signup, or return existing on login
      const existingWalletIdsStr = localStorage.getItem(
        `wallet_ids_${userData.id}`
      );
      const existingWalletIds = existingWalletIdsStr
        ? JSON.parse(existingWalletIdsStr)
        : null;

      // Always call backend - it will create new wallets or return existing ones
      try {
        const response = await fetch("/api/turnkey/create-wallets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userData.id,
            userName: userData.name,
            userEmail: userData.email,
            // Send existing wallet IDs if we have them (for verification)
            existingWalletIds: existingWalletIds || undefined,
          }),
        });

        if (response.ok) {
          const walletData = await response.json();
          // Only store wallet IDs (safe to store - keys are with Turnkey)
          const walletIds = {
            solana: walletData.wallets.solana?.walletId,
            ethereum: walletData.wallets.ethereum?.walletId,
            bnb: walletData.wallets.bnb?.walletId,
            base: walletData.wallets.base?.walletId,
          };
          userData.wallets = walletData.wallets;
          // Store only wallet IDs in localStorage (not keys)
          localStorage.setItem(
            `wallet_ids_${userData.id}`,
            JSON.stringify(walletIds)
          );

          // Log wallet creation status
          const createdWallets = [];
          if (walletIds.solana) createdWallets.push("Solana");
          if (walletIds.ethereum) createdWallets.push("Ethereum");
          if (walletIds.bnb) createdWallets.push("BNB");
          if (walletIds.base) createdWallets.push("Base");

          if (walletData.warnings && walletData.warnings.length > 0) {
            console.warn(
              `⚠️ Partial wallet creation: ${createdWallets.join(" and ")} created`,
              `Errors: ${walletData.warnings.join(", ")}`
            );
          } else {
            console.log(
              walletData.isNewUser
                ? `✅ New user - Turnkey wallets created (${createdWallets.join(", ")})`
                : `✅ Existing user - Turnkey wallets retrieved (${createdWallets.join(", ")})`,
              "- Keys stored securely by Turnkey"
            );
          }
        } else {
          console.error("Failed to get/create wallets:", await response.text());
          // Continue with login even if wallet creation fails
        }
      } catch (error) {
        console.error("Error getting/creating Turnkey wallets:", error);
        // Continue with login even if wallet creation fails
      }

      // Store user data (in production, verify with backend/Turnkey first)
      // Generate a session token for local storage
      const sessionToken = crypto.randomUUID();
      localStorage.setItem("auth_token", sessionToken);
      localStorage.setItem("user_data", JSON.stringify(userData));

      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    // Note: We keep wallet_ids for convenience, but keys are with Turnkey
    // If you want to clear wallet IDs on logout, uncomment:
    // if (user?.id) {
    //   localStorage.removeItem(`wallet_ids_${user.id}`);
    // }
    setUser(null);
    setTurnkeyUser(null);
    setTurnkeySession(null);
  };

  const connectWallet = (address: string) => {
    if (user) {
      const updatedUser = { ...user, walletAddress: address };
      setUser(updatedUser);
      localStorage.setItem("user_data", JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    turnkeyUser,
    turnkeySession,
    isLoading,
    login,
    logout,
    connectWallet,
    setTurnkeyUser,
    setTurnkeySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
