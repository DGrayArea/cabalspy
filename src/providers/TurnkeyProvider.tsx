"use client";

import { FC } from "react";
import {
  TurnkeyProvider,
  TurnkeyProviderConfig,
} from "@turnkey/react-wallet-kit";

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
  authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
  auth: {
    oauthConfig: {
      openOauthInPage: true,
      oauthRedirectUri:
        process.env.NEXT_PUBLIC_REDIRECT_URI ||
        (typeof window !== "undefined" ? window.location.origin : ""),
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
    },
  },
};

export const TurnKeyProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <TurnkeyProvider
      config={turnkeyConfig}
      callbacks={{
        onError: (error) => console.error("Turnkey error:", error),
      }}
    >
      {children}
    </TurnkeyProvider>
  );
};
