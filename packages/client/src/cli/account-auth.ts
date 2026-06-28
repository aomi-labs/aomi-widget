import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";

import type { GetAccountBearer } from "../types";

// The BFF cookies the CLI speaks to. `aomi_session` is the long-lived session we
// store; `aomi_siwe_nonce` is the single-use nonce the verify route expects back.
const SESSION_COOKIE = "aomi_session";
const NONCE_COOKIE = "aomi_siwe_nonce";

// Default SIWE chain when the session has none configured. Base mainnet — the
// chain whose BFF mounts the SIWE routes today. EOA recovery ignores it; it only
// shapes the EIP-4361 message.
const DEFAULT_SIWE_CHAIN_ID = 8453;

// Re-mint slightly early so an in-flight backend request never races expiry.
const BEARER_EXPIRY_SKEW_SECONDS = 30;

/**
 * Non-interactive **SIWE login** against a BFF: prove ownership of the CLI's EVM
 * key, receive OUR `aomi_session`, and return that session token. The CLI then
 * holds the session (long-lived, 7d) and pulls short-lived AccountBearers from
 * `/api/bff/auth/token` (see {@link createSessionGetAccountBearer}) — the same
 * two-token loop the browser gets, minus the human click.
 *
 * Drop-in to arixon's BetterAuth (`codex/widget-auth-pre-rust`): this hits our
 * pre-BetterAuth routes (`/api/bff/auth/siwe/{nonce,verify}`); post-merge it
 * repoints to the BetterAuth SIWE plugin and the returned token becomes a
 * `bearer()`-plugin session token. See docs/handoffs/bff-betterauth-integration.md §3.
 */
export async function siweLogin(input: {
  baseUrl: string;
  privateKey: string;
  chainId?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ sessionCookie: string; address: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const account = privateKeyToAccount(input.privateKey as `0x${string}`);
  const base = input.baseUrl.replace(/\/+$/, "");
  const origin = new URL(base);
  const chainId = input.chainId ?? DEFAULT_SIWE_CHAIN_ID;

  // 1. Fetch a single-use nonce.
  const nonceRes = await fetchImpl(`${base}/api/bff/auth/siwe/nonce`);
  if (!nonceRes.ok) {
    throw new Error(`SIWE nonce request failed: HTTP ${nonceRes.status}`);
  }
  const { nonce } = (await nonceRes.json()) as { nonce?: string };
  if (!nonce) throw new Error("SIWE nonce response missing nonce");

  // 2. Build + sign the EIP-4361 message. `domain` must equal the request host
  //    the verify route validates against (`request.headers.get("host")`).
  const message = createSiweMessage({
    address: account.address,
    chainId,
    domain: origin.host,
    uri: origin.origin,
    nonce,
    version: "1",
    statement: "Sign in to Aomi.",
  });
  const signature = await account.signMessage({ message });

  // 3. Verify → session. Replay the nonce as a cookie (the verify route reads it
  //    from `aomi_siwe_nonce`; its value equals the JSON nonce we just got).
  const verifyRes = await fetchImpl(`${base}/api/bff/auth/siwe/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${NONCE_COOKIE}=${nonce}`,
    },
    body: JSON.stringify({ message, signature }),
  });
  if (!verifyRes.ok) {
    const detail = await verifyRes.text().catch(() => "");
    throw new Error(
      `SIWE verify failed: HTTP ${verifyRes.status}${detail ? ` — ${detail}` : ""}`,
    );
  }
  const sessionCookie = extractSetCookie(verifyRes, SESSION_COOKIE);
  if (!sessionCookie) {
    throw new Error("SIWE verify succeeded but no aomi_session cookie was set");
  }
  return { sessionCookie, address: account.address };
}

/**
 * A {@link GetAccountBearer} backed by a stored BFF session: fetch a short-lived
 * AccountBearer from `/api/bff/auth/token`, cache it until just before expiry,
 * and re-fetch on `forceRefresh` (the 401 path) or when the cache is stale. The
 * session rides as `Authorization: Bearer` — the header shape arixon's `bearer()`
 * plugin uses — so migrating onto BetterAuth is a URL swap only.
 *
 * Returns `undefined` (not a throw) when no bearer can be obtained, so the
 * client degrades to anonymous rather than failing the request. A persistent
 * 401 here means the session itself expired — the user re-runs `aomi login`.
 */
export function createSessionGetAccountBearer(input: {
  baseUrl: string;
  sessionCookie: string;
  fetchImpl?: typeof fetch;
}): GetAccountBearer {
  const fetchImpl = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/+$/, "");
  let cached: { bearer: string; expiresAt: number } | undefined;

  return async (options) => {
    const now = Math.floor(Date.now() / 1000);
    if (
      !options?.forceRefresh &&
      cached &&
      cached.expiresAt - BEARER_EXPIRY_SKEW_SECONDS > now
    ) {
      return cached.bearer;
    }

    const res = await fetchImpl(`${base}/api/bff/auth/token`, {
      headers: { Authorization: `Bearer ${input.sessionCookie}` },
    });
    if (!res.ok) {
      cached = undefined;
      return undefined;
    }
    const data = (await res.json()) as {
      bearer?: string;
      expires_at?: number;
    };
    if (!data.bearer) {
      cached = undefined;
      return undefined;
    }
    cached = {
      bearer: data.bearer,
      // Fall back to a conservative 14-min life if the BFF omits expiry.
      expiresAt: data.expires_at ?? now + 14 * 60,
    };
    return cached.bearer;
  };
}

/** Pull a named cookie value out of a response's `Set-Cookie` header(s). */
function extractSetCookie(
  response: Response,
  name: string,
): string | undefined {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = headers.getSetCookie
    ? headers.getSetCookie()
    : (response.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=)/);
  const prefix = `${name}=`;
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length).split(";", 1)[0];
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}
