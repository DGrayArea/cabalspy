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
    createWallet,
    wallets,
    authState,
    clientState,
  } = useTurnkey();

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
          console.log("Turnkey user:", userData);
          console.log("Turnkey session:", sessionData);

          // Store Turnkey user and session globally
          if (userData) {
            setTurnkeyUser(userData);

            // Create wallets automatically after Turnkey authentication
            // Check if wallets already exist
            if (wallets && wallets.length > 0) {
              console.log("✅ Wallets already exist:", wallets);
            } else if (createWallet) {
              // Create Solana and BSC wallets for new users
              // According to Turnkey docs, createWallet takes address formats as array
              try {
                console.log("Creating wallets for Turnkey user...");
                const solanaWallet = await createWallet({
                  walletName: `${userData.userName}'s Solana Wallet`,
                  accounts: ["ADDRESS_FORMAT_SOLANA"],
                });

                const bscWallet = await createWallet({
                  walletName: `${userData.userName}'s BSC Wallet`,
                  accounts: ["ADDRESS_FORMAT_ETHEREUM"], // BSC uses Ethereum format
                });

                console.log("✅ Wallets created:", { solanaWallet, bscWallet });
              } catch (error) {
                console.error("Error creating wallets:", error);
              }
            }
          }
          if (sessionData) {
            setTurnkeySession(sessionData);
          }
        } else {
          console.log("Turnkey not ready:", {
            authState,
            clientState,
            isReady,
            isAuthenticated,
          });
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
    createWallet,
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

  if (isAuthenticated && displayUser) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all cursor-pointer shadow-lg hover:shadow-xl overflow-hidden"
            title={displayUser.name}
          >
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {displayUser.name.charAt(0).toUpperCase()}
              </span>
            )}
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
                {displayUser.avatar ? (
                  <img
                    src={displayUser.avatar}
                    alt={displayUser.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white">
                    {displayUser.name}
                  </div>
                  {displayUser.email && (
                    <div className="text-sm text-gray-400">
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
    </div>
  );
}
