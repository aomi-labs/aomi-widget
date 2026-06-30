"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, KeyRound, RotateCcw, Server } from "lucide-react";
import type { UserSource } from "@aomi-labs/deploy";
import {
  deploymentRollback,
  deploymentSdkStatus,
  deploymentSources,
} from "@portal/features/launch/client";
import type { LaunchSdkStatus } from "@portal/features/launch/contracts";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; sources: UserSource[]; sdk: LaunchSdkStatus | null }
  | { status: "error"; error: string };

type RollbackState = {
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
};

export function DeploymentConsole() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [rollback, setRollback] = useState<RollbackState | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [sourcesResult, sdk] = await Promise.all([
        deploymentSources(),
        deploymentSdkStatus().catch(() => null),
      ]);
      setState({
        status: "ready",
        sources: sourcesResult.sources,
        sdk,
      });
    } catch (err) {
      setState({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Failed to load deployment sources",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const sources = state.status === "ready" ? state.sources : [];
    const deployments = sources.filter((source) => source.latestDeployment);
    const liveApps = sources.flatMap((source) =>
      source.apps.filter((app) => app.isActive && app.loaded),
    );
    const blocked = sources.filter((source) => {
      const latest = source.latestDeployment;
      return latest?.state === "failed" || latest?.ciStatus === "failed";
    });
    return {
      sourceCount: sources.length,
      deploymentCount: deployments.length,
      liveAppCount: liveApps.length,
      blockedCount: blocked.length,
    };
  }, [state]);

  const runRollback = useCallback(
    async (source: UserSource) => {
      const deploymentId = source.latestDeployment?.deploymentId;
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
    state.status === "ready" ? state.sdk?.sdkStatus.requiredVersion : null;

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
            {state.status === "ready" && state.sources.length === 0 && (
              <div className="px-4 py-8 text-sm text-zinc-500">
                No connected deployment sources.
              </div>
            )}
            {state.status === "ready" &&
              state.sources.map((source) => (
                <DeploymentRow
                  key={source.id}
                  source={source}
                  requiredSdk={requiredSdk}
                  rollback={rollback}
                  onRollback={() => void runRollback(source)}
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
  requiredSdk,
  rollback,
  onRollback,
}: {
  source: UserSource;
  requiredSdk: string | null | undefined;
  rollback: RollbackState | null;
  onRollback: () => void;
}) {
  const latest = source.latestDeployment;
  const sdkVersion =
    latest?.sdkVersion ??
    latest?.apps.find((app) => app.sdkVersion)?.sdkVersion ??
    null;
  const target =
    latest?.apps.find((app) => app.target)?.target ?? latest?.buildTarget;
  const state = latest?.state ?? "not deployed";
  const deploymentId = latest?.deploymentId ?? null;
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
          {latest?.releaseTags.length ?? 0} release tag(s)
        </div>
      </div>
      <div>
        <StatusPill value={state} />
        <div className="mt-1 truncate text-xs text-zinc-500">
          {latest?.ciStatus ?? "no CI status"}
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
