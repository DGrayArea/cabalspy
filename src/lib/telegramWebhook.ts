/**
 * Telegram Webhook Management Utilities
 *
 * Helper functions for managing Telegram bot webhooks programmatically.
 */

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface SetWebhookOptions {
  url: string;
  secretToken?: string;
  allowedUpdates?: string[];
  dropPendingUpdates?: boolean;
}

/**
 * Set up Telegram webhook
 */
export async function setWebhook(
  botToken: string,
  options: SetWebhookOptions
): Promise<{ ok: boolean; description?: string; result?: any }> {
  const url = new URL(`https://api.telegram.org/bot${botToken}/setWebhook`);

  url.searchParams.set("url", options.url);

  if (options.secretToken) {
    url.searchParams.set("secret_token", options.secretToken);
  }

  if (options.allowedUpdates) {
    url.searchParams.set(
      "allowed_updates",
      JSON.stringify(options.allowedUpdates)
    );
  }

  if (options.dropPendingUpdates) {
    url.searchParams.set("drop_pending_updates", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
  });

  return response.json();
}

/**
 * Get current webhook info
 */
export async function getWebhookInfo(
  botToken: string
): Promise<{ ok: boolean; result?: WebhookInfo; description?: string }> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getWebhookInfo`
  );

  return response.json();
}

/**
 * Delete webhook
 */
export async function deleteWebhook(
  botToken: string,
  dropPendingUpdates = false
): Promise<{ ok: boolean; description?: string }> {
  const url = new URL(`https://api.telegram.org/bot${botToken}/deleteWebhook`);

  if (dropPendingUpdates) {
    url.searchParams.set("drop_pending_updates", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
  });

  return response.json();
}

/**
 * Get webhook URL from environment variables
 */
export function getWebhookUrl(): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return `${baseUrl}/api/telegram/webhook`;
}
