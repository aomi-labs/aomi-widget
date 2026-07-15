"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import {
  deploymentSources,
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
  launchAppStatus,
} from "@build/features/launch/client";
import type {
  LaunchSdkStatus,
  DeploymentPromoteResult,
  DeploymentRecord,
} from "@build/features/launch/contracts";

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
const RUNTIME_POLL_MS = 3000;
const RUNTIME_POLL_ATTEMPTS = 30;

function isMissingAppRecords(err: unknown) {
  return (
    err instanceof Error && err.message.toLowerCase().includes("unknown app")
  );
}

export function useProjectDetail(sourceId: number) {
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
  const [deployFlow, setDeployFlow] = useState<DeployFlowState>({
    phase: "idle",
  });
  const historyReq = useRef(false);
  const secretsReq = useRef(false);
  const recordsReq = useRef(false);

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
    setHistoryError(null);
    void deploymentHistory({ appSourceId: sourceId, limit: 20 })
      .then((r) => setHistory(r.deployments))
      .catch((err) => {
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history",
        );
        historyReq.current = false;
      });
  }, [sourceId, history]);

  const loadSecrets = useCallback(() => {
    if (secretsReq.current || secretsByApp !== null) return;
    secretsReq.current = true;
    setSecretsError(null);
    void deploymentSecrets({ appSourceId: sourceId })
      .then((r) => setSecrets(r.byApp))
      .catch((err) => {
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
        secretsReq.current = false;
      });
  }, [sourceId, secretsByApp]);

  const refreshSecrets = useCallback(async () => {
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ appSourceId: sourceId });
      setSecrets(r.byApp);
    } catch (err) {
      setSecretsError(
        err instanceof Error
          ? err.message
          : "Failed to load environment variables",
      );
      throw err;
    }
  }, [sourceId]);

  const setEnvVars = useCallback(
    async (app: string, secrets: Record<string, string>) => {
      const result = await deploymentSetSecrets({
        app,
        appSourceId: sourceId,
        secrets,
      });
      await refreshSecrets();
      return result;
    },
    [sourceId, refreshSecrets],
  );

  const deleteEnvVar = useCallback(
    async (app: string, name: string) => {
      const result = await deploymentDeleteSecret({
        app,
        appSourceId: sourceId,
        name,
      });
      await refreshSecrets();
      return result;
    },
    [sourceId, refreshSecrets],
  );

  // Fetch the DB activation timeline for every app on this source (per-app but
  // all DB reads — no GitHub fan-out). `force` re-fetches after an operation.
  const fetchRecords = useCallback(async (src: UserSource) => {
    setRecordsError(null);
    try {
      const entries = await Promise.all(
        src.apps.map(async (app) => {
          const result = await deploymentRecords({
            app: app.name,
            appSourceId: src.id,
          }).catch((err: unknown) => {
            if (isMissingAppRecords(err)) {
              return { records: [] };
            }
            throw err;
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
      deploymentPromote({ deploymentId, appSourceId: sourceId }),
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
      setDeployFlow({
        phase: "deploying",
        message: "Resolving latest commit…",
      });
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
      const activated = await launchActivate({
        appSourceId,
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
      const terminalPolls = new Map<string, number>();
      for (let attempt = 0; attempt < RUNTIME_POLL_ATTEMPTS; attempt += 1) {
        const results = await Promise.allSettled(
          activatedApps.map((app) =>
            launchAppStatus({
              name: app.name,
              releaseTag: app.releaseTag ?? undefined,
            }),
          ),
        );
        const checks = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        const pollFailed = results.some(
          (result) => result.status === "rejected",
        );
        if (
          !pollFailed &&
          checks.length === activatedApps.length &&
          checks.every((check) => check.ok && check.state === "live")
        ) {
          setDeployFlow({ phase: "done", message: "New version is live." });
          await reload();
          refreshRecords();
          return;
        }
        if (pollFailed) {
          // A freshly activated app may not be visible through the status
          // endpoint yet. Treat lookup errors as pending and restart the
          // terminal-failure streak so one transient miss cannot fail a live
          // activation.
          terminalPolls.clear();
        } else {
          const terminal = checks.find((check) => {
            const name = check.app?.name;
            if (!name) return false;
            if (check.app.is_active === false && check.app.loaded === false) {
              const streak = (terminalPolls.get(name) ?? 0) + 1;
              terminalPolls.set(name, streak);
              return streak >= 2;
            }
            terminalPolls.delete(name);
            return false;
          });
          if (terminal) {
            setDeployFlow({
              phase: "error",
              message: terminal.app?.name
                ? `Runtime check failed for ${terminal.app.name}.`
                : "Runtime reported a terminal error during activation.",
            });
            await reload();
            refreshRecords();
            return;
          }
        }
        setDeployFlow({
          phase: "activating",
          message: `Waiting for runtime… (${attempt + 1}/${RUNTIME_POLL_ATTEMPTS})`,
        });
        if (attempt < RUNTIME_POLL_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RUNTIME_POLL_MS));
        }
      }
      setDeployFlow({
        phase: "error",
        message:
          "Activation was accepted, but the app artifact did not become ready.",
      });
      await reload();
      refreshRecords();
    } catch (err) {
      setDeployFlow({
        phase: "error",
        message: err instanceof Error ? err.message : "Deploy failed",
      });
    }
  }, [source, sourceId, reload, refreshRecords]);

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
