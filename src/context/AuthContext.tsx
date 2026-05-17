"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";

export interface User {
  id: string;
  name: string;
  email?: string;
  telegramId?: string;
  discordId?: string;
  googleId?: string;
  avatar?: string;
  accessLevel?: string;
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
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  login: (provider: "google" | "telegram" | "discord", data: AuthData) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => void;
  setTurnkeyUser: (user: TurnkeyUser | null) => void;
  setTurnkeySession: (session: TurnkeySession | null) => void;
  refreshSession: () => Promise<void>;
  handleAuthCallback: (code: string, state: string) => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  // Prevents infinite retry loop if the sync endpoint returns a server error
  const syncFailedRef = useRef(false);
  const { user: tkUser, authState } = useTurnkey();

  // Sync with Turnkey's internal state
  useEffect(() => {
    // console.log("🔑 Turnkey State Check:", { authState, hasTkUser: !!tkUser });
    if (tkUser && authState === "authenticated") {
      setTurnkeyUser(tkUser as any);
    } else {
      setTurnkeyUser(null);
    }
  }, [tkUser, authState]);

  const checkSession = useCallback(async () => {
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
            accessLevel: data.user.accessLevel,
            walletAddress: data.wallet?.address,
            createdAt: new Date(),
          });
          // Keep lastActive current so in-app idle timer stays accurate
          localStorage.setItem("lastActive", Date.now().toString());
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Sync Turnkey with Backend
  const syncBackendSession = useCallback(async (tkUser: any) => {
    if (isSyncing || syncFailedRef.current) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tkUserId: tkUser.userId,
          email: tkUser.userEmail,
          name: tkUser.userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          syncFailedRef.current = false;
          setUser({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            telegramId: data.user.telegramId,
            discordId: data.user.discordId,
            googleId: data.user.googleId,
            avatar: data.user.avatar,
            accessLevel: data.user.accessLevel,
            createdAt: new Date(),
          });
        }
      } else {
        // Server error — stop retrying to avoid an infinite loop
        syncFailedRef.current = true;
        console.error("[auth/sync] Server error:", response.status, await response.text().catch(() => ""));
      }
    } catch (error) {
      syncFailedRef.current = true;
      console.error("Error syncing Turnkey session:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (authState === "authenticated" && tkUser && !user && !isSyncing && !syncFailedRef.current) {
      // console.log("🔄 Detected Turnkey auth, syncing with backend...");
      syncBackendSession(tkUser);
    }
  }, [authState, tkUser, user, isSyncing, syncBackendSession]);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    await checkSession();
  }, [checkSession]);

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
      localStorage.removeItem("lastActive");
    } catch (error) {
      console.error("Error logging out:", error);
    }
    syncFailedRef.current = false; // Allow sync to retry on next login
    setUser(null);
    setTurnkeyUser(null);
    setTurnkeySession(null);
  };

  const connectWallet = (address: string) => {
    if (user) {
      setUser({ ...user, walletAddress: address });
    }
  };

  const handleAuthCallback = useCallback(async (code: string, state: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error("Authentication callback failed");
      }

      // After successful callback, refresh the session to get the updated user data
      await refreshSession();
    } catch (error) {
      console.error("Error handling auth callback:", error);
      // Optionally, handle error state or redirect to an error page
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  // Session management: Inactivity timeout
  useEffect(() => {
    // Only track inactivity if user is logged in
    if (!user && !turnkeyUser) return;
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Update persistent last active timestamp
      localStorage.setItem("lastActive", Date.now().toString());

      // 4 hours of inactivity = automatic logout
      timeoutId = setTimeout(() => {
        logout();
        // console.log("[Auth] Session expired due to inactivity.");
      }, 4 * 60 * 60 * 1000);
    };

    // Events that reset the inactivity timer
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, turnkeyUser]);

  const isAuthenticated = !!turnkeySession || !!user || !!turnkeyUser;
  
  // isLoggingIn should be true if:
  // 1. Initial session check is running (isLoading)
  // 2. Metadata sync with backend is running (isSyncing)
  const isLoggingIn = isLoading || isSyncing;

  const value = {
    user,
    turnkeyUser,
    turnkeySession,
    isLoading,
    isAuthenticated,
    isLoggingIn,
    login,
    logout,
    connectWallet,
    setTurnkeyUser,
    setTurnkeySession,
    refreshSession,
    handleAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
