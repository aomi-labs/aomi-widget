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
import { useThreadContext, type ThreadMetadata } from "@/lib/thread-context";
import type { WalletTxRequestHandler, WalletTxRequestPayload } from "@/lib/wallet-tx";
type RuntimeActions = {
  sendSystemMessage: (message: string) => Promise<void>;
};
const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

const isTempThreadId = (id: string) => id.startsWith("temp-");

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

async function pickInjectedProvider(publicKey?: string): Promise<Eip1193Provider | undefined> {
  const ethereum = (globalThis as unknown as { ethereum?: unknown }).ethereum as
    | (Eip1193Provider & { providers?: unknown[] })
    | undefined;
  if (!ethereum?.request) return undefined;

  const candidates: Eip1193Provider[] = Array.isArray(ethereum.providers)
    ? (ethereum.providers.filter((p): p is Eip1193Provider => !!(p as Eip1193Provider)?.request) as Eip1193Provider[])
    : [ethereum];

  const target = publicKey?.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = (await candidate.request({ method: "eth_accounts" })) as unknown;
        const list = Array.isArray(accounts) ? (accounts as unknown[]).map((a) => String(a).toLowerCase()) : [];
        if (list.includes(target)) return candidate;
      } catch {
        // Ignore providers that error on eth_accounts.
      }
    }
  }

  return candidates[0];
}

type WalletTxRequest = WalletTxRequestPayload;

type BackendSystemEvent =
  | { InlineDisplay: unknown }
  | { SystemNotice: string }
  | { SystemError: string }
  | { AsyncUpdate: unknown };

function normalizeWalletError(error: unknown): { rejected: boolean; message: string } {
  const e = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
    cause?: unknown;
  };
  const cause = (e?.cause ?? null) as
    | { code?: unknown; name?: unknown; message?: unknown; shortMessage?: unknown }
    | null;

  const code =
    (typeof e?.code === "number" ? e.code : undefined) ??
    (typeof cause?.code === "number" ? cause.code : undefined);
  const name =
    (typeof e?.name === "string" ? e.name : undefined) ??
    (typeof cause?.name === "string" ? cause.name : undefined);
  const msg =
    (typeof e?.shortMessage === "string" ? e.shortMessage : undefined) ??
    (typeof cause?.shortMessage === "string" ? cause.shortMessage : undefined) ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    (typeof cause?.message === "string" ? cause.message : undefined) ??
    "Unknown wallet error";

  const rejected =
    code === 4001 ||
    name === "UserRejectedRequestError" ||
    name === "RejectedRequestError" ||
    /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(msg);

  return { rejected, message: msg };
}

function parseBackendSystemEvent(value: unknown): BackendSystemEvent | null {
  if (!value || typeof value !== "object") return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [key, payload] = entries[0];
  switch (key) {
    case "InlineDisplay":
      return { InlineDisplay: payload };
    case "SystemNotice":
      return { SystemNotice: typeof payload === "string" ? payload : String(payload) };
    case "SystemError":
      return { SystemError: typeof payload === "string" ? payload : String(payload) };
    case "AsyncUpdate":
      return { AsyncUpdate: payload };
    default:
      return null;
  }
}

