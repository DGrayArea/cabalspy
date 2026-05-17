import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewportProvider } from "@/context/ViewportContext";
import { TurnkeySolanaContextProvider } from "@/context/TurnkeySolanaContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { validateEnv } from "@/lib/env";
import { TurnKeyProvider } from "@/providers/TurnkeyProvider";
import { Toaster } from "@/components/ui/toaster";
import "@turnkey/react-wallet-kit/styles.css";

// Validate environment on server startup
// Note: validateEnv() handles build-time gracefully (warns instead of throwing)
if (typeof window === "undefined") {
  validateEnv();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: false, // Only preload primary font
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cabalspy-pi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Cabalspy - Real-time Token Pulse & Trading",
    template: "%s | Cabalspy",
  },
  description: "Advanced real-time token tracking and direct trading terminal for Solana and BSC. Discover trending pairs, new launches, and execute instant swaps with embedded wallets.",
  keywords: ["solana", "bsc", "token tracker", "crypto trading", "memecoins", "pump.fun", "dex screener", "turnkey wallets", "web3", "cabalspy"],
  authors: [{ name: "Cabalspy" }],
  creator: "Cabalspy",
  publisher: "Cabalspy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Cabalspy Terminal",
    description: "Advanced real-time token tracking and direct trading terminal for Solana and BSC.",
    url: APP_URL,
    siteName: "Cabalspy",
    images: [
      {
        url: "/logo.jpg", // Note: For best results, consider a 1200x630 og-image.png in the future
        width: 800,
        height: 800,
        alt: "Cabalspy Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cabalspy Terminal",
    description: "Advanced real-time token tracking and direct trading terminal for Solana and BSC.",
    images: ["/logo.jpg"], // Note: Consider a 1200x630 twitter-image.png in the future
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ViewportProvider>
          <TurnKeyProvider>
            <TurnkeySolanaContextProvider>
              <AuthProvider>
                <PortfolioProvider>
                  <WatchlistProvider>
                    <SettingsProvider>
                      <ErrorBoundary>
                        {children}
                      </ErrorBoundary>
                    </SettingsProvider>
                  </WatchlistProvider>
                </PortfolioProvider>
              </AuthProvider>
            </TurnkeySolanaContextProvider>
          </TurnKeyProvider>
        </ViewportProvider>
        <Toaster />
      </body>
    </html>
  );
}
