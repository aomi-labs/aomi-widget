import { type NextRequest, NextResponse } from "next/server";

import { resolveOrCreateCanonicalUser } from "./account-graph";
import { mintAccountBearer } from "./bearer";
import {
  ProviderCredentialError,
  verifyProviderCredential,
  type ProviderTokenCredential,
} from "./providers";
import { setSessionCookie } from "./session";

/**
 * The shared **auth exchange** route every Aomi BFF mounts at
 * `/api/bff/auth/exchange`. It swaps a verified embedded-wallet provider JWT
 * (Privy/Para) for OUR session: resolve-or-create the canonical user, establish
 * the `aomi_session` cookie, and return only session metadata.
 *
 * The provider subject (a DID) is only the credential *key* — `sub` on our
 * AccountBearer is the canonical UUID the find-only backend resolves. A returning
 * user lands on her existing UUID (keeps her history); only a new
 * `(provider, subject)` mints a new account.
 *
 * Credential verification lives in `./providers` (shaped to match arixon's
 * `@aomi-labs/auth/providers` so his verifiers drop in). This route owns only the
 * exchange *flow* — which is the scaffold that gets reframed under BetterAuth
 * (session-first link). See docs/handoffs/base-siwe-betterauth-dropin.md.
 */
export type Provider = "para" | "privy";

export type ExchangeConfig = {
  /** Providers this app accepts. Defaults to both Privy and Para. */
  providers?: ReadonlyArray<Provider>;
};

type ExchangeBody = {
  provider?: unknown;
  provider_jwt?: unknown;
  providerJwt?: unknown;
  jwt?: unknown;
  key_id?: unknown;
  keyId?: unknown;
};

/**
 * Build the `POST` handler for an app's `app/api/bff/auth/exchange/route.ts`:
 *
 * ```ts
 * export const POST = createAuthExchangeRoute({ providers: ["privy", "para"] });
 * export const runtime = "nodejs";
 * ```
 */
export function createAuthExchangeRoute(config: ExchangeConfig = {}) {
  const enabled = new Set<Provider>(config.providers ?? ["privy", "para"]);

  return async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      const body = (await request.json()) as ExchangeBody;
      const credential = toCredential(body, enabled);
      const { provider, token } = await verifyProviderCredential(credential);

      const { userId } = await resolveOrCreateCanonicalUser({
        provider,
        subject: token.subject,
      });

      // Validate that this BFF can mint the backend bearer before reporting the
      // session ready. The token itself stays server-side; the proxy mints and
      // injects one for each backend request.
      await mintAccountBearer(userId);

      const response = NextResponse.json({
        ok: true,
        user_id: userId,
      });
      await setSessionCookie(response, userId);
      return response;
    } catch (error) {
      const status =
        error instanceof ProviderCredentialError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : "Account exchange failed";
      return NextResponse.json({ error: message }, { status });
    }
  };
}

/** Normalize the request body into a provider credential (his shape). */
function toCredential(
  body: ExchangeBody,
  enabled: Set<Provider>,
): ProviderTokenCredential {
  const provider = stringValue(body.provider)?.toLowerCase();
  const providerToken = stringValue(
    body.provider_jwt ?? body.providerJwt ?? body.jwt,
  );
  if ((provider !== "privy" && provider !== "para") || !providerToken) {
    throw new ProviderCredentialError(400, "Missing provider credential");
  }
  if (!enabled.has(provider)) {
    throw new ProviderCredentialError(400, `Provider ${provider} is not enabled`);
  }
  return {
    provider,
    providerToken,
    keyId: stringValue(body.key_id ?? body.keyId),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
