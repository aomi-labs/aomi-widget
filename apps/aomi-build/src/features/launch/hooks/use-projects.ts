"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserSource } from "@aomi-labs/deploy";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  deploymentSources,
  deploymentSdkStatus,
} from "@build/features/launch/client";
import type { LaunchSdkStatus } from "@build/features/launch/contracts";
import type { GitHubSessionInfo } from "@build/features/launch/dashboard";

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
  // The GitHub session comes from the shell-level provider — reusing it here
  // avoids a second `/auth/github/status` round trip on every page mount.
  const { account } = useGitHubSession();
  const [state, setState] = useState<ProjectsState>({ status: "loading" });

  const reload = useCallback(async () => {
    if (account.loading) return;
    setState({ status: "loading" });
    const { loading: _loading, ...github } = account;
    try {
      const sdkPromise = deploymentSdkStatus().catch(() => null);
      if (!github.signedIn) {
        setState({ status: "signed_out", sdk: await sdkPromise });
        return;
      }
      const [{ sources }, sdk] = await Promise.all([
        deploymentSources(),
        sdkPromise,
      ]);
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
  }, [account]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload: () => void reload() };
}
