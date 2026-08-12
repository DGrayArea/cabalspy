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
 * This must be /auth, not the origin root. With openOauthInPage the browser
 * returns with the OAuth response in the URL, and Turnkey reads it on mount.
 * Landing on "/" meant the home page's access guard saw an unauthenticated
 * user (Turnkey hadn't consumed the response yet), redirected to /auth, and
 * destroyed the callback params mid-flight — so sign-in silently bounced back
 * to the start. Being a race, it occasionally succeeded, which is why
 * retrying appeared to "sometimes work".
 *
 * /auth has no access guard, so the SDK can finish undisturbed.
 */
const getRedirectUri = () => {
  if (process.env.NEXT_PUBLIC_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_REDIRECT_URI;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/auth`;
  }
  return "https://cabalspy-pi.vercel.app/auth";
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
