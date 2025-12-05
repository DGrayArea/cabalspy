import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ViewportProvider } from "@/context/ViewportContext";
import { TurnkeySolanaContextProvider } from "@/context/TurnkeySolanaContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
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

export const metadata: Metadata = {
  title: "Cabalspy - Real-time Token Pulse",
  description: "Real-time token tracking and trading platform",
  icons: {
    icon: "/logo.jpg",
  },
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
              <PortfolioProvider>
                <ErrorBoundary>
                  <AuthProvider>{children}</AuthProvider>
                </ErrorBoundary>
              </PortfolioProvider>
            </TurnkeySolanaContextProvider>
          </TurnKeyProvider>
        </ViewportProvider>
        <Toaster />
      </body>
    </html>
  );
}
