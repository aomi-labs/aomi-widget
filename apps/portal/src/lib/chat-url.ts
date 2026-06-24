/**
 * Resolves the base chat URL from the NEXT_PUBLIC_CHAT_URL env var.
 * Falls back to the canonical chat.aomi.dev host when the env is not set.
 */
export function resolveChatUrl(): string {
  return process.env.NEXT_PUBLIC_CHAT_URL?.trim() || "https://chat.aomi.dev";
}

/**
 * Returns the deep-link URL for a specific app in the chat UI.
 * @param appName - The app identifier to open in chat.
 */
export function chatAppUrl(
  appName: string,
  options: { locked?: boolean } = {},
): string {
  const base = resolveChatUrl();
  const query = `app=${encodeURIComponent(appName)}`;
  return options.locked ? `${base}?${query}&lock_app=1` : `${base}?${query}`;
}
