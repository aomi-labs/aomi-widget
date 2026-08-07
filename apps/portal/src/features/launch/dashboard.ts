// Client seam for the GitHub-signed-in deploy dashboard. Talks only to the
// same-origin portal BFF (`/api/bff/auth/github/*`, `/api/bff/launch/projects`);
// the GitHub session cookie + service bearer stay server-side.

import { API_PATHS } from "@portal/lib/api-paths";
import type { UserProject } from "@aomi-labs/deploy";

export type { UserProject };

export interface GitHubSessionInfo {
  signedIn: boolean;
  githubLogin: string | null;
  /** Present when the one-shot App is already installed (skip-install). */
  installationId?: string | null;
}

/** Where the "Sign in with GitHub" button points. */
export const GITHUB_SIGNIN_URL = API_PATHS.bff.auth.github.login;

export async function fetchGitHubSession(): Promise<GitHubSessionInfo> {
  try {
    const res = await fetch(API_PATHS.bff.auth.github.status, {
      cache: "no-store",
    });
    if (!res.ok) return { signedIn: false, githubLogin: null };
    return (await res.json()) as GitHubSessionInfo;
  } catch {
    return { signedIn: false, githubLogin: null };
  }
}

export async function signOutGitHub(): Promise<void> {
  await fetch(API_PATHS.bff.auth.github.signout, { method: "POST" });
}

export interface UserProjectsResult {
  projects: UserProject[];
  githubLogin: string | null;
}

export async function fetchUserProjects(): Promise<UserProjectsResult> {
  const res = await fetch(API_PATHS.bff.launch.projects, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as
    | UserProjectsResult
    | { error?: string };
  if (!res.ok) {
    const message =
      "error" in json && json.error
        ? json.error
        : `failed to load projects (${res.status})`;
    throw new Error(message);
  }
  return json as UserProjectsResult;
}
