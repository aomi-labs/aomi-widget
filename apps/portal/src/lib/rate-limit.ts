/**
 * In-process per-IP rate limiting for BFF route handlers.
 *
 * Uses a rolling 60-second window with a maximum of 10 requests per IP.
 * Note: This is module-level (one Map per process). In a multi-instance
 * deployment each instance maintains its own counters — acceptable for the
 * current use case.
 */

const WINDOW_MS = 60_000; // 60 seconds
// 60 req/min accommodates the full onboarding flow: preflight + deploy +
// ~20 status polls + activate + ~30 verify checks = ~53 requests.
const MAX_REQUESTS = 60;

interface WindowEntry {
  count: number;
  windowStart: number;
}

// In-process map — one entry per IP address
const windows = new Map<string, WindowEntry>();

/**
 * Check whether the given IP is within the allowed rate limit.
 * Starts a new window if none exists or the current window has expired.
 */
export function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = windows.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // No entry or window expired — start a fresh window
    windows.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count++;
  return { allowed: entry.count <= MAX_REQUESTS };
}

/**
 * Extract the client IP from a Request object.
 *
 * Priority order:
 * 1. `x-forwarded-for` (first value when comma-separated)
 * 2. `x-real-ip`
 * 3. `"unknown"` as a safe fallback
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
