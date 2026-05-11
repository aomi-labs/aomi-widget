/**
 * Pure helpers for the payment-aware fetch dispatcher.
 *
 * Kept separate from `payment-client-options.ts` so they can be unit-tested
 * without React, wagmi, or mppx.
 */

export type PaymentToggleFlags = {
  mppEnabled: boolean;
  x402Enabled: boolean;
};

const PAYMENT_METHOD_RE = /[?&]payment_method=/;
const ABSOLUTE_URL_RE = /^https?:\/\//i;

/**
 * Read the explicit `payment_method=` value from any `RequestInfo | URL`.
 * Returns `null` when the request is on Auto (no method param). Used by the
 * dispatcher to short-circuit straight to a wrapper for explicit selection,
 * avoiding the dispatcher's own probe round-trip on top of the wrapper's.
 */
export function readExplicitMethod(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    if (!PAYMENT_METHOD_RE.test(input)) return null;
    if (ABSOLUTE_URL_RE.test(input)) {
      return new URL(input).searchParams.get("payment_method");
    }
    // Relative path: build against a placeholder origin so URL parsing works.
    const probe = new URL(input, "http://_internal_/");
    return probe.searchParams.get("payment_method");
  }
  if (input instanceof URL) {
    return input.searchParams.get("payment_method");
  }
  return new URL(input.url).searchParams.get("payment_method");
}

/**
 * Narrow an Auto chat request to `?payment_method=coinbase` when the user has
 * MPP disabled and x402 enabled. Without this, the backend's default chain
 * (`null → byok → tempo → coinbase`, see product-mono `chat.rs:31`) would emit
 * a tempo 402 first and fall through to the dispatcher with no signer.
 *
 * The function is a no-op for any other toggle combination, and a no-op when
 * the URL already carries `payment_method=` (per-thread `<PaymentSelect>` wins).
 *
 * Handles all three `RequestInfo | URL` input shapes:
 *   - `string`  — absolute or relative; uses naive `?`/`&` append for relative
 *                 because `new URL("/api/chat")` throws without a base.
 *   - `URL`     — always absolute per WHATWG; uses `.href` (URL has no `.url`).
 *   - `Request` — `request.url` is always absolute; rebuild as a new `Request`
 *                 preserving headers/method/body (the caller is responsible
 *                 for cloning before the first fetch if it needs to re-read).
 */
export function narrowAutoMethod(
  input: RequestInfo | URL,
  flags: PaymentToggleFlags,
): RequestInfo | URL {
  if (flags.mppEnabled || !flags.x402Enabled) return input;

  if (typeof input === "string") {
    if (PAYMENT_METHOD_RE.test(input)) return input;
    if (!ABSOLUTE_URL_RE.test(input)) {
      return (
        input + (input.includes("?") ? "&" : "?") + "payment_method=coinbase"
      );
    }
    const url = new URL(input);
    url.searchParams.set("payment_method", "coinbase");
    return url.toString();
  }

  if (input instanceof URL) {
    if (input.searchParams.has("payment_method")) return input;
    const url = new URL(input.href);
    url.searchParams.set("payment_method", "coinbase");
    return url;
  }

  // Request — `input.url` is always a fully-resolved absolute URL.
  const url = new URL(input.url);
  if (url.searchParams.has("payment_method")) return input;
  url.searchParams.set("payment_method", "coinbase");
  return new Request(url.toString(), input);
}
