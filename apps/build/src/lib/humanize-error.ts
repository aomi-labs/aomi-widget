/**
 * Map raw API / auth failures to short user-facing copy.
 * Prefer this over surfacing bearer, OAuth, or env-var lectures in the UI.
 */
export function humanizeUserError(
  raw: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "";
  const text = message.trim();
  if (!text) return fallback;

  const lower = text.toLowerCase();

  if (
    lower.includes("not signed") ||
    lower.includes("unauthorized") ||
    /\b401\b/.test(lower)
  ) {
    return "Sign in with GitHub and try again.";
  }
  if (lower.includes("forbidden") || /\b403\b/.test(lower)) {
    return "You don't have access to do that.";
  }
  if (
    lower.includes("not implemented") ||
    lower.includes("isn't available yet") ||
    /\b501\b/.test(lower)
  ) {
    return "This isn't available yet.";
  }
  if (
    lower.includes("bearer") ||
    lower.includes("oauth") ||
    lower.includes("portal_service") ||
    lower.includes("service key") ||
    lower.includes("callback url")
  ) {
    return "Sign-in failed. Try again.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Too many requests. Wait a moment and try again.";
  }
  if (text.length > 140) {
    return fallback;
  }

  return text;
}
