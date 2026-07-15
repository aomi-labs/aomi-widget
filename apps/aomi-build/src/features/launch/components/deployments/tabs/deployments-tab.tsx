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
import {
  buildActivityList,
  buildDeploymentList,
  sortDeploymentsForTimeline,
} from "../deployment-timeline";
import { formatRelativeTime } from "../format-relative-time";

type Detail = ReturnType<typeof useProjectDetail>;
type OpState = {
  kind: "promote" | "deactivate" | "upgrade";
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
  url?: string;
};
type Pending =
  | { kind: "promote"; deploymentId: string }
  | { kind: "deactivate"; deploymentId: string; apps: string[] }
  | null;
type View = "deployments" | "activity";

export function DeploymentsTab({
  detail,
  onOpenEnvironment,
}: {
  detail: Detail;
  onOpenEnvironment?: () => void;
}) {
  const { toast } = useToast();
  const [op, setOp] = useState<OpState | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [view, setView] = useState<View>("deployments");

  useEffect(() => {
    detail.loadRecords();
    detail.loadRequiredSecrets();
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
      sortDeploymentsForTimeline(
        recordDeployments.map((deployment) => ({
          ...deployment,
          current: optimisticallyPromotedId
            ? deployment.deploymentId === optimisticallyPromotedId
            : runtimeCanResolveLive
              ? deployment.releaseTags.some((tag) => liveReleaseTags.has(tag))
              : deployment.current,
        })),
      ),
    [
      recordDeployments,
      optimisticallyPromotedId,
      runtimeCanResolveLive,
      liveReleaseTags,
    ],
  );
  const currentDeployment =
    deployments.find((deployment) => deployment.current) ?? null;
  const requiredSdk = detail.sdk?.sdkStatus.requiredVersion ?? null;
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
  const missingRequiredApps = useMemo(
    () =>
      source?.apps
        .map((app) => app.name)
        .filter((app) => detail.hasMissingSecrets(app)) ?? [],
    [detail, source],
  );
  const secretsCheckPending = Boolean(
    source &&
    source.apps.length > 0 &&
    detail.requiredSecrets === null &&
    !detail.requiredSecretsError,
  );
  const secretsCheckFailed = Boolean(
    source && source.apps.length > 0 && detail.requiredSecretsError,
  );
  const secretsGateBlocked = Boolean(
    source &&
    source.apps.length > 0 &&
    (secretsCheckPending ||
      secretsCheckFailed ||
      missingRequiredApps.length > 0),
  );
  const missingRequiredCount =
    missingRequiredApps.reduce(
      (count, app) =>
        count + (detail.requiredSecrets?.[app]?.missing.length ?? 0),
      0,
    ) || missingRequiredApps.length;

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

  const runUpgrade = async (deploymentId: string) => {
    setOp({
      kind: "upgrade",
      deploymentId,
      status: "running",
      message: "Preparing SDK upgrade…",
    });
    try {
      const result = await detail.upgradeSdk();
      if (result.status === "current") {
        setOp({
          kind: "upgrade",
          deploymentId,
          status: "done",
          message: `Linked repository already uses SDK ${result.requiredSdkVersion}. Redeploying it now…`,
        });
        await detail.redeploySource();
        return;
      }
      if (result.status === "manual") {
        setOp({
          kind: "upgrade",
          deploymentId,
          status: "error",
          message: `${result.reason} Run: ${result.command}`,
        });
        toast({ title: "Manual upgrade required", tone: "error" });
        return;
      }
      setOp({
        kind: "upgrade",
        deploymentId,
        status: "done",
        message: result.pullRequest.created
          ? "SDK upgrade PR created. Merge it, then redeploy from the linked repository."
          : "SDK upgrade PR is ready. Merge it, then redeploy from the linked repository.",
        url: result.pullRequest.url,
      });
      toast({ title: "Upgrade PR ready", tone: "success" });
    } catch (error) {
      setOp({
        kind: "upgrade",
        deploymentId,
        status: "error",
        message: error instanceof Error ? error.message : "SDK upgrade failed",
      });
      toast({ title: "Failed. Retry", tone: "error" });
    }
  };

  const historyCountLabel =
    deployments.length === 1
      ? "1 deployment in history"
      : `${deployments.length} deployments in history`;
  const summaryLabel = status?.isLive
    ? currentDeployment
      ? `Live · ${currentDeployment.apps.join(", ") || "app"} · ${historyCountLabel}`
      : `Live · ${historyCountLabel}`
    : deactivated
      ? `Deactivated · ${historyCountLabel}`
      : deployments.length > 0
        ? historyCountLabel
        : (status?.label ?? "No deployment");

  return (
    <div>
      <div className="border-border text-dim border-b px-4 py-2 text-xs">
        <span className="text-foreground font-medium">{summaryLabel}</span>
        <span className="text-dim"> · </span>
        Newest and current first. Promote an older release to make it live.
      </div>
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <div
          role="tablist"
          aria-label="Deployment views"
          className="border-border bg-surface-1 inline-grid h-9 grid-cols-2 rounded-md border p-0.5"
        >
          {[
            ["deployments", "History"],
            ["activity", "Promotions"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id as View)}
              className={`h-full w-24 rounded px-2.5 text-xs font-medium ${
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
              className="border-border bg-surface-1 text-foreground hover:bg-accent-hover inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
            disabled={deploying || secretsGateBlocked}
            onClick={() => {
              setOp(null);
              void detail.redeploySource();
            }}
            className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Deploy the source repo's latest commit and activate it"
          >
            <Rocket className="size-3.5" aria-hidden />
            {deploying ? "Deploying…" : "Redeploy from Linked Repository"}
          </button>
        </div>
      </div>

      {detail.deployFlow.phase !== "idle" && (
        <div
          className={`border-border border-b px-4 py-2 text-xs ${
            detail.deployFlow.phase === "error"
              ? "text-destructive"
              : "text-dim"
          }`}
        >
          {detail.deployFlow.message}
        </div>
      )}

      {op?.url && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between gap-3 border-b px-4 py-2 text-xs">
          <span>{op.message}</span>
          <a
            href={op.url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-medium underline underline-offset-2"
          >
            Review upgrade PR
          </a>
        </div>
      )}

      {deactivated && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 border-b px-4 py-2 text-xs">
          <span className="bg-destructive/20 rounded-full px-2 py-0.5 font-medium">
            Deactivated
          </span>
          <span>
            No deployment is currently live. Promote a deployment or deploy a
            new version.
          </span>
        </div>
      )}

      {detail.recordsError && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive border-b px-4 py-2 text-xs">
          {detail.recordsError}
        </div>
      )}

      {secretsGateBlocked && (
        <div
          className="border-warning/40 bg-warning/10 text-warning flex items-center justify-between gap-3 border-b px-4 py-3 text-xs"
          role="alert"
        >
          <span>
            {secretsCheckPending
              ? "Checking required secrets before deployment…"
              : detail.requiredSecretsError
                ? "Required secrets could not be verified. Refresh before deploying."
                : `${missingRequiredCount} required secret${missingRequiredCount === 1 ? "" : "s"} missing for ${missingRequiredApps.join(", ")}.`}
          </span>
          {onOpenEnvironment && !secretsCheckPending && !secretsCheckFailed && (
            <button
              type="button"
              onClick={onOpenEnvironment}
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Set required secrets
            </button>
          )}
        </div>
      )}

      {view === "deployments" &&
      deployments.length === 0 &&
      !detail.recordsError ? (
        <EmptyState
          title={
            status?.isLive ? "No deployment history yet" : "No deployments yet"
          }
          description={
            status?.isLive
              ? "This project is live, but no deployment records are available yet. Deploy a new version to start a history."
              : "Deploy the current version from the linked repository."
          }
          onAction={() =>
            secretsGateBlocked
              ? onOpenEnvironment?.()
              : void detail.redeploySource()
          }
          actionLabel={
            secretsGateBlocked
              ? "Set required secrets"
              : "Deploy from Linked Repository"
          }
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
          const secretsBlocked = deployment.apps.some((app) =>
            detail.hasMissingSecrets(app),
          );
          return (
            <TimelineDeploymentRow
              key={deployment.deploymentId}
              deployment={deployment}
              busy={running}
              message={message}
              runtimeState={hasUnloadedCurrentApp ? "not-loaded" : "loaded"}
              requiredSdk={requiredSdk}
              secretsBlocked={secretsBlocked}
              onPromote={() =>
                setPending({
                  kind: "promote",
                  deploymentId: deployment.deploymentId,
                })
              }
              onUpgrade={() => void runUpgrade(deployment.deploymentId)}
            />
          );
        })
      ) : null}

      {view === "activity" && activity.length === 0 && !detail.recordsError && (
        <EmptyPanel>
          No promotions recorded yet. Promote a deployment to see it here.
        </EmptyPanel>
      )}

      {view === "activity" && activity.length > 0 && (
        <div>
          {activity.map((row) => (
            <div
              key={`${row.app}-${row.deploymentId}-${row.releaseTag}-${row.createdAt}`}
              className="border-border text-dim flex min-h-10 items-center justify-between gap-4 border-b px-4 py-2 text-xs last:border-b-0"
            >
              <span className="min-w-0 truncate">
                <span className="text-foreground font-medium">{row.app}</span>
                <span className="text-dim"> · promoted · </span>
                <span className="font-mono">{row.deploymentId}</span>
              </span>
              <span
                className="shrink-0 text-right"
                title={new Date(row.createdAt * 1000).toLocaleString()}
              >
                {row.current ? "current · " : ""}
                {row.actor ? `${row.actor} · ` : ""}
                {formatRelativeTime(row.createdAt)}
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
