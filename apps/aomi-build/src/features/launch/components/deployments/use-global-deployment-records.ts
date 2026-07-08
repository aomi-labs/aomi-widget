"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserSource } from "@aomi-labs/deploy";
import { deploymentRecords } from "@build/features/launch/client";
import type { DeploymentRecord } from "@build/features/launch/contracts";
import {
  buildDeploymentList,
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

async function loadSourceDeployments(
  source: UserSource,
): Promise<GlobalDeployment[]> {
  const entries = await Promise.all(
    source.apps.map(async (app) => {
      const result = await deploymentRecords({
        app: app.name,
        appSourceId: source.id,
      });
      return [app.name, result.records] as const;
    }),
  );
  return buildDeploymentList(
    Object.fromEntries(entries) as Record<string, DeploymentRecord[]>,
  ).map((deployment) => ({
    ...deployment,
    sourceId: source.id,
    repositoryLink: source.repositoryLink ?? null,
  }));
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
    try {
      const perSource = await Promise.all(
        readyState.sources.map((source) => loadSourceDeployments(source)),
      );
      const deployments = perSource
        .flat()
        .sort((a, b) => b.createdAt - a.createdAt);
      setRecordsState({ status: "ready", deployments });
    } catch (err) {
      setRecordsState({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Failed to load deployment records",
        deployments: [],
      });
    }
  }, []);

  useEffect(() => {
    void loadRecords(projectsState);
  }, [projectsState, loadRecords]);

  const reload = useCallback(() => {
    reloadProjects();
  }, [reloadProjects]);

  return { projectsState, recordsState, sources, reload };
}
