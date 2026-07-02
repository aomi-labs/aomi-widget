"use client";

import { useEffect, useState } from "react";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
import { DeploymentRow } from "../ui/deployment-row";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { LoadingPanel, EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;
type RollbackState = {
  deploymentId: string;
  status: "running" | "done" | "error";
  message: string;
};

export function DeploymentsTab({ detail }: { detail: Detail }) {
  const [rollback, setRollback] = useState<RollbackState | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    detail.loadHistory();
    detail.loadActivations();
  }, [detail]);

  const requiredSdk = detail.sdk?.sdkStatus.requiredVersion;
  const source = detail.source;

  if (detail.history === null) {
    return <LoadingPanel label="Loading deployments…" />;
  }
  if (!source) {
    return <EmptyPanel>Project not found.</EmptyPanel>;
  }
  if (detail.history.length === 0) {
    return <EmptyPanel>No deployments for this project.</EmptyPanel>;
  }

  const runRollback = async (deploymentId: string) => {
    setConfirmId(null);
    setRollback({ deploymentId, status: "running", message: "Rolling back…" });
    try {
      const result = await detail.rollback(deploymentId);
      setRollback({
        deploymentId,
        status: result.ok ? "done" : "error",
        message: result.ok
          ? `Rollback activated ${result.rollback.releaseTags.length} release tag(s).`
          : result.rollback.status,
      });
      detail.reload();
    } catch (err) {
      setRollback({
        deploymentId,
        status: "error",
        message: err instanceof Error ? err.message : "Rollback failed",
      });
    }
  };

  // The backend history JSON sets a per-app `appReleaseTag` only when it
  // matches that app's live release tag, so equality means "this deployment
  // is what is running now".
  const isCurrent = (deployment: (typeof detail.history)[number]) =>
    deployment.apps.some(
      (app) => app.appReleaseTag && app.appReleaseTag === app.releaseTag,
    );

  return (
    <div>
      {detail.history.map((deployment, index) => {
        const id = deployment.deploymentId ?? null;
        const running =
          rollback?.deploymentId === id && rollback.status === "running";
        const message = rollback?.deploymentId === id ? rollback.message : null;
        return (
          <DeploymentRow
            key={id ?? index}
            deployment={deployment}
            source={source}
            requiredSdk={requiredSdk}
            running={running}
            message={message}
            current={isCurrent(deployment)}
            onRollback={() => {
              if (id) setConfirmId(id);
            }}
          />
        );
      })}
      {detail.activationsByApp && (
        <div className="mt-6">
          <div className="px-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Activity
          </div>
          {Object.entries(detail.activationsByApp).flatMap(([app, rows]) =>
            rows.map((row) => (
              <div
                key={`${app}-${row.deploymentId}-${row.createdAt}`}
                className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs text-zinc-600 last:border-b-0"
              >
                <span className="font-mono">
                  {row.action} · {row.deploymentId}
                </span>
                <span>
                  {app}
                  {row.actor ? ` · ${row.actor}` : ""} ·{" "}
                  {new Date(row.createdAt * 1000).toLocaleString()}
                </span>
              </div>
            )),
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmId !== null}
        title="Roll back deployment?"
        body="This re-activates the release tags recorded for this deployment. Cross-SDK rollbacks are blocked by the backend."
        confirmLabel="Roll back"
        onConfirm={() => {
          if (confirmId) void runRollback(confirmId);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
