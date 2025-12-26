import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { toInboundSystem, toInboundMessage } from "../utils/conversion";
import type { ThreadContext } from "../state/thread-store";
import type { PollingController } from "./polling-controller";
import {
  dequeuePendingSession,
  dequeuePendingSystem,
  enqueuePendingSession,
  enqueuePendingSystem,
  hasPendingSession,
  isSessionReady,
  resolveSessionId,
  setSessionRunning,
  type BakendState,
} from "./backend-state";

type MessageConverterConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  threadContextRef: MutableRefObject<ThreadContext>;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
};

// Singleton processor interface, stateless
export class MessageConverter {
  constructor(private readonly config: MessageConverterConfig) {}

  inbound(threadId: string, msgs?: SessionMessage[] | null) {
    const backendState = this.config.backendStateRef.current;
    if (!msgs) return;
    if (hasPendingSession(backendState, threadId)) {
      // Avoid overwriting optimistic UI when pending user messages exist.
      return;
    }

    const threadMessages: ThreadMessageLike[] = [];
    for (const msg of msgs) {
      if (msg.sender === "system") {
        const systemMessage = toInboundSystem(msg);
        if (systemMessage) {
          threadMessages.push(systemMessage);
        }
        continue;
      }
      const threadMessage = toInboundMessage(msg);
      if (threadMessage) {
        threadMessages.push(threadMessage);
      }
    }

    this.config.threadContextRef.current.setThreadMessages(threadId, threadMessages);
  }

  async outbound(message: AppendMessage, threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const threadContext = this.config.threadContextRef.current;
    const existingMessages = threadContext.getThreadMessages(threadId);
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    threadContext.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadContext.updateThreadMetadata(threadId, { lastActiveAt: new Date().toISOString() });

    if (!isSessionReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingSession(backendState, threadId, text);
      return;
    }

    const sessionId = resolveSessionId(backendState, threadId);

    try {
      this.markRunning(threadId, true);
      await this.config.backendApiRef.current.postChatMessage(sessionId, text);
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }

  async outboundSystem(threadId: string, text: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isSessionReady(backendState, threadId)) return;
    const threadMessages = this.config.threadContextRef.current.getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

    if (!hasUserMessages) {
      enqueuePendingSystem(backendState, threadId, text);
      return;
    }

    await this.outboundSystemInner(threadId, text);
  }

  async outboundSystemInner(threadId: string, text: string) {
    const backendState = this.config.backendStateRef.current;
    const threadContext = this.config.threadContextRef.current;
    const sessionId = resolveSessionId(backendState, threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(sessionId, text);
      if (response.res) {
        const systemMessage = toInboundSystem(response.res);
        if (systemMessage) {
          const updatedMessages = [...threadContext.getThreadMessages(threadId), systemMessage];
          threadContext.setThreadMessages(threadId, updatedMessages);
        }
      }
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send system message:", error);
      this.markRunning(threadId, false);
    }
  }

  async flushPendingSystem(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingSystem(backendState, threadId);
    if (!pending.length) return;
    for (const pendingMessage of pending) {
      await this.outboundSystemInner(threadId, pendingMessage);
    }
  }

  async flushPendingSession(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingSession(backendState, threadId);
    if (!pending.length) return;
    const sessionId = resolveSessionId(backendState, threadId);
    for (const text of pending) {
      try {
        await this.config.backendApiRef.current.postChatMessage(sessionId, text);
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    this.config.polling.start(threadId);
  }

  async cancel(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isSessionReady(backendState, threadId)) return;
    this.config.polling.stop(threadId);
    const sessionId = resolveSessionId(backendState, threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(sessionId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }

  private markRunning(threadId: string, running: boolean) {
    setSessionRunning(this.config.backendStateRef.current, threadId, running);
    if (this.config.threadContextRef.current.currentThreadId === threadId) {
      this.config.setGlobalIsRunning?.(running);
    }
  }

}
