import { GitCommitHorizontal, RotateCcw, PowerOff } from "lucide-react";
import type { TimelineDeployment } from "../deployment-timeline";

/** Deployment row rendered purely from the DB promotion records (no GitHub
 *  reads). The live deployment is marked Current and offers Deactivate; older
 *  deployments offer Promote. */
export function TimelineDeploymentRow({
  deployment,
  busy,
  message,
  runtimeState,
  onPromote,
  onDeactivate,
}: {
  deployment: TimelineDeployment;
  busy: boolean;
  message?: string | null;
  runtimeState?: "loaded" | "not-loaded";
  onPromote: () => void;
  onDeactivate: () => void;
}) {
  const { deploymentId, commit, apps, current, actor, sdkVersion, createdAt } =
    deployment;

  return (
    <div className="grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-zinc-100 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-medium">{deploymentId}</div>
          {current && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                runtimeState === "not-loaded"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {runtimeState === "not-loaded"
                ? "Selected, not loaded"
                : "Current"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 font-mono">
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            {commit ?? "unknown"}
          </span>
          <span>{apps.join(", ") || "no apps"}</span>
          {sdkVersion && <span>sdk {sdkVersion}</span>}
          <span>
            {actor ? `${actor} · ` : ""}
            {new Date(createdAt * 1000).toLocaleString()}
          </span>
        </div>
        {message && <div className="mt-1 text-xs text-zinc-500">{message}</div>}
      </div>

      <div className="flex items-center gap-2">
        {current ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDeactivate}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Deactivate: unload the binary and clear the live pointer"
          >
            <PowerOff className="size-3.5" aria-hidden />
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onPromote}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
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
