"use client";

import { FC } from "react";
import {
  TurnkeyProvider,
  TurnkeyProviderConfig,
  TurnkeyCallbacks,
} from "@turnkey/react-wallet-kit";
import { TurnkeyErrorCodes } from "@turnkey/sdk-types";

// Determine the redirect URI dynamically
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
        emailOtpAuthEnabled: false,
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
