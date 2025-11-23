"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { BackendApi, type SessionMessage } from "@/lib/backend-api";
import { constructSystemMessage, constructThreadMessage } from "@/lib/conversion";

type RuntimeActions = {
  sendSystemMessage: (message: string) => Promise<void>;
};
const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

export const useRuntimeActions = () => {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  sessionId = "default-session",
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  sessionId?: string;
}>) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSystemMessagesRef = useRef<String[]>([]);


  const hasPendingSystemMessage = () => pendingSystemMessagesRef.current.length > 0;
  const conversationStarted = () => messages.length > 0;

  const applyMessages = useCallback((msgs?: SessionMessage[] | null) => {
    if (!msgs) return;

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

    setMessages(threadMessages);
  }, []);


  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        applyMessages(state.messages);

        if (!state.is_processing) {
          // If there are pending system messages, append them now
          if (hasPendingSystemMessage()) {
            const pendingMessages = pendingSystemMessagesRef.current;
            pendingSystemMessagesRef.current = [];

            const systemMessages: ThreadMessageLike[] = [];
            for (const msg of pendingMessages) {
              backendApiRef.current.postSystemMessage(sessionId, msg.toString());
            }
          }

          setIsRunning(false);
          stopPolling();

          if (hasPendingSystemMessage()) {
            rePolling();
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [applyMessages, sessionId, stopPolling]);


  const rePolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        applyMessages(state.messages);

        if (!state.is_processing) {
          setIsRunning(false);
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [applyMessages, sessionId, stopPolling]);

  // Initialization
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        if (state.is_processing) {
          setIsRunning(true);
          startPolling();
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };

    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [sessionId, backendUrl, stopPolling, applyMessages, startPolling]);


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
      setMessages((prev) => [...prev, userMessage]);

      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(sessionId, text);
        startPolling();
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);
      }
    },
    [sessionId, applyMessages, startPolling]
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      try {
        if (conversationStarted()) {
          const response = await backendApiRef.current.postSystemMessage(
            sessionId,
            message,
          );
          const sessionMessage = response.res;
          if (sessionMessage) {
            // Conversation already started, emit system message immediately
            setIsRunning(true);
            const systemMessage = constructSystemMessage(sessionMessage);
            if (systemMessage) {
              setMessages((prev) => [...prev, systemMessage]);
            }
            startPolling();
          }

        } else {
          // Conversation hasn't started, queue the system message for later
          // We con't wanna see a Wallet Notification right away
          pendingSystemMessagesRef.current.push(message);
        }
      } catch (error) {
        console.error("Failed to send system message:", error);
        setIsRunning(false);
      }
    },
    [sessionId, messages.length, startPolling]
  );

  const onCancel = useCallback(async () => {
    stopPolling();

    try {
      await backendApiRef.current.postInterrupt(sessionId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [sessionId, stopPolling]);

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages: (msgs) => setMessages([...msgs]),
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
  });

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
