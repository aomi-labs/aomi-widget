import { SessionMessage, SystemNotification } from "@/lib/backend-api";
import { ThreadMessageLike } from "@assistant-ui/react";

export function constructThreadMessage(msg: SessionMessage): ThreadMessageLike {
  const content = [];
  const role: ThreadMessageLike["role"] =
    msg.sender === "user" ? "user" : msg.sender === "system" ? "system" : "assistant";

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
    content: content.length > 0 ? content : [{ type: "text" as const, text: "" }],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
  };

  return threadMessage;
}


// SessionMessage {
//   sender: 'system';
//   content: 'system's msg to the agent'; => system send to the agent e.g. "wallet connected on X network with address Y, call tools with network param X"
//   timestamp: some-time;                 => "Error calling tool WebSearch: 404"
//   is_streaming: false;
//   tool_stream: ['notification name to print', '']; => system notification to show to the user "Wallet connected on X network"
//                                                    => "WebSearch Error"
// }

export function constructNotification(msg: SessionMessage): SystemNotification {
  const [topic] = parseToolStream(msg.tool_stream) ?? [];
  if (topic) {
    return {
        message: topic,
        timestamp: parseTimestamp(msg.timestamp)
    }
  }
  return {
    message: '',
    timestamp: parseTimestamp(msg.timestamp)
  }
}

export function constructSystemMessage(msg: SessionMessage): ThreadMessageLike | null {
  const notification = constructNotification(msg);
  const messageText = notification?.message || msg.content || "";

  if (!messageText.trim()) return null;

  return {
    role: "system",
    content: [{ type: "text", text: messageText }],
    ...(notification?.timestamp && { createdAt: notification.timestamp }),
  };
}

export function constructUITool(): string {
    // TODO
  return '';
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
  } else if (typeof toolStream === "object") {
    const topic = (toolStream as { topic?: unknown }).topic;
    const content = (toolStream as { content?: unknown }).content;
    return topic ? [String(topic), String(content)] : null;
  }

  return null;
}
