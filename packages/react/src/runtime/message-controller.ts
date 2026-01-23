import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../backend/client";
import type { AomiMessage, ApiSystemEvent } from "../backend/types";
import { toInboundMessage } from "./utils";
import type { ThreadContext } from "../contexts/thread-context";
import type { PollingController } from "./polling-controller";
import {
  dequeuePendingChat,
  enqueuePendingChat,
  hasPendingChat,
  isThreadReady,
  resolveThreadId,
  setThreadRunning,
  type BakendState,
} from "../state/backend-state";

type MessageControllerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  threadContextRef: MutableRefObject<ThreadContext>;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
  getPublicKey?: () => string | undefined;
  onSyncEvents?: (sessionId: string, events: ApiSystemEvent[]) => void;
};

type ThreadContextApi = Pick<
  ThreadContext,
  "getThreadMessages" | "setThreadMessages" | "updateThreadMetadata"
>;

export class MessageController {
  constructor(private readonly config: MessageControllerConfig) {}

  inbound(threadId: string, msgs?: AomiMessage[] | null) {
    const backendState = this.config.backendStateRef.current;
    if (!msgs) return;
    if (hasPendingChat(backendState, threadId)) {
      // Avoid overwriting optimistic UI when pending user messages exist.
      return;
    }

    const threadMessages: ThreadMessageLike[] = [];
    for (const msg of msgs) {
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
      .filter(
        (part): part is Extract<typeof part, { type: "text" }> =>
          part.type === "text",
      )
      .map(
        (part: Extract<(typeof message.content)[number], { type: "text" }>) =>
          part.text,
      )
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
    threadState.updateThreadMetadata(threadId, {
      lastActiveAt: new Date().toISOString(),
    });

    if (!isThreadReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingChat(backendState, threadId, text);
      return;
    }

    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey = this.config.getPublicKey?.();

    try {
      this.markRunning(threadId, true);
      const response = publicKey
        ? await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
            publicKey,
          )
        : await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
          );

      // Apply the latest messages immediately so sync tool results appear without waiting for polling.
      if (response?.messages) {
        this.inbound(threadId, response.messages);
      }

      if (response?.system_events?.length && this.config.onSyncEvents) {
        this.config.onSyncEvents(backendThreadId, response.system_events);
      }

      if (response?.is_processing) {
        this.config.polling.start(threadId);
      } else if (!this.config.polling.isPolling(threadId)) {
        this.markRunning(threadId, false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }

  async flushPendingChat(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingChat(backendState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey = this.config.getPublicKey?.();
    for (const text of pending) {
      try {
        if (publicKey) {
          await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
            publicKey,
          );
        } else {
          await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
          );
        }
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
      const response =
        await this.config.backendApiRef.current.postInterrupt(backendThreadId);
      if (response?.messages) {
        this.inbound(threadId, response.messages);
      }
      if (response?.system_events?.length && this.config.onSyncEvents) {
        this.config.onSyncEvents(backendThreadId, response.system_events);
      }
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
