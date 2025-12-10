"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search,
  RefreshCw,
  Wallet,
  Menu,
  User,
  ArrowLeft,
} from "lucide-react";
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
  const { isAuthenticated } = useAuth();
  const { isDesktop, isMobile } = useViewport();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="border-b border-panel bg-panel/80 backdrop-blur-sm sticky top-0 z-50 w-full">
      <div className="w-full px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo and Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0 flex-1">
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                className="p-1.5 sm:p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95 flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 cursor-pointer"
            >
              <Image
                src="/logo.jpg"
                alt="Cabalspy Logo"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-gray-800/50 flex-shrink-0"
                unoptimized
              />
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent text-base sm:text-xl font-bold whitespace-nowrap">
                CABALSPY
              </span>
            </Link>
            {/* Desktop Navigation - Show on lg and above */}
            <nav className="hidden lg:flex items-center gap-4">
              <Link
                href="/"
                className={`text-sm transition-colors cursor-pointer ${
                  pathname === "/"
                    ? "text-white font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Home
              </Link>
              <Link
                href="/portfolio"
                className={`text-sm transition-colors cursor-pointer ${
                  pathname === "/portfolio"
                    ? "text-white font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Portfolio
              </Link>
            </nav>
          </div>

          {/* Desktop: Action Buttons - Show on desktop (md and above) */}
          <div
            style={{
              display: isDesktop ? "flex" : "none",
              alignItems: "center",
              gap: "0.5rem",
              flexShrink: 0,
            }}
          >
            {showSearch && onSearchClick && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Search Token"
              >
                <Search className="w-4 h-4 cursor-pointer" />
              </button>
            )}
            {showRefresh && onRefreshClick && (
              <button
                onClick={onRefreshClick}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 cursor-pointer ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
            {/* Wallet Settings - Only show when logged in */}
            {showWalletSettings && onWalletSettingsClick && isAuthenticated && (
              <button
                onClick={onWalletSettingsClick}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                title="Wallet Settings"
              >
                <Wallet className="w-4 h-4 cursor-pointer" />
              </button>
            )}
            {/* Auth Button */}
            <AuthButton />
          </div>

          {/* Mobile: Hamburger Menu and Wallet - Show only on mobile (below md breakpoint) */}
          <div
            style={{
              display: isMobile ? "flex" : "none",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {/* Wallet Settings - Only show when authenticated */}
            {showWalletSettings && onWalletSettingsClick && isAuthenticated && (
              <button
                onClick={onWalletSettingsClick}
                className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Wallet Settings"
              >
                <Wallet className="w-5 h-5 cursor-pointer" />
              </button>
            )}
            <Dialog open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <DialogTrigger asChild>
                <button
                  className="p-2 hover:bg-panel-elev rounded-lg transition-colors cursor-pointer active:scale-95"
                  title="Menu"
                >
                  <Menu className="w-5 h-5 cursor-pointer" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-transparent backdrop-blur-xl border-0 rounded-none shadow-none p-0 top-[5%] translate-y-0 max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="px-6 pt-6 pb-4">
                    <DialogHeader className="text-left">
                      <DialogTitle className="text-white text-2xl font-bold">
                        Menu
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
                        {showWalletSettings && onWalletSettingsClick && isAuthenticated && (
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

