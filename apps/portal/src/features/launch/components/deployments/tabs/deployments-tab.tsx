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
            onRollback={() => {
              if (id) setConfirmId(id);
            }}
          />
        );
      })}
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
