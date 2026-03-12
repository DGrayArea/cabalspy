"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Loader2 } from "lucide-react";
import { useTurnkey, AuthState, ClientState } from "@turnkey/react-wallet-kit";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OnboardingModal } from "@/components/OnboardingModal";

export default function AuthButton() {
  const {
    user,
    turnkeyUser,
    turnkeySession,
    logout,
    connectWallet,
    login,
    setTurnkeyUser,
    setTurnkeySession,
    isLoading: authLoading,
  } = useAuth();

  const {
    handleLogin,
    fetchUser,
    getSession,
    wallets,
    authState,
    clientState,
  } = useTurnkey();

  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      // Use Turnkey's handleLogin() which shows the auth modal
      // This will display Google OAuth option if configured in TurnkeyProvider
      await handleLogin();
    } catch (error) {
      console.error("Google login error:", error);
      alert(
        "Failed to initiate Google login. Please check console for details."
      );
    }
  };

  const handleTelegramLogin = async () => {
    try {
      // Initiate Telegram bot authentication flow
      // This will generate a token and redirect to the Telegram bot
      const response = await fetch("/api/auth/telegram/init");

      if (!response.ok) {
        throw new Error("Failed to initiate Telegram authentication");
      }

      const { botLink } = await response.json();

      // Open Telegram bot in a new tab
      // The bot will then send them back to the callback URL with auth data
      window.open(botLink, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Telegram login error:", error);
      alert(
        "Failed to initiate Telegram login. Please make sure:\n\n" +
          "1. Your Telegram bot is set up\n" +
          "2. TELEGRAM_BOT_TOKEN is configured in your environment\n" +
          "3. TELEGRAM_BOT_USERNAME is set (optional, defaults to 'your_bot_username')"
      );
    }
  };

  const handleDiscordLogin = async () => {
    try {
      const response = await fetch("/api/auth/discord/init");
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get Discord auth URL");
      }
    } catch (error) {
      console.error("Discord login error:", error);
      alert("Failed to initiate Discord login.");
    }
  };

  // useEffect must be called before any early returns (Rules of Hooks)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if client is initialized and user is authenticated
        // authState values: Unauthenticated, Authenticating, Authenticated
        // clientState values: NotInitialized, Initializing, Initialized
        if (!fetchUser || !getSession) {
          console.log("fetchUser or getSession not available yet");
          return;
        }

        // Check if client is ready and user is authenticated using enum values
        const isReady = clientState === ClientState.Ready;
        const isAuthenticated = authState === AuthState.Authenticated;

        if (isReady && isAuthenticated) {
          const userData = await fetchUser();
          const sessionData = await getSession();
          // console.log("Turnkey user:", userData);
          // console.log("Turnkey session:", sessionData);

          // Store Turnkey user and session globally
          if (userData) {
            setTurnkeyUser(userData);

            // Check if onboarding has been completed for this user
            const onboardingKey = `onboarding_completed_${userData.userId}`;
            const hasCompletedOnboarding = localStorage.getItem(onboardingKey) === "true";
            
            // Check if user has an embedded Solana wallet
            const hasEmbeddedSolanaWallet = wallets?.some(
              (wallet) =>
                (wallet.source === "embedded" || !wallet.source) &&
                wallet.accounts?.some(
                  (acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
                )
            );

            // If user has a wallet, mark onboarding as completed
            if (hasEmbeddedSolanaWallet) {
              setOnboardingCompleted(true);
              localStorage.setItem(onboardingKey, "true");
            } else {
              // If no wallet and onboarding not completed, show onboarding
              setOnboardingCompleted(hasCompletedOnboarding);
            }
          }
          if (sessionData) {
            setTurnkeySession(sessionData);
          }
        } else {
          // console.log("Turnkey not ready:", {
          //   authState,
          //   clientState,
          //   isReady,
          //   isAuthenticated,
          // });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    loadUserData();
  }, [
    fetchUser,
    getSession,
    authState,
    clientState,
    setTurnkeyUser,
    setTurnkeySession,
    wallets,
  ]);

  // Check if user is authenticated (either via custom auth or Turnkey)
  const isAuthenticated = user || turnkeyUser;

  // Use Turnkey user if available, otherwise use custom user
  const displayUser = isAuthenticated
    ? turnkeyUser
      ? {
          id: turnkeyUser.userId,
          name: turnkeyUser.userName,
          email: turnkeyUser.userEmail || turnkeyUser.userName,
          avatar: undefined,
          createdAt: turnkeyUser.createdAt
            ? new Date(parseInt(turnkeyUser.createdAt.seconds) * 1000)
            : new Date(),
        }
      : user!
    : null;

  // Show loading state while checking authentication
  const isCheckingAuth =
    authLoading ||
    clientState === ClientState.Loading ||
    clientState === undefined;

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-panel border border-gray-700/50">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    if (turnkeyUser) {
      const onboardingKey = `onboarding_completed_${turnkeyUser.userId}`;
      localStorage.setItem(onboardingKey, "true");
      setOnboardingCompleted(true);
    }
  };

  // Check if user has an embedded Solana wallet
  const hasEmbeddedSolanaWallet = wallets?.some(
    (wallet) =>
      (wallet.source === "embedded" || !wallet.source) &&
      wallet.accounts?.some(
        (acc) => acc.addressFormat === "ADDRESS_FORMAT_SOLANA"
      )
  );

  // Show onboarding if authenticated, has Turnkey user, but no wallet and onboarding not completed
  const shouldShowOnboarding =
    isAuthenticated &&
    turnkeyUser &&
    authState === AuthState.Authenticated &&
    clientState === ClientState.Ready &&
    !hasEmbeddedSolanaWallet &&
    !onboardingCompleted;

  if (isAuthenticated && displayUser) {
    return (
      <>
        {shouldShowOnboarding && (
          <OnboardingModal onComplete={handleOnboardingComplete} />
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="group flex items-center gap-2 px-1 py-1 pr-3 rounded-full bg-panel-elev border border-white/5 hover:border-primary/30 transition-all cursor-pointer active:scale-95 shadow-lg"
              title={displayUser.name}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors">
                {(() => {
                  const seed = displayUser.id || displayUser.name || "user";
                  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

                  return (
                    <img
                      src={avatarUrl}
                      alt={displayUser.name}
                      className="w-full h-full object-cover"
                    />
                  );
                })()}
              </div>
              <span className="text-xs font-bold text-muted group-hover:text-primary transition-colors truncate max-w-[80px]">
                {displayUser.name.split(" ")[0]}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            className="w-80 p-0 glass border-white/10 shadow-2xl animate-fade-in translate-y-2"
          >
            <Card className="border-0 bg-transparent">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black tracking-tight text-white uppercase italic">
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const seed = displayUser.id || displayUser.name || "user";
                    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

                    return (
                      <div className="relative group/avatar">
                        <img
                          src={avatarUrl}
                          alt={displayUser.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 group-hover/avatar:border-primary transition-colors"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-white truncate">
                      {displayUser.name}
                    </div>
                    {displayUser.email && (
                      <div className="text-xs text-muted truncate">
                        {displayUser.email}
                      </div>
                    )}
                  </div>
                </div>

                {turnkeySession && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                      Turnkey Active
                    </span>
                  </div>
                )}

                <Separator className="bg-white/5" />

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted">
                    <span>ID</span>
                    <span className="text-white font-mono">
                      {displayUser.id.slice(0, 8)}
                    </span>
                  </div>
                  {turnkeySession?.expiry && (
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted">
                      <span>Expires</span>
                      <span className="text-white font-mono">
                        {new Date(turnkeySession.expiry * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="bg-white/5" />

                <Button
                  onClick={() => {
                    logout();
                    if (turnkeyUser) {
                      setTurnkeyUser(null);
                      setTurnkeySession(null);
                    }
                  }}
                  variant="destructive"
                  className="w-full rounded-xl font-bold"
                  size="sm"
                >
                  <LogOut className="w-3 h-3 mr-2" />
                  LOGOUT
                </Button>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/auth">
        <Button
          variant="neon"
          size="sm"
          className="rounded-full px-6 py-5 shadow-neon-strong hover:scale-105 active:scale-95 transition-all"
        >
          SIGN IN
        </Button>
      </Link>
    </div>
  );
}
