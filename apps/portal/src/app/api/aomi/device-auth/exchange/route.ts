import { exchangeDeviceAuthGrant } from "@portal/lib/device-auth-grants";
import { json } from "@portal/lib/aomi-account/session";
import { exchangeProviderForExistingSession } from "@aomi-labs/account/account";
import type { AomiAccountCredential } from "@aomi-labs/account";
import { identifyDeviceAuthFailure } from "@portal/server/bff/device-auth-errors";
import { portalFailures } from "@portal/server/bff/failures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExchangeRequest = {
  code?: unknown;
  state?: unknown;
  codeVerifier?: unknown;
  redirectUri?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as ExchangeRequest | null;
  if (!body) return json(400, { error: "invalid_json" });
  if (
    typeof body.code !== "string" ||
    typeof body.state !== "string" ||
    typeof body.codeVerifier !== "string" ||
    typeof body.redirectUri !== "string"
  ) {
    return json(400, { error: "invalid_request" });
  }

  const grant = exchangeDeviceAuthGrant({
    code: body.code,
    state: body.state,
    codeVerifier: body.codeVerifier,
    redirectUri: body.redirectUri,
  });
  if (!grant) return json(400, { error: "invalid_or_expired_code" });

  if (grant.purpose === "link") {
    if (!grant.betterAuthUserId) {
      return json(400, { error: "invalid_or_expired_code" });
    }
    try {
      const result = await exchangeProviderForExistingSession({
        betterAuthUserId: grant.betterAuthUserId,
        credential: grant.credential as AomiAccountCredential,
      });
      return Response.json({
        ...result,
        provider: grant.provider,
      });
    } catch (error) {
      return portalFailures.handle(
        identifyDeviceAuthFailure(error, {
          routeFamily: "/api/aomi/device-auth/exchange",
          operation: "device_auth_exchange",
          fallbackError: "provider_exchange_failed",
        }),
      ).response;
    }
  }

  return Response.json({
    sessionToken: grant.sessionToken,
    expiresAt: grant.expiresAt,
    betterAuthUserId: grant.betterAuthUserId,
    provider: grant.provider,
  });
}
