"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserSource } from "@aomi-labs/deploy";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  deploymentSources,
  deploymentSdkStatus,
} from "@build/features/launch/client";
import type { LaunchSdkStatus } from "@build/features/launch/contracts";
import type { GitHubSessionInfo } from "@build/features/launch/dashboard";
import { buildQueryKeys, githubAccountKey } from "../query-keys";

export type ProjectsState =
  | { status: "loading" }
  | { status: "signed_out"; sdk: LaunchSdkStatus | null }
  | {
      status: "ready";
      sources: UserSource[];
      sdk: LaunchSdkStatus | null;
      github: GitHubSessionInfo;
    }
  | { status: "error"; error: string };

function hasApps(source: UserSource) {
  return source.apps.length > 0;
}

export function useProjects() {
  // The GitHub session comes from the shell-level provider — reusing it here
  // avoids a second `/auth/github/status` round trip on every page mount.
  const { account } = useGitHubSession();
  const accountKey = githubAccountKey(account.githubLogin);
  const sdk = useQuery({
    queryKey: buildQueryKeys.sdkStatus(),
    queryFn: () => deploymentSdkStatus().catch(() => null),
    enabled: !account.loading,
    staleTime: 5 * 60 * 1000,
  });
  const projects = useQuery({
    queryKey: buildQueryKeys.projects(accountKey ?? "unavailable"),
    queryFn: () => deploymentSources(),
    enabled: account.signedIn && accountKey !== null,
    staleTime: 60 * 1000,
  });

  const state = useMemo<ProjectsState>(() => {
    if (account.loading) return { status: "loading" };
    if (!account.signedIn) {
      return { status: "signed_out", sdk: sdk.data ?? null };
    }
    if (!accountKey) {
      return { status: "error", error: "GitHub account login is missing" };
    }
    if (projects.isPending) return { status: "loading" };
    if (projects.error) {
      const message =
        projects.error instanceof Error
          ? projects.error.message
          : "Failed to load projects";
      if (message.toLowerCase().includes("not signed in with github")) {
        return { status: "signed_out", sdk: sdk.data ?? null };
      }
      return { status: "error", error: message };
    }
    const { loading: _loading, ...github } = account;
    return {
      status: "ready",
      sources: (projects.data?.sources ?? []).filter(hasApps),
      sdk: sdk.data ?? null,
      github,
    };
  }, [
    account,
    accountKey,
    projects.data,
    projects.error,
    projects.isPending,
    sdk.data,
  ]);

  const reload = useCallback(() => {
    void Promise.all([projects.refetch(), sdk.refetch()]);
  }, [projects, sdk]);

  return { state, reload };
}
