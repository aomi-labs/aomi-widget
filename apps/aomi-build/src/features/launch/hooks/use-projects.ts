"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserSource } from "@aomi-labs/deploy";
import {
  deploymentSources,
  deploymentSdkStatus,
} from "@build/features/launch/client";
import type { LaunchSdkStatus } from "@build/features/launch/contracts";
import {
  fetchGitHubSession,
  type GitHubSessionInfo,
} from "@build/features/launch/dashboard";

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

export function useProjects() {
  const [state, setState] = useState<ProjectsState>({ status: "loading" });

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [github, sdk] = await Promise.all([
        fetchGitHubSession(),
        deploymentSdkStatus().catch(() => null),
      ]);
      if (!github.signedIn) {
        setState({ status: "signed_out", sdk });
        return;
      }
      const { sources } = await deploymentSources();
      setState({ status: "ready", sources, sdk, github });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects";
      if (message.toLowerCase().includes("not signed in with github")) {
        setState({ status: "signed_out", sdk: null });
        return;
      }
      setState({ status: "error", error: message });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload: () => void reload() };
}
