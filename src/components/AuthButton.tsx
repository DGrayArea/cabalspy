"use client";

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
            className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-700 hover:border-gray-600 transition-all cursor-pointer shadow-lg hover:shadow-xl overflow-hidden"
            title={displayUser.name}
          >
            {(() => {
              // Generate Dicebear avatar URL using user ID or name (not email)
              const seed = displayUser.id || displayUser.name || "user";
              const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

              return (
                <img
                  src={avatarUrl}
                  alt={displayUser.name}
                  className="w-full h-full rounded-full object-cover"
                />
              );
            })()}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-80 p-0 bg-gray-800 border-gray-700"
        >
          <Card className="border-0 bg-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-white">User Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4">
                {(() => {
                  // Generate Dicebear avatar URL using user ID or name (not email)
                  const seed = displayUser.id || displayUser.name || "user";
                  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

                  return (
                    <img
                      src={avatarUrl}
                      alt={displayUser.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-700 shrink-0"
                    />
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-white truncate">
                    {displayUser.name}
                  </div>
                  {displayUser.email && (
                    <div className="text-sm text-gray-400 truncate">
                      {displayUser.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Turnkey Status */}
              {turnkeySession && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">
                    Turnkey Authenticated
                  </span>
                </div>
              )}

              <Separator className="bg-gray-700" />

              {/* User Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User ID:</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {displayUser.id.slice(0, 8)}...
                  </span>
                </div>
                {turnkeySession && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Organization:</span>
                      <span className="text-gray-300 font-mono text-xs">
                        {turnkeySession.organizationId?.slice(0, 8)}...
                      </span>
                    </div>
                    {turnkeySession.expiry && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Session Expires:</span>
                        <span className="text-gray-300 text-xs">
                          {new Date(
                            turnkeySession.expiry * 1000
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator className="bg-gray-700" />

              {/* Logout Button */}
              <Button
                onClick={() => {
                  logout();
                  if (turnkeyUser) {
                    setTurnkeyUser(null);
                    setTurnkeySession(null);
                  }
                }}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
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
      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </button>
      <button
        onClick={handleTelegramLogin}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
        Telegram
      </button>
      <button
        onClick={handleDiscordLogin}
        className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
        </svg>
        Discord
      </button>
    </div>
  );
}
