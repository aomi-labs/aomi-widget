"use client";

import { useEffect, useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
import { TimelineDeploymentRow } from "../ui/timeline-deployment-row";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { LoadingPanel, EmptyPanel } from "../ui/state-panels";
import { buildActivityList, buildDeploymentList } from "../deployment-timeline";

type Detail = ReturnType<typeof useProjectDetail>;
type OpState = {
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
};
type Pending =
  | { kind: "rollback"; deploymentId: string }
  | { kind: "deactivate"; deploymentId: string; apps: string[] }
  | null;
type View = "deployments" | "logs";

export function DeploymentsTab({ detail }: { detail: Detail }) {
  const [op, setOp] = useState<OpState | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [view, setView] = useState<View>("deployments");

  useEffect(() => {
    detail.loadActivations();
  }, [detail]);

  const source = detail.source;
  const deployments = useMemo(
    () => buildDeploymentList(detail.activationsByApp),
    [detail.activationsByApp],
  );
  const activity = useMemo(
    () => buildActivityList(detail.activationsByApp),
    [detail.activationsByApp],
  );
  const deploying =
    detail.deployFlow.phase !== "idle" &&
    detail.deployFlow.phase !== "done" &&
    detail.deployFlow.phase !== "error";
  const runtimeByApp = useMemo(
    () => new Map(source?.apps.map((app) => [app.name, app]) ?? []),
    [source],
  );

  if (!source) {
    return detail.loading ? (
      <LoadingPanel label="Loading project…" />
    ) : (
      <EmptyPanel>Project not found.</EmptyPanel>
    );
  }
  if (detail.activationsByApp === null) {
    return <LoadingPanel label="Loading deployments…" />;
  }

  const runRollback = async (deploymentId: string) => {
    setPending(null);
    setOp({ deploymentId, status: "running", message: "Rolling back…" });
    try {
      const result = await detail.rollback(deploymentId);
      setOp({
        deploymentId,
        status: result.ok ? "done" : "error",
        message: result.ok
          ? `Rolled back ${result.rollback.releaseTags.length} release tag(s).`
          : result.rollback.status,
      });
      detail.reload();
      detail.refreshActivations();
    } catch (err) {
      setOp({
        deploymentId,
        status: "error",
        message: err instanceof Error ? err.message : "Rollback failed",
      });
    }
  };

  const runDeactivate = async (deploymentId: string, apps: string[]) => {
    setPending(null);
    setOp({ deploymentId, status: "running", message: "Deactivating…" });
    try {
      await detail.deactivate(apps);
      setOp({ deploymentId, status: "done", message: "Deactivated." });
      detail.reload();
      detail.refreshActivations();
    } catch (err) {
      setOp({
        deploymentId,
        status: "error",
        message: err instanceof Error ? err.message : "Deactivate failed",
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div
          role="tablist"
          aria-label="Deployment views"
          className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5"
        >
          {[
            ["deployments", "Deployments"],
            ["logs", "Logs"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id as View)}
              className={`h-7 rounded px-2.5 text-xs font-medium ${
                view === id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={deploying}
          onClick={() => void detail.deployNewVersion()}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          title="Deploy the source repo's latest commit and activate it"
        >
          <Rocket className="size-3.5" aria-hidden />
          {deploying ? "Deploying…" : "Deploy new version"}
        </button>
      </div>

      {detail.deployFlow.phase !== "idle" && (
        <div
          className={`border-b border-zinc-100 px-4 py-2 text-xs ${
            detail.deployFlow.phase === "error"
              ? "text-red-600"
              : "text-zinc-500"
          }`}
        >
          {detail.deployFlow.message}
        </div>
      )}

      {detail.activationsError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {detail.activationsError}
        </div>
      )}

      {view === "deployments" &&
      deployments.length === 0 &&
      !detail.activationsError ? (
        <EmptyPanel>
          No deployments yet. Use “Deploy new version” to publish this project.
        </EmptyPanel>
      ) : view === "deployments" && deployments.length > 0 ? (
        deployments.map((deployment) => {
          const running =
            op?.deploymentId === deployment.deploymentId &&
            op.status === "running";
          const message =
            op?.deploymentId === deployment.deploymentId ? op.message : null;
          const hasUnloadedCurrentApp =
            deployment.current &&
            deployment.apps.some((appName) => {
              const app = runtimeByApp.get(appName);
              return (
                app?.isActive === true &&
                app.loaded === false &&
                app.appReleaseTag != null &&
                deployment.releaseTags.includes(app.appReleaseTag)
              );
            });
          return (
            <TimelineDeploymentRow
              key={deployment.deploymentId}
              deployment={deployment}
              busy={running}
              message={message}
              runtimeState={hasUnloadedCurrentApp ? "not-loaded" : "loaded"}
              onRollback={() =>
                setPending({
                  kind: "rollback",
                  deploymentId: deployment.deploymentId,
                })
              }
              onDeactivate={() =>
                setPending({
                  kind: "deactivate",
                  deploymentId: deployment.deploymentId,
                  apps: deployment.apps,
                })
              }
            />
          );
        })
      ) : null}

      {view === "logs" && activity.length === 0 && !detail.activationsError && (
        <EmptyPanel>No activity logs for this project.</EmptyPanel>
      )}

      {view === "logs" && activity.length > 0 && (
        <div>
          {activity.map((row) => (
            <div
              key={`${row.app}-${row.deploymentId}-${row.releaseTag}-${row.createdAt}`}
              className="flex min-h-10 items-center justify-between gap-4 border-b border-zinc-100 px-4 py-2 text-xs text-zinc-600 last:border-b-0"
            >
              <span className="min-w-0 truncate font-mono">
                {row.action} · {row.deploymentId}
              </span>
              <span className="shrink-0 text-right">
                {row.app}
                {row.current ? " · current" : ""}
                {row.actor ? ` · ${row.actor}` : ""} ·{" "}
                {new Date(row.createdAt * 1000).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === "deactivate"
            ? "Deactivate deployment?"
            : "Roll back deployment?"
        }
        body={
          pending?.kind === "deactivate"
            ? "This unloads the running binary and clears the live pointer. The deployment record and history are kept."
            : "This re-activates the release tags recorded for this deployment. Cross-SDK rollbacks are blocked by the backend."
        }
        confirmLabel={
          pending?.kind === "deactivate" ? "Deactivate" : "Roll back"
        }
        onConfirm={() => {
          if (pending?.kind === "rollback") {
            void runRollback(pending.deploymentId);
          } else if (pending?.kind === "deactivate") {
            void runDeactivate(pending.deploymentId, pending.apps);
          }
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
