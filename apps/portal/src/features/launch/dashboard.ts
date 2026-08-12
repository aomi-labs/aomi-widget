// Client seam for the GitHub-signed-in deploy dashboard. Talks only to the
// same-origin portal BFF (`/api/bff/auth/github/*`, `/api/bff/launch/projects`);
// the GitHub session cookie + service bearer stay server-side.

import {
  githubSigninUrl,
  launchFetchGitHubSession,
  launchProjects,
  launchSignOutGitHub,
} from "./client";
import type {
  GitHubSessionInfo,
  UserProject,
  UserProjectsResult,
} from "@aomi-labs/deploy/launch";

export type { GitHubSessionInfo, UserProject, UserProjectsResult };

/** Where the "Sign in with GitHub" button points. */
export const GITHUB_SIGNIN_URL = githubSigninUrl;

export function fetchGitHubSession(): Promise<GitHubSessionInfo> {
  return launchFetchGitHubSession();
}

export function signOutGitHub(): Promise<void> {
  return launchSignOutGitHub();
}

export function fetchUserProjects(): Promise<UserProjectsResult> {
  return launchProjects();
}
