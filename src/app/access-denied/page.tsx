"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldOff, ExternalLink, ArrowLeft, CheckCircle2, Lock, AlertCircle, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";

function AccessDeniedContent() {
  const router = useRouter();
  const { isAuthenticated, user, isLoggingIn, logout } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error === "missing_role") {
      setErrorMsg("Verification Failed: Required Discord roles not found.");
    } else if (error === "not_in_server") {
      setErrorMsg("Verification Failed: You must be in the CabalSpy Discord server.");
    } else if (error === "already_linked") {
      setErrorMsg("Verification Failed: This Discord account is already linked to another user.");
    }
  }, [error]);

  const onLinkDiscord = async () => {
    try {
      const response = await fetch("/api/auth/discord/init");
      const data = await response.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Discord link error:", error);
    }
  };

  // Logout then hard redirect to /auth so the user can sign in with a different account.
  const onSwitchAccount = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-app text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />

      {/* Back Link — logs out first so user can sign in with a different account */}
      <button
        onClick={onSwitchAccount}
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-muted hover:text-white transition-colors group z-20"
      >
        <div className="p-1.5 sm:p-2 rounded-full bg-white/5 border border-white/10 group-hover:border-white/30 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Back to Login</span>
      </button>

      <div className="relative z-10 w-full max-w-[90%] sm:max-w-lg animate-fade-in py-8">
        {/* Icon */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full group-hover:bg-accent/40 transition-colors" />
            <div className="relative p-5 sm:p-6 rounded-3xl sm:rounded-4xl glass border border-accent/30 shadow-2xl">
              <ShieldOff className="w-10 h-10 sm:w-16 sm:h-16 text-accent" />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-4xl sm:rounded-4xl p-6 sm:p-10 border border-white/10 text-center space-y-4 sm:space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-px w-8 bg-accent/30" />
              <span className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-[0.3em]">Restricted Access</span>
              <span className="h-px w-8 bg-accent/30" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tighter text-white mb-2">
              ACCESS <span className="text-accent">DENIED</span>
            </h1>
            <p className="text-muted text-[11px] sm:text-sm font-medium leading-relaxed max-w-[320px] mx-auto">
              CabalSpy is an exclusive terminal. Verify your <strong className="text-white">Holder roles</strong> or <strong className="text-white">NFT ownership</strong> to enter.
            </p>
          </div>

          {errorMsg && (
            <div className="py-3 px-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 text-accent shrink-0" />
              <p className="text-[10px] sm:text-xs font-bold text-accent text-left">{errorMsg}</p>
            </div>
          )}

          <div className="h-px bg-white/5" />

          {isAuthenticated ? (
            <div className="space-y-6">
              <div className="text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-neon-sm" />
                  <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">Logged in as {user?.name || 'Turnkey User'}</p>
                </div>
                <p className="text-muted text-[11px] sm:text-xs leading-relaxed">
                  To access the terminal, you need to link your Discord account and verify you have the <span className="text-white font-bold">Holder</span> or <span className="text-white font-bold">Pre-Sale</span> role.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={onLinkDiscord}
                  className="w-full py-6 sm:py-7 rounded-2xl bg-primary text-black font-bold text-xs sm:text-sm tracking-widest hover:bg-primary/90 shadow-neon active:scale-95 transition-all group"
                >
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  LINK DISCORD ACCOUNT
                </Button>

                <Button
                  onClick={onSwitchAccount}
                  variant="glass"
                  className="w-full py-4 rounded-2xl border-white/10 hover:border-white/30 text-[10px] sm:text-xs font-bold tracking-widest"
                >
                  Sign in with a different account
                </Button>
                
                <a
                  href="https://discord.gg/8ckMqGnnAP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 text-muted hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Join Discord Server <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 sm:space-y-4 text-left bg-white/5 p-5 rounded-[2rem] border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-[0.2em] text-center mb-2">Instructions</p>
                {[
                  { icon: ShieldOff, text: "Join the CabalSpy Discord" },
                  { icon: Sparkles, text: "Acquire Holder or Pre-Sale role" },
                  { icon: CheckCircle2, text: "Sign in using verified Discord" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-gray-400">{text}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white text-black font-bold text-xs sm:text-sm tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl"
                >
                  <Lock className="w-4 h-4" />
                  PROCEED TO LOGIN
                </Link>
                <a
                  href="https://discord.gg/8ckMqGnnAP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#7289DA] rounded-2xl text-[10px] font-bold tracking-widest hover:bg-[#5865F2]/20 transition-all"
                >
                  DISCORD COMMUNITY <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          <div className="h-px bg-white/5" />
          
          <p className="text-[10px] font-medium text-muted/50 uppercase tracking-widest">
            Protected by CabalSpy Guardian System
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app flex items-center justify-center text-white"><div className="w-8 h-8 rounded-full bg-primary animate-pulse shadow-neon-sm" /></div>}>
      <AccessDeniedContent />
    </Suspense>
  );
}
