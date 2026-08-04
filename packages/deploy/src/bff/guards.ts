// =============================================================================
// Request guards — rate limiting and CSRF origin validation.
//
// These are the library defaults `createLaunchRoutes` uses when the host does
// not inject its own. Both are deliberately dependency-free:
//
// - Rate limiting is in-process (one Map per process). Fine for a single BFF
//   instance; a multi-instance deployment that needs shared counters should
//   inject its own guard.
// - Origin validation compares the `origin`/`referer` header to the request
//   URL, so no allowed-hosts env var is needed.
// =============================================================================

/** A guard returns a blocking Response, or null to let the request through. */
export type RouteGuard = (req: Request) => Response | null;

export type LaunchGuards = {
  /** Applied to read routes (status, app, projects). */
  read: RouteGuard;
  /** Applied to write routes (preflight, deploy, create, activate, redeploy). */
  write: RouteGuard;
};

const WINDOW_MS = 60_000;
// 60 req/min accommodates the full onboarding flow: preflight + deploy +
// ~20 status polls + activate + ~30 verify checks = ~53 requests.
const MAX_REQUESTS = 60;

interface WindowEntry {
  count: number;
  windowStart: number;
}

/**
 * Extract the client IP from a Request.
 * `x-forwarded-for` (first value) → `x-real-ip` → `"unknown"`.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Rolling-window in-process rate limiter keyed by client IP. */
export function createRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
}): (ip: string) => { allowed: boolean } {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const maxRequests = options?.maxRequests ?? MAX_REQUESTS;
  const windows = new Map<string, WindowEntry>();

  return function checkRateLimit(ip: string): { allowed: boolean } {
    const now = Date.now();
    const entry = windows.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      windows.set(ip, { count: 1, windowStart: now });
      return { allowed: true };
    }

    entry.count++;
    return { allowed: entry.count <= maxRequests };
  };
}

/**
 * CSRF origin validation: the request's `origin` (or `referer`) must match the
 * request URL's origin. Same-origin BFF calls always carry one of the two.
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

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tooManyRequests(): Response {
  return jsonResponse({ error: "Too many requests" }, 429);
}

function forbidden(): Response {
  return jsonResponse({ error: "Forbidden" }, 403);
}

/** The default guards: per-IP rate limit on reads, + same-origin on writes. */
export function createDefaultGuards(options?: {
  windowMs?: number;
  maxRequests?: number;
}): LaunchGuards {
  const checkRateLimit = createRateLimiter(options);

  const read: RouteGuard = (req) =>
    checkRateLimit(getClientIp(req)).allowed ? null : tooManyRequests();

  const write: RouteGuard = (req) =>
    read(req) ?? (validateOrigin(req) ? null : forbidden());

  return { read, write };
}
