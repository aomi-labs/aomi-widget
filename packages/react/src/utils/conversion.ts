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

  const [topic, toolContent] = parseToolStream(msg.tool_stream) ?? [];
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
  const [topic] = parseToolStream(msg.tool_stream) ?? [];
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

function parseToolStream(toolStream: SessionMessage["tool_stream"]): [string, string] | null {
  if (!toolStream) return null;

  if (Array.isArray(toolStream) && toolStream.length === 2) {
    const [topic, content] = toolStream;
    return [String(topic), content];
  }

  if (typeof toolStream === "object") {
    const topic = (toolStream as { topic?: unknown }).topic;
    const content = (toolStream as { content?: unknown }).content;
    return topic ? [String(topic), String(content)] : null;
  }

  return null;
}
