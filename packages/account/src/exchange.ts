import { type NextRequest, NextResponse } from "next/server";

import { resolveOrCreateCanonicalUser } from "./account-graph";
import { mintAccountBearer } from "./bearer";
import {
  ProviderCredentialError,
  verifyProviderCredential,
  type ProviderTokenCredential,
} from "./providers";
import { setSessionCookie } from "./session";

export type Provider = "para" | "privy";

export type ExchangeConfig = {
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
