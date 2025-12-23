import type { MutableRefObject } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { ThreadMetadata } from "../state/types";
import { constructSystemMessage } from "../utils/conversion";

export type MessageHandlerDependencies = {
  backendApiRef: MutableRefObject<BackendApi>;
  resolveThreadId: (threadId: string) => string;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setIsRunning: (running: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  isThreadReady: (threadId: string) => boolean;
  pendingSystemMessagesRef: MutableRefObject<Map<string, string[]>>;
  pendingChatMessagesRef: MutableRefObject<Map<string, string[]>>;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  getCurrentThreadId: () => string;
  getCurrentMessages: () => ThreadMessageLike[];
};

export function createMessageHandlers({
  backendApiRef,
  resolveThreadId,
  getThreadMessages,
  setThreadMessages,
  setIsRunning,
  startPolling,
  stopPolling,
  isThreadReady,
  pendingSystemMessagesRef,
  pendingChatMessagesRef,
  updateThreadMetadata,
  getCurrentThreadId,
  getCurrentMessages,
}: MessageHandlerDependencies) {
  const sendSystemMessageNow = async (threadId: string, message: string) => {
    const backendThreadId = resolveThreadId(threadId);
    setIsRunning(true);
    try {
      const response = await backendApiRef.current.postSystemMessage(backendThreadId, message);

      if (response.res) {
        const systemMessage = constructSystemMessage(response.res);
        if (systemMessage) {
          const updatedMessages = [...getThreadMessages(threadId), systemMessage];
          setThreadMessages(threadId, updatedMessages);
        }
      }

      await startPolling();
    } catch (error) {
      console.error("Failed to send system message:", error);
      setIsRunning(false);
    }
  };

  const flushPendingSystemMessages = async (threadId: string) => {
    const pending = pendingSystemMessagesRef.current.get(threadId);
    if (!pending?.length) return;

    pendingSystemMessagesRef.current.delete(threadId);
    for (const pendingMessage of pending) {
      await sendSystemMessageNow(threadId, pendingMessage);
    }
  };

  const flushPendingChatMessages = async (threadId: string) => {
    const pending = pendingChatMessagesRef.current.get(threadId);
    if (!pending?.length) return;

    pendingChatMessagesRef.current.delete(threadId);
    const backendThreadId = resolveThreadId(threadId);

    for (const text of pending) {
      try {
        await backendApiRef.current.postChatMessage(backendThreadId, text);
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    startPolling();
  };

  const onNew = async (message: AppendMessage) => {
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const threadId = getCurrentThreadId();
    const currentMessages = getCurrentMessages();
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    setThreadMessages(threadId, [...currentMessages, userMessage]);
    updateThreadMetadata(threadId, { lastActiveAt: new Date().toISOString() });

    if (!isThreadReady(threadId)) {
      console.log("Thread not ready yet; queuing message for later delivery.");
      setIsRunning(true);
      const pending = pendingChatMessagesRef.current.get(threadId) || [];
      pendingChatMessagesRef.current.set(threadId, [...pending, text]);
      return;
    }

    const backendThreadId = resolveThreadId(threadId);

    try {
      setIsRunning(true);
      await backendApiRef.current.postChatMessage(backendThreadId, text);
      await flushPendingSystemMessages(threadId);
      startPolling();
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsRunning(false);
    }
  };

  const sendSystemMessage = async (message: string) => {
    const threadId = getCurrentThreadId();
    if (!isThreadReady(threadId)) return;
    const threadMessages = getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

    if (!hasUserMessages) {
      const pending = pendingSystemMessagesRef.current.get(threadId) || [];
      pendingSystemMessagesRef.current.set(threadId, [...pending, message]);
      return;
    }

    await sendSystemMessageNow(threadId, message);
  };

  const onCancel = async () => {
    const threadId = getCurrentThreadId();
    if (!isThreadReady(threadId)) return;
    stopPolling();

    const backendThreadId = resolveThreadId(threadId);

    try {
      await backendApiRef.current.postInterrupt(backendThreadId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  return {
    onNew,
    onCancel,
    sendSystemMessage,
    sendSystemMessageNow,
    flushPendingSystemMessages,
    flushPendingChatMessages,
  };
}
