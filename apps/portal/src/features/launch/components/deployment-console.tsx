"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, KeyRound, RotateCcw, Server } from "lucide-react";
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
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load deployment sources";
      if (message.toLowerCase().includes("not signed in with github")) {
        setState({ status: "signed_out", sdk: null });
        return;
      }
      setState({
        status: "error",
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const sources = state.status === "ready" ? state.sources : [];
    const histories = state.status === "ready" ? state.histories : {};
    const deployments = Object.values(histories).flat();
    const liveApps = sources.flatMap((source) =>
      source.apps.filter((app) => app.isActive && app.loaded),
    );
    const blocked = deployments.filter(
      (deployment) =>
        deployment.state === "failed" || deployment.ciStatus === "failed",
    );
    return {
      sourceCount: sources.length,
      deploymentCount: deployments.length,
      liveAppCount: liveApps.length,
      blockedCount: blocked.length,
    };
  }, [state]);

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

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Developer Console
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">
              Deployments
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            <Server className="size-4" aria-hidden />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Sources" value={summary.sourceCount} />
          <Metric label="Deployments" value={summary.deploymentCount} />
          <Metric label="Live apps" value={summary.liveAppCount} />
          <Metric label="Needs attention" value={summary.blockedCount} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <div className="grid min-w-[980px] grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
              <div>Project</div>
              <div>Deployment</div>
              <div>Build</div>
              <div>SDK</div>
              <div className="text-right">Actions</div>
            </div>
            {state.status === "loading" && (
              <div className="px-4 py-8 text-sm text-zinc-500">
                Loading deployments
              </div>
            )}
            {state.status === "error" && (
              <div className="flex items-center gap-2 px-4 py-8 text-sm text-red-700">
                <AlertCircle className="size-4" aria-hidden />
                {state.error}
              </div>
            )}
            {state.status === "signed_out" && <GitHubSignInPanel />}
            {state.status === "ready" && state.sources.length === 0 && (
              <div className="px-4 py-8 text-sm text-zinc-500">
                No connected deployment sources.
              </div>
            )}
            {state.status === "ready" &&
              entries.map(({ source, deployment }, index) => (
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

          <aside className="flex flex-col gap-4">
            <InfoPanel
              icon={<Server className="size-4" aria-hidden />}
              title="SDK Requirement"
              lines={[
                requiredSdk
                  ? `Backend requires aomi-sdk ${requiredSdk}.`
                  : "Backend SDK version is unavailable.",
                "Rollback targets with missing or mismatched SDK stamps are blocked.",
              ]}
            />
            <InfoPanel
              icon={<KeyRound className="size-4" aria-hidden />}
              title="Env And API Keys"
              lines={[
                "Current backend support is per-user/per-app secrets.",
                "Durable deployment env writes are held until /api/_internal/secrets ownership is confirmed.",
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function GitHubSignInPanel() {
  return (
    <div className="flex min-h-[220px] min-w-[980px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div>
        <div className="text-base font-semibold">Sign in with GitHub</div>
        <div className="mt-1 max-w-md text-sm leading-6 text-zinc-500">
          Deployment history is scoped to repositories connected to your GitHub
          account.
        </div>
      </div>
      <a
        href={GITHUB_SIGNIN_URL}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Continue with GitHub
      </a>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{label}</div>
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

  return (
    <div className="grid min-h-[76px] min-w-[980px] grid-cols-[1.2fr_1fr_1fr_1fr_150px] gap-3 border-b border-zinc-100 px-4 py-4 text-sm last:border-b-0">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {source.repositoryLink ?? "Unknown repository"}
        </div>
        <div className="mt-1 text-xs text-zinc-500">Source #{source.id}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-xs">{deploymentId ?? "-"}</div>
        <div className="mt-1 text-xs text-zinc-500">
          {deployment?.releaseTags.length ?? 0} release tag(s)
        </div>
      </div>
      <div>
        <StatusPill value={state} />
        <div className="mt-1 truncate text-xs text-zinc-500">
          {deployment?.ciStatus ?? "no CI status"}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs text-zinc-700">
          {requiredSdk ? `required ${requiredSdk}` : "unknown required SDK"}
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500">
          {sdkVersion ? `built ${sdkVersion}` : "no SDK stamp"}
          {target ? ` / ${target}` : ""}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          disabled={!deploymentId || running}
          onClick={onRollback}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Rollback to this deployment"
        >
          <RotateCcw className="size-4" aria-hidden />
          Rollback
        </button>
        {rollbackMessage && (
          <div className="max-w-[150px] text-right text-xs text-zinc-500">
            {rollbackMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "ready" || value === "live"
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

function InfoPanel({
  icon,
  title,
  lines,
}: {
  icon: ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm leading-6 text-zinc-600">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
