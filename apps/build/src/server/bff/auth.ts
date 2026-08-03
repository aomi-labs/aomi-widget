import "server-only";

import { NextResponse } from "next/server";
import { validateOrigin } from "@build/lib/csrf";
import {
  type GitHubCliScope,
  type GitHubSession,
  getGitHubCliSessionFromRequest,
  getGitHubSession,
} from "@build/server/cookies/github";

type AuthResult = { session: GitHubSession } | { response: NextResponse };
type AnonymousAuthResult =
  | { session: GitHubSession | null }
  | { response: NextResponse };

export function authorize(
  req: Request,
  options: { write?: boolean; cliScope?: GitHubCliScope; allowAnon: true },
): Promise<AnonymousAuthResult>;
export function authorize(
  req: Request,
  options?: { write?: boolean; cliScope?: GitHubCliScope },
): Promise<AuthResult>;
export async function authorize(
  req: Request,
  options: {
    write?: boolean;
    cliScope?: GitHubCliScope;
    allowAnon?: boolean;
  } = {},
): Promise<AuthResult | AnonymousAuthResult> {
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
  if (
    !session &&
    options.allowAnon &&
    process.env.AOMI_BUILD_ALLOW_ANON === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return { session: null };
  }
  return session
    ? { session }
    : {
        response: NextResponse.json(
          { error: "not signed in with GitHub" },
          { status: 401 },
        ),
      };
}
