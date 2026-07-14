import Link from "next/link";
import { FolderKanban, Rocket } from "lucide-react";

/**
 * End-of-run handoff → manage path (Projects), never /deploy/[id].
 */
export function ShipHandoffBanner() {
  return (
    <div className="border-positive/30 bg-positive/5 mx-auto my-4 flex max-w-3xl flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-foreground text-[13px] font-medium">
          Local mock ready — ship toward Projects
        </p>
        <p className="text-subtle text-[12px]">
          Review the generated files, then manage deploy from Projects. Real
          Smithers SSE is not wired yet.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href="/projects"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors"
        >
          <FolderKanban className="size-3.5" />
          Open Projects
        </Link>
        <span className="text-dim inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-[11px]">
          <Rocket className="size-3.5" />
          GitHub init · Soon
        </span>
      </div>
    </div>
  );
}
