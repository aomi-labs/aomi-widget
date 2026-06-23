/**
 * CSRF origin validation for BFF route handlers.
 *
 * Compares the request's `origin` (or `referer`) header against the request URL.
 * No deployment env var is required: each environment's public host is already
 * present in the incoming request.
 */
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;

  try {
    const reqOrigin = new URL(origin).origin;
    const allowedOrigin = new URL(req.url).origin;
    return reqOrigin === allowedOrigin;
  } catch {
    return false;
  }
}
