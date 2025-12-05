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

const isTempThreadId = (id: string) => id.startsWith("temp-");

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
  // Queue for chat messages sent before backend ID is available
  const pendingChatMessagesRef = useRef<Map<string, string[]>>(new Map());

  // Get messages for current thread
  const currentMessages = getThreadMessages(currentThreadId);

  // Ref to track current thread ID for async callbacks (avoids stale closures)
  const currentThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  // Ref to track threads that were just created and should skip initial fetch
  // This prevents the fetchState from clearing input when switching from temp to real thread
  const skipInitialFetchRef = useRef<Set<string>>(new Set());

  // Ref to map temp thread IDs to their real backend IDs
  // This allows us to keep using tempId in the UI while using backendId for API calls
  const tempToBackendIdRef = useRef<Map<string, string>>(new Map());

  // Helper to resolve a thread ID to its backend ID (handles temp -> real mapping)
  const resolveThreadId = useCallback((threadId: string): string => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);

  // Helper to find a temp thread ID for a given backend ID (reverse lookup)
  const findTempIdForBackendId = useCallback((backendId: string): string | undefined => {
    for (const [tempId, bId] of tempToBackendIdRef.current.entries()) {
      if (bId === backendId) return tempId;
    }
    return undefined;
  }, []);

  // Check if a thread is ready for API calls (either not temp, or temp with backend ID)
  const isThreadReady = useCallback((threadId: string): boolean => {
    if (!isTempThreadId(threadId)) return true;
    return tempToBackendIdRef.current.has(threadId);
  }, []);

  // ==================== Message Processing ====================
  const applyMessages = useCallback((msgs?: SessionMessage[] | null) => {
    if (!msgs) return;

    // Don't overwrite messages if there are pending chat messages waiting to be sent
    // This prevents the UI from losing user messages while waiting for backend ID
    const hasPendingMessages = pendingChatMessagesRef.current.has(currentThreadId) && 
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
    if (!isThreadReady(currentThreadId)) return;
    if (pollingIntervalRef.current) return;
    const backendThreadId = resolveThreadId(currentThreadId);
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          stopPolling();
          return;
        }
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
  }, [currentThreadId, applyMessages, stopPolling, isThreadReady, resolveThreadId]);

  // ==================== Load Initial Thread State ====================
  useEffect(() => {
    const fetchInitialState = async () => {
      // For temp threads without a backend ID yet, skip fetching
      if (isTempThreadId(currentThreadId) && !tempToBackendIdRef.current.has(currentThreadId)) {
        setIsRunning(false);
        return;
      }

      // Skip initial fetch for newly created threads (switched from temp to real)
      // This prevents fetchState from clearing input when the thread was just created
      if (skipInitialFetchRef.current.has(currentThreadId)) {
        skipInitialFetchRef.current.delete(currentThreadId);
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(currentThreadId);

      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          return;
        }
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
  }, [currentThreadId, applyMessages, startPolling, stopPolling, resolveThreadId]);

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
        // Generate a temporary ID for immediate UI update
        const tempId = `temp-${crypto.randomUUID()}`;
        
        // Immediately show the new chat in UI (non-blocking)
        setThreadMetadata((prev) =>
          new Map(prev).set(tempId, { title: "New Chat", status: "regular" })
        );
        setThreadMessages(tempId, []);
        setCurrentThreadId(tempId);

        // Create thread on backend in background (with null title)
        backendApiRef.current.createThread(publicKey, undefined)
          .then(async (newThread) => {
            const backendId = newThread.session_id;
            
            // Store the mapping from tempId to backendId
            // This allows API calls to use the real backendId while UI stays on tempId
            tempToBackendIdRef.current.set(tempId, backendId);
            
            // Mark this temp thread to skip initial fetch - we just created it,
            // and fetching would overwrite any messages the user has typed
            skipInitialFetchRef.current.add(tempId);
            
            // Note: We intentionally do NOT switch currentThreadId here
            // Switching would cause a re-render that clears the input field
            // The tempId remains as the UI thread ID, but API calls use backendId via resolveThreadId

            // Flush any pending chat messages that were queued while waiting for backend ID
            const pendingMessages = pendingChatMessagesRef.current.get(tempId);
            if (pendingMessages?.length) {
              pendingChatMessagesRef.current.delete(tempId);
              for (const text of pendingMessages) {
                try {
                  // eslint-disable-next-line no-await-in-loop
                  await backendApiRef.current.postChatMessage(backendId, text);
                } catch (error) {
                  console.error("Failed to send queued message:", error);
                }
              }
              // Start polling after messages are sent (only if user is still on this thread)
              if (currentThreadIdRef.current === tempId) {
                startPolling();
              }
            }
          })
          .catch((error) => {
            console.error("Failed to create new thread:", error);
            // On error, remove the temp thread from UI
            setThreadMetadata((prev) => {
              const next = new Map(prev);
              next.delete(tempId);
              return next;
            });
            setThreads((prev) => {
              const next = new Map(prev);
              next.delete(tempId);
              return next;
            });
          });
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
    [getThreadMessages, setThreadMessages, startPolling, resolveThreadId]
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

  // Flush pending chat messages when backend ID becomes available
  const flushPendingChatMessages = useCallback(
    async (threadId: string) => {
      const pending = pendingChatMessagesRef.current.get(threadId);
      if (!pending?.length) return;

      pendingChatMessagesRef.current.delete(threadId);
      const backendThreadId = resolveThreadId(threadId);

      for (const text of pending) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await backendApiRef.current.postChatMessage(backendThreadId, text);
        } catch (error) {
          console.error("Failed to send queued message:", error);
        }
      }
      // Start polling after all messages are sent
      startPolling();
    },
    [resolveThreadId, startPolling]
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

      // Add message to current thread (show immediately in UI)
      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);

      // If thread isn't ready (backend ID not available yet), queue the message
      if (!isThreadReady(currentThreadId)) {
        console.log("Thread not ready yet; queuing message for later delivery.");
        setIsRunning(true); // Show pending state
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
    [currentThreadId, currentMessages, flushPendingSystemMessages, setThreadMessages, startPolling, isThreadReady, resolveThreadId]
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
    [currentThreadId, getThreadMessages, sendSystemMessageNow, isThreadReady]
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
  }, [currentThreadId, stopPolling, isThreadReady, resolveThreadId]);

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
    if (isTempThreadId(currentThreadId)) return;
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

        // Check if this sessionId corresponds to a temp thread
        // If so, update the temp thread's metadata, not create a new one
        const tempId = findTempIdForBackendId(sessionId);
        const threadIdToUpdate = tempId || sessionId;

        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadIdToUpdate);
          next.set(threadIdToUpdate, { title: newTitle, status: existing?.status ?? "regular" });
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
  }, [backendUrl, setThreadMetadata, findTempIdForBackendId]);

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
