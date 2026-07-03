import { exchangeDeviceAuthGrant } from "@portal/lib/device-auth-grants";
import { json } from "@portal/lib/aomi-account/session";

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

  return Response.json({
    sessionToken: grant.sessionToken,
    expiresAt: grant.expiresAt,
    betterAuthUserId: grant.betterAuthUserId,
    provider: grant.provider,
  });
}