function toHexQuantity(value: string): string {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}
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
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
  onWalletTxRequest,
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
  onWalletTxRequest?: WalletTxRequestHandler;
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
  const [subscribableSessionId, setSubscribableSessionId] = useState<string | null>(null);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());
  const lastEventIdBySessionRef = useRef<Map<string, number>>(new Map());
  const eventsInFlightRef = useRef<Set<string>>(new Set());
  const extraMessagesByThreadRef = useRef<Map<string, ThreadMessageLike[]>>(new Map());
  const handledWalletTxRequestsRef = useRef<Set<string>>(new Set());
  const walletTxQueueRef = useRef<Array<{ sessionId: string; threadId: string; request: WalletTxRequest }>>([]);
  const walletTxInFlightRef = useRef(false);
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

      const extras = extraMessagesByThreadRef.current.get(threadId) ?? [];
      setThreadMessages(threadId, [...threadMessages, ...extras]);
    },
    [setThreadMessages]
  );

  const appendExtraMessages = useCallback(
    (threadId: string, messages: ThreadMessageLike[]) => {
      if (!messages.length) return;
      const existing = extraMessagesByThreadRef.current.get(threadId) ?? [];
      extraMessagesByThreadRef.current.set(threadId, [...existing, ...messages]);
    },
    []
  );

  const enqueueWalletTxRequest = useCallback(
    (sessionId: string, threadId: string, request: WalletTxRequest) => {
      const key = `${sessionId}:${request.timestamp ?? JSON.stringify(request)}`;
      if (handledWalletTxRequestsRef.current.has(key)) return;
      handledWalletTxRequestsRef.current.add(key);
      walletTxQueueRef.current.push({ sessionId, threadId, request });
    },
    []
  );

  const drainWalletTxQueue = useCallback(async () => {
    if (walletTxInFlightRef.current) return;
    const next = walletTxQueueRef.current.shift();
    if (!next) return;
    walletTxInFlightRef.current = true;

    try {
      if (onWalletTxRequest) {
        const txHash = await onWalletTxRequest(next.request, {
          sessionId: next.sessionId,
          threadId: next.threadId,
          publicKey,
        });
        await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash}`);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
        return;
      }

      const activeProvider = await pickInjectedProvider(publicKey);
      if (!activeProvider?.request) {
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "No wallet provider found (window.ethereum missing)."
        );
        return;
      }

      const accounts = (await activeProvider.request({ method: "eth_accounts" })) as unknown;
      const addresses = Array.isArray(accounts) ? (accounts as unknown[]).map(String) : [];
      const from = publicKey || addresses[0];

      if (!from) {
        await activeProvider.request({ method: "eth_requestAccounts" });
      }

      const fromAddress =
        publicKey || ((await activeProvider.request({ method: "eth_accounts" })) as unknown);
      const resolvedFrom = publicKey || (Array.isArray(fromAddress) ? String((fromAddress as unknown[])[0] ?? "") : "");

      if (!resolvedFrom) {
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "Wallet is not connected; please connect a wallet to sign the requested transaction."
        );
        return;
      }

      const gas = next.request.gas ?? next.request.gas_limit ?? undefined;
      let valueHex: string | undefined;
      let gasHex: string | undefined;
      try {
        valueHex = toHexQuantity(next.request.value);
        if (gas) gasHex = toHexQuantity(gas);
      } catch (error) {
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Invalid wallet transaction request payload: ${(error as Error).message}`
        );
        return;
      }

      const txParams: Record<string, string> = {
        from: resolvedFrom,
        to: next.request.to,
        value: valueHex,
        data: next.request.data,
        ...(gasHex ? { gas: gasHex } : {}),
      };

      const txHash = (await activeProvider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })) as string;

      await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash}`);
      if (currentThreadIdRef.current === next.threadId) {
        try {
          const state = await backendApiRef.current.fetchState(next.sessionId);
          applySessionMessagesToThread(next.threadId, state.messages);
        } catch (refreshError) {
          console.error("Failed to refresh state after wallet tx:", refreshError);
        }
      }
    } catch (error) {
      const normalized = normalizeWalletError(error);
      const final = normalized.rejected
        ? "Transaction rejected by user."
        : `Transaction failed: ${normalized.message}`;
      try {
        await backendApiRef.current.postSystemMessage(next.sessionId, final);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
      } catch (postError) {
        console.error("Failed to report wallet tx result to backend:", postError);
      }
    } finally {
      walletTxInFlightRef.current = false;
      void drainWalletTxQueue();
    }
  }, [applySessionMessagesToThread, onWalletTxRequest, publicKey]);

  const handleWalletTxRequest = useCallback(
    (sessionId: string, threadId: string, request: WalletTxRequest) => {
      // Only pop the wallet if the user is currently viewing this thread.
      if (currentThreadIdRef.current !== threadId) return;

      const description = request.description || request.topic || "Wallet transaction requested";
      appendExtraMessages(threadId, [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `Wallet transaction request: ${description}`,
            },
          ],
          ...(request.timestamp ? { createdAt: new Date(request.timestamp) } : {}),
        },
      ]);

      enqueueWalletTxRequest(sessionId, threadId, request);
      void drainWalletTxQueue();
    },
    [appendExtraMessages, drainWalletTxQueue, enqueueWalletTxRequest]
  );

  const handleBackendSystemEvents = useCallback(
    (sessionId: string, threadId: string, rawEvents?: unknown[] | null) => {
      if (!rawEvents?.length) return;

      for (const raw of rawEvents) {
        const parsed = parseBackendSystemEvent(raw);
        if (!parsed) continue;

        if ("InlineDisplay" in parsed) {
          const payload = parsed.InlineDisplay;
          if (!payload || typeof payload !== "object") continue;
          const type = (payload as Record<string, unknown>).type;
          if (type !== "wallet_tx_request") continue;
          const requestValue = (payload as Record<string, unknown>).payload;
          if (!requestValue || typeof requestValue !== "object") continue;
          const req = requestValue as Record<string, unknown>;
          if (typeof req.to !== "string" || typeof req.value !== "string" || typeof req.data !== "string") {
            continue;
          }
          handleWalletTxRequest(sessionId, threadId, req as unknown as WalletTxRequest);
        }

        if ("SystemError" in parsed) {
          appendExtraMessages(threadId, [
            {
              role: "system",
              content: [{ type: "text", text: `System error: ${parsed.SystemError}` }],
              createdAt: new Date(),
            },
          ]);
        }
      }
    },
    [appendExtraMessages, handleWalletTxRequest]
  );

  // ==================== Message Processing ====================
  const applyMessages = useCallback((msgs?: SessionMessage[] | null) => {
    applySessionMessagesToThread(currentThreadId, msgs);
  }, [applySessionMessagesToThread, currentThreadId]);

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
    const threadIdForPolling = currentThreadId;
    const backendThreadId = resolveThreadId(currentThreadId);
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (currentThreadIdRef.current !== threadIdForPolling) return;
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          stopPolling();
          return;
        }
        handleBackendSystemEvents(backendThreadId, threadIdForPolling, state.system_events);
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
    handleBackendSystemEvents,
    stopPolling,
    isThreadReady,
    resolveThreadId,
  ]);

  // ==================== Load Initial Thread State ====================
  useEffect(() => {
    const fetchInitialState = async () => {
      // For temp threads without a backend ID yet, skip fetching
      if (isTempThreadId(currentThreadId) && !tempToBackendIdRef.current.has(currentThreadId)) {
        setSubscribableSessionId(null);
        setIsRunning(false);
        return;
      }

      // Skip initial fetch for newly created threads (switched from temp to real)
      // This prevents fetchState from clearing input when the thread was just created
      if (skipInitialFetchRef.current.has(currentThreadId)) {
        skipInitialFetchRef.current.delete(currentThreadId);
        if (isThreadReady(currentThreadId)) {
          setSubscribableSessionId(resolveThreadId(currentThreadId));
        }
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(currentThreadId);

      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setSubscribableSessionId(null);
          setIsRunning(false);
          return;
        }
        setSubscribableSessionId(backendThreadId);
        handleBackendSystemEvents(backendThreadId, currentThreadId, state.system_events);
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
    isThreadReady,
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
            thread.last_active_at ||
            thread.updated_at ||
            thread.created_at ||
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
      [, metaB]: [string, ThreadMetadata]
    ) => {
      const tsA = parseTimestamp(metaA.lastActiveAt);
      const tsB = parseTimestamp(metaB.lastActiveAt);
      return tsB - tsA;
    };

    const regularThreads = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "regular")
      .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
      .sort(sortByLastActiveDesc)
      .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
        id,
        title: meta.title || "New Chat",
        status: "regular",
      }));

    const archivedThreadsArray = Array.from(threadMetadata.entries())
      .filter(([_, meta]) => meta.status === "archived")
      .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
      .sort(sortByLastActiveDesc)
      .map(([id, meta]): ExternalStoreThreadData<"archived"> => ({
        id,
        title: meta.title || "New Chat",
        status: "archived",
      }));

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
            tempToBackendIdRef.current.delete(previousPendingId);
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
            })
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
          preparePendingThread(creatingThreadIdRef.current ?? `temp-${crypto.randomUUID()}`);
          return;
        }

        // Generate a temporary ID for immediate UI update
        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId);

        // Create thread on backend in background (with null title)
        const createPromise = backendApiRef.current
          .createThread(publicKey, undefined)
          .then(async (newThread) => {
            const uiThreadId = creatingThreadIdRef.current ?? tempId;
            const backendId = newThread.session_id;

            // Store the mapping from tempId to backendId
            // This allows API calls to use the real backendId while UI stays on tempId
            tempToBackendIdRef.current.set(uiThreadId, backendId);
            if (currentThreadIdRef.current === uiThreadId) {
              setSubscribableSessionId(backendId);
            }

            // Mark this temp thread to skip initial fetch - we just created it,
            // and fetching would overwrite any messages the user has typed
            skipInitialFetchRef.current.add(uiThreadId);

            const backendTitle = newThread.title;
            if (backendTitle && !isPlaceholderTitle(backendTitle)) {
              setThreadMetadata((prev) => {
                const next = new Map(prev);
                const existing = next.get(uiThreadId);
                const nextStatus =
                  existing?.status === "archived" ? "archived" : "regular";
                next.set(uiThreadId, {
                  title: backendTitle,
                  status: nextStatus,
                  lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
                });
                return next;
              });
              if (creatingThreadIdRef.current === uiThreadId) {
                creatingThreadIdRef.current = null;
              }
            }

            // Flush any pending chat messages that were queued while waiting for backend ID
            const pendingMessages = pendingChatMessagesRef.current.get(uiThreadId);
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
            const failedId = creatingThreadIdRef.current ?? tempId;
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
        updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });

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
                  new Map(prev).set(defaultId, {
                    title: "New Chat",
                    status: "regular",
                    lastActiveAt: new Date().toISOString(),
                  })
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
    [getThreadMessages, setThreadMessages, startPolling, resolveThreadId]
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
          tempToBackendIdRef.current.set(threadId, backendId);
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
      flushPendingSystemMessages,
      isThreadReady,
      publicKey,
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

      // Add message to current thread (show immediately in UI)
      setThreadMessages(currentThreadId, [...currentMessages, userMessage]);
      updateThreadMetadata(currentThreadId, { lastActiveAt: new Date().toISOString() });

      // If thread isn't ready (backend ID not available yet), queue the message
      if (!isThreadReady(currentThreadId)) {
        console.log("Thread not ready yet; queuing message for later delivery.");
        setIsRunning(true); // Show pending state
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
      currentThreadId,
      currentMessages,
      ensureBackendSessionForThread,
      flushPendingSystemMessages,
      setThreadMessages,
      startPolling,
      isThreadReady,
      resolveThreadId,
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
    [
      currentThreadId,
      ensureBackendSessionForThread,
      getThreadMessages,
      isThreadReady,
      sendSystemMessageNow,
    ]
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
    if (!subscribableSessionId) return;

    const backendSessionId = subscribableSessionId;

    const applyTitleChanged = (sessionId: string, newTitle: string) => {
      const tempId = findTempIdForBackendId(sessionId);
      const threadIdToUpdate = tempId || sessionId;

      setThreadMetadata((prev) => {
        const next = new Map(prev);
        const existing = next.get(threadIdToUpdate);
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        const nextStatus = existing?.status === "archived" ? "archived" : "regular";
        next.set(threadIdToUpdate, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
        });
        return next;
      });
      if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === threadIdToUpdate) {
        creatingThreadIdRef.current = null;
      }
    };

    const drainEvents = async (sessionId: string) => {
      if (eventsInFlightRef.current.has(sessionId)) return;
      eventsInFlightRef.current.add(sessionId);

      try {
        let afterId = lastEventIdBySessionRef.current.get(sessionId) ?? 0;
        for (;;) {
          const events = await backendApiRef.current.fetchEventsAfter(sessionId, afterId, 200);
          if (!events.length) break;

          for (const event of events) {
            const eventId = typeof event.event_id === "number" ? event.event_id : Number(event.event_id);
            if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);

            if (event.type === "title_changed" && typeof event.new_title === "string") {
              applyTitleChanged(sessionId, event.new_title);
            }

            if (event.type === "wallet_tx_request") {
              const payload = (event as unknown as { payload?: unknown }).payload;
              if (payload && typeof payload === "object") {
                const req = payload as Record<string, unknown>;
                if (typeof req.to === "string" && typeof req.value === "string" && typeof req.data === "string") {
                  const threadId = findTempIdForBackendId(sessionId) || sessionId;
                  handleWalletTxRequest(sessionId, threadId, req as unknown as WalletTxRequest);
                }
              }
            }
          }

          // If we hit the limit, keep draining in case more events are waiting.
          if (events.length < 200) break;
        }

        lastEventIdBySessionRef.current.set(sessionId, afterId);
      } catch (error) {
        console.error("Failed to fetch async events:", error);
      } finally {
        eventsInFlightRef.current.delete(sessionId);
      }
    };

    // Catch up on any events already in the store (e.g. title changes that happened before subscribing).
    void drainEvents(backendSessionId);

    const unsubscribe = backendApiRef.current.subscribeToUpdates(
      backendSessionId,
      (update) => {
        if (update.type !== "event_available") return;
        void drainEvents(update.session_id);
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [findTempIdForBackendId, handleWalletTxRequest, setThreadMetadata, subscribableSessionId]);

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
