"use client";

import { useEffect, useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
import { TimelineDeploymentRow } from "../ui/timeline-deployment-row";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { LoadingPanel, EmptyPanel } from "../ui/state-panels";
import { buildDeploymentList } from "../deployment-timeline";

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

export function DeploymentsTab({ detail }: { detail: Detail }) {
  const [op, setOp] = useState<OpState | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    detail.loadActivations();
  }, [detail]);

  const source = detail.source;
  const deployments = useMemo(
    () => buildDeploymentList(detail.activationsByApp),
    [detail.activationsByApp],
  );
  const deploying =
    detail.deployFlow.phase !== "idle" &&
    detail.deployFlow.phase !== "done" &&
    detail.deployFlow.phase !== "error";

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
        <div className="text-sm font-medium">Deployments</div>
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

      {deployments.length === 0 ? (
        <EmptyPanel>
          No deployments yet. Use “Deploy new version” to publish this project.
        </EmptyPanel>
      ) : (
        deployments.map((deployment) => {
          const running =
            op?.deploymentId === deployment.deploymentId &&
            op.status === "running";
          const message =
            op?.deploymentId === deployment.deploymentId ? op.message : null;
          return (
            <TimelineDeploymentRow
              key={deployment.deploymentId}
              deployment={deployment}
              busy={running}
              message={message}
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
        confirmLabel={pending?.kind === "deactivate" ? "Deactivate" : "Roll back"}
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
