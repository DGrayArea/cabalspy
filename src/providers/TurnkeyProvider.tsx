"use client";

import { FC } from "react";
import {
  TurnkeyProvider,
  TurnkeyProviderConfig,
  TurnkeyCallbacks,
} from "@turnkey/react-wallet-kit";
import { TurnkeyErrorCodes } from "@turnkey/sdk-types";

// Determine the redirect URI
const getRedirectUri = () => {
  if (process.env.NEXT_PUBLIC_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_REDIRECT_URI;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

const redirectUri = getRedirectUri();

// Log for debugging (only in development)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("🔍 Turnkey OAuth Config:", {
    redirectUri,
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? "✅ Set"
      : "❌ Missing",
    organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID
      ? "✅ Set"
      : "❌ Missing",
    authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID
      ? "✅ Set"
      : "❌ Missing",
  });
  console.log(
    "⚠️  IMPORTANT: Add this redirect URI to Google Cloud Console:",
    redirectUri
  );
  console.log("   1. Go to: https://console.cloud.google.com/apis/credentials");
  console.log("   2. Click your OAuth 2.0 Client ID");
  console.log("   3. Under 'Authorized redirect URIs', click + ADD URI");
  console.log(`   4. Add: ${redirectUri}`);
  console.log("   5. Click Save");
}

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
  authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
  auth: {
    // Enable auth methods
    methods: {
      googleOauthEnabled: true, // Enable Google OAuth
      emailOtpAuthEnabled: false,
      smsOtpAuthEnabled: false,
      passkeyAuthEnabled: false,
      walletAuthEnabled: false,
    },
    // Auth method order (Google first)
    methodOrder: ["socials", "email", "sms", "passkey", "wallet"],
    oauthConfig: {
      openOauthInPage: true,
      // Note: When using Turnkey Auth Proxy, the redirect URI is handled by Turnkey
      // You need to add Turnkey's redirect URI to Google Cloud Console
      // Typically: https://auth.turnkey.com/oauth/callback
      // Check your Turnkey Dashboard → Auth Proxy Config for the exact URI
      oauthRedirectUri: redirectUri,
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
    },
  },
};

const turnkeyCallbacks: TurnkeyCallbacks = {
  onError: (error) => {
    console.error("❌ Turnkey error:", error.code, error.message);

    // Handle specific error codes
    switch (error.code) {
      case TurnkeyErrorCodes.ACCOUNT_ALREADY_EXISTS:
        console.error(
          "This social login is already associated with another account."
        );
        break;
      default:
        console.error("Turnkey error:", error.message);
        // If it's an OAuth error, provide helpful guidance
        if (
          error.message?.toLowerCase().includes("redirect") ||
          error.message?.toLowerCase().includes("oauth")
        ) {
          console.error("\n🔧 OAuth Redirect URI Fix:");
          console.error("1. Go to Turnkey Dashboard → Auth Proxy Config");
          console.error("2. Find the 'Callback URI' or 'Redirect URI'");
          console.error("3. Go to Google Cloud Console → OAuth 2.0 Client IDs");
          console.error(
            "4. Add that Turnkey callback URI to 'Authorized redirect URIs'"
          );
        }
    }
  },
};

export const TurnKeyProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <TurnkeyProvider config={turnkeyConfig} callbacks={turnkeyCallbacks}>
      {children}
    </TurnkeyProvider>
  );
};
