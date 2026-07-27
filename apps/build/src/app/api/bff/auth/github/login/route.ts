import { startGitHubOAuth } from "@build/server/github-auth";

export const runtime = "nodejs";

// GET /api/bff/auth/github/login — the single entrypoint for GitHub OAuth.
export async function GET(req: Request) {
  return startGitHubOAuth(req, { kind: "browser" });
}
