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

function isUnknownAppRecordsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.toLowerCase().includes("unknown app");
}

async function loadSourceDeployments(
  source: UserSource,
): Promise<GlobalDeployment[]> {
  const entries = await Promise.all(
    source.apps.map(async (app) => {
      try {
        const result = await deploymentRecords({
          app: app.name,
          appSourceId: source.id,
        });
        return [app.name, result.records] as const;
      } catch (err) {
        if (!isUnknownAppRecordsError(err)) throw err;
        // An app that is registered but has never deployed makes the records
        // backend reject with "unknown app `…`". Degrade that one app to an
        // empty record set instead of failing the whole deployments view.
        console.warn(
          `deployment records unavailable for app "${app.name}"`,
          err,
        );
        return [app.name, [] as DeploymentRecord[]] as const;
      }
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
