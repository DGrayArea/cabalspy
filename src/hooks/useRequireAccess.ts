"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ALLOWED_DISCORD_ROLE_IDS } from "@/lib/accessRoles";
import { verifyNftOwnership } from "@/services/verify-nft";

/**
 * Single gate for every holders-only page.
 *
 * Previously this check lived inline on the home page only, so /portfolio,
 * /profile and the token pages were reachable by typing the URL. Keeping it
 * in one hook means access is enforced the same way everywhere, and adding a
 * new gated page is one line rather than a copied block.
 *
 * Order of checks mirrors the original home-page logic:
 *   1. accessLevel (source of truth — re-derived from live Discord roles
 *      server-side on each session check)
 *   2. Discord roles carried on the session
 *   3. NFT ownership as a fallback
 *
 * Returns `isAuthorizing`: true while the decision is still pending, so the
 * caller can hold a loading state instead of flashing gated content.
 */
export function useRequireAccess() {
  const { isAuthenticated, user, isLoggingIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  useEffect(() => {
    // Wait for the session check to settle. Redirecting while it is still in
    // flight is what made the login flow flash the /auth page.
    if (authLoading || isLoggingIn) return;

    // An OAuth callback may land here with its response still in the URL and
    // Turnkey mid-way through consuming it. Redirecting now would throw the
    // response away and silently bounce the user back to sign-in, so hold.
    if (typeof window !== "undefined") {
      const raw = window.location.hash + window.location.search;
      if (/id_token|access_token|[?&]code=|oauth/i.test(raw)) return;
    }

    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }

    // Session exists but the user profile is still syncing (e.g. Turnkey auth
    // before /api/auth/sync resolves) — wait rather than deny.
    if (!user) return;

    let cancelled = false;
    const grant = () => {
      if (!cancelled) setIsAuthorizing(false);
    };

    const checkAccess = async () => {
      if (user.accessLevel === "admin" || user.accessLevel === "holder") {
        grant();
        return;
      }

      const hasDiscordRole = user.roles?.some((r: string) =>
        ALLOWED_DISCORD_ROLE_IDS.includes(r),
      );
      if (hasDiscordRole) {
        grant();
        return;
      }

      if (user.walletAddress) {
        const hasNft = await verifyNftOwnership(user.walletAddress);
        if (hasNft) {
          grant();
          return;
        }
      }

      if (!cancelled) router.replace("/access-denied");
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, authLoading, isLoggingIn, router]);

  return { isAuthorizing };
}
