"use client";

import { useEffect, useMemo, useState } from "react";
import { PowerOff, Rocket } from "lucide-react";
import { EmptyState } from "@build/components/control-plane/empty-state";
import { useToast } from "@build/components/control-plane/toast";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { projectDeploymentStatus } from "../project-deployment-status";
import { TimelineDeploymentRow } from "../ui/timeline-deployment-row";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { LoadingPanel, EmptyPanel } from "../ui/state-panels";
import { buildActivityList, buildDeploymentList } from "../deployment-timeline";

type Detail = ReturnType<typeof useProjectDetail>;
type OpState = {
  kind: "promote" | "deactivate";
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
};
type Pending =
  | { kind: "promote"; deploymentId: string }
  | { kind: "deactivate"; deploymentId: string; apps: string[] }
  | null;
type View = "deployments" | "activity";

export function DeploymentsTab({ detail }: { detail: Detail }) {
  const { toast } = useToast();
  const [op, setOp] = useState<OpState | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [view, setView] = useState<View>("deployments");

  useEffect(() => {
    detail.loadRecords();
  }, [detail]);

  const source = detail.source;
  const status = useMemo(
    () => (source ? projectDeploymentStatus(source) : null),
    [source],
  );
  const recordDeployments = useMemo(
    () => buildDeploymentList(detail.recordsByApp),
    [detail.recordsByApp],
  );
  const activity = useMemo(
    () => buildActivityList(detail.recordsByApp),
    [detail.recordsByApp],
  );
  const runtimeHasActiveState =
    source?.apps.some((app) => typeof app.isActive === "boolean") ?? false;
  const activeAppMissingReleaseTag =
    source?.apps.some((app) => app.isActive && app.appReleaseTag == null) ??
    false;
  const runtimeCanResolveLive =
    runtimeHasActiveState && !activeAppMissingReleaseTag;
  const optimisticallyPromotedId =
    op?.kind === "promote" && op.status === "done" ? op.deploymentId : null;
  const optimisticallyDeactivated =
    op?.kind === "deactivate" && op.status === "done";
  const liveReleaseTags = useMemo(
    () =>
      new Set(
        optimisticallyDeactivated
          ? []
          : (source?.apps
              .filter(
                (app) => app.isActive && typeof app.appReleaseTag === "string",
              )
              .map((app) => app.appReleaseTag as string) ?? []),
      ),
    [source, optimisticallyDeactivated],
  );
  const deployments = useMemo(
    () =>
      recordDeployments.map((deployment) => ({
        ...deployment,
        current: optimisticallyPromotedId
          ? deployment.deploymentId === optimisticallyPromotedId
          : runtimeCanResolveLive
            ? deployment.releaseTags.some((tag) => liveReleaseTags.has(tag))
            : deployment.current,
      })),
    [
      recordDeployments,
      optimisticallyPromotedId,
      runtimeCanResolveLive,
      liveReleaseTags,
    ],
  );
  const currentDeployment =
    deployments.find((deployment) => deployment.current) ?? null;
  const deactivated =
    runtimeCanResolveLive &&
    deployments.length > 0 &&
    currentDeployment == null;
  const deploying =
    detail.deployFlow.phase !== "idle" &&
    detail.deployFlow.phase !== "done" &&
    detail.deployFlow.phase !== "error";
  const deactivatingCurrent =
    currentDeployment != null &&
    op?.deploymentId === currentDeployment.deploymentId &&
    op.status === "running";
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
  if (detail.recordsByApp === null) {
    return <LoadingPanel label="Loading deployments…" />;
  }

  const runPromote = async (deploymentId: string) => {
    setPending(null);
    setOp({
      kind: "promote",
      deploymentId,
      status: "running",
      message: "Promoting…",
    });
    try {
      const result = await detail.promote(deploymentId);
      setOp({
        kind: "promote",
        deploymentId,
        status: result.ok ? "done" : "error",
        message: result.ok
          ? `Promoted ${result.promote.releaseTags.length} release tag(s).`
          : result.promote.status,
      });
      toast({
        title: result.ok ? "Promoted" : "Failed. Retry",
        tone: result.ok ? "success" : "error",
      });
      detail.reload();
      detail.refreshRecords();
    } catch (err) {
      setOp({
        kind: "promote",
        deploymentId,
        status: "error",
        message: err instanceof Error ? err.message : "Promote failed",
      });
      toast({ title: "Failed. Retry", tone: "error" });
    }
  };

  const runDeactivate = async (deploymentId: string, apps: string[]) => {
    setPending(null);
    setOp({
      kind: "deactivate",
      deploymentId,
      status: "running",
      message: "Deactivating…",
    });
    try {
      await detail.deactivate(apps);
      setOp({
        kind: "deactivate",
        deploymentId,
        status: "done",
        message: "Deactivated.",
      });
      toast({ title: "Deactivated", tone: "success" });
      detail.reload();
      detail.refreshRecords();
    } catch (err) {
      setOp({
        kind: "deactivate",
        deploymentId,
        status: "error",
        message: err instanceof Error ? err.message : "Deactivate failed",
      });
      toast({ title: "Failed. Retry", tone: "error" });
    }
  };

  return (
    <div>
      <div className="border-b border-border px-4 py-2 text-xs text-dim">
        Deployment history for this project.
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div
          role="tablist"
          aria-label="Deployment views"
          className="inline-flex rounded-md border border-border bg-surface-1 p-0.5"
        >
          {[
            ["deployments", "Deployments"],
            ["activity", "Activity"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id as View)}
              className={`h-7 rounded px-2.5 text-xs font-medium ${
                view === id
                  ? "bg-primary text-primary-foreground"
                  : "text-dim hover:bg-accent-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(currentDeployment || deactivated) && (
            <button
              type="button"
              disabled={deploying || deactivatingCurrent || deactivated}
              onClick={() =>
                currentDeployment
                  ? setPending({
                      kind: "deactivate",
                      deploymentId: currentDeployment.deploymentId,
                      apps: currentDeployment.apps,
                    })
                  : undefined
              }
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-xs font-medium text-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              title={
                deactivated
                  ? "No deployment is live"
                  : "Deactivate: unload the binary and clear the live pointer"
              }
            >
              <PowerOff className="size-3.5" aria-hidden />
              Deactivate
            </button>
          )}
          <button
            type="button"
            disabled={deploying}
            onClick={() => {
              setOp(null);
              void detail.deployNewVersion();
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Deploy the source repo's latest commit and activate it"
          >
            <Rocket className="size-3.5" aria-hidden />
            {deploying ? "Deploying…" : "Deploy new version"}
          </button>
        </div>
      </div>

      {detail.deployFlow.phase !== "idle" && (
        <div
          className={`border-b border-border px-4 py-2 text-xs ${
            detail.deployFlow.phase === "error"
              ? "text-destructive"
              : "text-dim"
          }`}
        >
          {detail.deployFlow.message}
        </div>
      )}

      {deactivated && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <span className="rounded-full bg-destructive/20 px-2 py-0.5 font-medium">
            Deactivated
          </span>
          <span>
            No deployment is currently live. Promote a deployment or deploy a
            new version.
          </span>
        </div>
      )}

      {detail.recordsError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {detail.recordsError}
        </div>
      )}

      {view === "deployments" &&
      deployments.length === 0 &&
      !detail.recordsError ? (
        <EmptyState
          title={
            status?.isLive
              ? "No deployment history yet"
              : "No deployments yet"
          }
          description={
            status?.isLive
              ? "This project is live, but no deployment records are available yet. Deploy a new version to start a history."
              : "Use Deploy new version to publish this project."
          }
          onAction={() => void detail.deployNewVersion()}
          actionLabel="Deploy new version"
        />
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
              onPromote={() =>
                setPending({
                  kind: "promote",
                  deploymentId: deployment.deploymentId,
                })
              }
            />
          );
        })
      ) : null}

      {view === "activity" && activity.length === 0 && !detail.recordsError && (
        <EmptyPanel>No promotion activity for this project.</EmptyPanel>
      )}

      {view === "activity" && activity.length > 0 && (
        <div>
          {activity.map((row) => (
            <div
              key={`${row.app}-${row.deploymentId}-${row.releaseTag}-${row.createdAt}`}
              className="flex min-h-10 items-center justify-between gap-4 border-b border-border px-4 py-2 text-xs text-dim last:border-b-0"
            >
              <span className="min-w-0 truncate font-mono">
                promoted · {row.deploymentId}
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
            : "Promote deployment?"
        }
        body={
          pending?.kind === "deactivate"
            ? "This unloads the running binary and clears the live pointer. The deployment record and history are kept."
            : "This makes the deployment's release live. Cross-SDK promotions are blocked by the backend."
        }
        confirmLabel={pending?.kind === "deactivate" ? "Deactivate" : "Promote"}
        onConfirm={() => {
          if (pending?.kind === "promote") {
            void runPromote(pending.deploymentId);
          } else if (pending?.kind === "deactivate") {
            void runDeactivate(pending.deploymentId, pending.apps);
          }
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
