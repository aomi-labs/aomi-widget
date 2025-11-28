"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
  type ExternalStoreThreadListAdapter,
  type ExternalStoreThreadData,
} from "@assistant-ui/react";
import { BackendApi, type SessionMessage } from "@/lib/backend-api";
import { constructSystemMessage, constructThreadMessage } from "@/lib/conversion";
import { useThreadContext } from "@/lib/thread-context";
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
  publicKey,
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
}>) {
  // ==================== Thread Context Integration ====================
  const {
    currentThreadId,
    setCurrentThreadId,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    updateThreadMetadata,
  } = useThreadContext();


  // ==================== State ====================
  const [isRunning, setIsRunning] = useState(false);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());

  // Get messages for current thread
  const currentMessages = getThreadMessages(currentThreadId);

  // ==================== Message Processing ====================
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

    setThreadMessages(currentThreadId, threadMessages);
  }, [currentThreadId, setThreadMessages]);

  // ==================== Backend API ====================
  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  // ==================== Polling Logic ====================
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
        const state = await backendApiRef.current.fetchState(currentThreadId);
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
  }, [currentThreadId, applyMessages, stopPolling]);

  // ==================== Load Initial Thread State ====================
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const state = await backendApiRef.current.fetchState(currentThreadId);
        applyMessages(state.messages);

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
  }, [currentThreadId, applyMessages, startPolling, stopPolling]);

  // ==================== Load Thread List from Backend ====================
  useEffect(() => {
    if (!publicKey) return;

    const fetchThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const newMetadata = new Map(threadMetadata);

        // Track highest chat number
        let maxChatNum = threadCnt;

        for (const thread of threadList) {
          const title = thread.title || "New Chat";
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
          });

          // Extract chat number if title follows "Chat N" format
          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }

        setThreadMetadata(newMetadata);
        // Sync counter to highest chat number
        if (maxChatNum > threadCnt) {
          setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void fetchThreadList();
  }, [publicKey]); // Only run on mount and when publicKey changes

  // ==================== Thread List Adapter ====================
  const threadListAdapter: ExternalStoreThreadListAdapter = (() => {
    // Build thread arrays from metadata (newest first)
    const regularThreads = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "regular")
      .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
        id,
        title: meta.title,
        status: "regular",
      }))
      .reverse(); // Show newest threads first

    const archivedThreadsArray = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "archived")
      .map(([id]): ExternalStoreThreadData<"archived"> => ({
        id,
        title: id, // Display session_id as title for now
        status: "archived",
      }))
      .reverse(); // Show newest archived threads first

    return {
      threadId: currentThreadId,
      threads: regularThreads,
      archivedThreads: archivedThreadsArray,

      // Create new thread
      onSwitchToNewThread: async () => {
        try {
          // Generate sequential title
          const nextCount = threadCnt + 1;
          const chatTitle = `Chat ${nextCount}`;

          // Create thread with title
          const newThread = await backendApiRef.current.createThread(publicKey, chatTitle);
          const backendId = newThread.session_id;
          const backendTitle = newThread.title || chatTitle;

          setThreadMetadata((prev) =>
            new Map(prev).set(backendId, { title: backendTitle, status: "regular" })
          );
          setThreadMessages(backendId, []);
          setCurrentThreadId(backendId);
          setThreadCnt(nextCount); // Increment counter
        } catch (error) {
          console.error("Failed to create new thread:", error);
          // Could show error toast to user here
        }
      },

      // Switch to existing thread
      onSwitchToThread: (threadId: string) => {
        setCurrentThreadId(threadId);
      },

      // Rename thread
      onRename: async (threadId: string, newTitle: string) => {
        // Optimistic update
        updateThreadMetadata(threadId, { title: newTitle });

        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
          // Could rollback here, but we'll keep the optimistic update
        }
      },

      // Archive thread
      onArchive: async (threadId: string) => {
        // Optimistic update
        updateThreadMetadata(threadId, { status: "archived" });

        try {
          await backendApiRef.current.archiveThread(threadId);
        } catch (error) {
          console.error("Failed to archive thread:", error);
          // Rollback on error
          updateThreadMetadata(threadId, { status: "regular" });
        }
      },

      // Unarchive thread
      onUnarchive: async (threadId: string) => {
        // Optimistic update
        updateThreadMetadata(threadId, { status: "regular" });

        try {
          await backendApiRef.current.unarchiveThread(threadId);
        } catch (error) {
          console.error("Failed to unarchive thread:", error);
          // Rollback on error
          updateThreadMetadata(threadId, { status: "archived" });
        }
      },

        // Delete thread
        onDelete: async (threadId: string) => {
          try {
            await backendApiRef.current.deleteThread(threadId);

            // Remove from context
            setThreadMetadata((prev) => {
              const next = new Map(prev);
              next.delete(threadId);
              return next;
            });
            setThreads((prev) => {
              const next = new Map(prev);
              next.delete(threadId);
              return next;
            });

            // Switch to another thread if current was deleted
            if (currentThreadId === threadId) {
              const firstRegularThread = Array.from(threadMetadata.entries())
                .find(([id, meta]) => meta.status === "regular" && id !== threadId);

              if (firstRegularThread) {
                setCurrentThreadId(firstRegularThread[0]);
              } else {
                // No threads left, create a default one
                const defaultId = "default-session";
                setThreadMetadata((prev) =>
                  new Map(prev).set(defaultId, { title: "New Chat", status: "regular" })
                );
                setThreadMessages(defaultId, []);
                setCurrentThreadId(defaultId);
              }
            }
          } catch (error) {
            console.error("Failed to delete thread:", error);
            throw error; // Let the UI handle the error
          }
        },
      };
  })();

  // ==================== Message Handlers ====================
  const sendSystemMessageNow = useCallback(
    async (threadId: string, message: string) => {
      setIsRunning(true);
      try {
        const response = await backendApiRef.current.postSystemMessage(threadId, message);

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
    [getThreadMessages, setThreadMessages, startPolling]
  );

  const flushPendingSystemMessages = useCallback(
    async (threadId: string) => {
      const pending = pendingSystemMessagesRef.current.get(threadId);
      if (!pending?.length) return;

      pendingSystemMessagesRef.current.delete(threadId);
      for (const pendingMessage of pending) {
        // Send sequentially to preserve order
        // eslint-disable-next-line no-await-in-loop
        await sendSystemMessageNow(threadId, pendingMessage);
      }
    },
    [sendSystemMessageNow]
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

      // Add message to current thread
      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);

      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(currentThreadId, text);
        await flushPendingSystemMessages(currentThreadId);
        startPolling();
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);
      }
    },
    [currentThreadId, currentMessages, flushPendingSystemMessages, setThreadMessages, startPolling]
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      const threadMessages = getThreadMessages(currentThreadId);
      const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

      if (!hasUserMessages) {
        const pending = pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [...pending, message]);
        return;
      }

      await sendSystemMessageNow(currentThreadId, message);
    },
    [currentThreadId, getThreadMessages, sendSystemMessageNow]
  );

  const onCancel = useCallback(async () => {
    stopPolling();

    try {
      await backendApiRef.current.postInterrupt(currentThreadId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [currentThreadId, stopPolling]);

  // ==================== Runtime ====================
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadId, [...msgs]),
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: {
      threadList: threadListAdapter, // 🎯 Thread list adapter enabled!
    },
  });

  useEffect(() => {
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, flushPendingSystemMessages]);

  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates(
      (update) => {
        if (update.type !== "TitleChanged") return;
        const sessionId = update.data.session_id;
        const newTitle = update.data.new_title;

        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(sessionId);
          next.set(sessionId, { title: newTitle, status: existing?.status ?? "regular" });
          return next;
        });
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [backendUrl, setThreadMetadata]);

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
