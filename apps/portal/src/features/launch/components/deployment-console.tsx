"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Github,
  GitCommitHorizontal,
  KeyRound,
  MoreHorizontal,
  RotateCcw,
  Settings,
} from "lucide-react";
import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import {
  deploymentHistory,
  deploymentRollback,
  deploymentSdkStatus,
  deploymentSources,
} from "@portal/features/launch/client";
import type { LaunchSdkStatus } from "@portal/features/launch/contracts";
import {
  fetchGitHubSession,
  GITHUB_SIGNIN_URL,
  type GitHubSessionInfo,
} from "@portal/features/launch/dashboard";

type LoadState =
  | { status: "loading" }
  | { status: "signed_out"; sdk: LaunchSdkStatus | null }
  | {
      status: "ready";
      sources: UserSource[];
      histories: Record<number, UserSourceLatestDeployment[]>;
      sdk: LaunchSdkStatus | null;
      github: GitHubSessionInfo;
    }
  | { status: "error"; error: string };

type RollbackState = {
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
};

type DeploymentEntry = {
  source: UserSource;
  deployment: UserSourceLatestDeployment | null;
};

export function DeploymentConsole() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [rollback, setRollback] = useState<RollbackState | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [github, sdk] = await Promise.all([
        fetchGitHubSession(),
        deploymentSdkStatus().catch(() => null),
      ]);
      if (!github.signedIn) {
        setState({ status: "signed_out", sdk });
        return;
      }

      const sourcesResult = await deploymentSources();
      const historyPairs = await Promise.all(
        sourcesResult.sources.map(async (source) => {
          try {
            const history = await deploymentHistory({
              appSourceId: source.id,
              limit: 20,
            });
            return [source.id, history.deployments] as const;
          } catch {
            return [
              source.id,
              source.latestDeployment ? [source.latestDeployment] : [],
            ] as const;
          }
        }),
      );

      setState({
        status: "ready",
        sources: sourcesResult.sources,
        histories: Object.fromEntries(historyPairs),
        sdk,
        github,
      });
      setSelectedSourceId(
        (current) => current ?? sourcesResult.sources[0]?.id ?? null,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load deployment sources";
      if (message.toLowerCase().includes("not signed in with github")) {
        setState({ status: "signed_out", sdk: null });
        return;
      }
      setState({ status: "error", error: message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = useMemo<DeploymentEntry[]>(() => {
    if (state.status !== "ready") return [];
    return state.sources.flatMap((source) => {
      const history = state.histories[source.id] ?? [];
      if (history.length === 0) {
        return [{ source, deployment: source.latestDeployment ?? null }];
      }
      return history.map((deployment) => ({ source, deployment }));
    });
  }, [state]);

  const selectedSource = useMemo(() => {
    if (state.status !== "ready") return null;
    return (
      state.sources.find((source) => source.id === selectedSourceId) ??
      state.sources[0] ??
      null
    );
  }, [selectedSourceId, state]);

  const selectedEntries = useMemo(() => {
    if (!selectedSource) return [];
    return entries.filter((entry) => entry.source.id === selectedSource.id);
  }, [entries, selectedSource]);

  const summary = useMemo(() => {
    const sources = state.status === "ready" ? state.sources : [];
    const deployments = entries.filter((entry) => entry.deployment);
    const liveApps = sources.flatMap((source) =>
      source.apps.filter((app) => app.isActive && app.loaded),
    );
    const failed = deployments.filter(
      ({ deployment }) =>
        deployment?.state === "failed" || deployment?.ciStatus === "failed",
    );
    return {
      sourceCount: sources.length,
      deploymentCount: deployments.length,
      liveAppCount: liveApps.length,
      failedCount: failed.length,
    };
  }, [entries, state]);

  const runRollback = useCallback(
    async (deployment: UserSourceLatestDeployment | null) => {
      const deploymentId = deployment?.deploymentId;
      if (!deploymentId) return;
      setRollback({
        deploymentId,
        status: "running",
        message: "Rolling back",
      });
      try {
        const result = await deploymentRollback({ deploymentId });
        setRollback({
          deploymentId,
          status: result.ok ? "done" : "error",
          message: result.ok
            ? `Rollback activated ${result.rollback.releaseTags.length} release tag(s).`
            : result.rollback.status,
        });
        await load();
      } catch (err) {
        setRollback({
          deploymentId,
          status: "error",
          message: err instanceof Error ? err.message : "Rollback failed",
        });
      }
    },
    [load],
  );

  const requiredSdk =
    state.status === "ready" || state.status === "signed_out"
      ? state.sdk?.sdkStatus.requiredVersion
      : null;
  const githubLogin =
    state.status === "ready" ? state.github.githubLogin : null;

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white lg:block">
          <div className="flex h-14 items-center border-b border-zinc-200 px-4">
            <div className="flex size-6 items-center justify-center rounded-md bg-zinc-950 text-xs font-semibold text-white">
              A
            </div>
            <div className="ml-2 text-sm font-semibold">Aomi</div>
          </div>
          <nav className="space-y-1 px-2 py-3 text-sm">
            <NavItem active icon={<Boxes className="size-4" />}>
              Deployments
            </NavItem>
            <NavItem icon={<KeyRound className="size-4" />}>
              Environment
            </NavItem>
            <NavItem icon={<Settings className="size-4" />}>Settings</NavItem>
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-14 items-center justify-between border-b border-zinc-200 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="font-medium">Deployments</span>
              <ChevronRight className="size-4 text-zinc-400" aria-hidden />
              <span className="truncate text-zinc-500">
                {selectedSource?.repositoryLink ?? "All projects"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {githubLogin && (
                <div className="hidden items-center gap-2 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 sm:flex">
                  <Github className="size-3.5" aria-hidden />
                  {githubLogin}
                </div>
              )}
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-normal">
                  {selectedSource?.repositoryLink ?? "Deployments"}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage build history, SDK compatibility, and rollbacks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[520px]">
                <Metric label="Projects" value={summary.sourceCount} />
                <Metric label="Deployments" value={summary.deploymentCount} />
                <Metric label="Live" value={summary.liveAppCount} />
                <Metric label="Failed" value={summary.failedCount} />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
              <ProjectList
                state={state}
                selectedSourceId={selectedSource?.id ?? null}
                onSelect={setSelectedSourceId}
              />

              <div className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4">
                  <div className="flex items-center gap-1 rounded-md bg-zinc-100 p-1 text-sm">
                    <Tab active>Deployments</Tab>
                    <Tab>Domains</Tab>
                    <Tab>Logs</Tab>
                  </div>
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                    title="More deployment actions"
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                </div>
                {state.status === "loading" && (
                  <TableMessage>Loading projects</TableMessage>
                )}
                {state.status === "error" && (
                  <TableMessage tone="error">{state.error}</TableMessage>
                )}
                {state.status === "signed_out" && <GitHubSignInPanel />}
                {state.status === "ready" && selectedEntries.length === 0 && (
                  <TableMessage>No deployments for this project.</TableMessage>
                )}
                {state.status === "ready" &&
                  selectedEntries.map(({ source, deployment }, index) => (
                    <DeploymentRow
                      key={`${source.id}-${deployment?.deploymentId ?? index}`}
                      source={source}
                      deployment={deployment}
                      requiredSdk={requiredSdk}
                      rollback={rollback}
                      onRollback={() => void runRollback(deployment)}
                    />
                  ))}
              </div>

              <ProjectDetails
                source={selectedSource}
                requiredSdk={requiredSdk}
                deployments={selectedEntries}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({
  active = false,
  icon,
  children,
}: {
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-8 items-center gap-2 rounded-md px-2 ${
        active
          ? "bg-zinc-100 font-medium text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {icon}
      {children}
    </div>
  );
}

function Tab({
  active = false,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`h-7 rounded px-2.5 text-xs font-medium ${
        active ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function ProjectList({
  state,
  selectedSourceId,
  onSelect,
}: {
  state: LoadState;
  selectedSourceId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-3">
        <div className="text-sm font-medium">Projects</div>
        <div className="text-xs text-zinc-500">
          {state.status === "ready" ? state.sources.length : 0}
        </div>
      </div>
      {state.status === "ready" && state.sources.length > 0 ? (
        <div className="max-h-[560px] overflow-y-auto p-1">
          {state.sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => onSelect(source.id)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-zinc-50 ${
                source.id === selectedSourceId ? "bg-zinc-100" : ""
              }`}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-medium">
                {(source.repositoryLink ?? "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {source.repositoryLink ?? "Unknown repository"}
                </div>
                <div className="text-xs text-zinc-500">Source #{source.id}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-8 text-sm text-zinc-500">
          {state.status === "signed_out"
            ? "Sign in to load projects."
            : "No projects yet."}
        </div>
      )}
    </div>
  );
}

function GitHubSignInPanel() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border border-zinc-200">
        <Github className="size-5" aria-hidden />
      </div>
      <div>
        <div className="text-base font-semibold">Sign in with GitHub</div>
        <div className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
          Deployment history is scoped to repositories connected to your GitHub
          account.
        </div>
      </div>
      <a
        href={GITHUB_SIGNIN_URL}
        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Continue with GitHub
      </a>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function DeploymentRow({
  source,
  deployment,
  requiredSdk,
  rollback,
  onRollback,
}: {
  source: UserSource;
  deployment: UserSourceLatestDeployment | null;
  requiredSdk: string | null | undefined;
  rollback: RollbackState | null;
  onRollback: () => void;
}) {
  const sdkVersion =
    deployment?.sdkVersion ??
    deployment?.apps.find((app) => app.sdkVersion)?.sdkVersion ??
    null;
  const target =
    deployment?.apps.find((app) => app.target)?.target ??
    deployment?.buildTarget;
  const state = deployment?.state ?? "not deployed";
  const deploymentId = deployment?.deploymentId ?? null;
  const running =
    rollback?.deploymentId === deploymentId && rollback.status === "running";
  const rollbackMessage =
    rollback?.deploymentId === deploymentId ? rollback.message : null;
  const sdkOk = Boolean(
    requiredSdk && sdkVersion && requiredSdk === sdkVersion,
  );
  const commit = deployment?.commitHash?.slice(0, 12) ?? "unknown";

  return (
    <div className="grid min-h-[88px] grid-cols-[minmax(0,1fr)_140px] gap-4 border-b border-zinc-100 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_150px_130px_120px]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot state={state} />
          <div className="truncate text-sm font-medium">
            {deploymentId ?? "No deployment"}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Github className="size-3.5" aria-hidden />
            {source.repositoryLink ?? "Unknown repository"}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            {commit}
          </span>
          <span>{deployment?.releaseTags.length ?? 0} release tag(s)</span>
        </div>
        {rollbackMessage && (
          <div
            className={`mt-2 text-xs ${
              rollback?.status === "error" ? "text-red-600" : "text-zinc-500"
            }`}
          >
            {rollbackMessage}
          </div>
        )}
      </div>

      <div className="hidden text-sm lg:block">
        <StatusPill value={state} />
        <div className="mt-1 text-xs text-zinc-500">
          {deployment?.ciStatus ?? "no CI"}
        </div>
      </div>

      <div className="hidden min-w-0 text-sm lg:block">
        <div className="flex items-center gap-1.5 text-xs">
          {sdkOk ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
          ) : (
            <AlertCircle className="size-3.5 text-zinc-400" aria-hidden />
          )}
          <span className="truncate">{sdkVersion ?? "no SDK"}</span>
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500">
          {target ?? "unknown target"}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          disabled={!deploymentId || running}
          onClick={onRollback}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Rollback to this deployment"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Rollback
        </button>
      </div>
    </div>
  );
}

function ProjectDetails({
  source,
  requiredSdk,
  deployments,
}: {
  source: UserSource | null;
  requiredSdk: string | null | undefined;
  deployments: DeploymentEntry[];
}) {
  const latest =
    deployments.find((entry) => entry.deployment)?.deployment ?? null;
  const latestSdk =
    latest?.sdkVersion ??
    latest?.apps.find((app) => app.sdkVersion)?.sdkVersion;
  return (
    <aside className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-medium">Project Details</div>
      </div>
      <dl className="divide-y divide-zinc-100 text-sm">
        <Detail label="Repository" value={source?.repositoryLink ?? "-"} />
        <Detail label="Source ID" value={source ? `#${source.id}` : "-"} />
        <Detail label="Deployments" value={String(deployments.length)} />
        <Detail label="Required SDK" value={requiredSdk ?? "unknown"} />
        <Detail label="Latest SDK" value={latestSdk ?? "no stamp"} />
      </dl>
      <div className="border-t border-zinc-200 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4" aria-hidden />
          Environment
        </div>
        <p className="text-sm leading-6 text-zinc-500">
          Per-user/per-app secrets are available. Durable deployment env writes
          are pending the /api/_internal/secrets ownership contract.
        </p>
      </div>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}

function TableMessage({
  tone,
  children,
}: {
  tone?: "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-[260px] items-center justify-center px-4 py-10 text-center text-sm ${
        tone === "error" ? "text-red-600" : "text-zinc-500"
      }`}
    >
      {children}
    </div>
  );
}

function StatusDot({ state }: { state: string }) {
  const tone =
    state === "ready" || state === "live" || state === "recorded"
      ? "bg-emerald-500"
      : state === "failed"
        ? "bg-red-500"
        : "bg-zinc-400";
  return <span className={`size-2 rounded-full ${tone}`} />;
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "ready" || value === "live" || value === "recorded"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "failed"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium ${tone}`}
    >
      {value}
    </span>
  );
}
