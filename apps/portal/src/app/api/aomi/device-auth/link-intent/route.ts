import {
  issueDeviceAuthLinkIntent,
  type DeviceAuthProvider,
} from "@portal/lib/device-auth-grants";
import { getBetterAuthSession, json } from "@portal/lib/aomi-account/session";
import { identifyDeviceAuthFailure } from "@portal/server/bff/device-auth-errors";
import { portalFailures } from "@portal/server/bff/failures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkIntentRequest = {
  state?: unknown;
  codeChallenge?: unknown;
  redirectUri?: unknown;
  provider?: unknown;
};

const EXPECTED_ERRORS = new Set([
  "invalid_state",
  "invalid_code_challenge",
  "invalid_redirect_uri",
]);

export async function POST(req: Request): Promise<Response> {
  let session: Awaited<ReturnType<typeof getBetterAuthSession>>;
  try {
    session = await getBetterAuthSession(req);
  } catch (error) {
    return portalFailures.handle(
      identifyDeviceAuthFailure(error, {
        routeFamily: "/api/aomi/device-auth/link-intent",
        operation: "device_auth_link_intent",
        expectedCodes: EXPECTED_ERRORS,
      }),
    ).response;
  }
  if (!session?.user?.id) {
    return json(401, { error: "unauthenticated" });
  }

  const body = (await req.json().catch(() => null)) as LinkIntentRequest | null;
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
    const intent = issueDeviceAuthLinkIntent({
      state: body.state,
      codeChallenge: body.codeChallenge,
      redirectUri: body.redirectUri,
      betterAuthUserId: session.user.id,
      provider,
    });
    return Response.json({
      linkIntent: intent.id,
      state: intent.state,
      redirectUri: intent.redirectUri,
      provider: intent.provider,
    });
  } catch (error) {
    return portalFailures.handle(
      identifyDeviceAuthFailure(error, {
        routeFamily: "/api/aomi/device-auth/link-intent",
        operation: "device_auth_link_intent",
        expectedCodes: EXPECTED_ERRORS,
      }),
    ).response;
  }
}
