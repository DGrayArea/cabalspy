"use client";

import { FC } from "react";
import {
  TurnkeyProvider,
  TurnkeyProviderConfig,
  TurnkeyCallbacks,
} from "@turnkey/react-wallet-kit";
import { TurnkeyErrorCodes } from "@turnkey/sdk-types";

/**
 * Where Google sends the user back to.
 *
 * MUST exactly match an "Authorized redirect URI" in the Google Cloud Console
 * OAuth client, or Google rejects the request with 400 redirect_uri_mismatch
 * before the user ever reaches the app. The origin root is what is registered,
 * so that is what we send.
 *
 * The original sign-in bounce (landing on "/" and being redirected to /auth
 * before Turnkey consumed the OAuth response) is fixed in useRequireAccess,
 * which now holds its redirect while an OAuth response is present in the URL.
 * That fix is independent of which path we return to.
 *
 * To return somewhere other than the root, register that exact URI in the
 * Google console first, then set NEXT_PUBLIC_REDIRECT_URI to match it.
 */
const getRedirectUri = () => {
  if (process.env.NEXT_PUBLIC_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_REDIRECT_URI;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "https://cabalspy-pi.vercel.app";
};

const turnkeyCallbacks: TurnkeyCallbacks = {
  onError: (error) => {
    console.error("❌ Turnkey error:", error.code, error.message);
  },
};

export const TurnKeyProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const currentRedirectUri = getRedirectUri();

  const turnkeyConfig: TurnkeyProviderConfig = {
    organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
    authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
    auth: {
      methods: {
        googleOauthEnabled: true,
        // Email OTP replaces the Telegram widget as the non-Google option.
        emailOtpAuthEnabled: true,
        smsOtpAuthEnabled: false,
        passkeyAuthEnabled: false,
        walletAuthEnabled: false,
      },
      methodOrder: ["socials", "email", "sms", "passkey", "wallet"],
      oauthConfig: {
        openOauthInPage: true, // Use full-page OAuth redirect for flawless mobile & desktop production support
        oauthRedirectUri: currentRedirectUri,
        googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      },
    },
  };

  return (
    <TurnkeyProvider config={turnkeyConfig} callbacks={turnkeyCallbacks}>
      {children}
    </TurnkeyProvider>
  );
};
