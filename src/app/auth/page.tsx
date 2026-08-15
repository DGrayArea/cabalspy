"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck, Zap, Globe, Mail } from "lucide-react";
import { Hero } from "@/components/Hero";
// Telegram login is disabled (email OTP replaces it) — re-enable by
// uncommenting this and the widget block further down.
// import { TelegramLoginWidget } from "@/components/TelegramLoginWidget";

function AuthContent() {
  const router = useRouter();
  const { isAuthenticated, isLoggingIn, isLoading, user } = useAuth();
  const { handleGoogleOauth, handleLogin } = useTurnkey();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // When Turnkey picks up the OAuth result (isLoggingIn becomes true)
  // or auth completes, clear the processing flag
  useEffect(() => {
    if (isLoggingIn || isAuthenticated) {
      setIsProcessingOAuth(false);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    }
  }, [isLoggingIn, isAuthenticated]);

  // If already authenticated and user profile synced, redirect to home
  useEffect(() => {
    if (isAuthenticated && user && !isLoggingIn) {
      router.replace("/");
    }
  }, [isAuthenticated, user, isLoggingIn, router]);

  // Show a plain spinner for initial page load
  if (isLoading && !isProcessingOAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Show "Finalizing..." only when actually processing a login/sync
  if (isLoggingIn || isProcessingOAuth) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted text-sm font-medium animate-pulse">Finalizing your session...</p>
      </div>
    );
  }

  const onGoogleLogin = async () => {
    setIsProcessingOAuth(true);
    // Safety net: clear after 15s in case Turnkey never responds (e.g. user closed popup)
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => setIsProcessingOAuth(false), 15000);
    try {
      await handleGoogleOauth();
      // In popup mode, resolves after popup closes.
      // Keep isProcessingOAuth=true so we show loading until Turnkey
      // begins processing (isLoggingIn becomes true via the useEffect above)
    } catch (error) {
      console.error("Google login error:", error);
      // On error (e.g. popup closed by user), clear immediately
      setIsProcessingOAuth(false);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    }
  };

  // Email OTP. Turnkey's own flow owns code entry, resend and error states —
  // it stays in-page, so no redirect handling is needed here.
  const onEmailLogin = async () => {
    try {
      await handleLogin();
    } catch (error) {
      console.error("Email login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 sm:pb-6 border-b border-white/5 mb-4 sm:mb-8 z-20">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.jpg"
            alt="Cabalspy"
            width={38}
            height={38}
            className="rounded-xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
            unoptimized
          />
          <div>
            <span className="text-base sm:text-lg font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent uppercase tracking-wider block leading-none">
              CABALSPY
            </span>
            <span className="text-[9px] text-muted font-mono tracking-widest uppercase">Market Intel</span>
          </div>
        </Link>
        {/* "Back to terminal" used to sit here, linking to "/" — but "/" is
            gated, so from the sign-in page it just bounced straight back here.
            The logo already links home for anyone who is signed in. */}
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10 py-2 sm:py-4">
        {/* Hero Section */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <Hero embedded={true} />
        </div>

        {/* Login Section */}
        <div className="lg:col-span-5 order-1 lg:order-2 w-full max-w-md mx-auto animate-fade-in">
          <Card id="login-section" className="glass border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <CardHeader className="pt-6 sm:pt-8 pb-3 sm:pb-4 text-center">
              <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Image
                  src="/logo.jpg"
                  alt="Cabalspy"
                  width={32}
                  height={32}
                  className="rounded-xl object-cover"
                  unoptimized
                />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white">WELCOME BACK</CardTitle>
              <CardDescription className="text-muted text-xs sm:text-sm font-medium">Choose your preferred login method</CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-6 sm:pb-8 flex flex-col gap-3">
              <Button 
                onClick={onGoogleLogin}
                variant="glass" 
                className="w-full py-5 sm:py-6 rounded-2xl border-white/10 hover:border-primary/40 hover:bg-primary/5 group transition-all cursor-pointer"
              >
                <div className="bg-white p-1 sm:p-1.5 rounded-lg mr-2 sm:mr-3 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <span className="font-bold text-sm sm:text-base">Continue with Google</span>
              </Button>

              {/* Telegram login — disabled in favour of email OTP below.
                  Kept (with TelegramLoginWidget and /api/auth/telegram) so it
                  can be restored by uncommenting this block:

              <div className="w-full flex flex-col items-center gap-2 mt-1">
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                  Or sign in with Telegram
                </p>
                <TelegramLoginWidget
                  buttonSize="large"
                  cornerRadius={8}
                  requestAccess={true}
                  className="w-full"
                />
              </div>
              */}

              {/* Email OTP — for users who don't want to use Google.
                  Opens Turnkey's own flow, which handles code entry, resend
                  and error states. */}
              <div className="w-full flex flex-col items-center gap-2 mt-1">
                <div className="flex items-center gap-3 w-full py-1">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] text-muted font-bold uppercase tracking-widest">or</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <Button
                  onClick={onEmailLogin}
                  variant="glass"
                  className="w-full py-5 sm:py-6 rounded-2xl border-white/10 hover:border-primary/40 hover:bg-primary/5 group transition-all cursor-pointer"
                >
                  <div className="bg-white/10 p-1 sm:p-1.5 rounded-lg mr-2 sm:mr-3 group-hover:scale-110 transition-transform">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm sm:text-base">Continue with Email</span>
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2.5 px-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] text-muted font-medium">Safe & Secure Turnkey Embedded Wallets</span>
                </div>
                <div className="flex items-center gap-2.5 px-2">
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] text-muted font-medium">Instant One-Click Trading Setup</span>
                </div>
                <div className="flex items-center gap-2.5 px-2">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] text-muted font-medium">Degen-focused Real-Time Feeds</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <p className="mt-4 text-center text-[10px] sm:text-xs text-muted font-medium px-4">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline transition-all">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="text-primary hover:underline transition-all">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
