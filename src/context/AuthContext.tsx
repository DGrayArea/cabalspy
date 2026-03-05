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
  discordId?: string;
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

interface DiscordAuthData {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
}

type AuthData = GoogleAuthData | TelegramAuthData | DiscordAuthData;

interface AuthContextType {
  user: User | null;
  turnkeyUser: TurnkeyUser | null;
  turnkeySession: TurnkeySession | null;
  isLoading: boolean;
  login: (provider: "google" | "telegram" | "discord", data: AuthData) => Promise<void>;
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
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              telegramId: data.user.telegramId,
              discordId: data.user.discordId,
              googleId: data.user.googleId,
              avatar: data.user.avatar,
              walletAddress: data.wallet?.address,
              createdAt: new Date(),
            });
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

  const login = async (provider: "google" | "telegram" | "discord", data: AuthData) => {
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

      } else if (provider === "discord") {
        const discordData = data as DiscordAuthData;
        userData = {
          id: discordData.id,
          name: discordData.username,
          discordId: discordData.id,
          avatar: discordData.avatar || undefined,
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

      // Instead of caching and creating wallets here, we fetch the updated session
      // Since the auth callback routes (Google, Discord, Telegram) handle DB user creation
      // and Turnkey wallet syncing, calling checking the session again guarantees we have the
      // most up-to-date user + wallet config.
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            userData = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              telegramId: data.user.telegramId,
              discordId: data.user.discordId,
              googleId: data.user.googleId,
              avatar: data.user.avatar,
              walletAddress: data.wallet?.address,
              createdAt: new Date(),
            };
          }
        }
      } catch (error) {
        console.error("Error confirming session after login:", error);
      }

      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch (error) {
      console.error("Error logging out:", error);
    }
    setUser(null);
    setTurnkeyUser(null);
    setTurnkeySession(null);
  };

  const connectWallet = (address: string) => {
    if (user) {
      setUser({ ...user, walletAddress: address });
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
