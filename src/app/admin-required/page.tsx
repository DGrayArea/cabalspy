"use client";

import Link from "next/link";
import { ShieldOff, ArrowLeft, Home } from "lucide-react";

/**
 * Shown when a logged-in user without admin privileges tries to access /admin.
 * Different from /access-denied (which is for Discord role verification failures).
 */
export default function AdminUnauthorizedPage() {
  return (
    <div className="min-h-screen bg-app text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff007a]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />

      {/* Back */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-muted hover:text-white transition-colors group z-20"
      >
        <div className="p-1.5 sm:p-2 rounded-full bg-white/5 border border-white/10 group-hover:border-white/30 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Back to Terminal</span>
      </Link>

      <div className="relative z-10 w-full max-w-[90%] sm:max-w-md animate-fade-in text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#ff007a]/20 blur-2xl rounded-full group-hover:bg-[#ff007a]/30 transition-colors" />
            <div className="relative p-5 sm:p-6 rounded-3xl glass border border-[#ff007a]/30 shadow-2xl">
              <ShieldOff className="w-10 h-10 sm:w-14 sm:h-14 text-[#ff007a]" />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 sm:p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-5">
          <div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-8 bg-[#ff007a]/30" />
              <span className="text-[10px] font-black text-[#ff007a] uppercase tracking-[0.3em]">Admin Only</span>
              <span className="h-px w-8 bg-[#ff007a]/30" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white mb-3">
              NOT <span className="text-[#ff007a]">AUTHORISED</span>
            </h1>
            <p className="text-[#64748b] text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              This area is restricted to <strong className="text-white">platform administrators</strong> only.
              Your current account does not have the required privileges.
            </p>
          </div>

          <div className="h-px bg-white/5" />

          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all"
            >
              <Home className="w-4 h-4" />
              Return to Terminal
            </Link>
          </div>

          <p className="text-[10px] font-medium text-[#64748b]/50 uppercase tracking-widest">
            If you believe this is an error, contact the platform owner.
          </p>
        </div>
      </div>
    </div>
  );
}
