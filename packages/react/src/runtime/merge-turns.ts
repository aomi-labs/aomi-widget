import type { ThreadMessageLike } from "@assistant-ui/react";

/**
 * Fold a backend-derived message list so that each agent *turn* renders as a
 * single assistant message with an ordered `content` array, instead of a stack
 * of separate bubbles (one per tool call + a final text).
 *
 * The backend emits a flat `AomiMessage[]` where each message is either text or
 * a single tool result, so `toInboundMessage` produces one `ThreadMessageLike`
 * per fragment. A turn therefore arrives as several contiguous assistant
 * messages. assistant-ui only groups parts *within* a message, so we merge the
 * contiguous run into one message whose parts are `[tool-call, …, text]`. The
 * Working-trace UI then partitions that single message into the collapsible
 * trace (tool-call / reasoning parts) and the final answer (trailing text).
 *
 * Special assistant notices (e.g. the `payment_required` gate) carry an
 * `aomiNoticeKind` and are kept standalone. User/system messages break a run.
 */

type MessageContentPart =
  Exclude<ThreadMessageLike["content"], string> extends readonly (infer U)[]
    ? U
    : never;

const hasNoticeKind = (message: ThreadMessageLike): boolean =>
  Boolean(
    (message.metadata?.custom as Record<string, unknown> | undefined)
      ?.aomiNoticeKind,
  );

/** Assistant messages that participate in turn-merging (excludes notices). */
const isMergeableAssistant = (message: ThreadMessageLike): boolean =>
  message.role === "assistant" && !hasNoticeKind(message);

const toContentParts = (
  content: ThreadMessageLike["content"],
): MessageContentPart[] => {
  if (typeof content === "string") {
    return content.length > 0
      ? [{ type: "text", text: content } as MessageContentPart]
      : [];
  }
  return [...(content as readonly MessageContentPart[])];
};

/**
 * Give every tool-call part a deterministic, stable, unique id.
 *
 * `toInboundMessage` mints ids as `tool_${Date.now()}`, which collide when a
 * turn fires several tool calls in the same millisecond and also change on every
 * poll. Once a turn is merged into a single message, duplicate ids make
 * assistant-ui's `useResources` throw ("Duplicate key toolCallId-…"), crashing
 * the whole message render. Re-key by (message index, part index): unique within
 * and across messages, and stable across polls because the list is append-only.
 */
const reindexToolCallIds = (
  message: ThreadMessageLike,
  messageIndex: number,
): ThreadMessageLike => {
  if (typeof message.content === "string") return message;
  let changed = false;
  const content = (message.content as MessageContentPart[]).map((part, i) => {
    if ((part as { type?: string }).type === "tool-call") {
      changed = true;
      return { ...part, toolCallId: `aomi-tc-${messageIndex}-${i}` };
    }
    return part;
  });
  return changed
    ? { ...message, content: content as ThreadMessageLike["content"] }
    : message;
};

export function mergeAssistantTurns(
  messages: ThreadMessageLike[],
): ThreadMessageLike[] {
  const out: ThreadMessageLike[] = [];
  let run: ThreadMessageLike[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1) {
      out.push(run[0]!);
    } else {
      const first = run[0]!;
      const mergedContent: MessageContentPart[] = [];
      for (const message of run) {
        mergedContent.push(...toContentParts(message.content));
      }
      out.push({
        ...first,
        content: mergedContent as ThreadMessageLike["content"],
      });
    }
    run = [];
  };

  for (const message of messages) {
    if (isMergeableAssistant(message)) {
      run.push(message);
    } else {
      flush();
      out.push(message);
    }
  }
  flush();

  return out.map((message, index) => reindexToolCallIds(message, index));
}
