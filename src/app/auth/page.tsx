"use client";

import { useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShieldCheck, Zap, Globe } from "lucide-react";
import { Hero } from "@/components/Hero";

function AuthContent() {
  const router = useRouter();
  const { isAuthenticated, isLoggingIn, user } = useAuth();
  const { handleLogin } = useTurnkey();

  // Debug logging
  useEffect(() => {
    console.log("🔐 Auth Page State:", { isAuthenticated, isLoggingIn, user: !!user });
  }, [isAuthenticated, isLoggingIn, user]);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated && !isLoggingIn) {
      console.log("🚀 Redirecting to terminal...");
      router.replace("/");
    }
  }, [isAuthenticated, isLoggingIn, router]);

  if (isLoggingIn) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted text-sm font-medium animate-pulse">Finalizing your session...</p>
      </div>
    );
  }

  const onGoogleLogin = async () => {
    try {
      await handleLogin();
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  const onTelegramLogin = async () => {
    try {
      const response = await fetch("/api/auth/telegram/init");
      if (response.ok) {
        const { botLink } = await response.json();
        window.open(botLink, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Telegram login error:", error);
    }
  };



  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-7xl mx-auto mb-6 sm:mb-12">
        <Hero />
      </div>

      {/* Back Button */}
      <Link 
        href="/" 
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-muted hover:text-primary transition-colors group z-20"
      >
        <div className="p-1.5 sm:p-2 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/30 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <span className="text-[10px] sm:text-sm font-bold uppercase tracking-widest">Back to Terminal</span>
      </Link>

      <div className="w-full max-w-[440px] z-10 animate-fade-in py-8">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="relative mb-3 sm:mb-4 group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Image
              src="/logo.jpg"
              alt="Cabalspy"
              width={64}
              height={64}
              className="rounded-2xl sm:rounded-3xl object-cover ring-2 ring-white/10 relative z-10 sm:w-[80px] sm:h-[80px]"
              unoptimized
            />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tighter mb-1 uppercase">
            CABALSPY
          </h1>
          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-[0.2em] text-muted text-center italic">Real-time Token Pulse</p>
        </div>

        <Card id="login-section" className="glass border-white/10 rounded-4xl sm:rounded-4xl shadow-2xl overflow-hidden">
          <CardHeader className="pt-8 sm:pt-10 pb-4 sm:pb-6 text-center">
            <CardTitle className="text-xl sm:text-2xl font-black text-white italic">WELCOME BACK</CardTitle>
            <CardDescription className="text-muted text-xs sm:text-sm font-medium">Choose your preferred login method</CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 pb-8 sm:pb-10 flex flex-col gap-3 sm:gap-4">
            <Button 
              onClick={onGoogleLogin}
              variant="glass" 
              className="w-full py-5 sm:py-7 rounded-2xl sm:rounded-2xl border-white/5 hover:border-primary/40 hover:bg-primary/5 group"
            >
              <div className="bg-white p-1 sm:p-1.5 rounded-lg mr-2 sm:mr-3 group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="font-bold text-sm sm:text-base">Continue with Google</span>
            </Button>

            <Button 
              onClick={onTelegramLogin}
              variant="glass" 
              className="w-full py-5 sm:py-7 rounded-xl sm:rounded-2xl border-white/5 hover:border-blue-400/40 hover:bg-blue-400/5 group"
            >
              <div className="bg-[#229ED9] p-1 sm:p-1.5 rounded-lg mr-2 sm:mr-3 group-hover:scale-110 transition-transform">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="font-bold text-sm sm:text-base">Continue with Telegram</span>
            </Button>



            <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted font-medium">Safe & Secure with Turnkey Embedded Wallets</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted font-medium">Instant One-Click Trading Setup</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted font-medium">Degen-focused Real-time Market Data</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-muted font-medium px-4">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline transition-all">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-primary hover:underline transition-all">Privacy Policy</Link>
        </p>
      </div>
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
