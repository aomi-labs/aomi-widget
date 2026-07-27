"use client";

import { type FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TextMessagePartProvider,
  useMessage,
  type TextMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";

import { cn, useCurrentThreadMetadata } from "@aomi-labs/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  interpretToolStep,
  type ToolChip,
} from "@/components/assistant-ui/tool-interpreter";

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

const toDetailString = (result: unknown): string =>
  typeof result === "string" ? result : JSON.stringify(result, null, 2);

/**
 * The expanded args/result box. Capped to ~20 lines (`max-h-[26rem]`) and made
 * scrollable beyond that, so a long tool payload (e.g. a full transaction dump
 * of raw calldata) scrolls in place instead of marching the trace — and the
 * answer below it — far down the page.
 */
const DETAIL_BOX_CLASS =
  "border-aomi-border bg-aomi-surface text-aomi-muted max-h-[26rem] overflow-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-xs leading-relaxed";

const MAX_VISIBLE_CHIPS = 4;

/** Base + per-chip stagger for the left-to-right chip cascade (ms). */
const CHIP_BASE_DELAY_MS = 100;
const CHIP_STEP_DELAY_MS = 70;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

const ToolChipView: FC<{ chip: ToolChip; index: number; animate: boolean }> = ({
  chip,
  index,
  animate,
}) => {
  const Glyph = chip.icon;
  return (
    <span
      className={cn(
        "bg-aomi-surface-2 text-aomi-muted inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs tabular-nums leading-4",
        animate &&
          "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none",
      )}
      style={
        animate
          ? {
              animationDelay: `${CHIP_BASE_DELAY_MS + index * CHIP_STEP_DELAY_MS}ms`,
            }
          : undefined
      }
    >
      {chip.dot ? (
        <span
          className="size-[5px] shrink-0 rounded-full"
          style={{ backgroundColor: chip.dot }}
          aria-hidden="true"
        />
      ) : (
        !Glyph && (
          <span
            className="bg-aomi-accent size-[5px] shrink-0 rounded-full"
            aria-hidden="true"
          />
        )
      )}
      {Glyph && <Glyph className="text-aomi-muted size-3 shrink-0" />}
      <span className="truncate">{chip.label}</span>
    </span>
  );
};

const WorkingStep: FC<{
  tool: ToolCallMessagePart;
  active: boolean;
  animate: boolean;
}> = ({ tool, active, animate }) => {
  const [open, setOpen] = useState(false);
  const done = tool.result !== undefined;
  const argsText =
    tool.argsText && tool.argsText !== "undefined" ? tool.argsText : undefined;
  const hasDetail = done || argsText !== undefined;
  const interpretation = interpretToolStep({
    toolName: tool.toolName,
    argsText,
    result: tool.result,
  });
  const Icon = interpretation.icon;
  const shownChips =
    interpretation.chips.length > MAX_VISIBLE_CHIPS
      ? interpretation.chips.slice(0, MAX_VISIBLE_CHIPS)
      : interpretation.chips;
  const overflow = interpretation.chips.length - shownChips.length;

  return (
    <div
      className={cn(
        "aui-working-step",
        animate &&
          "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none",
      )}
    >
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((o) => !o)}
        className="aui-working-step-header group/step flex w-full items-center gap-2.5 py-1 text-left disabled:cursor-default"
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center">
          {done && !active ? (
            interpretation.failed ? (
              <XIcon className="text-aomi-danger size-3.5" />
            ) : (
              <CheckIcon className="text-aomi-success size-3.5" />
            )
          ) : (
            <Icon className="text-aomi-muted size-3.5" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 truncate font-mono text-[13px]",
            active ? "aui-working-shimmer font-medium" : "text-aomi-fg",
          )}
        >
          {interpretation.title}
        </span>
        {/* Detail affordance stays quiet until the row is hovered (or open). */}
        {hasDetail && (
          <ChevronRightIcon
            className={cn(
              "text-aomi-muted/60 size-3 shrink-0 transition-[transform,opacity]",
              open
                ? "rotate-90 opacity-100"
                : "opacity-0 group-hover/step:opacity-100",
            )}
          />
        )}
      </button>

      {interpretation.chips.length > 0 && (
        <div className="aui-working-step-chips mb-1 ml-[26px] mt-2 flex max-w-full flex-wrap items-center gap-1.5">
          {shownChips.map((chip, i) => (
            <ToolChipView
              key={`${chip.label}-${i}`}
              chip={chip}
              index={i}
              animate={animate}
            />
          ))}
          {overflow > 0 && (
            <span
              className={cn(
                "bg-aomi-surface-2 text-aomi-muted inline-flex items-center rounded-full px-2.5 py-1 font-mono text-xs leading-4",
                animate &&
                  "animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none",
              )}
              style={
                animate
                  ? {
                      animationDelay: `${CHIP_BASE_DELAY_MS + shownChips.length * CHIP_STEP_DELAY_MS}ms`,
                    }
                  : undefined
              }
            >
              +{overflow} more
            </span>
          )}
        </div>
      )}

      {open && hasDetail && (
        <div className="aui-working-step-detail mb-1.5 ml-[26px] mt-4 flex flex-col gap-1.5">
          {argsText && <pre className={DETAIL_BOX_CLASS}>{argsText}</pre>}
          {done && (
            <pre className={DETAIL_BOX_CLASS}>{toDetailString(tool.result)}</pre>
          )}
        </div>
      )}
    </div>
  );
};

