import {
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useCallback, type MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { constructSystemMessage, constructThreadMessage } from "../utils/conversion";
import type { ThreadMetadata } from "../state/types";

type UseMessageHandlersParams = {
  backendApiRef: MutableRefObject<BackendApi>;
  currentThreadId: string;
  currentMessages: ThreadMessageLike[];
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  isThreadReady: (threadId: string) => boolean;
  resolveThreadId: (threadId: string) => string;
  setIsRunning: (isRunning: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  pendingSystemMessagesRef: MutableRefObject<Map<string, string[]>>;
  pendingChatMessagesRef: MutableRefObject<Map<string, string[]>>;
};

export function useMessageHandlers({
  backendApiRef,
  currentThreadId,
  currentMessages,
  getThreadMessages,
  setThreadMessages,
  updateThreadMetadata,
  isThreadReady,
  resolveThreadId,
  setIsRunning,
  startPolling,
  stopPolling,
  pendingSystemMessagesRef,
  pendingChatMessagesRef,
}: UseMessageHandlersParams) {
  const applyMessages = useCallback(
    (msgs?: SessionMessage[] | null) => {
      if (!msgs) return;

      const hasPendingMessages =
        pendingChatMessagesRef.current.has(currentThreadId) &&
        (pendingChatMessagesRef.current.get(currentThreadId)?.length ?? 0) > 0;
      if (hasPendingMessages) {
        console.log("Skipping applyMessages - pending messages exist for thread:", currentThreadId);
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

      setThreadMessages(currentThreadId, threadMessages);
    },
    [currentThreadId, pendingChatMessagesRef, setThreadMessages]
  );

  const sendSystemMessageNow = useCallback(
    async (threadId: string, message: string) => {
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
    },
    [backendApiRef, getThreadMessages, resolveThreadId, setIsRunning, setThreadMessages, startPolling]
  );

  const flushPendingSystemMessages = useCallback(
    async (threadId: string) => {
      const pending = pendingSystemMessagesRef.current.get(threadId);
      if (!pending?.length) return;

      pendingSystemMessagesRef.current.delete(threadId);
      for (const pendingMessage of pending) {
        await sendSystemMessageNow(threadId, pendingMessage);
      }
    },
    [pendingSystemMessagesRef, sendSystemMessageNow]
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = message.content
        .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
        .map((part: Extract<(typeof message)["content"][number], { type: "text" }>) => part.text)
        .join("\n");

      if (!text) return;

      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
      };

      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);
      updateThreadMetadata(currentThreadId, { lastActiveAt: new Date().toISOString() });

      if (!isThreadReady(currentThreadId)) {
        console.log("Thread not ready yet; queuing message for later delivery.");
        setIsRunning(true);
        const pending = pendingChatMessagesRef.current.get(currentThreadId) || [];
        pendingChatMessagesRef.current.set(currentThreadId, [...pending, text]);
        return;
      }

      const backendThreadId = resolveThreadId(currentThreadId);

      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(backendThreadId, text);
        await flushPendingSystemMessages(currentThreadId);
        startPolling();
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);
      }
    },
    [
      backendApiRef,
      currentMessages,
      currentThreadId,
      flushPendingSystemMessages,
      isThreadReady,
      pendingChatMessagesRef,
      resolveThreadId,
      setIsRunning,
      setThreadMessages,
      startPolling,
      updateThreadMetadata,
    ]
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      if (!isThreadReady(currentThreadId)) return;
      const threadMessages = getThreadMessages(currentThreadId);
      const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

      if (!hasUserMessages) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        return;
      }

      await sendSystemMessageNow(currentThreadId, message);
    },
    [currentThreadId, getThreadMessages, isThreadReady, pendingSystemMessagesRef, sendSystemMessageNow]
  );

  const onCancel = useCallback(async () => {
    if (!isThreadReady(currentThreadId)) return;
    stopPolling();

    const backendThreadId = resolveThreadId(currentThreadId);

    try {
      await backendApiRef.current.postInterrupt(backendThreadId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [
    backendApiRef,
    currentThreadId,
    isThreadReady,
    resolveThreadId,
    setIsRunning,
    stopPolling,
  ]);

  return {
    applyMessages,
    onNew,
    onCancel,
    sendSystemMessage,
    flushPendingSystemMessages,
  };
}
