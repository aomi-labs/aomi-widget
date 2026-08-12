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
  launchAppsStatus,
} from "@build/features/launch/client";
import {
  isFatalLaunchRequestError,
  waitForAppsToLoad,
  waitForDeploymentReady,
} from "@aomi-labs/deploy/launch";
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
const DEPLOYMENT_READY_TIMEOUT_MS = 8 * 60 * 1000;
const RUNTIME_READY_TIMEOUT_MS = 8 * 60 * 1000;

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
  const projectPlatform = source ? source.platformName.trim() : undefined;
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
  const secretsReq = useRef<Set<number>>(new Set());
  const recordsReq = useRef(false);
  const requiredSecretsReq = useRef(false);
  const projectEpochRef = useRef(0);
  const deployAbortRef = useRef<AbortController | null>(null);
  // Advance the generation after a project navigation commits. Async reads
  // capture the generation they started in and cannot write into a later page.
  useEffect(() => {
    projectEpochRef.current += 1;
  }, [projectId]);

  // Refetch source + SDK status. Kept stable (keyed via the query client, not
  // the query objects) so callbacks depending on it don't churn every render.
  const reload = useCallback(async () => {
    const requestEpoch = projectEpochRef.current;
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
    if (projectEpochRef.current !== requestEpoch) return;
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
    secretsReq.current.clear();
    setSecrets(null);
    setSecretsError(null);
    requiredSecretsReq.current = false;
    setRequiredSecrets(null);
    setRequiredSecretsError(null);
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
    void deploymentHistory({ projectId, limit: 20 })
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
  }, [history, projectId]);

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

  const refreshRequiredSecrets = useCallback(async () => {
    const requestEpoch = projectEpochRef.current;
    requiredSecretsReq.current = true;
    setRequiredSecretsError(null);
    try {
      const result = await deploymentRequiredSecrets({ projectId });
      if (projectEpochRef.current === requestEpoch) {
        setRequiredSecrets(result.byApp);
      }
      return result.byApp;
    } catch (err) {
      if (projectEpochRef.current === requestEpoch) {
        setRequiredSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load required secrets",
        );
        requiredSecretsReq.current = false;
      }
      throw err;
    }
  }, [projectId]);

  const loadRequiredSecrets = useCallback(() => {
    if (requiredSecretsReq.current || requiredSecrets !== null) return;
    void refreshRequiredSecrets().catch(() => undefined);
  }, [refreshRequiredSecrets, requiredSecrets]);

  const ensureRequiredSecrets = useCallback(
    async (apps: string[], projectIdOverride?: number) => {
      const requestEpoch = projectEpochRef.current;
      try {
        const byApp =
          projectIdOverride === undefined
            ? await refreshRequiredSecrets()
            : (
                await deploymentRequiredSecrets({
                  projectId: projectIdOverride,
                })
              ).byApp;
        if (
          projectIdOverride !== undefined &&
          projectEpochRef.current === requestEpoch
        ) {
          setRequiredSecrets(byApp);
        }
        if (projectEpochRef.current !== requestEpoch)
          throw new Error("Project changed while checking required secrets.");
        const missing = missingRequiredSecrets(byApp, apps);
        if (Object.keys(missing).length > 0) {
          throw new MissingRequiredSecretsError(missing);
        }
      } catch (err) {
        if (
          projectEpochRef.current === requestEpoch &&
          !(err instanceof MissingRequiredSecretsError)
        ) {
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

  const refreshSecrets = useCallback(async (applicationId: number) => {
    const requestEpoch = projectEpochRef.current;
    setSecretsError(null);
    try {
      const r = await deploymentSecrets({ applicationId });
      if (projectEpochRef.current === requestEpoch) {
        setSecrets((current) => ({ ...(current ?? {}), ...r.byApp }));
      }
    } catch (err) {
      if (projectEpochRef.current === requestEpoch) {
        setSecretsError(
          err instanceof Error
            ? err.message
            : "Failed to load environment variables",
        );
      }
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
      if (projectEpochRef.current !== requestEpoch) return result;
      await refreshRequiredSecrets();
      return result;
    },
    [refreshRequiredSecrets, refreshSecrets],
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
      if (projectEpochRef.current === requestEpoch) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load deployment activity";
        setRecordsError(message);
        setRecords({});
      }
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
      const pre = await launchPreflight({
        repo,
        projectId,
      });
      if (!isCurrent()) return;
      const targetProjectId = pre.projectId ?? projectId;
      // Preflight re-syncs the source from the repo, so HEAD's `aomi.toml` can
      // register apps this page never saw. Refresh the source before gating:
      // the required-secret check runs against `pre.apps`, and both the gate
      // banner and the Environment tab list apps from `source.apps`. Without
      // this the check can fail for an app the UI has no row for — the user is
      // told a secret is missing with nowhere to enter it.
      await reload();
      if (!isCurrent()) return;
      await ensureRequiredSecrets(pre.apps, targetProjectId);
      if (!isCurrent()) return;
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
      const apps = deployed.apps;
      const ready = await waitForDeploymentReady(
        () => launchStatus(deploymentId, projectPlatform),
        {
          signal: controller.signal,
          intervalMs: DEPLOY_POLL_MS,
          timeoutMs: DEPLOYMENT_READY_TIMEOUT_MS,
          isFatal: isFatalLaunchRequestError,
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
              timeoutMs: RUNTIME_READY_TIMEOUT_MS,
              isFatal: isFatalLaunchRequestError,
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
