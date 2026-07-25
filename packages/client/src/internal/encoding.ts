/**
 * Decode a base64url string to its UTF-8 text. Prefers the browser `atob`
 * and falls back to Node's `Buffer` so the decode works in both runtimes.
 */
export function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(normalized);
  }
  type BufferLike = {
    from(
      input: string,
      encoding: "base64",
    ): {
      toString(encoding: "utf8"): string;
    };
  };
  const BufferCtor = (globalThis as typeof globalThis & { Buffer?: BufferLike })
    .Buffer;
  if (BufferCtor) {
    return BufferCtor.from(normalized, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder is available");
}

/**
 * Extract the `sub` claim from an unverified JWT, or null when the token has
 * no payload segment / no usable subject. Used only as a cache-partition hint;
 * the server remains the authority that verifies the token.
 */
export function decodeJwtSubject(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const subject = (JSON.parse(decodeBase64Url(payload)) as { sub?: unknown })
      .sub;
    return typeof subject === "string" && subject.trim()
      ? subject.trim()
      : null;
  } catch {
    return null;
  }
}
