"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import {
  deploymentSources,
  deploymentHistory,
  deploymentSecrets,
  deploymentSdkStatus,
  deploymentRollback,
  deploymentActivations,
  deploymentDeactivate,
  launchPreflight,
  launchDeploy,
  launchStatus,
  launchActivate,
} from "@portal/features/launch/client";
import type {
  LaunchSdkStatus,
  DeploymentRollbackResult,
  DeploymentActivation,
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

export function useProjectDetail(sourceId: number) {
  const [source, setSource] = useState<UserSource | null>(null);
  const [sdk, setSdk] = useState<LaunchSdkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserSourceLatestDeployment[] | null>(
    null,
  );
  const [secretsByApp, setSecrets] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [activationsByApp, setActivations] = useState<Record<
    string,
    DeploymentActivation[]
  > | null>(null);
  const [deployFlow, setDeployFlow] = useState<DeployFlowState>({
    phase: "idle",
  });
  const historyReq = useRef(false);
  const secretsReq = useRef(false);
  const activationsReq = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ sources }, sdkStatus] = await Promise.all([
        deploymentSources(),
        deploymentSdkStatus().catch(() => null),
      ]);
      setSource(sources.find((s) => s.id === sourceId) ?? null);
      setSdk(sdkStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    historyReq.current = true;
    void deploymentHistory({ appSourceId: sourceId, limit: 20 })
      .then((r) => setHistory(r.deployments))
      .catch(() => setHistory([]));
  }, [sourceId, history]);

  const loadSecrets = useCallback(() => {
    if (secretsReq.current || secretsByApp !== null) return;
    secretsReq.current = true;
    void deploymentSecrets()
      .then((r) => setSecrets(r.byApp))
      .catch(() => setSecrets({}));
  }, [secretsByApp]);

  // Fetch the DB activation timeline for every app on this source (per-app but
  // all DB reads — no GitHub fan-out). `force` re-fetches after an operation.
  const fetchActivations = useCallback(
    async (src: UserSource) => {
      const entries = await Promise.all(
        src.apps.map(async (app) => {
          const result = await deploymentActivations({
            app: app.name,
            appSourceId: src.id,
          }).catch(() => null);
          return [app.name, result?.activations ?? []] as const;
        }),
      );
      setActivations(Object.fromEntries(entries));
    },
    [],
  );

  const loadActivations = useCallback(() => {
    if (activationsReq.current || activationsByApp !== null || !source) return;
    activationsReq.current = true;
    void fetchActivations(source);
  }, [source, activationsByApp, fetchActivations]);

  const refreshActivations = useCallback(() => {
    if (!source) return;
    void fetchActivations(source);
  }, [source, fetchActivations]);

  const rollback = useCallback(
    (deploymentId: string): Promise<DeploymentRollbackResult> =>
      deploymentRollback({ deploymentId, appSourceId: sourceId }),
    [sourceId],
  );

  const deactivate = useCallback(
    (apps: string[]) => deploymentDeactivate({ appSourceId: sourceId, apps }),
    [sourceId],
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
      setDeployFlow({ phase: "deploying", message: "Resolving latest commit…" });
      const pre = await launchPreflight({ repo });
      const appSourceId = pre.appSourceId ?? sourceId;
      setDeployFlow({ phase: "deploying", message: "Deploying new version…" });
      const deployed = await launchDeploy({
        appSourceId,
        sourceRef: pre.sourceRef,
        repo,
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
      await launchActivate({ releaseTags, apps });
      setDeployFlow({ phase: "done", message: "New version is live." });
      await reload();
      refreshActivations();
    } catch (err) {
      setDeployFlow({
        phase: "error",
        message: err instanceof Error ? err.message : "Deploy failed",
      });
    }
  }, [source, sourceId, reload, refreshActivations]);

  return {
    source,
    loading,
    error,
    sdk,
    history,
    secretsByApp,
    activationsByApp,
    deployFlow,
    loadHistory,
    loadSecrets,
    loadActivations,
    refreshActivations,
    rollback,
    deactivate,
    deployNewVersion,
    reload: () => void reload(),
  };
}
