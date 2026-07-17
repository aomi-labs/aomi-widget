import {
  issueDeviceAuthLinkGrant,
  type DeviceAuthProvider,
} from "@portal/lib/device-auth-grants";
import { json } from "@portal/lib/aomi-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkGrantRequest = {
  linkIntent?: unknown;
  state?: unknown;
  redirectUri?: unknown;
  provider?: unknown;
  credential?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as LinkGrantRequest | null;
  if (!body) return json(400, { error: "invalid_json" });
  if (
    typeof body.linkIntent !== "string" ||
    typeof body.state !== "string" ||
    typeof body.redirectUri !== "string" ||
    (body.provider !== "privy" && body.provider !== "para")
  ) {
    return json(400, { error: "invalid_request" });
  }

  try {
    const grant = issueDeviceAuthLinkGrant({
      linkIntent: body.linkIntent,
      state: body.state,
      redirectUri: body.redirectUri,
      provider: body.provider as DeviceAuthProvider,
      credential: body.credential,
    });
    return Response.json({
      code: grant.code,
      state: grant.state,
      redirectUri: grant.redirectUri,
      provider: grant.provider,
    });
  } catch (error) {
    return json(400, {
      error: error instanceof Error ? error.message : "invalid_request",
    });
  }
}
