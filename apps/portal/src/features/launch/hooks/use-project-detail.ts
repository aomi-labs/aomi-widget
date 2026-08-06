"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserProject, UserProjectLatestDeployment } from "@aomi-labs/deploy";
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
} from "@portal/features/launch/client";
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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ projects }, sdkStatus] = await Promise.all([
        deploymentProjects(),
        deploymentSdkStatus().catch(() => null),
      ]);
      setSource(projects.find((s) => s.id === projectId) ?? null);
      setSdk(sdkStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    historyReq.current = true;
    setHistoryError(null);
    void deploymentHistory({ projectId: projectId, limit: 20 })
      .then((r) => setHistory(r.deployments))
      .catch((err) => {
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history",
        );
        historyReq.current = false;
      });
  }, [projectId, history]);

  const loadSecrets = useCallback((applicationId: number) => {
    if (secretsReq.current.has(applicationId)) return;
    secretsReq.current.add(applicationId);
    setSecretsError(null);
    void deploymentSecrets({ applicationId })
      .then((r) =>
        setSecrets((current) => ({ ...(current ?? {}), ...r.byApp })),
      )
      .catch((err) => {
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
        secretsReq.current.delete(applicationId);
      });
  }, []);

  const refreshSecrets = useCallback(async (applicationId: number) => {
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ applicationId });
      setSecrets((current) => ({ ...(current ?? {}), ...r.byApp }));
    } catch (err) {
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
      const result = await deploymentSetSecrets({
        applicationId,
        secrets,
      });
      await refreshSecrets(applicationId);
      return result;
    },
    [refreshSecrets],
  );

  const deleteEnvVar = useCallback(
    async (applicationId: number, name: string) => {
      const result = await deploymentDeleteSecret({
        applicationId,
        name,
      });
      await refreshSecrets(applicationId);
      return result;
    },
    [refreshSecrets],
  );

  // Fetch the DB activation timeline for every app on this source (per-app but
  // all DB reads — no GitHub fan-out). `force` re-fetches after an operation.
  const fetchRecords = useCallback(async (src: UserProject) => {
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
      setRecords(Object.fromEntries(entries));
    } catch (err) {
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
    const repo = source?.repositoryLink;
    if (!repo) {
      setDeployFlow({ phase: "error", message: "Source repo is unknown." });
      return;
    }
    try {
      setDeployFlow({
        phase: "deploying",
        message: "Resolving latest commit…",
      });
      const pre = await launchPreflight({ repo, projectId });
      const targetProjectId = pre.projectId ?? projectId;
      if (!pre.sourceRef) {
        throw new Error("Preflight did not return an immutable source commit.");
      }
      setDeployFlow({ phase: "deploying", message: "Deploying new version…" });
      const deployed = await launchDeploy({
        projectId: targetProjectId,
        sourceRef: pre.sourceRef,
      });
      const deploymentId = deployed.deployment.id;

      const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
      let releaseTags = deployed.releaseTags;
      let apps = deployed.apps;
      // Poll CI until the release is published.
      for (;;) {
        const status = await launchStatus(deploymentId);
        releaseTags = status.releaseTags?.length
          ? status.releaseTags
          : releaseTags;
        if (status.state === "ready") break;
        if (status.state === "failed") {
          setDeployFlow({
            phase: "error",
            message: "Build failed; see the platform CI run.",
          });
          return;
        }
        if (Date.now() > deadline) {
          setDeployFlow({
            phase: "error",
            message: "Timed out waiting for the build; retry later.",
          });
          return;
        }
        setDeployFlow({
          phase: "building",
          message: `Building… (${status.state})`,
        });
        await new Promise((r) => setTimeout(r, DEPLOY_POLL_MS));
      }

      setDeployFlow({ phase: "activating", message: "Activating release…" });
      // Activate the SAME project the deploy targeted — `targetProjectId`
      // is preflight-resolved and can differ from the page's `projectId`.
      const activated = await launchActivate({
        projectId: targetProjectId,
        releaseTags,
        apps,
      });
      const unloaded = activated.activation.apps.filter((app) => !app.loaded);
      setDeployFlow({
        phase: unloaded.length ? "error" : "done",
        message: unloaded.length
          ? `Release selected, but ${unloaded.map((app) => app.name).join(", ")} is not loaded in this runtime.`
          : "New version is live.",
      });
      await reload();
      refreshRecords();
    } catch (err) {
      setDeployFlow({
        phase: "error",
        message: err instanceof Error ? err.message : "Deploy failed",
      });
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
