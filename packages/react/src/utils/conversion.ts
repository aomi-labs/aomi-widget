import type { ThreadMessageLike } from "@assistant-ui/react";

import type { SessionMessage } from "../api/types";

type MessageContentPart = Exclude<ThreadMessageLike["content"], string> extends readonly (infer U)[] ? U : never;

export function toInboundMessage(msg: SessionMessage): ThreadMessageLike | null {
  if (msg.sender === "system") return null;

  const content: MessageContentPart[] = [];
  const role: ThreadMessageLike["role"] = msg.sender === "user" ? "user" : "assistant";

  if (msg.content) {
    content.push({ type: "text" as const, text: msg.content });
  }

  // Sync result or Asnyc Ack
  const [topic, toolContent] = parseToolResult(msg.tool_result) ?? [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call" as const,
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: undefined,
      result: (() => {
        try {
          return JSON.parse(toolContent);
        } catch {
          return { args: toolContent };
        }
      })(),
    });
  }

  const threadMessage = {
    role,
    content: (content.length > 0 ? content : [{ type: "text" as const, text: "" }]) as ThreadMessageLike["content"],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
  } satisfies ThreadMessageLike;

  return threadMessage;
}

export function toInboundSystem(msg: SessionMessage): ThreadMessageLike | null {
  const [topic] = parseToolResult(msg.tool_result) ?? [];
  const messageText = topic || msg.content || "";
  const timestamp = parseTimestamp(msg.timestamp);

  if (!messageText.trim()) return null;

  return {
    role: "system",
    content: [{ type: "text", text: messageText }],
    ...(timestamp && { createdAt: timestamp }),
  } satisfies ThreadMessageLike;
}

export function constructUITool(): string {
  return "";
}

function parseTimestamp(timestamp?: string) {
  if (!timestamp) return undefined;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function parseToolResult(toolResult: SessionMessage["tool_result"]): [string, string] | null {
  if (!toolResult) return null;

  if (Array.isArray(toolResult) && toolResult.length === 2) {
    const [topic, content] = toolResult;
    return [String(topic), content];
  }

  if (typeof toolResult === "object") {
    const topic = (toolResult as { topic?: unknown }).topic;
    const content = (toolResult as { content?: unknown }).content;
    return topic ? [String(topic), String(content)] : null;
  }

  return null;
}
