"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserSource } from "@aomi-labs/deploy";
import { deploymentHistory } from "@build/features/launch/client";
import {
  commitFromDeploymentId,
  type TimelineDeployment,
} from "./deployment-timeline";
import { useProjects, type ProjectsState } from "../../hooks/use-projects";

export type GlobalDeployment = TimelineDeployment & {
  sourceId: number;
  repositoryLink: string | null;
};

type RecordsState =
  | { status: "idle" | "loading" }
  | { status: "ready"; deployments: GlobalDeployment[] }
  | { status: "error"; error: string; deployments: GlobalDeployment[] };

// One history call per source (DB-backed on the backend) instead of one
// records call per app — a user with S sources and A apps each pays S
// requests here, not S×A.
async function loadSourceDeployments(
  source: UserSource,
): Promise<GlobalDeployment[]> {
  const { deployments } = await deploymentHistory({
    appSourceId: source.id,
    limit: 20,
  });
  return deployments.flatMap((deployment) => {
    if (!deployment.deploymentId) return [];
    return [
      {
        deploymentId: deployment.deploymentId,
        commit:
          deployment.commitHash ??
          commitFromDeploymentId(deployment.deploymentId),
        apps: deployment.apps.map((app) => app.name),
        releaseTags: deployment.releaseTags,
        current: deployment.apps.some((app) => app.isActive),
        actor: null,
        sdkVersion: deployment.sdkVersion ?? null,
        createdAt: deployment.createdAt ?? 0,
        sourceId: source.id,
        repositoryLink: source.repositoryLink ?? null,
      },
    ];
  });
}

export function useGlobalDeploymentRecords() {
  const { state: projectsState, reload: reloadProjects } = useProjects();
  const [recordsState, setRecordsState] = useState<RecordsState>({
    status: "idle",
  });

  const sources = useMemo(
    () => (projectsState.status === "ready" ? projectsState.sources : []),
    [projectsState],
  );

  const loadRecords = useCallback(async (readyState: ProjectsState) => {
    if (readyState.status !== "ready") return;
    setRecordsState({ status: "loading" });
    const settled = await Promise.allSettled(
      readyState.sources.map((source) => loadSourceDeployments(source)),
    );
    const deployments = settled
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .sort((a, b) => b.createdAt - a.createdAt);
    const failures = settled.filter((result) => result.status === "rejected");
    if (failures.length > 0 && deployments.length === 0) {
      const first = failures[0] as PromiseRejectedResult;
      setRecordsState({
        status: "error",
        error:
          first.reason instanceof Error
            ? first.reason.message
            : "Failed to load deployment records",
        deployments: [],
      });
      return;
    }
    setRecordsState({ status: "ready", deployments });
  }, []);

  useEffect(() => {
    void loadRecords(projectsState);
  }, [projectsState, loadRecords]);

  const reload = useCallback(() => {
    reloadProjects();
  }, [reloadProjects]);

  return { projectsState, recordsState, sources, reload };
}
