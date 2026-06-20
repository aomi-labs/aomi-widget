/**
 * CSRF origin validation for BFF route handlers.
 *
 * Compares the request's `origin` (or `referer`) header against the configured
 * app URL. Fails closed: if no header is present or no env var is configured,
 * the request is rejected.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;

  const allowed =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!allowed) return false; // fail-closed: if not configured, reject

  try {
    const reqOrigin = new URL(origin).origin;
    const allowedOrigin = new URL(allowed).origin;
    return reqOrigin === allowedOrigin;
  } catch {
    return false;
  }
}
