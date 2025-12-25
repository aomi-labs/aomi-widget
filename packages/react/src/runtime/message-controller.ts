import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { toInboundSystem, toInboundMessage } from "../utils/conversion";
import type { ThreadContext } from "../state/thread-store";
import type { PollingController } from "./polling-controller";
import {
  dequeuePendingChat,
  dequeuePendingSystem,
  enqueuePendingChat,
  enqueuePendingSystem,
  hasPendingChat,
  isThreadReady,
  resolveThreadId,
  setThreadRunning,
  type BakendState,
} from "./backend-state";

type MessageControllerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  threadContextRef: MutableRefObject<ThreadContext>;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
};

type ThreadContextApi = Pick<
  ThreadContext,
  "getThreadMessages" | "setThreadMessages" | "updateThreadMetadata"
>;

export class MessageController {
  constructor(private readonly config: MessageControllerConfig) {}

  inbound(threadId: string, msgs?: SessionMessage[] | null) {
    const backendState = this.config.backendStateRef.current;
    if (!msgs) return;
    if (hasPendingChat(backendState, threadId)) {
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

    this.getThreadContextApi().setThreadMessages(threadId, threadMessages);
  }

  async outbound(message: AppendMessage, threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const threadState = this.getThreadContextApi();
    const existingMessages = threadState.getThreadMessages(threadId);
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    threadState.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadState.updateThreadMetadata(threadId, { lastActiveAt: new Date().toISOString() });

    if (!isThreadReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingChat(backendState, threadId, text);
      return;
    }

    const backendThreadId = resolveThreadId(backendState, threadId);

    try {
      this.markRunning(threadId, true);
      await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }

  async outboundSystem(threadId: string, text: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    const threadMessages = this.getThreadContextApi().getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

    if (!hasUserMessages) {
      enqueuePendingSystem(backendState, threadId, text);
      return;
    }

    await this.outboundSystemInner(threadId, text);
  }

  async outboundSystemInner(threadId: string, text: string) {
    const backendState = this.config.backendStateRef.current;
    const threadState = this.getThreadContextApi();
    const backendThreadId = resolveThreadId(backendState, threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(backendThreadId, text);
      if (response.res) {
        const systemMessage = toInboundSystem(response.res);
        if (systemMessage) {
          const updatedMessages = [...threadState.getThreadMessages(threadId), systemMessage];
          threadState.setThreadMessages(threadId, updatedMessages);
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

  async flushPendingChat(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingChat(backendState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    for (const text of pending) {
      try {
        await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    this.config.polling.start(threadId);
  }

  async cancel(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    this.config.polling.stop(threadId);
    const backendThreadId = resolveThreadId(backendState, threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(backendThreadId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }

  private markRunning(threadId: string, running: boolean) {
    setThreadRunning(this.config.backendStateRef.current, threadId, running);
    if (this.config.threadContextRef.current.currentThreadId === threadId) {
      this.config.setGlobalIsRunning?.(running);
    }
  }

  private getThreadContextApi(): ThreadContextApi {
    const { getThreadMessages, setThreadMessages, updateThreadMetadata } =
      this.config.threadContextRef.current;
    return { getThreadMessages, setThreadMessages, updateThreadMetadata };
  }
}
