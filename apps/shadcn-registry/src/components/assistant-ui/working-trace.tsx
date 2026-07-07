"use client";

import { type FC, useEffect, useRef, useState } from "react";
import {
  MessagePrimitive,
  TextMessagePartProvider,
  useMessage,
  type TextMessagePart,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
import { ChevronRightIcon } from "lucide-react";

import { cn, useCurrentThreadMetadata } from "@aomi-labs/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { resolveToolIcon } from "@/components/assistant-ui/tool-icon";

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
 * revealed. Plain replies with no tool calls skip the trace and stream normally.
 */

const humanizeToolName = (name: string): string => {
  if (!name) return "Tool";
  const spaced = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const formatDuration = (seconds: number): string => {
  if (seconds < 1) return "less than a second";
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

const toDetailString = (result: unknown): string =>
  typeof result === "string" ? result : JSON.stringify(result, null, 2);

const WorkingStep: FC<{ tool: ToolCallMessagePart; active: boolean }> = ({
  tool,
  active,
}) => {
  const [open, setOpen] = useState(false);
  const done = tool.result !== undefined;
  const argsText =
    tool.argsText && tool.argsText !== "undefined" ? tool.argsText : undefined;
  const hasDetail = done || argsText !== undefined;
  const Icon = resolveToolIcon(tool.toolName, tool.result);

  return (
    <div className="aui-working-step animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((o) => !o)}
        className="aui-working-step-header flex w-full items-center gap-2 py-1 text-left disabled:cursor-default"
      >
        <span className="bg-background relative flex size-4 shrink-0 items-center justify-center">
          <Icon className="text-muted-foreground size-3.5" />
        </span>
        <span
          className={cn(
            "flex-1 truncate",
            active ? "aui-working-shimmer font-medium" : "text-foreground",
          )}
        >
          {humanizeToolName(tool.toolName)}
        </span>
        {hasDetail && (
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground/60 size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
        )}
      </button>

      {open && hasDetail && (
        <div className="aui-working-step-detail mb-1 ml-6 flex flex-col gap-1.5">
          {argsText && (
            <pre className="border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-xs leading-relaxed">
              {argsText}
            </pre>
          )}
          {done && (
            <pre className="border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-xs leading-relaxed">
              {toDetailString(tool.result)}
            </pre>
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
const WorkingNote: FC<{ text: string }> = ({ text }) => (
  <div className="aui-working-note animate-in fade-in-0 slide-in-from-bottom-1 flex items-start gap-2 py-1 duration-300 motion-reduce:animate-none">
    <span
      className="bg-background relative flex h-5 w-4 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <span className="bg-muted-foreground/70 size-1.5 rounded-full" />
    </span>
    <div className="text-foreground/75 min-w-0 flex-1 text-sm leading-relaxed [&_p+p]:mt-2 [&_p]:my-0">
      <TextMessagePartProvider text={text}>
        <MarkdownText />
      </TextMessagePartProvider>
    </div>
  </div>
);

const WorkingTrace: FC<{
  running: boolean;
  items: TraceItem[];
}> = ({ running, items }) => {
  const [open, setOpen] = useState(running);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const wasRunning = useRef(running);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (wasRunning.current && !running) {
      // turn just finished: freeze the timer and auto-collapse
      setElapsed((Date.now() - startedAt.current) / 1000);
      setOpen(false);
    }
    wasRunning.current = running;
  }, [running]);

  const label = running
    ? "Working"
    : elapsed != null
      ? `Worked for ${formatDuration(elapsed)}`
      : "Worked it out";

  // Exactly one "live" signal: the last item (always a tool step) shimmers while
  // the trace is open; if the user collapses mid-run, the header shimmers instead.
  const activeIndex = running ? items.length - 1 : -1;
  const headerClass = !running
    ? "text-muted-foreground"
    : open
      ? "text-muted-foreground font-medium"
      : "aui-working-shimmer font-medium";

  return (
    <div className="aui-working-trace mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="aui-working-trace-header text-muted-foreground flex items-center gap-1.5 text-sm"
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <span className={headerClass}>{label}</span>
      </button>

      {open && (
        <div className="aui-working-trace-body relative isolate ml-1 mt-1.5 flex flex-col text-sm">
          {/* Timeline rail threading through the icon column; each icon's
              opaque background knocks it out, so it reads as connecting them. */}
          <span
            aria-hidden="true"
            className="bg-border absolute bottom-[14px] left-[7.5px] top-[14px] w-px"
          />
          {items.map((item, i) =>
            item.kind === "tool" ? (
              <WorkingStep
                key={item.key}
                tool={item.tool}
                active={i === activeIndex}
              />
            ) : (
              <WorkingNote key={item.key} text={item.text} />
            ),
          )}
        </div>
      )}
    </div>
  );
};

const MinimalWorkingTrace: FC = () => (
  <div className="aui-working-trace mb-3">
    <div className="aui-working-trace-header text-muted-foreground flex items-center gap-1.5 text-sm">
      <ChevronRightIcon className="size-3.5 shrink-0" />
      <span className="aui-working-shimmer font-medium">Working</span>
    </div>
  </div>
);

const NullPart: FC = () => null;

/**
 * Drop-in replacement for `<MessagePrimitive.Parts>` in an assistant message.
 *
 * A merged turn is one ordered `content` array: interstitial talk (`text`) and
 * tool calls, then the final answer (`text`). We split at the LAST tool call —
 * everything up to and including it is the Working trace (tool steps + muted
 * interstitial notes, in order); the trailing `text` run is the final answer,
 * buffered out of view until the turn finishes so only it streams out below.
 * A plain reply with no tool calls skips the trace and streams live.
 */
export const AssistantTurnParts: FC = () => {
  const content = useMessage((s) => s.content);
  const running = useMessage((s) => s.status?.type === "running");
  const turnPhase =
    useCurrentThreadMetadata()?.control.turnPhase ??
    (running ? "working" : "idle");

  const lastToolIndex = content.reduce(
    (last, part, i) => (part.type === "tool-call" ? i : last),
    -1,
  );

  if (lastToolIndex < 0) {
    if (running && turnPhase === "working") {
      return <MinimalWorkingTrace />;
    }

    if (running) {
      return null;
    }

    // Plain reply — no tools. Stream the text live.
    return (
      <MessagePrimitive.Parts
        components={{ Text: MarkdownText, Reasoning: NullPart }}
      />
    );
  }

  // Build the trace rows in order, merging consecutive talk into one note.
  const items: TraceItem[] = [];
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

  const answerText = content
    .slice(lastToolIndex + 1)
    .filter((p): p is TextMessagePart => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")
    .trim();

  return (
    <>
      <WorkingTrace running={running} items={items} />
      {!running && answerText.length > 0 && (
        <div className="aui-working-answer animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
          <TextMessagePartProvider text={answerText}>
            <MarkdownText />
          </TextMessagePartProvider>
        </div>
      )}
    </>
  );
};
