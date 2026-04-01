import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { AomiClient, AomiMessage, AomiSystemEvent } from "@aomi-labs/client";
import { toInboundMessage } from "./utils";
import type { ThreadContext } from "../contexts/thread-context";
import type { PollingController } from "./polling-controller";
import type { UserState } from "../contexts/user-context";
import {
  resolveThreadId,
  setThreadRunning,
  type BackendState,
} from "../state/backend-state";

type MessageControllerConfig = {
  aomiClientRef: MutableRefObject<AomiClient>;
  backendStateRef: MutableRefObject<BackendState>;
  threadContextRef: MutableRefObject<ThreadContext>;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
  getPublicKey?: () => string | undefined;
  getApp: () => string;
  getApiKey?: () => string | null;
  getUserState?: () => UserState;
  onSyncEvents?: (sessionId: string, events: AomiSystemEvent[]) => void;
};

type ThreadContextApi = Pick<
  ThreadContext,
  "getThreadMessages" | "setThreadMessages" | "updateThreadMetadata"
>;

export class MessageController {
  constructor(private readonly config: MessageControllerConfig) {}

  inbound(threadId: string, msgs?: AomiMessage[] | null) {
    if (!msgs) return;

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

    const backendThreadId = resolveThreadId(backendState, threadId);
    const app = this.config.getApp();
    const publicKey = this.config.getPublicKey?.();
    const apiKey = this.config.getApiKey?.() ?? undefined;
    const userState = this.config.getUserState?.();

    try {
      this.markRunning(threadId, true);
      const response = await this.config.aomiClientRef.current.sendMessage(
        backendThreadId,
        text,
        { app, publicKey, apiKey, userState },
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

  async cancel(threadId: string) {
    this.config.polling.stop(threadId);
    const backendState = this.config.backendStateRef.current;
    const backendThreadId = resolveThreadId(backendState, threadId);
    try {
      const response =
        await this.config.aomiClientRef.current.interrupt(backendThreadId);
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
