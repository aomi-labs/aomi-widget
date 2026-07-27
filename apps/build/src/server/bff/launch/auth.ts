import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import { validateOrigin } from "@build/lib/csrf";
import {
  type GitHubCliScope,
  type GitHubSession,
  getGitHubCliSessionFromRequest,
  getGitHubSession,
} from "@build/server/cookies/github";

type AuthResult = { session: GitHubSession } | { response: NextResponse };

export async function authorize(
  req: Request,
  options: { write?: boolean; cliScope?: GitHubCliScope } = {},
): Promise<AuthResult> {
  if (!checkRateLimit(getClientIp(req)).allowed) {
    return {
      response: NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      ),
    };
  }
  if (options.cliScope) {
    const cli = await getGitHubCliSessionFromRequest(req, options.cliScope);
    if (cli) return { session: cli };
  }
  if (options.write && !validateOrigin(req)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  const session = await getGitHubSession();
  return session
    ? { session }
    : {
        response: NextResponse.json(
          { error: "not signed in with GitHub" },
          { status: 401 },
        ),
      };
}

export function rateLimit(req: Request): NextResponse | null {
  return checkRateLimit(getClientIp(req)).allowed
    ? null
    : NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
