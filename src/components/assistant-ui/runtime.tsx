"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
  type ExternalStoreThreadListAdapter,
  type ExternalStoreThreadData,
} from "@assistant-ui/react";
import { BackendApi, type SessionMessage } from "@/lib/backend-api";
import {
  constructSystemMessage,
  constructThreadMessage,
} from "@/lib/conversion";
import { useThreadContext, type ThreadMetadata } from "@/lib/thread-context";

type RuntimeActions = {
  sendSystemMessage: (message: string) => Promise<void>;
};
const RuntimeActionsContext = createContext<RuntimeActions | undefined>(
  undefined,
);

const parseTimestamp = (value?: string | number) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") {
    // Accept both ms and seconds since backend may send either
    return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : 0;
  }

  // Numeric strings like "1725654321" are not parsed by Date.parse, so coerce first
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};
const isPlaceholderTitle = (title?: string) => {
  const normalized = title?.trim() ?? "";
  return !normalized || normalized.startsWith("#[");
};

export const useRuntimeActions = () => {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error(
      "useRuntimeActions must be used within AomiRuntimeProvider",
    );
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
    bumpThreadViewKey,
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
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());
  // Queue for chat messages sent before backend ID is available
  const pendingChatMessagesRef = useRef<Map<string, string[]>>(new Map());
  // Track in-flight creation to avoid duplicate backend requests
  const creatingThreadIdRef = useRef<string | null>(null);
  const createThreadPromiseRef = useRef<Promise<void> | null>(null);
  const findPendingThreadId = useCallback(() => {
    if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
    for (const [id, meta] of threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [threadMetadata]);

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

  // Helper to resolve a thread ID to its backend ID
  const resolveThreadId = useCallback((threadId: string): string => threadId, []);

  // Check if a thread is ready for API calls
  const isThreadReady = useCallback(
    (threadId: string): boolean => creatingThreadIdRef.current !== threadId,
    [],
  );

  // ==================== Message Processing ====================
  const applyMessages = useCallback(
    (msgs?: SessionMessage[] | null) => {
      if (!msgs) return;

      // Don't overwrite messages if there are pending chat messages waiting to be sent
      // This prevents the UI from losing user messages while waiting for backend ID
      const hasPendingMessages =
        pendingChatMessagesRef.current.has(currentThreadId) &&
        (pendingChatMessagesRef.current.get(currentThreadId)?.length ?? 0) > 0;
      if (hasPendingMessages) {
        console.log(
          "Skipping applyMessages - pending messages exist for thread:",
          currentThreadId,
        );
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
    [currentThreadId, setThreadMessages],
  );

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
  }, [
    currentThreadId,
    applyMessages,
    stopPolling,
    isThreadReady,
    resolveThreadId,
  ]);

  // ==================== Load Initial Thread State ====================
  useEffect(() => {
    const fetchInitialState = async () => {
      // Skip fetching if the thread is still being created
      if (!isThreadReady(currentThreadId)) {
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
  }, [
    currentThreadId,
    applyMessages,
    startPolling,
    stopPolling,
    resolveThreadId,
  ]);

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
          const rawTitle = thread.title ?? "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            newMetadata.get(thread.session_id)?.lastActiveAt ||
            new Date().toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
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
    const sortByLastActiveDesc = (
      [, metaA]: [string, ThreadMetadata],
      [, metaB]: [string, ThreadMetadata],
    ) => {
      const tsA = parseTimestamp(metaA.lastActiveAt);
      const tsB = parseTimestamp(metaB.lastActiveAt);
      return tsB - tsA;
    };

    const regularThreads = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "regular")
      .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
      .sort(sortByLastActiveDesc)
      .map(
        ([id, meta]): ExternalStoreThreadData<"regular"> => ({
          id,
          title: meta.title || "New Chat",
          status: "regular",
        }),
      );

    const archivedThreadsArray = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "archived")
      .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
      .sort(sortByLastActiveDesc)
      .map(
        ([id, meta]): ExternalStoreThreadData<"archived"> => ({
          id,
          title: meta.title || "New Chat",
          status: "archived",
        }),
      );

    return {
      threadId: currentThreadId,
      threads: regularThreads,
      archivedThreads: archivedThreadsArray,

      // Create new thread
      onSwitchToNewThread: async () => {
        const preparePendingThread = (newId: string) => {
          const previousPendingId = creatingThreadIdRef.current;
          if (previousPendingId && previousPendingId !== newId) {
            setThreadMetadata((prev) => {
              const next = new Map(prev);
              next.delete(previousPendingId);
              return next;
            });
            setThreads((prev) => {
              const next = new Map(prev);
              next.delete(previousPendingId);
              return next;
            });
            pendingChatMessagesRef.current.delete(previousPendingId);
            pendingSystemMessagesRef.current.delete(previousPendingId);
            skipInitialFetchRef.current.delete(previousPendingId);
          }

          creatingThreadIdRef.current = newId;
          pendingChatMessagesRef.current.delete(newId);
          pendingSystemMessagesRef.current.delete(newId);
          setThreadMetadata((prev) =>
            new Map(prev).set(newId, {
              title: "New Chat",
              status: "pending",
              lastActiveAt: new Date().toISOString(),
            }),
          );
          setThreadMessages(newId, []);
          setCurrentThreadId(newId);
          setIsRunning(false);
          bumpThreadViewKey();
        };

        // If any pending thread exists (either in-flight or awaiting title), reuse it without new request
        const existingPendingId = findPendingThreadId();
        if (existingPendingId) {
          preparePendingThread(existingPendingId);
          return;
        }

        // If a creation request is already in flight, just reset UI with a fresh pending thread
        if (createThreadPromiseRef.current) {
          preparePendingThread(
            creatingThreadIdRef.current ?? crypto.randomUUID(),
          );
          return;
        }

        // Generate a thread ID for immediate UI update
        const threadId = crypto.randomUUID();
        preparePendingThread(threadId);

        // Create thread on backend in background
        const createPromise = backendApiRef.current
          .createThread(threadId, publicKey)
          .then(async (newThread) => {
            const uiThreadId = creatingThreadIdRef.current ?? threadId;
            const backendId = newThread.session_id;
            if (uiThreadId !== backendId) {
              console.warn("[aomi][thread] backend id mismatch", {
                uiThreadId,
                backendId,
              });
            }

            // Mark this temp thread to skip initial fetch - we just created it,
            // and fetching would overwrite any messages the user has typed
            skipInitialFetchRef.current.add(uiThreadId);

            setThreadMetadata((prev) => {
              const next = new Map(prev);
              const existing = next.get(uiThreadId);
              const nextStatus =
                existing?.status === "archived" ? "archived" : "regular";
              next.set(uiThreadId, {
                title: existing?.title ?? "New Chat",
                status: nextStatus,
                lastActiveAt:
                  existing?.lastActiveAt ?? new Date().toISOString(),
              });
              return next;
            });
            if (creatingThreadIdRef.current === uiThreadId) {
              creatingThreadIdRef.current = null;
            }

            // Flush any pending chat messages that were queued while waiting for backend ID
            const pendingMessages =
              pendingChatMessagesRef.current.get(uiThreadId);
            if (pendingMessages?.length) {
              pendingChatMessagesRef.current.delete(uiThreadId);
              for (const text of pendingMessages) {
                try {
                  await backendApiRef.current.postChatMessage(backendId, text);
                } catch (error) {
                  console.error("Failed to send queued message:", error);
                }
              }
              // Start polling after messages are sent (only if user is still on this thread)
              if (currentThreadIdRef.current === uiThreadId) {
                startPolling();
              }
            }
          })
          .catch((error) => {
            console.error("Failed to create new thread:", error);
            const failedId = creatingThreadIdRef.current ?? threadId;
            // On error, remove the temp thread from UI
            setThreadMetadata((prev) => {
              const next = new Map(prev);
              next.delete(failedId);
              return next;
            });
            setThreads((prev) => {
              const next = new Map(prev);
              next.delete(failedId);
              return next;
            });
            if (creatingThreadIdRef.current === failedId) {
              creatingThreadIdRef.current = null;
            }
          })
          .finally(() => {
            createThreadPromiseRef.current = null;
          });

        createThreadPromiseRef.current = createPromise;
      },

      // Switch to existing thread
      onSwitchToThread: (threadId: string) => {
        setCurrentThreadId(threadId);
      },

      // Rename thread
      onRename: async (threadId: string, newTitle: string) => {
        // Optimistic update
        updateThreadMetadata(threadId, {
          title: isPlaceholderTitle(newTitle) ? "" : newTitle,
        });

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
            const firstRegularThread = Array.from(
              threadMetadata.entries(),
            ).find(
              ([id, meta]) => meta.status === "regular" && id !== threadId,
            );

            if (firstRegularThread) {
              setCurrentThreadId(firstRegularThread[0]);
            } else {
              // No threads left, create a default one
              const defaultId = "default-session";
              setThreadMetadata((prev) =>
                new Map(prev).set(defaultId, {
                  title: "New Chat",
                  status: "regular",
                  lastActiveAt: new Date().toISOString(),
                }),
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
        const response = await backendApiRef.current.postSystemMessage(
          backendThreadId,
          message,
        );

        if (response.res) {
          const systemMessage = constructSystemMessage(response.res);
          if (systemMessage) {
            const updatedMessages = [
              ...getThreadMessages(threadId),
              systemMessage,
            ];
            setThreadMessages(threadId, updatedMessages);
          }
        }

        await startPolling();
      } catch (error) {
        console.error("Failed to send system message:", error);
        setIsRunning(false);
      }
    },
    [getThreadMessages, setThreadMessages, startPolling, resolveThreadId],
  );

  const flushPendingSystemMessages = useCallback(
    async (threadId: string) => {
      const pending = pendingSystemMessagesRef.current.get(threadId);
      if (!pending?.length) return;

      pendingSystemMessagesRef.current.delete(threadId);
      for (const pendingMessage of pending) {
        // Send sequentially to preserve order
        await sendSystemMessageNow(threadId, pendingMessage);
      }
    },
    [sendSystemMessageNow],
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
          await backendApiRef.current.postChatMessage(backendThreadId, text);
        } catch (error) {
          console.error("Failed to send queued message:", error);
        }
      }
      // Start polling after all messages are sent
      startPolling();
    },
    [resolveThreadId, startPolling],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
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

      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
      };

      // Add message to current thread (show immediately in UI)
      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);
      updateThreadMetadata(currentThreadId, {
        lastActiveAt: new Date().toISOString(),
      });

      // If thread isn't ready (backend ID not available yet), queue the message
      if (!isThreadReady(currentThreadId)) {
        console.log(
          "Thread not ready yet; queuing message for later delivery.",
        );
        setIsRunning(true); // Show pending state
        const pending =
          pendingChatMessagesRef.current.get(currentThreadId) || [];
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
      currentThreadId,
      currentMessages,
      flushPendingSystemMessages,
      setThreadMessages,
      startPolling,
      isThreadReady,
      resolveThreadId,
      updateThreadMetadata,
    ],
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      if (!isThreadReady(currentThreadId)) return;
      const threadMessages = getThreadMessages(currentThreadId);
      const hasUserMessages = threadMessages.some((msg) => msg.role === "user");

      if (!hasUserMessages) {
        const pending =
          pendingSystemMessagesRef.current.get(currentThreadId) || [];
        pendingSystemMessagesRef.current.set(currentThreadId, [
          ...pending,
          message,
        ]);
        return;
      }

      await sendSystemMessageNow(currentThreadId, message);
    },
    [currentThreadId, getThreadMessages, sendSystemMessageNow, isThreadReady],
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
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          const nextStatus =
            existing?.status === "archived" ? "archived" : "regular";
          next.set(threadIdToUpdate, {
            title: normalizedTitle,
            status: nextStatus,
            lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
          });
          return next;
        });
        if (
          !isPlaceholderTitle(newTitle) &&
          creatingThreadIdRef.current === threadIdToUpdate
        ) {
          creatingThreadIdRef.current = null;
        }
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [backendUrl, setThreadMetadata, findTempIdForBackendId]);

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
