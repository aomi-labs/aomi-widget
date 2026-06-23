import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  getDeploymentClient,
  onboardErrorResponse,
} from "@portal/lib/onboard-deploy";
import { getGitHubSession } from "@portal/lib/aomi-account/github-session";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";

// GET /api/onboard/sources — the signed-in user's source repos + their apps,
// merged across installations. Scoped to the github_user_id in the session
// cookie; a client can never ask for someone else's sources.
export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }

  try {
    const client = await getDeploymentClient();
    const sources = await client.listUserSources({
      githubUserId: session.githubUserId,
    });
    return NextResponse.json({ sources, githubLogin: session.githubLogin });
  } catch (err) {
    return onboardErrorResponse(err);
  }
}
