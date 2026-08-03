"use client";

import { type FC, useEffect, useMemo, useRef, useState } from "react";
import type { ToolCallMessagePart } from "@assistant-ui/react";
import { BotIcon, CheckIcon, ChevronRightIcon, XIcon } from "lucide-react";

import {
  cn,
  type TaskRunState,
  type TaskRunStatus,
  type TaskRunStep,
} from "@aomi-labs/react";
import { interpretToolStep } from "@/components/assistant-ui/tool-interpreter";
import {
  prefersReducedMotion,
  ToolStepRow,
  WorkingNote,
} from "@/components/assistant-ui/working-trace-rows";

/**
 * A delegated child agent, as one row of the working trace.
 *
 * The row is a live surface joined from two sources (see the reconciliation
 * contract in `@aomi-labs/react`'s `TaskRunState`):
 *   • while the child runs there is **no** transcript part — the trace renders
 *     a synthetic row straight off the `taskRuns` sidecar (`run`);
 *   • when the mother's `task` tool-call part lands it renders the same row
 *     (`tool`), with the sidecar still supplying steps and the summary;
 *   • on reload of an older thread there is no sidecar at all, so the row
 *     degrades to what the transcript carries — label from the args, staged
 *     count from the result, no steps ("Phase 0").
 *
 * Behaviour is the decided one: mounts expanded while live, folds itself away
 * ~900ms after it finishes — unless the reader has touched it, in which case it
 * stays exactly as they left it. Children hang off a vertical rail, which is
 * the only marker of whose steps you are reading.
 */

/** Identity colors, cycled by order of appearance within the turn. */
const AGENT_COLORS = ["var(--aomi-accent)", "var(--aomi-pink)"];

