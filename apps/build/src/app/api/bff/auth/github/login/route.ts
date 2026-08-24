import { startGitHubOAuth } from "@build/server/github-auth";

export const runtime = "nodejs";

function browserReturnTo(req: Request): string | undefined {
  const requestUrl = new URL(req.url);
  const candidates = [
    requestUrl.searchParams.get("return_to"),
    req.headers.get("referer"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, requestUrl.origin);
      if (
        url.origin === requestUrl.origin &&
        `${url.pathname}${url.search}`.length <= 2048
      ) {
        return `${url.pathname}${url.search}`;
      }
    } catch {
      // Ignore malformed return locations.
    }
  }
  return undefined;
}

// GET /api/bff/auth/github/login — the single entrypoint for GitHub OAuth.
export async function GET(req: Request) {
  return startGitHubOAuth(req, {
    kind: "browser",
    returnTo: browserReturnTo(req),
  });
}
