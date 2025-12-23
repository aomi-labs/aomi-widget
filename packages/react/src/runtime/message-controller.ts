import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { constructSystemMessage, constructThreadMessage } from "../utils/conversion";
import type { ThreadRegistry } from "./thread-registry";
import type { PollingController } from "./polling-controller";

type MessageControllerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  registry: ThreadRegistry;
  polling: PollingController;
  setGlobalIsRunning?: (running: boolean) => void;
};

export class MessageController {
  constructor(private readonly config: MessageControllerConfig) {}

  applyBackendMessages(threadId: string, msgs?: SessionMessage[] | null) {
    if (!msgs) return;
    if (this.config.registry.hasPendingChat(threadId)) {
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

    this.config.registry.setThreadMessages(threadId, threadMessages);
  }

  async sendChat(message: AppendMessage, threadId: string) {
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const existingMessages = this.config.registry.getThreadMessages(threadId);
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    this.config.registry.setThreadMessages(threadId, [...existingMessages, userMessage]);
    this.config.registry.updateThreadMetadata(threadId, { lastActiveAt: new Date().toISOString() });

    if (!this.config.registry.isThreadReady(threadId)) {
      this.markRunning(threadId, true);
      this.config.registry.enqueuePendingChat(threadId, text);
      return;
    }

    const backendThreadId = this.config.registry.resolveThreadId(threadId);

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
    if (!this.config.registry.isThreadReady(threadId)) return;
    const threadMessages = this.config.registry.getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

    if (!hasUserMessages) {
      this.config.registry.enqueuePendingSystem(threadId, text);
      return;
    }

    await this.sendSystemMessageNow(threadId, text);
  }

  async sendSystemMessageNow(threadId: string, text: string) {
    const backendThreadId = this.config.registry.resolveThreadId(threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(backendThreadId, text);
      if (response.res) {
        const systemMessage = constructSystemMessage(response.res);
        if (systemMessage) {
          const updatedMessages = [...this.config.registry.getThreadMessages(threadId), systemMessage];
          this.config.registry.setThreadMessages(threadId, updatedMessages);
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
    const pending = this.config.registry.dequeuePendingSystem(threadId);
    if (!pending.length) return;
    for (const pendingMessage of pending) {
      await this.sendSystemMessageNow(threadId, pendingMessage);
    }
  }

  async flushPendingChat(threadId: string) {
    const pending = this.config.registry.dequeuePendingChat(threadId);
    if (!pending.length) return;
    const backendThreadId = this.config.registry.resolveThreadId(threadId);
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
    if (!this.config.registry.isThreadReady(threadId)) return;
    this.config.polling.stop(threadId);
    const backendThreadId = this.config.registry.resolveThreadId(threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(backendThreadId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }

  private markRunning(threadId: string, running: boolean) {
    this.config.registry.setIsRunning(threadId, running);
    this.config.setGlobalIsRunning?.(running);
  }
}
