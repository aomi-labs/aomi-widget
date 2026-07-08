// =============================================================================
// Framework-free cookie helpers.
//
// The BFF handlers are plain `(Request) => Response` functions, so cookies are
// read from the `cookie` header and written via `Set-Cookie` — no dependency
// on `next/headers` or any framework cookie jar.
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
