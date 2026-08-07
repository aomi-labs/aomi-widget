"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  UserProject,
  UserProjectLatestDeployment,
} from "@aomi-labs/deploy";
import {
  deploymentProjects,
  deploymentHistory,
  deploymentSecrets,
  deploymentSetSecrets,
  deploymentDeleteSecret,
  deploymentSdkStatus,
  deploymentPromote,
  deploymentRecords,
  deploymentDeactivate,
  launchPreflight,
  launchDeploy,
  launchStatus,
  launchActivate,
  launchAppsStatus,
  LaunchRequestError,
} from "@portal/features/launch/client";
import {
  waitForAppsToLoad,
  waitForDeploymentReady,
} from "@aomi-labs/deploy/launch";
import type {
  LaunchSdkStatus,
  DeploymentPromoteResult,
  DeploymentRecord,
} from "@portal/features/launch/contracts";

/** Progress of an in-flight "deploy new version" pipeline (deploy → CI → activate). */
export type DeployFlowState =
  | { phase: "idle" }
  | { phase: "deploying"; message: string }
  | { phase: "building"; message: string }
  | { phase: "activating"; message: string }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

const DEPLOY_POLL_MS = 4000;
const DEPLOY_TIMEOUT_MS = 8 * 60 * 1000;

export function useProjectDetail(projectId: number) {
  const [source, setSource] = useState<UserProject | null>(null);
  const [sdk, setSdk] = useState<LaunchSdkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserProjectLatestDeployment[] | null>(
    null,
  );
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [secretsByApp, setSecrets] = useState<Record<string, string[]> | null>(
    null,
  );
  const [secretsError, setSecretsError] = useState<string | null>(null);
  const [recordsByApp, setRecords] = useState<Record<
    string,
    DeploymentRecord[]
  > | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [deployFlow, setDeployFlow] = useState<DeployFlowState>({
    phase: "idle",
  });
  const historyReq = useRef(false);
  const secretsReq = useRef(new Set<number>());
  const recordsReq = useRef(false);
  const projectEpochRef = useRef(0);
  const deployAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    projectEpochRef.current += 1;
  }, [projectId]);

  const reload = useCallback(async () => {
    const requestEpoch = projectEpochRef.current;
    setLoading(true);
    setError(null);
    try {
      const [{ projects }, sdkStatus] = await Promise.all([
        deploymentProjects(undefined, projectId),
        deploymentSdkStatus().catch(() => null),
      ]);
      if (projectEpochRef.current !== requestEpoch) return;
      setSource(projects.find((s) => s.id === projectId) ?? null);
      setSdk(sdkStatus);
    } catch (err) {
      if (projectEpochRef.current !== requestEpoch) return;
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      if (projectEpochRef.current === requestEpoch) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    historyReq.current = false;
    setHistory(null);
    setHistoryError(null);
    secretsReq.current.clear();
    setSecrets(null);
    setSecretsError(null);
    recordsReq.current = false;
    setRecords(null);
    setRecordsError(null);
    setDeployFlow({ phase: "idle" });
    deployAbortRef.current?.abort();
    deployAbortRef.current = null;
  }, [projectId]);

  useEffect(
    () => () => {
      deployAbortRef.current?.abort();
    },
    [],
  );

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    const requestEpoch = projectEpochRef.current;
    historyReq.current = true;
    setHistoryError(null);
    void deploymentHistory({ projectId: projectId, limit: 20 })
      .then((r) => {
        if (projectEpochRef.current === requestEpoch) setHistory(r.deployments);
      })
      .catch((err) => {
        if (projectEpochRef.current !== requestEpoch) return;
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history",
        );
        historyReq.current = false;
      });
  }, [projectId, history]);

  const loadSecrets = useCallback((applicationId: number) => {
    if (secretsReq.current.has(applicationId)) return;
    const requestEpoch = projectEpochRef.current;
    secretsReq.current.add(applicationId);
    setSecretsError(null);
    void deploymentSecrets({ applicationId })
      .then((r) => {
        if (projectEpochRef.current !== requestEpoch) return;
        setSecrets((current) => ({ ...(current ?? {}), ...r.byApp }));
      })
      .catch((err) => {
        if (projectEpochRef.current !== requestEpoch) return;
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
        secretsReq.current.delete(applicationId);
      });
  }, []);

  const refreshSecrets = useCallback(async (applicationId: number) => {
    const requestEpoch = projectEpochRef.current;
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ applicationId });
      if (projectEpochRef.current === requestEpoch) {
        setSecrets((current) => ({ ...(current ?? {}), ...r.byApp }));
      }
    } catch (err) {
      if (projectEpochRef.current !== requestEpoch) throw err;
      setSecretsError(
        err instanceof Error
          ? err.message
          : "Failed to load environment variables",
      );
      throw err;
    }
  }, []);

  const setEnvVars = useCallback(
    async (applicationId: number, secrets: Record<string, string>) => {
      const requestEpoch = projectEpochRef.current;
      const result = await deploymentSetSecrets({
        applicationId,
        secrets,
      });
      if (projectEpochRef.current !== requestEpoch) return result;
      await refreshSecrets(applicationId);
      return result;
    },
    [refreshSecrets],
  );

  const deleteEnvVar = useCallback(
    async (applicationId: number, name: string) => {
      const requestEpoch = projectEpochRef.current;
      const result = await deploymentDeleteSecret({
        applicationId,
        name,
      });
      if (projectEpochRef.current !== requestEpoch) return result;
      await refreshSecrets(applicationId);
      return result;
    },
    [refreshSecrets],
  );

  // Fetch the DB activation timeline for every app on this source (per-app but
  // all DB reads — no GitHub fan-out). `force` re-fetches after an operation.
  const fetchRecords = useCallback(async (src: UserProject) => {
    const requestEpoch = projectEpochRef.current;
    setRecordsError(null);
    try {
      const entries = await Promise.all(
        src.apps.map(async (app) => {
          const result = await deploymentRecords({
            app: app.name,
            projectId: src.id,
          });
          return [app.name, result.records] as const;
        }),
      );
      if (projectEpochRef.current === requestEpoch) {
        setRecords(Object.fromEntries(entries));
      }
    } catch (err) {
      if (projectEpochRef.current !== requestEpoch) throw err;
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load deployment activity";
      setRecordsError(message);
      setRecords({});
      throw err;
    }
  }, []);

  const loadRecords = useCallback(() => {
    if (recordsReq.current || recordsByApp !== null || !source) return;
    recordsReq.current = true;
    void fetchRecords(source).catch(() => {
      recordsReq.current = false;
    });
  }, [source, recordsByApp, fetchRecords]);

  const refreshRecords = useCallback(() => {
    if (!source) return;
    void fetchRecords(source).catch(() => undefined);
  }, [source, fetchRecords]);

  const promote = useCallback(
    (deploymentId: string): Promise<DeploymentPromoteResult> =>
      deploymentPromote({ deploymentId, projectId: projectId }),
    [projectId],
  );

  const deactivate = useCallback(
    (apps: string[]) => deploymentDeactivate({ projectId: projectId, apps }),
    [projectId],
  );

  // Deploy the source repo's current HEAD and activate the resulting release
  // once CI publishes it. GitHub is read only here (status polling) — the
  // "update deployment" operation — never on the passive tab render.
  const deployNewVersion = useCallback(async () => {
    const requestEpoch = projectEpochRef.current;
    const isCurrent = () => projectEpochRef.current === requestEpoch;
    const repo = source?.repositoryLink;
    deployAbortRef.current?.abort();
    const controller = new AbortController();
    deployAbortRef.current = controller;
    if (!repo) {
      setDeployFlow({ phase: "error", message: "Source repo is unknown." });
      deployAbortRef.current = null;
      return;
    }
    try {
      setDeployFlow({
        phase: "deploying",
        message: "Resolving latest commit…",
      });
      const pre = await launchPreflight({ repo, projectId });
      if (!isCurrent()) return;
      const targetProjectId = pre.projectId ?? projectId;
      if (!pre.sourceRef) {
        throw new Error("Preflight did not return an immutable source commit.");
      }
      setDeployFlow({ phase: "deploying", message: "Deploying new version…" });
      const deployed = await launchDeploy({
        projectId: targetProjectId,
        sourceRef: pre.sourceRef,
      });
      if (!isCurrent()) return;
      const deploymentId = deployed.deployment.id;

      let releaseTags = deployed.releaseTags;
      let apps = deployed.apps;
      const ready = await waitForDeploymentReady(
        () => launchStatus(deploymentId),
        {
          signal: controller.signal,
          intervalMs: DEPLOY_POLL_MS,
          timeoutMs: DEPLOY_TIMEOUT_MS,
          isFatal: (error) =>
            error instanceof LaunchRequestError &&
            error.status >= 400 &&
            error.status < 500,
          onProgress: (status) => {
            if (!isCurrent()) return;
            releaseTags = status.releaseTags?.length
              ? status.releaseTags
              : releaseTags;
            if (status.state !== "ready") {
              setDeployFlow({
                phase: "building",
                message: `Building… (${status.state})`,
              });
            }
          },
        },
      );
      releaseTags = ready.releaseTags?.length ? ready.releaseTags : releaseTags;
      if (!isCurrent()) return;

      setDeployFlow({ phase: "activating", message: "Activating release…" });
      // Activate the SAME project the deploy targeted — `targetProjectId`
      // is preflight-resolved and can differ from the page's `projectId`.
      const activated = await launchActivate({
        projectId: targetProjectId,
        releaseTags,
        apps,
      });
      if (!isCurrent()) return;
      const activatedApps = activated.activation?.apps ?? [];
      const failed = activatedApps.find((app) => app.error);
      if (!activated.ok || failed) {
        setDeployFlow({
          phase: "error",
          message: failed?.error ?? "Activation was not accepted.",
        });
        return;
      }
      if (apps.length > 0 && activatedApps.length === 0) {
        setDeployFlow({
          phase: "error",
          message: "Activation returned no application statuses.",
        });
        return;
      }
      const unloaded = activatedApps.filter((app) => !app.loaded);
      if (unloaded.length > 0) {
        setDeployFlow({
          phase: "activating",
          message: "Loading app runtime…",
        });
        try {
          await waitForAppsToLoad(
            () => launchAppsStatus({ projectId: targetProjectId }),
            unloaded.map((app) => ({
              name: app.name,
              releaseTag: app.releaseTag ?? undefined,
            })),
            {
              signal: controller.signal,
              intervalMs: DEPLOY_POLL_MS,
              timeoutMs: DEPLOY_TIMEOUT_MS,
              onProgress: ({ ready, total }) => {
                if (isCurrent()) {
                  setDeployFlow({
                    phase: "activating",
                    message: `Loading app runtime… (${ready}/${total})`,
                  });
                }
              },
            },
          );
        } catch (err) {
          if (controller.signal.aborted) return;
          throw err;
        }
        if (!isCurrent()) return;
      }
      setDeployFlow({ phase: "done", message: "New version is live." });
      await reload();
      if (!isCurrent()) return;
      refreshRecords();
    } catch (err) {
      if (controller.signal.aborted || !isCurrent()) return;
      setDeployFlow({
        phase: "error",
        message: err instanceof Error ? err.message : "Deploy failed",
      });
    } finally {
      if (deployAbortRef.current === controller) deployAbortRef.current = null;
    }
  }, [source, projectId, reload, refreshRecords]);

  return {
    source,
    loading,
    error,
    sdk,
    history,
    historyError,
    secretsByApp,
    secretsError,
    recordsByApp,
    recordsError,
    deployFlow,
    loadHistory,
    loadSecrets,
    setEnvVars,
    deleteEnvVar,
    loadRecords,
    refreshRecords,
    promote,
    deactivate,
    deployNewVersion,
    reload: () => void reload(),
  };
}
