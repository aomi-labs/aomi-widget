import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import { Github, GitCommitHorizontal, RotateCcw } from "lucide-react";
import { StatusDot } from "./status-dot";
import { StatusPill } from "./status-pill";
import { SdkBadge } from "./sdk-badge";

export function DeploymentRow({
  deployment,
  source,
  requiredSdk,
  running,
  message,
  onRollback,
}: {
  deployment: UserSourceLatestDeployment | null;
  source: UserSource;
  requiredSdk?: string | null;
  running: boolean;
  message?: string | null;
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
        {message && <div className="mt-2 text-xs text-zinc-500">{message}</div>}
      </div>

      <div className="hidden text-sm lg:block">
        <StatusPill value={state} />
        <div className="mt-1 text-xs text-zinc-500">
          {deployment?.ciStatus ?? "no CI"}
        </div>
      </div>

      <div className="hidden min-w-0 text-sm lg:block">
        <SdkBadge stamped={sdkVersion} required={requiredSdk} />
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
