"use client";

import { useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, ShieldCheck, Zap, Globe } from "lucide-react";

function AuthContent() {
  const router = useRouter();
  const { user, turnkeyUser, authLoading } = useAuth() as any;
  const { handleLogin } = useTurnkey();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user || turnkeyUser) {
      router.push("/");
    }
  }, [user, turnkeyUser, router]);

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

  const onDiscordLogin = async () => {
    try {
      const response = await fetch("/api/auth/discord/init");
      const data = await response.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Discord login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full animate-pulse transition-delay-1000" />
      
      {/* Back Button */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-muted hover:text-primary transition-colors group"
      >
        <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:border-primary/30 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold uppercase tracking-widest">Back</span>
      </Link>

      <div className="w-full max-w-[440px] z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Image
              src="/logo.jpg"
              alt="Cabalspy"
              width={80}
              height={80}
              className="rounded-3xl object-cover ring-2 ring-white/10 relative z-10"
              unoptimized
            />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tighter mb-1">
            CABALSPY
          </h1>
          <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Real-time Token Pulse</p>
        </div>

        <Card className="glass border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardHeader className="pt-10 pb-6 text-center">
            <CardTitle className="text-2xl font-black text-white italic">WELCOME BACK</CardTitle>
            <CardDescription className="text-muted font-medium">Choose your preferred login method</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10 flex flex-col gap-4">
            <Button 
              onClick={onGoogleLogin}
              variant="glass" 
              className="w-full py-7 rounded-2xl border-white/5 hover:border-primary/40 hover:bg-primary/5 group"
            >
              <div className="bg-white p-1.5 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="font-bold text-base">Continue with Google</span>
            </Button>

            <Button 
              onClick={onTelegramLogin}
              variant="glass" 
              className="w-full py-7 rounded-2xl border-white/5 hover:border-blue-400/40 hover:bg-blue-400/5 group"
            >
              <div className="bg-[#229ED9] p-1.5 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="font-bold text-base">Continue with Telegram</span>
            </Button>

            <Button 
              onClick={onDiscordLogin}
              variant="glass" 
              className="w-full py-7 rounded-2xl border-white/5 hover:border-indigo-400/40 hover:bg-indigo-400/5 group"
            >
              <div className="bg-[#5865F2] p-1.5 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                </svg>
              </div>
              <span className="font-bold text-base">Continue with Discord</span>
            </Button>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 px-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted font-medium">Safe & Secure with Turnkey Embedded Wallets</span>
              </div>
              <div className="flex items-center gap-3 px-4">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted font-medium">Instant One-Click Trading Setup</span>
              </div>
              <div className="flex items-center gap-3 px-4">
                <Globe className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted font-medium">Degen-focused Real-time Market Data</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="mt-8 text-center text-xs text-muted font-medium">
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
