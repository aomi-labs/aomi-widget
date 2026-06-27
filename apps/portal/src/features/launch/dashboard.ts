// Client seam for the GitHub-signed-in deploy dashboard. Talks only to the
// same-origin portal BFF (`/api/bff/auth/github/*`, `/api/bff/launch/sources`); the
// GitHub session cookie + service bearer stay server-side.

import type { UserSource } from "@aomi-labs/deploy";

export type { UserSource };

export interface GitHubSessionInfo {
  signedIn: boolean;
  githubLogin: string | null;
}

/** Where the "Sign in with GitHub" button points. */
export const GITHUB_SIGNIN_URL = "/api/bff/auth/github/login";

export async function fetchGitHubSession(): Promise<GitHubSessionInfo> {
  try {
    const res = await fetch("/api/bff/auth/github/status", {
      cache: "no-store",
    });
    if (!res.ok) return { signedIn: false, githubLogin: null };
    return (await res.json()) as GitHubSessionInfo;
  } catch {
    return { signedIn: false, githubLogin: null };
  }
}

export async function signOutGitHub(): Promise<void> {
  await fetch("/api/bff/auth/github/signout", { method: "POST" });
}

export interface UserSourcesResult {
  sources: UserSource[];
  githubLogin: string | null;
}

export async function fetchUserSources(): Promise<UserSourcesResult> {
  const res = await fetch("/api/bff/launch/sources", { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as
    | UserSourcesResult
    | { error?: string };
  if (!res.ok) {
    const message =
      "error" in json && json.error
        ? json.error
        : `failed to load sources (${res.status})`;
    throw new Error(message);
  }
  return json as UserSourcesResult;
}
