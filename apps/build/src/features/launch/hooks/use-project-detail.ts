"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DeploymentPromoteResult,
  DeploymentRecord,
  DeploymentProjectsResult,
} from "@build/features/launch/contracts";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  buildQueryKeys,
  buildQueryStaleTime,
  githubAccountKey,
} from "../query-keys";

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

export function useProjectDetail(projectId: number) {
  const { account } = useGitHubSession();
  const accountKey = githubAccountKey(account.githubLogin);
  const queryClient = useQueryClient();
  const sourceKey = useMemo(
    () => buildQueryKeys.projectSource(accountKey ?? "unavailable", projectId),
    [accountKey, projectId],
  );
  const projectsKey = buildQueryKeys.projects(accountKey ?? "unavailable");

  // Source + SDK status live in react-query. The source is a server-filtered
  // single-source read (`projectId` on the projects BFF route) — a project
  // page never transfers the whole account. Warm navigations skip even that:
  // `initialData` seeds from the `/projects` list the index already fetched,
  // stamped with that list's own freshness, so list → project paints from
  // cache and doesn't refetch while the list is still fresh.
  // `enabled: !account.loading` fires the read once the session is known
  // (signed-out surfaces the auth error, as the hand-rolled version did),
  // never gating on the SDK badge.
  const projectsQuery = useQuery({
    queryKey: sourceKey,
    queryFn: () => deploymentProjects(undefined, projectId),
    enabled: !account.loading,
    staleTime: buildQueryStaleTime.projects,
    initialData: () => {
      const list =
        queryClient.getQueryData<DeploymentProjectsResult>(projectsKey);
      const seeded = list?.projects.find((s) => s.id === projectId);
      return seeded ? { ...list, projects: [seeded] } : undefined;
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(projectsKey)?.dataUpdatedAt,
  });
  const sdkQuery = useQuery({
    queryKey: buildQueryKeys.sdkStatus(),
    queryFn: () => deploymentSdkStatus().catch(() => null),
    enabled: !account.loading,
    staleTime: buildQueryStaleTime.sdkStatus,
  });
  const source = useMemo(
    () => projectsQuery.data?.projects.find((s) => s.id === projectId) ?? null,
    [projectsQuery.data, projectId],
  );
  const projectPlatform = source?.platformName?.trim() || undefined;
  const sdk = sdkQuery.data ?? null;
  const loading = account.loading || projectsQuery.isPending;
  const error = projectsQuery.error
    ? projectsQuery.error instanceof Error
      ? projectsQuery.error.message
      : "Failed to load project"
    : null;

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

  // Refetch source + SDK status. Kept stable (keyed via the query client, not
  // the query objects) so callbacks depending on it don't churn every render.
  const reload = useCallback(async () => {
    // Clear the records latch so "Refresh" actually recovers a failed
    // deployment-activity load. On error `fetchRecords` sets `recordsByApp` to
    // `{}` (non-null), which otherwise makes `loadRecords` no-op forever and
    // strands the tab on its error banner until a full page reload.
    recordsReq.current = false;
    setRecords(null);
    setRecordsError(null);
    historyReq.current = false;
    setHistory(null);
    setHistoryError(null);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: sourceKey }),
      queryClient.refetchQueries({ queryKey: buildQueryKeys.sdkStatus() }),
    ]);
  }, [queryClient, sourceKey]);

  // Reset deployment-activity latches when the project changes so a same-route
  // navigation (…/projects/1 → …/projects/2, no unmount) cannot show the
  // previous project's records or history. The source refreshes via react-query.
  useEffect(() => {
    recordsReq.current = false;
    setRecords(null);
    setRecordsError(null);
    historyReq.current = false;
    setHistory(null);
    setHistoryError(null);
  }, [projectId]);

  const loadHistory = useCallback(() => {
    if (historyReq.current || history !== null) return;
    historyReq.current = true;
    setHistoryError(null);
    void deploymentHistory({ projectId, limit: 20 })
      .then((r) => setHistory(r.deployments))
      .catch((err) => {
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load history",
        );
        historyReq.current = false;
      });
  }, [history, projectId]);

  const loadSecrets = useCallback(() => {
    if (secretsReq.current || secretsByApp !== null) return;
    secretsReq.current = true;
    setSecretsError(null);
    void deploymentSecrets({ projectId })
      .then((r) => setSecrets(r.byApp))
      .catch((err) => {
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
        secretsReq.current = false;
      });
  }, [secretsByApp, projectId]);

  const refreshRequiredSecrets = useCallback(async () => {
    requiredSecretsReq.current = true;
    setRequiredSecretsError(null);
    try {
      const result = await deploymentRequiredSecrets({ projectId });
      setRequiredSecrets(result.byApp);
      return result.byApp;
    } catch (err) {
      setRequiredSecretsError(
        err instanceof Error ? err.message : "Failed to load required secrets",
      );
      requiredSecretsReq.current = false;
      throw err;
    }
  }, [projectId]);

  const loadRequiredSecrets = useCallback(() => {
    if (requiredSecretsReq.current || requiredSecrets !== null) return;
    void refreshRequiredSecrets().catch(() => undefined);
  }, [refreshRequiredSecrets, requiredSecrets]);

  const ensureRequiredSecrets = useCallback(
    async (apps: string[], projectIdOverride?: number) => {
      try {
        const byApp =
          projectIdOverride === undefined
            ? await refreshRequiredSecrets()
            : (
                await deploymentRequiredSecrets({
                  projectId: projectIdOverride,
                })
              ).byApp;
        if (projectIdOverride !== undefined) setRequiredSecrets(byApp);
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
    [refreshRequiredSecrets],
  );

  const hasMissingSecrets = useCallback(
    (app: string) => (requiredSecrets?.[app]?.missing.length ?? 0) > 0,
    [requiredSecrets],
  );

  const refreshSecrets = useCallback(async () => {
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ projectId });
      setSecrets(r.byApp);
    } catch (err) {
      setSecretsError(
        err instanceof Error
          ? err.message
          : "Failed to load environment variables",
      );
      throw err;
    }
  }, [projectId]);

  const setEnvVars = useCallback(
    async (app: string, secrets: Record<string, string>) => {
      const result = await deploymentSetSecrets({
        app,
        projectId,
        secrets,
      });
      await refreshSecrets();
      await refreshRequiredSecrets();
      return result;
    },
    [refreshRequiredSecrets, refreshSecrets, projectId],
  );

  const deleteEnvVar = useCallback(
    async (app: string, name: string) => {
      const result = await deploymentDeleteSecret({
        app,
        projectId,
        name,
      });
      await refreshSecrets();
      return result;
    },
    [refreshSecrets, projectId],
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
      deploymentPromote({ deploymentId, projectId }),
    [projectId],
  );

  const deactivate = useCallback(
    (apps: string[]) => deploymentDeactivate({ projectId, apps }),
    [projectId],
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
      const pre = await launchPreflight({
        repo,
        projectId,
      });
      const targetProjectId = pre.projectId ?? projectId;
      // Preflight re-syncs the source from the repo, so HEAD's `aomi.toml` can
      // register apps this page never saw. Refresh the source before gating:
      // the required-secret check runs against `pre.apps`, and both the gate
      // banner and the Environment tab list apps from `source.apps`. Without
      // this the check can fail for an app the UI has no row for — the user is
      // told a secret is missing with nowhere to enter it.
      await reload();
      await ensureRequiredSecrets(pre.apps, targetProjectId);
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
        const status = await launchStatus(deploymentId, projectPlatform);
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
    projectPlatform,
    refreshRecords,
    reload,
    source,
    projectId,
  ]);

  const upgradeSdk = useCallback(
    () => deploymentUpgradeSdk({ projectId }),
    [projectId],
  );

  // Cheap merge-poll counterpart to upgradeSdk: one GitHub-backed read, no
  // repo tarball or branch refresh, safe to call on the 45s recheck loop.
  const checkSdkUpgradeStatus = useCallback(
    () => deploymentSdkUpgradeStatus({ projectId }),
    [projectId],
  );

  return {
    source,
    loading,
    error,
    sdk,
    /** Cache namespace for account-scoped queries (null until session resolves). */
    accountKey,
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
