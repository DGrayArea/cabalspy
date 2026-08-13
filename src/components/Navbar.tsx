"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, RefreshCw, Wallet, Menu, User, ArrowLeft, ShieldCheck } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/context/AuthContext";
import { useViewport } from "@/context/ViewportContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface NavbarProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
  showRefresh?: boolean;
  onRefreshClick?: () => void;
  isLoading?: boolean;
  showWalletSettings?: boolean;
  onWalletSettingsClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function Navbar({
  showSearch = false,
  onSearchClick,
  showRefresh = false,
  onRefreshClick,
  isLoading = false,
  showWalletSettings = false,
  onWalletSettingsClick,
  showBackButton = false,
  onBackClick,
}: NavbarProps) {
  const pathname = usePathname();
  const { user, turnkeyUser, turnkeySession } = useAuth();
  const isAuthenticated = user || turnkeyUser || turnkeySession;
  const isAdmin = user?.accessLevel === "admin";
  const { isDesktop, isMobile } = useViewport();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="border-b border-primary/20 bg-panel/80 backdrop-blur-xl sticky top-0 z-50 w-full shadow-[0_4px_20px_-5px_rgba(var(--primary-rgb),0.2)] h-16 sm:h-20 flex items-center">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center min-w-0 flex-1">
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                className="mr-3 p-2 hover:bg-panel-elev rounded-xl transition-colors cursor-pointer active:scale-95 flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {/* min-w-0 (not flex-shrink-0) so the wordmark can truncate on
                narrow screens instead of being overlapped by the controls. */}
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 cursor-pointer group pr-2 sm:pr-4"
            >
              <div className="relative">
                <Image
                  src="/logo.jpg"
                  alt="Cabalspy Logo"
                  width={36}
                  height={36}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0 transition-all group-hover:ring-primary/60"
                  unoptimized
                />
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent text-base sm:text-2xl font-extrabold tracking-tight truncate">
                CABALSPY
              </span>
            </Link>

            {/* Navigation Links - Pushed away from logo with ml (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 sm:gap-8 md:gap-10 ml-6 sm:ml-10 md:ml-14">
              <Link
                href="/"
                className={`text-sm sm:text-base font-bold tracking-wide transition-all hover:text-primary cursor-pointer ${
                  pathname === "/" ? "text-primary border-b-2 border-primary pb-0.5" : "text-muted hover:text-white"
                }`}
              >
                Home
              </Link>
              <Link
                href="/portfolio"
                className={`text-sm sm:text-base font-bold tracking-wide transition-all hover:text-primary cursor-pointer ${
                  pathname === "/portfolio" ? "text-primary border-b-2 border-primary pb-0.5" : "text-muted hover:text-white"
                }`}
              >
                Portfolio
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`text-sm sm:text-base font-bold tracking-wide transition-all hover:text-[#f59e0b] cursor-pointer flex items-center gap-1.5 ${
                    pathname === "/admin" ? "text-[#f59e0b] border-b-2 border-[#f59e0b] pb-0.5" : "text-[#f59e0b]/80 hover:text-[#f59e0b]"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Desktop Action Buttons & Auth */}
          <div className="hidden md:flex items-center gap-3 sm:gap-4 shrink-0">
            {showSearch && onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer active:scale-95 text-muted hover:text-primary border border-white/5 hover:border-primary/30"
                title="Search Token"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
              </button>
            )}
            {showRefresh && onRefreshClick && (
              <button
                onClick={onRefreshClick}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer active:scale-95 text-muted hover:text-primary border border-white/5 hover:border-primary/30"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 sm:w-5 sm:h-5 cursor-pointer ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
            {/* Wallet Settings - Only show when logged in */}
            {showWalletSettings && onWalletSettingsClick && isAuthenticated && (
              <button
                onClick={onWalletSettingsClick}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95 text-muted hover:text-primary border border-white/5 hover:border-primary/30"
                title="Wallet Settings"
              >
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer" />
              </button>
            )}
            {/* Auth Button */}
            <AuthButton />
          </div>

          {/* Mobile: Control Bar & Hamburger Menu (Below md breakpoint) */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {showSearch && onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-muted hover:text-primary border border-white/5"
                title="Search Token"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            {showRefresh && onRefreshClick && (
              <button
                onClick={onRefreshClick}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-muted hover:text-primary border border-white/5"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}
            <AuthButton />
            <Dialog open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <DialogTrigger asChild>
                <button
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer active:scale-95 text-muted hover:text-primary border-0 focus:ring-0 active:bg-white/5"
                  title="Menu"
                >
                  <Menu className="w-6 h-6 cursor-pointer" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md glass border-0 rounded-[2.5rem] shadow-[0_0_100px_rgba(var(--primary-rgb),0.2)] p-0 top-[2%] h-auto max-h-[96vh] overflow-hidden focus:ring-0 select-none">
                <div className="flex flex-col h-full bg-black/40 backdrop-blur-3xl">
                  {/* Header */}
                  <div className="px-8 pt-10 pb-6">
                    <DialogHeader className="text-left">
                      <DialogTitle className="text-white text-3xl font-bold tracking-tighter flex items-center gap-3">
                        <div className="w-2 h-10 bg-primary shadow-neon" />
                        TERMINAL MENU
                      </DialogTitle>
                    </DialogHeader>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col py-2">
                    {/* Navigation Links */}
                      <nav className="flex flex-col px-2">
                        <Link
                          href="/"
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center gap-4 px-4 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-panel-elev/50 rounded-xl transition-all cursor-pointer group"
                        >
                          <span className="group-hover:translate-x-1 transition-transform">
                            Home
                          </span>
                        </Link>
                        <Link
                          href="/portfolio"
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center gap-4 px-4 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-panel-elev/50 rounded-xl transition-all cursor-pointer group"
                        >
                          <span className="group-hover:translate-x-1 transition-transform">
                            Portfolio
                          </span>
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-4 px-4 py-4 text-base font-medium text-[#f59e0b] hover:bg-[#f59e0b]/10 rounded-xl transition-all cursor-pointer group border border-[#f59e0b]/20"
                          >
                            <ShieldCheck className="w-5 h-5 text-[#f59e0b]" />
                            <span className="group-hover:translate-x-1 transition-transform font-bold">
                              Admin Console
                            </span>
                          </Link>
                        )}
                      </nav>

                    {/* Action Buttons */}
                    <div className="px-2 pt-2 pb-2">
                      <div className="flex flex-col gap-1">
                        {showSearch && onSearchClick && (
                          <button
                            onClick={() => {
                              onSearchClick();
                              setShowMobileMenu(false);
                            }}
                            className="flex items-center gap-4 px-4 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-panel-elev/50 rounded-xl transition-all cursor-pointer group"
                          >
                            <Search className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                            <span className="group-hover:translate-x-1 transition-transform">
                              Search Token
                            </span>
                          </button>
                        )}
                        {showRefresh && onRefreshClick && (
                          <button
                            onClick={() => {
                              onRefreshClick();
                              setShowMobileMenu(false);
                            }}
                            className="flex items-center gap-4 px-4 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-panel-elev/50 rounded-xl transition-all cursor-pointer group"
                          >
                            <RefreshCw
                              className={`w-5 h-5 text-gray-400 group-hover:text-white transition-colors ${isLoading ? "animate-spin" : ""}`}
                            />
                            <span className="group-hover:translate-x-1 transition-transform">
                              Refresh
                            </span>
                          </button>
                        )}
                        {showWalletSettings &&
                          onWalletSettingsClick &&
                          isAuthenticated && (
                            <button
                              onClick={() => {
                                onWalletSettingsClick();
                                setShowMobileMenu(false);
                              }}
                              className="flex items-center gap-4 px-4 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-panel-elev/50 rounded-xl transition-all cursor-pointer group"
                            >
                              <Wallet className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                              <span className="group-hover:translate-x-1 transition-transform">
                                Wallet Settings
                              </span>
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Auth Button */}
                    <div className="px-6 pt-4 pb-6">
                      <div className="flex justify-center">
                        <AuthButton />
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  );
}
