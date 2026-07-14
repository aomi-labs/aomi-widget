"use client";

import { History } from "lucide-react";

import type { BuildSession } from "@build/features/build/contracts";
import { JOURNEY_STAGES } from "@build/features/build/contracts";
import { cn } from "@build/lib/utils";

type SessionHistoryProps = {
  sessions: BuildSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNewSession: () => void;
  className?: string;
};

function statusTone(status: BuildSession["status"]) {
  if (status === "healthy") return "bg-positive/10 text-positive";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "running") return "bg-warning/10 text-warning";
  return "bg-surface-2 text-dim";
}

function stageLabel(stageId: BuildSession["stageId"]) {
  return JOURNEY_STAGES.find((s) => s.id === stageId)?.title ?? stageId;
}

/**
 * Thin in-page session list — not an immersive BuildLayout rail.
 */
export function SessionHistory({
  sessions,
  activeSessionId,
  onSelect,
  onNewSession,
  className,
}: SessionHistoryProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-subtle flex items-center gap-1.5 text-[12px] font-medium">
          <History className="text-dim size-3.5" />
          Sessions
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="text-dim hover:text-foreground text-[11px] transition-colors"
        >
          New
        </button>
      </div>
      <div className="space-y-1">
        {sessions.slice(0, 8).map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className={cn(
              "panel-row w-full text-left",
              activeSessionId === session.id && "border-border-hover bg-accent-selected",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground truncate text-[13px]">
                {session.title}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                  statusTone(session.status),
                )}
              >
                {session.status}
              </span>
            </div>
            <p className="text-dim mt-0.5 text-[11px]">
              {stageLabel(session.stageId)} · {session.updatedAt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
