"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ALLOWED_DISCORD_ROLE_IDS } from "@/lib/accessRoles";

export interface RequireAccessState {
  /** True while we still don't know whether the user may be here. */
  isChecking: boolean;
  /** True once the user is confirmed to have terminal access. */
  hasAccess: boolean;
}

/**
 * Single source of truth for "may this signed-in user use the terminal?".
 *
 * Unauthenticated users go to /auth; authenticated users without a
 * Holder/Pre-Sale role (or admin) go to /access-denied. Use this on every
 * gated page so access rules can't drift page to page.
 *
 * Note: this is a client-side gate for UX. Server-side enforcement lives in
 * the API routes — swaps themselves are non-custodial and signed client-side,
 * so the gate is about the product surface, not custody.
 */
export function useRequireAccess(): RequireAccessState {
  const { user, turnkeyUser, isLoading, isLoggingIn } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!(user || turnkeyUser);
  const settling = isLoading || isLoggingIn;

  // While the session is still resolving we don't know the access level yet —
  // treating that as "no access" is what caused spurious /access-denied
  // bounces right after an OAuth redirect.
  const hasAccess =
    !!user &&
    (user.accessLevel === "admin" ||
      user.accessLevel === "holder" ||
      (Array.isArray((user as { roles?: string[] }).roles) &&
        (user as { roles?: string[] }).roles!.some((r) =>
          ALLOWED_DISCORD_ROLE_IDS.includes(r)
        )));

  const isChecking = settling || (isAuthenticated && !user);

  useEffect(() => {
    if (isChecking) return;

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    if (!hasAccess) {
      router.push("/access-denied");
    }
  }, [isChecking, isAuthenticated, hasAccess, router]);

  return { isChecking, hasAccess };
}
