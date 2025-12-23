import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { constructSystemMessage, constructThreadMessage } from "../utils/conversion";
import type { ThreadContextValue } from "../state/thread-context";
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
  type ThreadRuntimeState,
} from "./runtime-state";

type MessageControllerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  runtimeStateRef: MutableRefObject<ThreadRuntimeState>;
  threadContextRef: MutableRefObject<ThreadContextValue>;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
};

type ThreadStateApi = Pick<
  ThreadContextValue,
  "getThreadMessages" | "setThreadMessages" | "updateThreadMetadata"
>;

export class MessageController {
  constructor(private readonly config: MessageControllerConfig) {}

  applyBackendMessages(threadId: string, msgs?: SessionMessage[] | null) {
    const runtimeState = this.config.runtimeStateRef.current;
    if (!msgs) return;
    if (hasPendingChat(runtimeState, threadId)) {
      // Avoid overwriting optimistic UI when pending user messages exist.
      return;
    }

    const threadMessages: ThreadMessageLike[] = [];
    for (const msg of msgs) {
      if (msg.sender === "system") {
        const systemMessage = constructSystemMessage(msg);
        if (systemMessage) {
          threadMessages.push(systemMessage);
        }
        continue;
      }
      const threadMessage = constructThreadMessage(msg);
      if (threadMessage) {
        threadMessages.push(threadMessage);
      }
    }

    this.getThreadStateApi().setThreadMessages(threadId, threadMessages);
  }

  async sendChat(message: AppendMessage, threadId: string) {
    const runtimeState = this.config.runtimeStateRef.current;
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const threadState = this.getThreadStateApi();
    const existingMessages = threadState.getThreadMessages(threadId);
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    threadState.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadState.updateThreadMetadata(threadId, { lastActiveAt: new Date().toISOString() });

    if (!isThreadReady(runtimeState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingChat(runtimeState, threadId, text);
      return;
    }

    const backendThreadId = resolveThreadId(runtimeState, threadId);

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

  async sendSystemMessage(threadId: string, text: string) {
    const runtimeState = this.config.runtimeStateRef.current;
    if (!isThreadReady(runtimeState, threadId)) return;
    const threadMessages = this.getThreadStateApi().getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

    if (!hasUserMessages) {
      enqueuePendingSystem(runtimeState, threadId, text);
      return;
    }

    await this.sendSystemMessageNow(threadId, text);
  }

  async sendSystemMessageNow(threadId: string, text: string) {
    const runtimeState = this.config.runtimeStateRef.current;
    const threadState = this.getThreadStateApi();
    const backendThreadId = resolveThreadId(runtimeState, threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(backendThreadId, text);
      if (response.res) {
        const systemMessage = constructSystemMessage(response.res);
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
    const runtimeState = this.config.runtimeStateRef.current;
    const pending = dequeuePendingSystem(runtimeState, threadId);
    if (!pending.length) return;
    for (const pendingMessage of pending) {
      await this.sendSystemMessageNow(threadId, pendingMessage);
    }
  }

  async flushPendingChat(threadId: string) {
    const runtimeState = this.config.runtimeStateRef.current;
    const pending = dequeuePendingChat(runtimeState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(runtimeState, threadId);
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
    const runtimeState = this.config.runtimeStateRef.current;
    if (!isThreadReady(runtimeState, threadId)) return;
    this.config.polling.stop(threadId);
    const backendThreadId = resolveThreadId(runtimeState, threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(backendThreadId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }

  private markRunning(threadId: string, running: boolean) {
    setThreadRunning(this.config.runtimeStateRef.current, threadId, running);
    this.config.setGlobalIsRunning?.(running);
  }

  private getThreadStateApi(): ThreadStateApi {
    const { getThreadMessages, setThreadMessages, updateThreadMetadata } =
      this.config.threadContextRef.current;
    return { getThreadMessages, setThreadMessages, updateThreadMetadata };
  }
}
