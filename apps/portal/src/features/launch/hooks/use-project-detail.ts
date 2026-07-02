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
} from "@portal/features/launch/client";
import type {
  LaunchSdkStatus,
  DeploymentRollbackResult,
  DeploymentActivation,
} from "@portal/features/launch/contracts";

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

  const loadActivations = useCallback(() => {
    if (activationsReq.current || activationsByApp !== null || !source) return;
    activationsReq.current = true;
    void Promise.all(
      source.apps.map(async (app) => {
        const result = await deploymentActivations({ app: app.name }).catch(
          () => null,
        );
        return [app.name, result?.activations ?? []] as const;
      }),
    ).then((entries) => setActivations(Object.fromEntries(entries)));
  }, [source, activationsByApp]);

  const rollback = useCallback(
    (deploymentId: string): Promise<DeploymentRollbackResult> =>
      deploymentRollback({ deploymentId }),
    [],
  );

  return {
    source,
    loading,
    error,
    sdk,
    history,
    secretsByApp,
    activationsByApp,
    loadHistory,
    loadSecrets,
    loadActivations,
    rollback,
    reload: () => void reload(),
  };
}