/** Beat after completion before an untouched row folds (lets the check land). */
const FOLD_DELAY_MS = 900;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const asCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** The `ChildTaskRequest` the mother sent: `{label, app, prompt}`. */
const readArgs = (
  tool: ToolCallMessagePart | undefined,
): Record<string, unknown> | undefined => {
  if (!tool) return undefined;
  const direct = asRecord(tool.args);
  if (direct) return direct;
  if (tool.argsText && tool.argsText !== "undefined") {
    try {
      return asRecord(JSON.parse(tool.argsText));
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const toStatus = (value: unknown): TaskRunStatus | undefined => {
  switch (value) {
    case "running":
    case "completed":
    case "failed":
    case "stalled":
    case "cancelled":
      return value;
    default:
      return undefined;
  }
};

/**
 * Steps that are protocol plumbing, not work: the child's `thread_return`
 * call (its message already becomes the row summary) and "notes" that are
 * really raw JSON blobs a model narrated instead of prose.
 */
const isInternalStep = (step: TaskRunStep): boolean => {
  if (step.kind === "tool_call") return step.toolName === "thread_return";
  const text = step.text.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

/** The child steps the row actually shows. */
export const visibleAgentSteps = (run?: TaskRunState): TaskRunStep[] =>
  (run?.steps ?? []).filter((step) => !isInternalStep(step));

/**
 * The step count shown for an agent row — visible tool calls when we have the
 * step stream, the backend's terminal count otherwise (Phase 0). Shared with
 * the trace header so "N steps" always matches what expanding reveals.
 */
export const agentStepCount = (run?: TaskRunState): number => {
  const visible = visibleAgentSteps(run);
  return visible.length > 0
    ? visible.filter((step) => step.kind === "tool_call").length
    : (run?.stepCount ?? 0);
};

const stepKey = (step: TaskRunStep, index: number): string =>
  `${step.kind}-${step.childSeq}-${index}`;

const argsTextOf = (step: Extract<TaskRunStep, { kind: "tool_call" }>) =>
  step.args !== undefined ? JSON.stringify(step.args, null, 2) : undefined;

const titleOf = (step: TaskRunStep): string =>
  step.kind === "note"
    ? step.text
    : interpretToolStep({
        toolName: step.toolName,
        argsText: argsTextOf(step),
        result: step.resultPreview,
      }).title;

const formatCounter = (steps: number, seconds: number | null): string =>
  [
    steps > 0 ? `${steps} step${steps === 1 ? "" : "s"}` : null,
    seconds != null ? `${seconds}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Elapsed wall-clock since the run started, re-read once a second while it is
 * live. The tick is information rather than decoration, so it runs under
 * `prefers-reduced-motion` too — only the pulsing marker stands still there.
 */
const useElapsedSeconds = (startedAt: number, live: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  return Math.max(0, Math.round((now - startedAt) / 1000));
};

export type WorkingAgentProps = {
  agentId: string;
  /** Live sidecar state; absent on a reloaded thread (Phase 0 degradation). */
  run?: TaskRunState;
  /** The mother's `task` tool-call part, once the delegation has landed. */
  tool?: ToolCallMessagePart;
  /** Appearance order within the turn — picks the identity color. */
  order: number;
  /** This row holds the trace's single live signal (it is the newest item). */
  active: boolean;
  /** Play the entrance animation (false for scrollback / reloaded turns). */
  animate: boolean;
};

export const WorkingAgent: FC<WorkingAgentProps> = ({
  agentId,
  run,
  tool,
  order,
  active,
  animate,
}) => {
  const args = readArgs(tool);
  const result = asRecord(tool?.result);

  const status: TaskRunStatus =
    run?.status ?? toStatus(result?.status) ?? (tool ? "completed" : "running");
  const live = status === "running";
  const label = asText(run?.label) ?? asText(args?.label) ?? "agent";
  const steps = useMemo(() => visibleAgentSteps(run), [run]);
  const stepCount = agentStepCount(run);
  const stagedCount = run?.stagedCount ?? asCount(result?.staged_count) ?? 0;
  const startedAt = run?.startedAt ?? 0;

  const [open, setOpen] = useState(live);
  const userToggled = useRef(false);

  // Auto-expand while live, auto-fold a beat after the run goes terminal — but
  // never once the reader has taken the row over.
  useEffect(() => {
    if (userToggled.current) return;
    if (live) {
      setOpen(true);
      return;
    }
    const timer = setTimeout(
      () => {
        if (!userToggled.current) setOpen(false);
      },
      prefersReducedMotion() ? 0 : FOLD_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [live]);

  // Children only animate the first time they are shown, so reopening a folded
  // row replays nothing. A row that mounted already-finished never animates.
  const animatedCount = useRef(animate ? 0 : Number.MAX_SAFE_INTEGER);
  useEffect(() => {
    if (!animate) return;
    animatedCount.current = Math.max(animatedCount.current, steps.length);
  }, [animate, steps.length]);

  const elapsedSeconds = useElapsedSeconds(startedAt, live);
  const seconds = live
    ? startedAt > 0
      ? elapsedSeconds
      : null
    : run?.durationMs != null
      ? Math.max(1, Math.round(run.durationMs / 1000))
      : null;

  const latest = steps.length > 0 ? steps[steps.length - 1] : undefined;
  const latestTitle = useMemo(
    () => (latest ? titleOf(latest) : undefined),
    [latest],
  );

  // While live and expanded the children tell the story, so the slot is empty;
  // collapsed, it carries the latest intent as the row's live signal; once the
  // run is done it settles into the child's summary line.
  const summary = live
    ? open
      ? undefined
      : (latestTitle ?? "starting…")
    : (asText(run?.message) ??
      (stagedCount > 0 ? `staged ${stagedCount}` : undefined));
  const summaryShimmers = live && !open && active;

  return (
    <div
      className={cn(
        "aui-working-agent flex flex-col",
        animate &&
          "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none",
      )}
      data-agent-id={agentId}
      data-live={live}
      data-open={open}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          userToggled.current = true;
          setOpen((o) => !o);
        }}
        className="aui-working-agent-header group/agent flex w-full items-center gap-2.5 py-1 text-left"
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center">
          {live ? (
            // The robot IS the marker while the child works — same contract as
            // a tool row's icon (identity while running, check when done), and
            // the one glyph that says "a subagent is doing this" at a glance.
            <BotIcon
              className="aui-working-agent-bot size-3.5 animate-pulse motion-reduce:animate-none"
              style={{ color: AGENT_COLORS[order % AGENT_COLORS.length] }}
              aria-hidden="true"
            />
          ) : status === "completed" ? (
            <CheckIcon className="text-aomi-success size-3.5" />
          ) : (
            <XIcon className="text-aomi-danger size-3.5" />
          )}
        </span>
        <span className="aui-working-agent-label text-aomi-fg shrink-0 font-mono text-[13px] font-medium">
          {label}
        </span>
        <span
          className={cn(
            "aui-working-agent-summary min-w-0 flex-1 truncate font-mono text-[12.5px]",
            summaryShimmers
              ? "aui-working-shimmer font-medium"
              : "text-aomi-muted",
          )}
        >
          {summary}
        </span>
        <span className="aui-working-agent-count text-aomi-muted shrink-0 font-mono text-xs tabular-nums">
          {formatCounter(stepCount, seconds)}
        </span>
        <ChevronRightIcon
          className={cn(
            "text-aomi-muted/60 size-3 shrink-0 transition-[transform,opacity]",
            open
              ? "rotate-90 opacity-100"
              : "opacity-0 group-hover/agent:opacity-100",
          )}
        />
      </button>

      {/* The subtree animates its height open/closed and stays mounted, so a
          fold never remounts (and never restarts) the child rows. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {/* The rail: the only thing marking whose steps these are. */}
          <div className="aui-working-agent-rail border-aomi-border mb-1.5 ml-[7px] mt-0.5 flex flex-col gap-0.5 border-l pl-[17px]">
            {steps.map((step, i) => {
              const newest = i === steps.length - 1;
              const childActive = active && live && open && newest;
              const childAnimate = i >= animatedCount.current;
              if (step.kind === "note") {
                return (
                  <WorkingNote
                    key={stepKey(step, i)}
                    text={step.text}
                    animate={childAnimate}
                    active={childActive}
                  />
                );
              }
              const argsText = argsTextOf(step);
              return (
                <ToolStepRow
                  key={stepKey(step, i)}
                  interpretation={interpretToolStep({
                    toolName: step.toolName,
                    argsText,
                    result: step.resultPreview,
                  })}
                  argsText={argsText}
                  detailText={step.resultPreview}
                  done={!newest || !live}
                  active={childActive}
                  animate={childAnimate}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
