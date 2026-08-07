"use client";

import { type FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TextMessagePartProvider,
  useMessage,
  type TextMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, MoreHorizontalIcon } from "lucide-react";

import {
  cn,
  readTaskPartAgentId,
  useCurrentThreadMetadata,
  useThreadTaskRuns,
  type TaskRunState,
} from "@aomi-labs/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { interpretToolStep } from "@/components/assistant-ui/tool-interpreter";
import {
  agentStepCount,
  WorkingAgent,
} from "@/components/assistant-ui/working-agent";
import {
  prefersReducedMotion,
  toDetailString,
  ToolStepRow,
  WorkingNote,
} from "@/components/assistant-ui/working-trace-rows";

/**
 * Working trace — the chain-of-thought UI.
 *
 * A merged assistant turn (see `mergeAssistantTurns` in @aomi-labs/react) is one
 * message with ordered parts `[tool-call, …, text]`. We split it:
 *   • tool-call parts → a collapsible "Working" trace, one line per step
 *   • the trailing text → the final answer, streamed on its own
 *
 * "Still working" is carried entirely by the shimmer on the *last* step: it keeps
 * sweeping whenever the turn is running, including the common case where a tool
 * call has finished and we're just waiting on the model to say what's next. When
 * the turn completes the trace collapses to "Worked for Ns" and the answer is
 * revealed. Plain replies with no tool calls buffer while running, then reveal
 * with the same final-answer fake stream once the turn settles.
 */

