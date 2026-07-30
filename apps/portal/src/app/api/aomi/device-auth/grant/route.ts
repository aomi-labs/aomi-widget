import {
  issueDeviceAuthGrant,
  type DeviceAuthProvider,
} from "@portal/lib/device-auth-grants";
import { getBetterAuthSession, json } from "@portal/lib/aomi-account/session";
import { identifyDeviceAuthFailure } from "@portal/server/bff/device-auth-errors";
import { portalFailures } from "@portal/server/bff/failures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GrantRequest = {
  state?: unknown;
  codeChallenge?: unknown;
  redirectUri?: unknown;
  provider?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  const session = await getBetterAuthSession(req);
  const sessionToken = session?.session?.token;
  if (!session?.user?.id || typeof sessionToken !== "string") {
    return json(401, { error: "unauthenticated" });
  }

  const body = (await req.json().catch(() => null)) as GrantRequest | null;
  if (!body) return json(400, { error: "invalid_json" });
  if (
    typeof body.state !== "string" ||
    typeof body.codeChallenge !== "string" ||
    typeof body.redirectUri !== "string"
  ) {
    return json(400, { error: "invalid_request" });
  }
  const provider =
    body.provider === "privy" || body.provider === "para"
      ? (body.provider as DeviceAuthProvider)
      : undefined;

  try {
    const grant = issueDeviceAuthGrant({
      state: body.state,
      codeChallenge: body.codeChallenge,
      redirectUri: body.redirectUri,
      sessionToken,
      expiresAt: session.session?.expiresAt,
      betterAuthUserId: session.user.id,
      provider,
    });
    return Response.json({
      code: grant.code,
      state: grant.state,
      redirectUri: grant.redirectUri,
      expiresAt: grant.expiresAt,
    });
  } catch (error) {
    return portalFailures.handle(
      identifyDeviceAuthFailure(error, {
        routeFamily: "/api/aomi/device-auth/grant",
        operation: "device_auth_grant",
      }),
    ).response;
  }
}
