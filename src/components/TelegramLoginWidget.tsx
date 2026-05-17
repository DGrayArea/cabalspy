"use client";

/**
 * Telegram Login Widget
 *
 * Uses the official Telegram Login Widget (https://core.telegram.org/widgets/login).
 * When the user authenticates via Telegram, it calls our /api/auth/telegram POST endpoint
 * with the verified data, which creates a server session and sets a secure cookie.
 *
 * Requires: NEXT_PUBLIC_TELEGRAM_BOT_USERNAME env var (no @, just the username)
 */

import { useEffect, useRef, useCallback } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  onSuccess?: (user: TelegramUser) => void;
  onError?: (error: string) => void;
  buttonSize?: "large" | "medium" | "small";
  cornerRadius?: number;
  requestAccess?: boolean;
  className?: string;
}

export function TelegramLoginWidget({
  onSuccess,
  onError,
  buttonSize = "large",
  cornerRadius = 8,
  requestAccess = true,
  className = "",
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME_PROD ||
    "cabalspy_bot";

  const handleTelegramAuth = useCallback(
    async (user: TelegramUser) => {
      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });

        if (!response.ok) {
          const data = await response.json();
          onError?.(data.error || "Authentication failed");
          return;
        }

        onSuccess?.(user);

        // The server sets a secure httpOnly cookie — trigger a page reload
        // so AuthContext picks up the new session from /api/auth/session
        window.location.href = "/";
      } catch (err) {
        onError?.("Network error during authentication");
      }
    },
    [onSuccess, onError]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Expose callback globally for the Telegram script
    (window as any).onTelegramAuth = handleTelegramAuth;

    // Inject the Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", buttonSize);
    script.setAttribute("data-radius", cornerRadius.toString());
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", requestAccess ? "write" : "");

    // Clear any previous widget before injecting
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername, buttonSize, cornerRadius, requestAccess, handleTelegramAuth]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center min-h-[48px] ${className}`}
    />
  );
}
