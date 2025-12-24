"use client";

import { useCallback, type RefObject } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { SessionMessage } from "@/lib/backend-api";
import { constructSystemMessage, constructThreadMessage } from "@/lib/conversion";

type UseThreadMessageStoreParams = {
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  pendingChatMessagesRef: RefObject<Map<string, string[]>>;
};

export function useThreadMessageStore({
  setThreadMessages,
  pendingChatMessagesRef,
}: UseThreadMessageStoreParams) {
  const applySessionMessagesToThread = useCallback(
    (threadId: string, msgs?: SessionMessage[] | null) => {
      if (!msgs) return;

      const hasPendingMessages =
        pendingChatMessagesRef.current.has(threadId) &&
        (pendingChatMessagesRef.current.get(threadId)?.length ?? 0) > 0;
      if (hasPendingMessages) return;

      const threadMessages: ThreadMessageLike[] = [];
      for (const msg of msgs) {
        if (msg.sender === "system") {
          const systemMessage = constructSystemMessage(msg);
          if (systemMessage) threadMessages.push(systemMessage);
          continue;
        }
        const threadMessage = constructThreadMessage(msg);
        if (threadMessage) threadMessages.push(threadMessage);
      }

      setThreadMessages(threadId, threadMessages);
    },
    [setThreadMessages]
  );

  const applyMessagesForThread = useCallback(
    (threadId: string, msgs?: SessionMessage[] | null) => {
      applySessionMessagesToThread(threadId, msgs);
    },
    [applySessionMessagesToThread]
  );

  return {
    applyMessagesForThread,
    applySessionMessagesToThread,
  };
}
