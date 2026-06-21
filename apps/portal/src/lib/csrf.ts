/**
 * CSRF origin validation for BFF route handlers.
 *
 * Compares the request's `origin` (or `referer`) header against the configured
 * app URL. If no env var is configured, falls back to fail-open (allow) so
 * that the deploy flow works on deployments that haven't set the env var yet.
 * Set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL to enable strict origin checking.
 */
export function validateOrigin(req: Request): boolean {
  const allowed =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  // If no allowed origin is configured, skip the check rather than block all
  // requests. This is intentionally fail-open: configure the env var to enable
  // strict enforcement.
  if (!allowed) return true;

  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;

  try {
    const reqOrigin = new URL(origin).origin;
    const allowedOrigin = new URL(allowed).origin;
    return reqOrigin === allowedOrigin;
  } catch {
    return false;
  }
}
