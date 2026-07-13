import { GitCommitHorizontal, RotateCcw } from "lucide-react";
import type { TimelineDeployment } from "../deployment-timeline";
import { formatRelativeTime } from "../format-relative-time";

/** Deployment row from DB promotion records. Lead with apps + status; id is secondary. */
export function TimelineDeploymentRow({
  deployment,
  busy,
  message,
  runtimeState,
  onPromote,
}: {
  deployment: TimelineDeployment;
  busy: boolean;
  message?: string | null;
  runtimeState?: "loaded" | "not-loaded";
  onPromote: () => void;
}) {
  const { deploymentId, commit, apps, current, actor, sdkVersion, createdAt } =
    deployment;
  const title = apps.join(", ") || "Deployment";
  const absolute = new Date(createdAt * 1000).toLocaleString();

  return (
    <div
      className={`grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 ${
        current ? "bg-positive/5" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-medium">{title}</div>
          {current && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                runtimeState === "not-loaded"
                  ? "bg-warning/10 text-warning"
                  : "bg-positive/10 text-positive"
              }`}
            >
              {runtimeState === "not-loaded"
                ? "Selected, not loaded"
                : "Current"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
          <span className="inline-flex items-center gap-1 font-mono">
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            {commit ?? "unknown"}
          </span>
          {sdkVersion && <span>sdk {sdkVersion}</span>}
          {actor && <span>{actor}</span>}
          <span title={absolute}>{formatRelativeTime(createdAt)}</span>
        </div>
        <div className="text-dim mt-1 truncate font-mono text-[11px]">
          {deploymentId}
        </div>
        {message && <div className="mt-1 text-xs text-dim">{message}</div>}
      </div>

      <div className="flex items-center gap-2">
        {!current && (
          <button
            type="button"
            disabled={busy}
            onClick={onPromote}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 text-xs font-medium text-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Promote this deployment to live"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Promote
          </button>
        )}
      </div>
    </div>
  );
}
