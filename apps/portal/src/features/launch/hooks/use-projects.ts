"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserProject } from "@aomi-labs/deploy";
import {
  deploymentProjects,
  deploymentSdkStatus,
} from "@portal/features/launch/client";
import type { LaunchSdkStatus } from "@portal/features/launch/contracts";
import {
  fetchGitHubSession,
  type GitHubSessionInfo,
} from "@portal/features/launch/dashboard";

export type ProjectsState =
  | { status: "loading" }
  | { status: "signed_out"; sdk: LaunchSdkStatus | null }
  | {
      status: "ready";
      projects: UserProject[];
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
      const { projects } = await deploymentProjects();
      setState({ status: "ready", projects, sdk, github });
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
