"use client";

import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "@/lib/backend-api";
import type { ThreadMetadata } from "@/lib/thread-context";
import { constructSystemMessage } from "@/lib/conversion";
import { isPlaceholderTitle } from "@/lib/runtime-utils";

type UseThreadMessagingParams = {
  backendApiRef: RefObject<BackendApi>;
  publicKey?: string;
  currentThreadId: string;
  currentMessages: ThreadMessageLike[];
  currentThreadIdRef: RefObject<string>;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  setIsRunning: (running: boolean) => void;
  startPolling: () => void;
  resolveThreadId: (threadId: string) => string;
  isThreadReady: (threadId: string) => boolean;
  bindBackendId: (threadId: string, backendId: string) => void;
  bumpUpdateSubscriptions: () => void;
  setSubscribableSessionId: (sessionId: string | null) => void;
  pendingChatMessagesRef: RefObject<Map<string, string[]>>;
  pendingSystemMessagesRef: RefObject<Map<string, string[]>>;
  skipInitialFetchRef: RefObject<Set<string>>;
  creatingThreadIdRef: RefObject<string | null>;
  createThreadPromiseRef: RefObject<Promise<void> | null>;
};

export function useThreadMessaging({
  backendApiRef,
  publicKey,
  currentThreadId,
  currentMessages,
  currentThreadIdRef,
  getThreadMessages,
  setThreadMessages,
  setThreadMetadata,
  updateThreadMetadata,
  setIsRunning,
  startPolling,
  resolveThreadId,
  isThreadReady,
  bindBackendId,
  bumpUpdateSubscriptions,
  setSubscribableSessionId,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  skipInitialFetchRef,
  creatingThreadIdRef,
  createThreadPromiseRef,
}: UseThreadMessagingParams) {
  const sendSystemMessageNow = useCallback(
    async (threadId: string, message: string) => {
      const backendThreadId = resolveThreadId(threadId);
      setIsRunning(true);
      try {
        const response = await backendApiRef.current.postSystemMessage(backendThreadId, message);
        if (currentThreadIdRef.current === threadId) {
          setSubscribableSessionId(backendThreadId);
        }

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
    [
      backendApiRef,
      currentThreadIdRef,
      getThreadMessages,
      resolveThreadId,
      setIsRunning,
      setSubscribableSessionId,
      setThreadMessages,
      startPolling,
    ]
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
    [sendSystemMessageNow]
  );

  const ensureBackendSessionForThread = useCallback(
    (threadId: string) => {
      if (isThreadReady(threadId)) return;
      if (createThreadPromiseRef.current) return;

      creatingThreadIdRef.current = threadId;
      setThreadMetadata((prev) => {
        const next = new Map(prev);
        const existing = next.get(threadId);
        next.set(threadId, {
          title: existing?.title ?? "New Chat",
          status: "pending",
          lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
        });
        return next;
      });

      // Prevent fetchState from overwriting optimistic messages while we send queued items.
      skipInitialFetchRef.current.add(threadId);

      const createPromise = backendApiRef.current
        .createThread(publicKey, undefined)
        .then(async (newThread) => {
          const backendId = newThread.session_id;
          bindBackendId(threadId, backendId);
          bumpUpdateSubscriptions();
          if (currentThreadIdRef.current === threadId) {
            setSubscribableSessionId(backendId);
          }

          const backendTitle = newThread.title;
          if (backendTitle && !isPlaceholderTitle(backendTitle)) {
            setThreadMetadata((prev) => {
              const next = new Map(prev);
              const existing = next.get(threadId);
              const nextStatus = existing?.status === "archived" ? "archived" : "regular";
              next.set(threadId, {
                title: backendTitle,
                status: nextStatus,
                lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
              });
              return next;
            });
          }

          const pendingMessages = pendingChatMessagesRef.current.get(threadId);
          if (pendingMessages?.length) {
            pendingChatMessagesRef.current.delete(threadId);
            for (const text of pendingMessages) {
              try {
                await backendApiRef.current.postChatMessage(backendId, text);
              } catch (error) {
                console.error("Failed to send queued message:", error);
              }
            }
            await flushPendingSystemMessages(threadId);
            if (currentThreadIdRef.current === threadId) {
              startPolling();
            }
          }
        })
        .catch((error) => {
          console.error("Failed to create backend session:", error);
          createThreadPromiseRef.current = null;
        })
        .finally(() => {
          createThreadPromiseRef.current = null;
        });

      createThreadPromiseRef.current = createPromise;
    },
    [
      backendApiRef,
      bindBackendId,
      bumpUpdateSubscriptions,
      currentThreadIdRef,
      flushPendingSystemMessages,
      isThreadReady,
      pendingChatMessagesRef,
      publicKey,
      setSubscribableSessionId,
      setThreadMetadata,
      startPolling,
    ]
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = message.content
        .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
        .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
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
        ensureBackendSessionForThread(currentThreadId);
        return;
      }

      const backendThreadId = resolveThreadId(currentThreadId);

      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(backendThreadId, text);
        setSubscribableSessionId(backendThreadId);
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
      ensureBackendSessionForThread,
      flushPendingSystemMessages,
      isThreadReady,
      pendingChatMessagesRef,
      resolveThreadId,
      setIsRunning,
      setSubscribableSessionId,
      setThreadMessages,
      startPolling,
      updateThreadMetadata,
    ]
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      if (!isThreadReady(currentThreadId)) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        ensureBackendSessionForThread(currentThreadId);
        return;
      }
      const threadMessages = getThreadMessages(currentThreadId);
      const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

      if (!hasUserMessages) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        return;
      }

      await sendSystemMessageNow(currentThreadId, message);
    },
    [currentThreadId, ensureBackendSessionForThread, getThreadMessages, isThreadReady, sendSystemMessageNow]
  );

  return {
    flushPendingSystemMessages,
    onNew,
    sendSystemMessage,
  };
}