/** One rendered row of the trace: a tool step, or a run of interstitial talk. */
type TraceItem =
  | { kind: "tool"; tool: ToolCallMessagePart; key: string }
  | { kind: "note"; text: string; key: string };

/**
 * An interstitial line — the model talking between tool calls. Rendered as a
 * muted markdown note with a dot marker in the icon column so it lines up with
 * the tool steps on the rail (in order, inside the trace — not in the answer).
 */
const WorkingNote: FC<{ text: string; animate: boolean }> = ({
  text,
  animate,
}) => (
  <div
    className={cn(
      "aui-working-note flex items-start gap-2 py-1",
      animate &&
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none",
    )}
  >
    <span
      className="relative flex h-[19px] w-4 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span className="bg-aomi-muted/60 size-1 rounded-full" />
    </span>
    <div className="text-aomi-muted min-w-0 flex-1 text-[13px] leading-relaxed [&_p+p]:mt-2 [&_p]:my-0">
      <TextMessagePartProvider text={text}>
        <MarkdownText />
      </TextMessagePartProvider>
    </div>
  </div>
);

const WorkingTrace: FC<{
  running: boolean;
  items: TraceItem[];
  revealed: number;
}> = ({ running, items, revealed }) => {
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
  const startedAt = useRef<number>(Date.now());

  // How many items have already played their entrance. Survives the body's
  // collapse/remount (this component stays mounted), so an item only animates
  // the first time it's revealed — reopening a finished trace shows it static.
  const animatedCount = useRef(0);
  useEffect(() => {
    if (revealed > animatedCount.current) animatedCount.current = revealed;
  }, [revealed]);

  // The trace has fully caught up once every queued item has been revealed.
  const fullyRevealed = !running && revealed >= items.length;

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
  }, [windowed, revealed, open]);

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
  }, [animating, open, revealed, windowed]);

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
        {!running && <CheckIcon className="text-aomi-success size-3.5 shrink-0" />}
        <span className={cn("text-[13px]", headerClass)}>{label}</span>
        <span className="text-aomi-muted font-mono text-xs">
          {revealed} {revealed === 1 ? "step" : "steps"}
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
          open ? "grid-rows-[1fr] opacity-100" : "hidden grid-rows-[0fr] opacity-0",
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
                {visibleItems.map((item, i) =>
                  item.kind === "tool" ? (
                    <WorkingStep
                      key={item.key}
                      tool={item.tool}
                      active={i === activeIndex}
                      animate={i >= animatedCount.current}
                    />
                  ) : (
                    <WorkingNote
                      key={item.key}
                      text={item.text}
                      animate={i >= animatedCount.current}
                    />
                  ),
                )}
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
                : `Show all ${revealed} steps`}
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
 */
export const AssistantTurnParts: FC = () => {
  const content = useMessage((s) => s.content);
  const running = useMessage((s) => s.status?.type === "running");
  const isLast = useMessage((s) => s.isLast);
  const turnPhase =
    useCurrentThreadMetadata()?.control.turnPhase ??
    (running ? "working" : "idle");
  const lastCompletedAt =
    useCurrentThreadMetadata()?.control.lastCompletedAt ?? 0;

  const lastToolIndex = content.reduce(
    (last, part, i) => (part.type === "tool-call" ? i : last),
    -1,
  );

  // Build the trace rows in order, merging consecutive talk into one note.
  // Empty when the turn has no tool calls (the plain-reply branch below).
  const items: TraceItem[] = [];
  if (lastToolIndex >= 0) {
    content.slice(0, lastToolIndex + 1).forEach((part, i) => {
      if (part.type === "tool-call") {
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
  }

  // Pace the reveal so a burst of tool calls cascades instead of flashing in.
  // Called unconditionally (before the branches below) to satisfy hook rules;
  // it's a harmless no-op with an empty trace.
  const revealed = useStaggeredReveal(items.length, running);

  // Whether this turn was seen working live (vs. loaded already complete). Gates
  // the entrance/fake-stream so a reloaded thread doesn't replay the animation.
  const liveTurnRef = useRef(running);
  useEffect(() => {
    if (running) liveTurnRef.current = true;
  }, [running]);
  const recentlyCompleted =
    isLast && lastCompletedAt > 0 && Date.now() - lastCompletedAt < 5000;
  const liveTurn = liveTurnRef.current || recentlyCompleted;

  if (lastToolIndex < 0) {
    // While a turn is still live, text before the first tool call is provisional:
    // a later tool call can arrive and move that text into the Working trace.
    // Keep it buffered so it never flashes as the final answer and jumps upward.
    if (running) {
      return turnPhase === "working" ? <MinimalWorkingTrace /> : null;
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
      .slice(lastToolIndex + 1)
      .filter((p): p is TextMessagePart => p.type === "text"),
  );

  // Hold the answer until the trace has fully caught up, so the steps finish
  // cascading before it fades in — nothing moves between the two regions.
  const answerReady = !running && revealed >= items.length;

  return (
    <>
      <WorkingTrace running={running} items={items} revealed={revealed} />
      {answerReady && answerText.length > 0 && (
        <div className="aui-working-answer">
          <FakeStreamedText text={answerText} stream={liveTurn} />
        </div>
      )}
    </>
  );
};
