// =============================================================================
// Request plumbing for BFF handlers — cookies, guards, and input validators.
//
// The BFF handlers are plain `(Request) => Response` functions, so cookies are
// read from the `cookie` header and written via `Set-Cookie` — no dependency
// on `next/headers` or any framework cookie jar.
//
// Guards are the library defaults `createLaunchRoutes` uses when the host does
// not inject its own. Both are deliberately dependency-free:
//
// - Rate limiting is in-process (one Map per process). Fine for a single BFF
//   instance; a multi-instance deployment that needs shared counters should
//   inject its own guard.
// - Origin validation compares the `origin`/`referer` header to the request
//   URL, so no allowed-hosts env var is needed.
//
// Validators are type guards that return `true` only when the value matches
// the expected shape. All checks fail-closed on `unknown` input.
// =============================================================================

/** Read one cookie value from a Request's `cookie` header. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

export type CookieAttributes = {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

/** Serialize a `Set-Cookie` header value. */
export function serializeCookie(
  name: string,
  value: string,
  attrs: CookieAttributes = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${attrs.path ?? "/"}`);
  if (attrs.maxAge !== undefined) parts.push(`Max-Age=${attrs.maxAge}`);
  if (attrs.httpOnly ?? true) parts.push("HttpOnly");
  if (attrs.secure) parts.push("Secure");
  const sameSite = attrs.sameSite ?? "lax";
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  return parts.join("; ");
}

/** Append a `Set-Cookie` header to a Response (Responses are header-mutable). */
export function appendSetCookie(res: Response, cookie: string): Response {
  res.headers.append("Set-Cookie", cookie);
  return res;
}

/** Default `Secure` flag: on in production unless the host says otherwise. */
export function defaultSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

type WebCryptoLike = {
  getRandomValues(array: Uint8Array): Uint8Array;
};

/** Random hex string (WebCrypto with a Node fallback for Node 18). */
export async function randomHex(byteLength: number): Promise<string> {
  const bytes = new Uint8Array(byteLength);
  const webCrypto = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    const { webcrypto } = await import("node:crypto");
    (webcrypto as unknown as WebCryptoLike).getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

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

/**
 * Accepts numeric installation IDs like `"123456789"`.
 * Rejects empty strings, floats, negative numbers, and non-digit characters.
 */
export function isValidInstallationId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}

/**
 * Accepts `"owner/name"` — exactly two non-empty segments separated by one `/`.
 * Rejects trailing/leading slashes, multiple slashes, and empty segments.
 */
export function isValidRepo(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.trim().split("/");
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

/** Rejects empty strings and whitespace-only strings. */
export function isValidDeploymentId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Accepts an array of strings where every element is non-empty after trimming.
 * Also accepts an empty array (no tags yet — the backend handles that case).
 */
export function isValidReleaseTags(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((tag) => typeof tag === "string" && tag.trim().length > 0)
  );
}

/** Positive safe integer — project ids and app ids. */
export function isValidProjectId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
