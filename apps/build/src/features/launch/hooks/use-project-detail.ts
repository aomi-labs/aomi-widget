"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import {
  deploymentSources,
  deploymentHistory,
  deploymentSecrets,
  deploymentSetSecrets,
  deploymentDeleteSecret,
  deploymentRequiredSecrets,
  deploymentSdkStatus,
  deploymentPromote,
  deploymentRecords,
  deploymentDeactivate,
  deploymentUpgradeSdk,
  deploymentSdkUpgradeStatus,
  launchPreflight,
  launchDeploy,
  launchStatus,
  launchActivate,
} from "@build/features/launch/client";
import {
  MissingRequiredSecretsError,
  missingRequiredSecrets,
  type RequiredSecretsByApp,
} from "@build/features/launch/required-secrets";
import type {
  LaunchSdkStatus,
  DeploymentPromoteResult,
  DeploymentRecord,
} from "@build/features/launch/contracts";

/** Progress of an in-flight linked-source redeploy (deploy → CI → activate). */
export type DeployFlowState =
  | { phase: "idle" }
  | { phase: "deploying"; message: string }
  | { phase: "building"; message: string }
  | { phase: "activating"; message: string }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

const DEPLOY_POLL_MS = 4000;
const DEPLOY_TIMEOUT_MS = 8 * 60 * 1000;

