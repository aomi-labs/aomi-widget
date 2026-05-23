// =============================================================================
// beginAuth — start a fresh auth flow.
// =============================================================================
//
// Generates a state token, writes a `pending_auths` row, returns the URL
// the user should be sent to (the provider's `/start` route on this
// deployment) plus the state token (so the caller can `awaitAuth` on it).
//
// Does NOT contact the provider — that happens when the user actually hits
// /start in their browser. begin is just a reservation.

import type { ProviderRegistry } from "../providers/registry";
import type { Store } from "../store";
import type { AuthCtx, BeginResult } from "../types";

const STATE_TTL_MS = 60 * 60 * 1000; // 1 hour — generous; pending rows are cheap

export interface BeginAuthDeps {
  store: Store;
  providers: ProviderRegistry;
  baseUrl: string;
  randomBytes?: (n: number) => Uint8Array;
}

export async function beginAuth(
  deps: BeginAuthDeps,
  ctx: AuthCtx,
  args: { provider: string },
): Promise<BeginResult> {
  const provider = deps.providers.get(args.provider);
  if (!provider) {
    throw new Error(`auth: unknown provider '${args.provider}'`);
  }

  const stateToken = generateStateToken(deps.randomBytes);
  const now = Date.now();

  await deps.store.insertPendingAuth({
    stateToken,
    userId: ctx.userId,
    provider: args.provider,
    initiator: ctx.initiator,
    startedAt: now,
  });

  const baseUrl = deps.baseUrl.replace(/\/$/, "");
  const authUrl = `${baseUrl}/api/auth/${encodeURIComponent(
    args.provider,
  )}/start?state=${encodeURIComponent(stateToken)}`;

  return {
    stateToken,
    authUrl,
    expiresAt: now + STATE_TTL_MS,
  };
}

function generateStateToken(
  randomBytes?: (n: number) => Uint8Array,
): string {
  const buf = randomBytes
    ? randomBytes(24)
    : crypto.getRandomValues(new Uint8Array(24));
  return base64url(buf);
}

function base64url(buf: Uint8Array): string {
  // Node + Edge runtimes both provide btoa(); we feed it a binary string.
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(s) : Buffer.from(buf).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
