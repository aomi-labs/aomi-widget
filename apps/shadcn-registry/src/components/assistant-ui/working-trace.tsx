"use client";

import { type FC, useEffect, useRef, useState } from "react";
import {
  MessagePrimitive,
  useMessage,
  type TextMessagePartComponent,
  type ToolCallMessagePart,
} from "@assistant-ui/react";
import { CheckIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";

import { cn } from "@aomi-labs/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";

/**
 * Working trace — the chain-of-thought UI.
 *
 * A merged assistant turn (see `mergeAssistantTurns` in @aomi-labs/react) is one
 * message with ordered parts `[tool-call, …, text]`. We split it:
 *   • tool-call parts → a collapsible, shimmering "Working" trace
 *   • the trailing text → the final answer, streamed on its own
 *
 * While the turn is running, the answer is buffered out of view (the shimmer
 * carries the "still thinking" signal); when the turn completes the trace
 * collapses to "Worked for Ns" and the answer is revealed. Plain replies with
 * no tool calls skip the trace entirely and stream normally.
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

const WorkingStep: FC<{ tool: ToolCallMessagePart }> = ({ tool }) => {
  const [open, setOpen] = useState(false);
  const done = tool.result !== undefined;
  const argsText =
    tool.argsText && tool.argsText !== "undefined" ? tool.argsText : undefined;
  const hasDetail = done || argsText !== undefined;

  return (
    <div className="aui-working-step">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((o) => !o)}
        className="aui-working-step-header flex w-full items-center gap-2 py-1 text-left disabled:cursor-default"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {done ? (
            <CheckIcon className="size-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Loader2Icon className="size-3.5 animate-spin text-primary motion-reduce:animate-none" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 truncate",
            done ? "text-foreground" : "text-muted-foreground",
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
            <pre className="border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-[0.6875rem] leading-relaxed">
              {argsText}
            </pre>
          )}
          {done && (
            <pre className="border-border/60 bg-muted/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md border p-2 font-mono text-[0.6875rem] leading-relaxed">
              {toDetailString(tool.result)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const WorkingTrace: FC<{
  running: boolean;
  tools: ToolCallMessagePart[];
}> = ({ running, tools }) => {
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

  return (
    <div className="aui-working-trace mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="aui-working-trace-header flex items-center gap-1.5 text-sm"
      >
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        {running ? (
          <span className="aui-working-shimmer font-medium">{label}</span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <CheckIcon className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            {label}
          </span>
        )}
      </button>

      {open && (
        <div className="aui-working-trace-body border-border mt-1.5 ml-1.5 flex flex-col border-l pl-3.5 text-sm">
          {tools.map((tool, i) => (
            <WorkingStep key={tool.toolCallId ?? i} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Final answer that stays hidden while the turn is still working. */
const BufferedAnswerText: TextMessagePartComponent = () => {
  const running = useMessage((s) => s.status?.type === "running");
  if (running) return null;
  return (
    <div className="aui-working-answer animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <MarkdownText />
    </div>
  );
};

const NullPart: FC = () => null;

/**
 * Drop-in replacement for `<MessagePrimitive.Parts>` in an assistant message.
 * Renders the Working trace (from tool-call parts) plus the final answer (text
 * parts, via the primitive so markdown + streaming keep working).
 */
export const AssistantTurnParts: FC = () => {
  const content = useMessage((s) => s.content);
  const running = useMessage((s) => s.status?.type === "running");

  const toolParts = content.filter(
    (p): p is ToolCallMessagePart => p.type === "tool-call",
  );
  const hasTrace = toolParts.length > 0;

  return (
    <>
      {hasTrace && <WorkingTrace running={running} tools={toolParts} />}
      <MessagePrimitive.Parts
        components={{
          // With a trace, buffer the answer until the turn finishes.
          // Without one (plain reply), stream it live.
          Text: hasTrace ? BufferedAnswerText : MarkdownText,
          Reasoning: NullPart,
          tools: { Fallback: NullPart },
        }}
      />
    </>
  );
};