export function useProjectDetail(sourceId: number, platform?: string) {
  const [source, setSource] = useState<UserSource | null>(null);
  const [sdk, setSdk] = useState<LaunchSdkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserSourceLatestDeployment[] | null>(
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
  const [requiredSecrets, setRequiredSecrets] =
    useState<RequiredSecretsByApp | null>(null);
  const [requiredSecretsError, setRequiredSecretsError] = useState<
    string | null
  >(null);
  const [deployFlow, setDeployFlow] = useState<DeployFlowState>({
    phase: "idle",
  });
  const historyReq = useRef(false);
  const secretsReq = useRef(false);
  const recordsReq = useRef(false);
  const requiredSecretsReq = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Clear the records latch so "Refresh" actually recovers a failed
    // deployment-activity load. On error `fetchRecords` sets `recordsByApp` to
    // `{}` (non-null), which otherwise makes `loadRecords` no-op forever and
    // strands the tab on its error banner until a full page reload.
    recordsReq.current = false;
    setRecords(null);
    setRecordsError(null);
    try {
      const [{ sources }, sdkStatus] = await Promise.all([
        deploymentSources(platform),
        deploymentSdkStatus().catch(() => null),
      ]);
      setSource(sources.find((s) => s.id === sourceId) ?? null);
      setSdk(sdkStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [platform, sourceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    historyReq.current = true;
    setHistoryError(null);
    void deploymentHistory({ appSourceId: sourceId, limit: 20, platform })
      .then((r) => setHistory(r.deployments))
      .catch((err) => {
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history",
        );
        historyReq.current = false;
      });
  }, [history, platform, sourceId]);

  const loadSecrets = useCallback(() => {
    if (secretsReq.current || secretsByApp !== null) return;
    secretsReq.current = true;
    setSecretsError(null);
    void deploymentSecrets({ appSourceId: sourceId, platform })
      .then((r) => setSecrets(r.byApp))
      .catch((err) => {
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
        secretsReq.current = false;
      });
  }, [platform, secretsByApp, sourceId]);

  const refreshRequiredSecrets = useCallback(async () => {
    requiredSecretsReq.current = true;
    setRequiredSecretsError(null);
    try {
      const result = await deploymentRequiredSecrets({
        appSourceId: sourceId,
        platform,
      });
      setRequiredSecrets(result.byApp);
      return result.byApp;
    } catch (err) {
      setRequiredSecretsError(
        err instanceof Error ? err.message : "Failed to load required secrets",
      );
      requiredSecretsReq.current = false;
      throw err;
    }
  }, [platform, sourceId]);

  const loadRequiredSecrets = useCallback(() => {
    if (requiredSecretsReq.current || requiredSecrets !== null) return;
    void refreshRequiredSecrets().catch(() => undefined);
  }, [refreshRequiredSecrets, requiredSecrets]);

  const ensureRequiredSecrets = useCallback(
    async (apps: string[], appSourceIdOverride?: number) => {
      try {
        const byApp =
          appSourceIdOverride === undefined
            ? await refreshRequiredSecrets()
            : (
                await deploymentRequiredSecrets({
                  appSourceId: appSourceIdOverride,
                  platform,
                })
              ).byApp;
        if (appSourceIdOverride !== undefined) setRequiredSecrets(byApp);
        const missing = missingRequiredSecrets(byApp, apps);
        if (Object.keys(missing).length > 0) {
          throw new MissingRequiredSecretsError(missing);
        }
      } catch (err) {
        if (!(err instanceof MissingRequiredSecretsError)) {
          setRequiredSecretsError(
            err instanceof Error
              ? err.message
              : "Failed to verify required secrets",
          );
          requiredSecretsReq.current = false;
        }
        throw err;
      }
    },
    [platform, refreshRequiredSecrets],
  );

  const hasMissingSecrets = useCallback(
    (app: string) => (requiredSecrets?.[app]?.missing.length ?? 0) > 0,
    [requiredSecrets],
  );

  const refreshSecrets = useCallback(async () => {
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ appSourceId: sourceId, platform });
      setSecrets(r.byApp);
    } catch (err) {
      setSecretsError(
        err instanceof Error
          ? err.message
          : "Failed to load environment variables",
      );
      throw err;
    }
  }, [platform, sourceId]);

  const setEnvVars = useCallback(
    async (app: string, secrets: Record<string, string>) => {
      const result = await deploymentSetSecrets({
        app,
        appSourceId: sourceId,
        platform,
        secrets,
      });
      await refreshSecrets();
      await refreshRequiredSecrets();
      return result;
    },
    [platform, refreshRequiredSecrets, refreshSecrets, sourceId],
  );

  const deleteEnvVar = useCallback(
    async (app: string, name: string) => {
      const result = await deploymentDeleteSecret({
        app,
        appSourceId: sourceId,
        platform,
        name,
      });
      await refreshSecrets();
      return result;
    },
    [platform, refreshSecrets, sourceId],
  );

  // Fetch the DB activation timeline for every app on this source (per-app but
  // all DB reads — no GitHub fan-out). `force` re-fetches after an operation.
  const fetchRecords = useCallback(
    async (src: UserSource) => {
      setRecordsError(null);
      try {
        const entries = await Promise.all(
          src.apps.map(async (app) => {
            const result = await deploymentRecords({
              app: app.name,
              appSourceId: src.id,
              platform,
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
    },
    [platform],
  );

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
      deploymentPromote({ deploymentId, appSourceId: sourceId, platform }),
    [platform, sourceId],
  );

  const deactivate = useCallback(
    (apps: string[]) =>
      deploymentDeactivate({ appSourceId: sourceId, apps, platform }),
    [platform, sourceId],
  );

  // Deploy the source repo's current HEAD and activate the resulting release
  // once CI publishes it. GitHub is read only here (status polling) — the
  // "update deployment" operation — never on the passive tab render.
  const redeploySource = useCallback(async () => {
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
      const pre = await launchPreflight({ repo, platform });
      const appSourceId = pre.appSourceId ?? sourceId;
      // Preflight re-syncs the source from the repo, so HEAD's `aomi.toml` can
      // register apps this page never saw. Refresh the source before gating:
      // the required-secret check runs against `pre.apps`, and both the gate
      // banner and the Environment tab list apps from `source.apps`. Without
      // this the check can fail for an app the UI has no row for — the user is
      // told a secret is missing with nowhere to enter it.
      await reload();
      await ensureRequiredSecrets(pre.apps, appSourceId);
      setDeployFlow({ phase: "deploying", message: "Deploying new version…" });
      const deployed = await launchDeploy({
        appSourceId,
        platform,
        sourceRef: pre.sourceRef,
        repo,
      });
      const deploymentId = deployed.deployment.id;

      const deadline = Date.now() + DEPLOY_TIMEOUT_MS;
      let releaseTags = deployed.releaseTags;
      let apps = deployed.apps;
      // Poll CI until the release is published.
      for (;;) {
        const status = await launchStatus(deploymentId, platform);
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
      const activated = await launchActivate({
        appSourceId,
        platform,
        releaseTags,
        apps,
      });
      // A rejected/partial activation still returns apps (with `error` set), and
      // a malformed response may omit `activation` entirely — surface the real
      // reason instead of throwing into the generic "Deploy failed" catch.
      const activatedApps = activated.activation?.apps ?? [];
      const failed = activatedApps.find((app) => app.error);
      if (!activated.ok || failed) {
        setDeployFlow({
          phase: "error",
          message: failed?.error ?? "Activation was not accepted.",
        });
        return;
      }
      const unloaded = activatedApps.filter((app) => !app.loaded);
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
  }, [
    ensureRequiredSecrets,
    platform,
    refreshRecords,
    reload,
    source,
    sourceId,
  ]);

  const upgradeSdk = useCallback(
    () => deploymentUpgradeSdk({ appSourceId: sourceId, platform }),
    [platform, sourceId],
  );

  // Cheap merge-poll counterpart to upgradeSdk: one GitHub-backed read, no
  // repo tarball or branch refresh, safe to call on the 45s recheck loop.
  const checkSdkUpgradeStatus = useCallback(
    () => deploymentSdkUpgradeStatus({ appSourceId: sourceId, platform }),
    [platform, sourceId],
  );

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
    requiredSecrets,
    requiredSecretsError,
    deployFlow,
    loadHistory,
    loadSecrets,
    loadRequiredSecrets,
    refreshRequiredSecrets,
    ensureRequiredSecrets,
    hasMissingSecrets,
    setEnvVars,
    deleteEnvVar,
    loadRecords,
    refreshRecords,
    promote,
    deactivate,
    redeploySource,
    upgradeSdk,
    checkSdkUpgradeStatus,
    reload: () => void reload(),
  };
}