const formatDuration = (seconds: number): string => {
  if (seconds < 1) return "less than a second";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

/** useLayoutEffect on the client, useEffect on the server (dodges the SSR warning). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Matches the header collapse (duration-300 ease-out). */
const WINDOW_ANIM_MS = 300;

/**
 * Paces how many trace items are shown, revealing them one at a time so a burst
 * of tool calls that lands in a single update cascades instead of flashing in.
 *
 * The cadence adapts to backlog: a lone pending step waits ~1200ms (a deliberate
 * beat that fills the otherwise-idle shimmer time), but the delay tightens toward
 * ~360ms as more items queue up, so a model that ran ahead is caught up quickly
 * and in order — never held back. Once the turn ends we drain any remainder fast
 * (~220ms) so the final answer is never gated on the stagger. Under
 * `prefers-reduced-motion` everything is revealed immediately.
 *
 * Pacing applies ONLY to a turn that is live (running) while this is mounted.
 * A turn that's already complete when it mounts — a reloaded thread, scrollback,
 * a thread switch — reveals everything at once, so a finished answer never sits
 * behind an animation replaying from scratch.
 */
const REVEAL_BASE_MS = 1200;
const REVEAL_MIN_MS = 360;
const REVEAL_STEP_MS = 320;
const REVEAL_TAIL_MS = 220;

/**
 * Whenever the trace is open — live or after completion — it is capped to this
 * height so a long run of steps doesn't march down the whole screen. Newest
 * steps stay pinned at the bottom; older ones remain available by scrolling the
 * trace under edge fades (see `.aui-working-trace-edge-fade`). Sized to show
 * ~5 full steps with the adjacent rows dissolving at the edges. "Show all"
 * remains available when an uncapped overview is more useful.
 */
const WORKING_WINDOW_PX = 260;

const useStaggeredReveal = (target: number, running: boolean): number => {
  const reduced = prefersReducedMotion();
  // Only pace a turn we saw working live. If it wasn't running at mount, it's a
  // completed/loaded turn — start fully revealed.
  const startedLive = useRef(running && !reduced);
  const [revealed, setRevealed] = useState(startedLive.current ? 0 : target);

  useEffect(() => {
    if (running && !reduced) startedLive.current = true;
  }, [running, reduced]);

  useEffect(() => {
    if (!startedLive.current) {
      if (revealed !== target) setRevealed(target);
      return;
    }
    if (revealed >= target) return;
    // Reveal the first item promptly for responsiveness; pace the rest.
    if (revealed === 0) {
      setRevealed(1);
      return;
    }
    const backlog = target - revealed;
    const delay = running
      ? Math.max(REVEAL_MIN_MS, REVEAL_BASE_MS - (backlog - 1) * REVEAL_STEP_MS)
      : REVEAL_TAIL_MS;
    const timer = setTimeout(() => setRevealed((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [revealed, target, running, reduced]);

  // Clamp in case a turn's content ever shrinks (it is append-only in practice).
  return Math.min(revealed, target);
};

/**
 * One tool call of the mother's own trace. The presentation lives in
 * `ToolStepRow` (shared with a delegated agent's child steps); this wrapper
 * only unpacks the transcript part.
 */
const WorkingStep: FC<{
  tool: ToolCallMessagePart;
  active: boolean;
  animate: boolean;
}> = ({ tool, active, animate }) => {
  const done = tool.result !== undefined;
  const argsText =
    tool.argsText && tool.argsText !== "undefined" ? tool.argsText : undefined;

  return (
    <ToolStepRow
      interpretation={interpretToolStep({
        toolName: tool.toolName,
        argsText,
        result: tool.result,
      })}
      argsText={argsText}
      detailText={done ? toDetailString(tool.result) : undefined}
      done={done}
      active={active}
      animate={animate}
    />
  );
};

/**
 * One rendered row of the trace: a tool step, a run of interstitial talk, or a
 * delegated agent (whose own steps hang off it).
 */
type TraceItem =
  | { kind: "tool"; tool: ToolCallMessagePart; key: string }
  | { kind: "note"; text: string; key: string }
  | {
      kind: "agent";
      agentId: string;
      /** Present once the mother's `task` part has landed in the transcript. */
      tool?: ToolCallMessagePart;
      /** Present while the live sidecar knows about the run. */
      run?: TaskRunState;
      /** Appearance order within the turn — picks the row's identity color. */
      order: number;
      key: string;
    };

/** Child steps an agent row contributes to the header/pill step count. */
const childStepCount = (item: TraceItem): number =>
  item.kind === "agent" ? agentStepCount(item.run) : 0;

export const WorkingTrace: FC<{
  running: boolean;
  items: TraceItem[];
  revealed: number;
  /** The turn delegated to child agents — announces the mode in the header. */
  orchestrating: boolean;
  /**
   * When the turn actually started, if known. The card can mount long after
   * the work began (the transcript part for a delegation only lands at the
   * end), so mount time alone under-reports "Orchestrated for Ns" badly.
   */
  startedAtMs?: number;
}> = ({ running, items, revealed, orchestrating, startedAtMs }) => {
  const [open, setOpen] = useState(running);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [hasContentBelow, setHasContentBelow] = useState(false);
  // True only while the expand/collapse height tween is in flight; keeps the
  // viewport clipped and suppresses the edge fades so the animation reads cleanly.
  const [animating, setAnimating] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  // The inner content's natural height, read for overflow detection and the
  // expand/collapse tween. Measuring the body keeps the result stable while the
  // viewport is capped or its max-height animation is in flight.
  const bodyRef = useRef<HTMLDivElement>(null);
  // Live traces follow new steps while the reader is at the bottom. Scrolling up
  // opts out until they return to the newest step, so a tool update never yanks
  // an older row out from under the pointer.
  const followLatestRef = useRef(true);
  const prevOpen = useRef(open);
  const prevWindowed = useRef(!expanded);
  const prevExpanded = useRef(expanded);
  const animRef = useRef<Animation | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const wasRunning = useRef(running);
  const startedAt = useRef<number>(startedAtMs ?? Date.now());
  // An earlier anchor can arrive after mount (e.g. the first task_started
  // event lands a beat later); only ever move the start backwards.
  if (startedAtMs !== undefined && startedAtMs < startedAt.current) {
    startedAt.current = startedAtMs;
  }

  // How many items have already played their entrance. Survives the body's
  // collapse/remount (this component stays mounted), so an item only animates
  // the first time it's revealed — reopening a finished trace shows it static.
  const animatedCount = useRef(0);
  useEffect(() => {
    if (revealed > animatedCount.current) animatedCount.current = revealed;
  }, [revealed]);

  // The trace has fully caught up once every queued item has been revealed.
  const fullyRevealed = !running && revealed >= items.length;

  // A delegated agent remains one top-level trace item while its nested step
  // stream grows. Track that growth separately: `revealed` does not change for
  // those updates, but the viewport still needs to follow the newest child step.
  const revealedChildStepCount = items.reduce(
    (total, item, index) =>
      index < revealed && item.kind === "agent"
        ? total + (item.run?.steps.length ?? 0)
        : total,
    0,
  );

  // Cap the open trace to a scrolling window — live and after completion alike:
  // the newest steps stay pinned at the bottom and older ones remain wheel/touch/
  // keyboard-scrollable under edge fades instead of marching down the page.
  // Expanding ("Show all") still lifts the cap. The fades only engage once
  // content actually overflows, so a short trace is never faded.
  const windowed = !expanded;
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !windowed) {
      setOverflowing(false);
      return;
    }
    // Compare the full content height to the cap directly, so the reading stays
    // stable while the expand/collapse height animation is mid-flight — otherwise
    // the "Show all" control would flicker out.
    setOverflowing(body.offsetHeight - WORKING_WINDOW_PX > 24);
  }, [windowed, revealed, revealedChildStepCount, open]);

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
    followLatestRef.current = distanceFromBottom <= 8;
    setHasContentBelow(distanceFromBottom > 8);
  };

  // Animate the expand/collapse of the window height (cap ⇄ full content),
  // mirroring the header's collapse feel. Plain CSS can't transition to/from the
  // uncapped `auto` height, so we drive it with the Web Animations API: measure
  // the natural height and tween `max-height` between the cap and full. WAAP
  // overrides the declarative style while playing and reverts to it on finish —
  // which already matches the tween's end value, so it settles seamlessly. Runs
  // in a layout effect (before paint, so the first frame is already clipped) and
  // only when `expanded` actually flips — not on mount, streaming re-renders, or
  // under reduced motion.
  useIsomorphicLayoutEffect(() => {
    if (prevExpanded.current === expanded) return;
    prevExpanded.current = expanded;
    const viewport = viewportRef.current;
    const body = bodyRef.current;
    if (!viewport || !body || prefersReducedMotion()) return;
    const cap = WORKING_WINDOW_PX;
    const full = body.offsetHeight;
    const from = expanded ? cap : full;
    const to = expanded ? full : cap;
    animRef.current?.cancel();
    setAnimating(true);
    const anim = viewport.animate(
      [{ maxHeight: `${from}px` }, { maxHeight: `${to}px` }],
      { duration: WINDOW_ANIM_MS, easing: "ease-out" },
    );
    animRef.current = anim;
    const settle = () => {
      if (animRef.current !== anim) return;
      animRef.current = null;
      setAnimating(false);
    };
    anim.onfinish = settle;
    anim.oncancel = settle;
  }, [expanded]);

  // Start/restart a capped trace at its newest step. While it stays open, only
  // follow streamed additions when the reader has not scrolled away from the
  // bottom. This also restores the recent-step view after "Collapse to recent".
  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    const reopened = open && !prevOpen.current;
    const collapsedToWindow = windowed && !prevWindowed.current;

    if (reopened || collapsedToWindow) followLatestRef.current = true;
    prevOpen.current = open;
    prevWindowed.current = windowed;

    if (!viewport || !open || !windowed || animating) return;
    if (followLatestRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      setHasContentBelow(false);
    }
  }, [animating, open, revealed, revealedChildStepCount, windowed]);

  useEffect(() => () => animRef.current?.cancel(), []);

  useEffect(() => {
    if (wasRunning.current && !running) {
      // turn just finished: freeze the timer (collapse waits for full reveal)
      setElapsed((Date.now() - startedAt.current) / 1000);
    }
    wasRunning.current = running;
  }, [running]);

  // Auto-collapse only after the tail has finished cascading, and leave the last
  // step on screen for a beat so it isn't hidden the instant it appears.
  useEffect(() => {
    if (!fullyRevealed) return;
    const timer = setTimeout(() => setOpen(false), 500);
    return () => clearTimeout(timer);
  }, [fullyRevealed]);

  // The badge already names the orchestration mode. Keep the status language
  // identical across modes so the header never reads as the redundant
  // “Orchestrating · ORCHESTRATOR”.
  const label = running
    ? "Working"
    : elapsed != null
      ? `Worked for ${formatDuration(elapsed)}`
      : "Worked it out";

  // Exactly one "live" signal: the newest *revealed* step shimmers while running
  // and the trace is open; if the user collapses mid-run, the header shimmers.
  const activeIndex = running ? revealed - 1 : -1;
  const headerClass = !running
    ? "text-aomi-fg font-medium"
    : open
      ? "text-aomi-muted font-medium"
      : "aui-working-shimmer font-medium";

  const visibleItems = items.slice(0, revealed);

  // Step count rule: every shown row counts as one step, and a delegated agent
  // row additionally contributes its child steps (its reported `stepCount`, or
  // the steps actually observed). So a turn of 3 mother steps around one agent
  // that ran 5 child steps reads "9 steps" — the agent row itself is a step.
  const stepCount = visibleItems.reduce(
    (total, item) => total + 1 + childStepCount(item),
    0,
  );

  return (
    // Open: a full-width bordered card (header + step rows). Closed: the card
    // shrinks to a compact inline chip — a finished trace must not sit in the
    // column as a full-width gray stripe.
    <div
      className={cn(
        "aui-working-trace mb-3",
        open
          ? "border-aomi-border flex flex-col overflow-hidden rounded-xl border"
          : "flex",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "aui-working-trace-header flex items-center gap-2 text-left text-sm",
          open
            ? "bg-aomi-surface w-full px-3.5 py-[11px]"
            : "border-aomi-border bg-aomi-surface hover:border-aomi-muted/40 rounded-full border px-3 py-[7px] transition-colors",
        )}
      >
        {!running && (
          <CheckIcon className="text-aomi-success size-3.5 shrink-0" />
        )}
        <span className={cn("text-[13px]", headerClass)}>{label}</span>
        {orchestrating && (
          <span className="aui-working-badge bg-aomi-accent-subtle text-aomi-accent-strong shrink-0 rounded-full px-2 py-[1px] font-mono text-[10px] uppercase tracking-[0.1em]">
            orchestrator
          </span>
        )}
        <span className="text-aomi-muted font-mono text-xs">
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
        {open && <span className="flex-1" />}
        <ChevronDownIcon
          className={cn(
            "text-aomi-muted size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Collapse animates the grid row from 1fr→0fr (plus a fade) instead of
          snapping shut. The body stays mounted so items never remount. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "hidden grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-aomi-border relative border-t">
            {windowed && overflowing && !animating && (
              <>
                <span
                  aria-hidden="true"
                  className="aui-working-trace-edge-fade-top pointer-events-none absolute inset-x-0 top-0 z-20 h-16"
                />
                {hasContentBelow && (
                  <span
                    aria-hidden="true"
                    className="aui-working-trace-edge-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16"
                  />
                )}
              </>
            )}
            <div
              ref={viewportRef}
              onScroll={handleViewportScroll}
              tabIndex={windowed && overflowing ? 0 : undefined}
              aria-label={
                windowed && overflowing ? "Working trace steps" : undefined
              }
              className={cn(
                "aui-working-trace-viewport",
                windowed && !animating && "overflow-y-auto",
                animating && "overflow-hidden",
                windowed &&
                  overflowing &&
                  !animating &&
                  "aui-working-trace-scroll",
              )}
              style={{ maxHeight: windowed ? WORKING_WINDOW_PX : undefined }}
            >
              <div
                ref={bodyRef}
                className="aui-working-trace-body relative isolate flex flex-col gap-1 px-3.5 pb-3.5 pt-3 text-sm"
              >
                {visibleItems.map((item, i) => {
                  const animate = i >= animatedCount.current;
                  if (item.kind === "tool") {
                    return (
                      <WorkingStep
                        key={item.key}
                        tool={item.tool}
                        active={i === activeIndex}
                        animate={animate}
                      />
                    );
                  }
                  if (item.kind === "agent") {
                    return (
                      <WorkingAgent
                        key={item.key}
                        agentId={item.agentId}
                        run={item.run}
                        tool={item.tool}
                        order={item.order}
                        // A live agent row owns the trace's single live signal:
                        // it re-homes the shimmer onto its newest child (open)
                        // or onto its own summary line (folded).
                        active={i === activeIndex}
                        animate={animate}
                      />
                    );
                  }
                  return (
                    <WorkingNote
                      key={item.key}
                      text={item.text}
                      animate={animate}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {/* Below the window: while it's hiding older steps, offer a way to lift
              the cap; while expanded, offer the way back to just the recent steps.
              Shown live and after completion — the window persists either way. */}
          {((windowed && overflowing) || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="aui-working-trace-more text-aomi-muted hover:text-aomi-fg flex items-center gap-1.5 px-3.5 pb-3 text-xs"
            >
              <MoreHorizontalIcon className="size-3.5 shrink-0" />
              {expanded
                ? "Collapse to recent steps"
                : `Show all ${stepCount} steps`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MinimalWorkingTrace: FC = () => (
  <div className="aui-working-trace border-aomi-border mb-3 flex flex-col overflow-hidden rounded-xl border">
    <div className="aui-working-trace-header bg-aomi-surface flex items-center gap-2.5 px-3.5 py-[11px] text-sm">
      <span className="aui-working-shimmer text-[13px] font-medium">
        Working
      </span>
    </div>
  </div>
);

/**
 * True once `active` has held for the submitting→working grace window. The
 * runtime flips `turnPhase` on the same 300ms timer, but that write can be
 * lost — a fresh thread has no registered metadata yet, and a control sync
 * racing the send can rebuild it — so the trace keeps its own clock instead
 * of leaving the user staring at a bare dot until the first backend event.
 */
const WORKING_GRACE_MS = 300;
export function useWorkingGrace(active: boolean): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), WORKING_GRACE_MS);
    return () => clearTimeout(timer);
  }, [active]);
  return elapsed;
}

const collectText = (parts: TextMessagePart[]): string =>
  parts
    .map((part) => part.text)
    .join("\n\n")
    .trim();

/** Total wall-clock of the synthetic typewriter for the final answer. */
const FAKE_STREAM_MS = 500;

/**
 * Reveals a finished answer with a quick synthetic typewriter (~500ms, ease-out)
 * so it feels streamed rather than pasted in. `stream={false}` (a completed turn
 * loaded from history) renders it in full at once — no replay on every reload.
 */
const FakeStreamedText: FC<{ text: string; stream: boolean }> = ({
  text,
  stream,
}) => {
  const reduced = prefersReducedMotion();
  const animate = stream && !reduced;
  const [count, setCount] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }
    const total = text.length;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / FAKE_STREAM_MS);
      const eased = 1 - (1 - t) * (1 - t); // ease-out
      setCount(Math.max(1, Math.round(eased * total)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);

  return (
    <TextMessagePartProvider text={text.slice(0, count)}>
      <MarkdownText />
    </TextMessagePartProvider>
  );
};

/**
 * Drop-in replacement for `<MessagePrimitive.Parts>` in an assistant message.
 *
 * A merged turn is one ordered `content` array: interstitial talk (`text`) and
 * tool calls, then the final answer (`text`). We split at the LAST tool call —
 * everything up to and including it is the Working trace (tool steps + muted
 * interstitial notes, in order); the trailing `text` run is the final answer,
 * buffered out of view until the turn finishes so only it streams out below.
 * A plain reply with no tool calls is also buffered while running, then
 * fake-streamed once it is known to be the final answer.
 *
 * Delegations are the one row that does not come from the transcript alone: a
 * running child has no `task` part yet, so its row is rendered synthetically
 * from the `taskRuns` sidecar and hands over to the transcript part (same key,
 * same row) once that lands. See `WorkingAgent`.
 */
export const AssistantTurnParts: FC<{
  /** Rendered parent saw the working grace elapse; show the chip even if the
   * store's turnPhase write was lost (see useWorkingGrace). */
  workingFallback?: boolean;
}> = ({ workingFallback = false }) => {
  const content = useMessage((s) => s.content);
  const running = useMessage((s) => s.status?.type === "running");
  const isLast = useMessage((s) => s.isLast);
  const turnPhase =
    useCurrentThreadMetadata()?.control.turnPhase ??
    (running ? "working" : "idle");
  const lastCompletedAt =
    useCurrentThreadMetadata()?.control.lastCompletedAt ?? 0;
  const taskRuns = useThreadTaskRuns();

  const lastToolIndex = content.reduce(
    (last, part, i) => (part.type === "tool-call" ? i : last),
    -1,
  );

  // The sidecar is cleared on every send (see the runtime's sendMessage), so
  // every run in it belongs to the current turn — render them all on the last
  // message, running or finished. Deliberately NOT gated on "seen while
  // running" via a component ref: fast models can stream the final text as a
  // separate message that remounts this component between `task_completed`
  // and the `task` transcript part landing, and a ref-based memory would
  // blank the trace for that gap (it re-appeared with the row folded).
  // Scrollback stays inert because only the last message reads the sidecar,
  // and reloads start with an empty sidecar (transcript rows take over).
  const liveDelegations = isLast
    ? Object.values(taskRuns).sort((a, b) => a.startedAt - b.startedAt)
    : [];

  // Where the trace ends and the final answer begins. Normally the last tool
  // call — but a delegation that has not landed in the transcript yet has no
  // tool part at all, so a turn that is *only* a live delegation still gets a
  // trace (its talk becomes notes; the answer is buffered while running).
  const traceEnd =
    lastToolIndex >= 0
      ? lastToolIndex + 1
      : liveDelegations.length > 0
        ? content.length
        : 0;

  // Build the trace rows in order, merging consecutive talk into one note.
  // Empty when the turn has neither tool calls nor a live delegation.
  const items: TraceItem[] = [];
  const joinedAgentIds = new Set<string>();
  let agentOrder = 0;
  content.slice(0, traceEnd).forEach((part, i) => {
    if (part.type === "tool-call") {
      const agentId = readTaskPartAgentId(part);
      if (agentId) {
        // The transcript part renders the row now; its sidecar (when we still
        // have one) supplies the steps and the summary line.
        joinedAgentIds.add(agentId);
        items.push({
          kind: "agent",
          agentId,
          tool: part,
          run: taskRuns[agentId],
          order: agentOrder++,
          key: `agent-${agentId}`,
        });
        return;
      }
      items.push({
        kind: "tool",
        tool: part,
        key: part.toolCallId ?? `tool-${i}`,
      });
      return;
    }
    if (part.type !== "text" || part.text.trim().length === 0) return;
    const prev = items[items.length - 1];
    if (prev?.kind === "note") prev.text += `\n\n${part.text}`;
    else items.push({ kind: "note", text: part.text, key: `note-${i}` });
  });

  // Synthetic rows for runs the transcript has not caught up with, appended
  // after the last transcript-derived item, ordered by start. The key is the
  // agent id, so when the transcript part lands React keeps the same row (and
  // its open/user-toggled state) instead of remounting it.
  for (const run of liveDelegations) {
    if (joinedAgentIds.has(run.agentId)) continue;
    items.push({
      kind: "agent",
      agentId: run.agentId,
      run,
      order: agentOrder++,
      key: `agent-${run.agentId}`,
    });
  }

  // "Orchestrator-ness" is a property of the turn, never of the currently
  // selected app — so scrollback still reads correctly after an app switch. A
  // `task` part that carries no join key (an older transcript) still counts.
  const orchestrating = items.some(
    (item) =>
      item.kind === "agent" ||
      (item.kind === "tool" && item.tool.toolName === "task"),
  );

  // Pace the reveal so a burst of tool calls cascades instead of flashing in.
  // Called unconditionally (before the branches below) to satisfy hook rules;
  // it's a harmless no-op with an empty trace.
  const staggered = useStaggeredReveal(items.length, running);

  // Staggered-reveal choice: an agent row backed by a live sidecar is never
  // held hostage to the reveal backlog. Everything up to and including the
  // newest sidecar-backed agent row is shown at once (in practice that row is
  // last, so an orchestrating turn reveals immediately); the mother's own
  // steps keep their paced cascade before and after the delegation.
  const revealFloor = items.reduce(
    (floor, item, i) => (item.kind === "agent" && item.run ? i + 1 : floor),
    0,
  );
  const revealed = Math.max(staggered, revealFloor);

  // When the work actually began, for the header's "Orchestrated for Ns".
  // Anchored to the earliest signal we have: the moment this turn was first
  // seen running, or the earliest delegation's client-clock start — whichever
  // is older. Mount time alone lies when the trace mounts late (a delegating
  // turn's transcript part only lands at the very end).
  const turnStartRef = useRef<number | null>(running ? Date.now() : null);
  if (running && turnStartRef.current === null) {
    turnStartRef.current = Date.now();
  }
  const earliestRunStart = items.reduce<number | null>(
    (earliest, item) =>
      item.kind === "agent" && item.run
        ? Math.min(earliest ?? item.run.startedAt, item.run.startedAt)
        : earliest,
    null,
  );
  const startedAtMs =
    turnStartRef.current !== null && earliestRunStart !== null
      ? Math.min(turnStartRef.current, earliestRunStart)
      : (turnStartRef.current ?? earliestRunStart ?? undefined);

  // Whether this turn was seen working live (vs. loaded already complete). Gates
  // the entrance/fake-stream so a reloaded thread doesn't replay the animation.
  const liveTurnRef = useRef(running);
  useEffect(() => {
    if (running) liveTurnRef.current = true;
  }, [running]);
  const recentlyCompleted =
    isLast && lastCompletedAt > 0 && Date.now() - lastCompletedAt < 5000;
  const liveTurn = liveTurnRef.current || recentlyCompleted;

  if (items.length === 0) {
    // While a turn is still live, text before the first tool call is provisional:
    // a later tool call can arrive and move that text into the Working trace.
    // Keep it buffered so it never flashes as the final answer and jumps upward.
    if (running) {
      return turnPhase === "working" || workingFallback ? (
        <MinimalWorkingTrace />
      ) : null;
    }

    const answerText = collectText(
      content.filter((p): p is TextMessagePart => p.type === "text"),
    );

    // Plain reply — no tools. Reveal it with the same short fake-stream used
    // after tool calls, once we know it is the final answer.
    return answerText.length > 0 ? (
      <FakeStreamedText text={answerText} stream={liveTurn} />
    ) : null;
  }

  const answerText = collectText(
    content
      .slice(traceEnd)
      .filter((p): p is TextMessagePart => p.type === "text"),
  );

  // Hold the answer until the trace has fully caught up, so the steps finish
  // cascading before it fades in — nothing moves between the two regions.
  const answerReady = !running && revealed >= items.length;

  return (
    <>
      <WorkingTrace
        running={running}
        items={items}
        revealed={revealed}
        orchestrating={orchestrating}
        startedAtMs={startedAtMs}
      />
      {answerReady && answerText.length > 0 && (
        <div className="aui-working-answer">
          <FakeStreamedText text={answerText} stream={liveTurn} />
        </div>
      )}
    </>
  );
};
