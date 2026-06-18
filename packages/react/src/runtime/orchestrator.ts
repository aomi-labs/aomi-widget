"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { AomiClient, UserState, WalletRequest } from "@aomi-labs/client";
import { CLIENT_TYPE_WEB_UI } from "@aomi-labs/client";
import { Session as ClientSession } from "@aomi-labs/client";
import {
  useThreadContext,
  type ThreadContext,
} from "../contexts/thread-context";
import { ThreadRegistry } from "./thread-registry";
import { toInboundMessage } from "./utils";

type OrchestratorOptions = {
  getPublicKey?: () => string | undefined;
  getUserState?: () => UserState;
  getApp: () => string;
  getApiKey?: () => string | null;
  getClientId?: () => string | undefined;
  prepareThreadForSend?: (threadId: string) => Promise<void> | void;
  onSendSuccess?: (threadId: string) => void;
  onSendError?: (threadId: string, error: unknown) => Promise<void> | void;
  onPendingRequestsChange?: (requests: WalletRequest[]) => void;
  onEvent?: (event: {
    type: string;
    payload: unknown;
    sessionId: string;
  }) => void;
};

type OptimisticSendStatus = "sending" | "sent" | "failed";

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Message failed to send";

const getHttpStatus = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number") return status;

  const message = toErrorMessage(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : undefined;
};

const isPaymentRequiredError = (error: unknown) => getHttpStatus(error) === 402;

const PAYMENT_REQUIRED_MESSAGE =
  "You're out of funds, please set up a payment method.";

const buildPaymentRequiredMessage = (): ThreadMessageLike => ({
  id: `aomi-payment-required-${Date.now()}`,
  role: "assistant",
  content: [
    {
      type: "text",
      text: PAYMENT_REQUIRED_MESSAGE,
    },
  ],
  createdAt: new Date(),
  metadata: {
    custom: {
      aomiNoticeKind: "payment_required",
      aomiNoticeTitle: "Credits needed",
    },
  },
});

const previewText = (value: string, max = 80) => {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}…`;
};

const getOptimisticStatus = (message: ThreadMessageLike) => {
  const status = message.metadata?.custom?.aomiSendStatus;
  return status === "sending" || status === "sent" || status === "failed"
    ? status
    : undefined;
};

const hasUnhydratedOptimisticMessage = (messages: ThreadMessageLike[]) =>
  messages.some((message) => {
    const status = getOptimisticStatus(message);
    return status === "sending" || status === "sent";
  });

const withOptimisticStatus = (
  message: ThreadMessageLike,
  status: OptimisticSendStatus,
  error?: unknown,
): ThreadMessageLike => {
  const custom: Record<string, unknown> = {
    ...(message.metadata?.custom ?? {}),
    aomiSendStatus: status,
  };

  if (error) {
    custom.aomiSendError = toErrorMessage(error);
  } else {
    delete custom.aomiSendError;
  }

  return {
    ...message,
    metadata: {
      ...message.metadata,
      custom,
    },
  };
};

const updateOptimisticMessage = (
  threadContext: ThreadContext,
  threadId: string,
  messageId: string,
  status: OptimisticSendStatus,
  error?: unknown,
) => {
  const messages = threadContext.getThreadMessages(threadId);
  let changed = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    changed = true;
    return withOptimisticStatus(message, status, error);
  });

  if (changed) {
    threadContext.setThreadMessages(threadId, nextMessages);
  }
};

const appendPaymentRequiredMessage = (
  threadContext: ThreadContext,
  threadId: string,
) => {
  const messages = threadContext.getThreadMessages(threadId);

  // Walk back to the most recent assistant message. A "last message" check
  // fails for back-to-back 402s because the second failed send inserts an
  // optimistic user message between the existing notice and the new notice
  // call, so the last message is always a user message and the dedupe
  // misses. Skipping over user messages also gives the correct "fresh notice
  // after a successful reply" behavior: if a successful assistant message
  // landed since the last notice, we want a new notice.
  let hasPaymentNotice = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    hasPaymentNotice =
      message.metadata?.custom?.aomiNoticeKind === "payment_required";
    break;
  }

  if (hasPaymentNotice) return;

  threadContext.setThreadMessages(threadId, [
    ...messages,
    buildPaymentRequiredMessage(),
  ]);
};

export function useRuntimeOrchestrator(
  aomiClient: AomiClient,
  options: OrchestratorOptions,
) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContext>(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isRunning, setIsRunning] = useState(false);

  const registryRef = useRef<ThreadRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new ThreadRegistry(() => aomiClientRef.current);
  }
  const registry = registryRef.current;

  const closeSession = useCallback((threadId: string) => {
    registry.closeSession(threadId);
  }, [registry]);

  const closeIdleSessionsExcept = useCallback(
    (activeThreadId: string) => registry.closeIdleSessionsExcept(activeThreadId),
    [registry],
  );

  const closeAllSessions = useCallback(() => {
    registry.closeAllSessions();
  }, [registry]);

  /** Get or create a ClientSession for a thread, wiring up event listeners. */
  const getSession = useCallback(
    (threadId: string): ClientSession => {
      const manager = registry.sessionManager;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextPublicKey = nextOptions.getPublicKey?.();
      const nextApiKey = nextOptions.getApiKey?.() ?? undefined;
      const nextClientId = nextOptions.getClientId?.();
      const nextUserState = nextOptions.getUserState?.();
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          publicKey: nextPublicKey,
          apiKey: nextApiKey,
          clientId: nextClientId,
          userState: nextUserState,
        });
        existing.setSSEActive(
          threadContextRef.current.currentThreadId === threadId,
        );
        return existing;
      }

      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        publicKey: nextPublicKey,
        apiKey: nextApiKey,
        clientId: nextClientId,
        clientType: CLIENT_TYPE_WEB_UI,
        syncPendingTxRequestsFromUserState: false,
        userState: nextUserState,
      });
      session.setSSEActive(threadContextRef.current.currentThreadId === threadId);

      // Wire ClientSession events → React state
      const cleanups: Array<() => void> = [];

      // Messages → thread context
      cleanups.push(
        session.on("messages", (msgs) => {
          const threadMessages: ThreadMessageLike[] = [];
          for (const msg of msgs) {
            const converted = toInboundMessage(msg);
            if (converted) threadMessages.push(converted);
          }
          const existingMessages =
            threadContextRef.current.getThreadMessages(threadId);
          if (
            threadMessages.length === 0 &&
            hasUnhydratedOptimisticMessage(existingMessages)
          ) {
            return;
          }
          threadContextRef.current.setThreadMessages(threadId, threadMessages);
        }),
      );

      // Processing state
      cleanups.push(
        session.on("processing_start", () => {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
        }),
      );
      cleanups.push(
        session.on("processing_end", () => {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        }),
      );

      cleanups.push(
        session.on("wallet_requests_changed", (requests) =>
          optionsRef.current.onPendingRequestsChange?.(requests),
        ),
      );

      // Title changes → thread metadata
      cleanups.push(
        session.on("title_changed", ({ title }) => {
          threadContextRef.current.updateThreadMetadata(threadId, { title });
        }),
      );

      // Forward SSE/system events to the event relay
      const forwardEvent = (type: string) =>
        session.on(
          type as keyof import("@aomi-labs/client").SessionEventMap,
          (payload: unknown) => {
            optionsRef.current.onEvent?.({
              type,
              payload,
              sessionId: threadId,
            });
          },
        );

      cleanups.push(forwardEvent("tool_update"));
      cleanups.push(forwardEvent("tool_complete"));
      cleanups.push(forwardEvent("system_notice"));
      cleanups.push(forwardEvent("system_error"));
      cleanups.push(forwardEvent("async_callback"));
      cleanups.push(forwardEvent("user_state_request"));

      registry.setListenerCleanup(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });

      return session;
    },
    // Stable deps — registry instance is stable for the lifetime of the hook
    [registry],
  );

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      const existingPromise = registry.initialStatePromises.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }

      const cachedMessages =
        threadContextRef.current.getThreadMessages(threadId);
      const hasCachedMessages = cachedMessages.length > 0;
      const isHydrated = registry.hydratedThreads.has(threadId);
      if (hasCachedMessages || isHydrated) {
        // Cache hit: render whatever's already in the thread context immediately.
        const session = registry.sessionManager.get(threadId);
        if (session) {
          // Session survived closeIdleSessionsExcept (only happens when it's
          // still processing/polling/has pending requests). Keep using it;
          // SSE is already attached.
          optionsRef.current.onPendingRequestsChange?.(
            session.getPendingRequests(),
          );
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(session.getIsProcessing());
          }
        } else {
          // Session was torn down because the thread was idle. Don't recreate
          // it just to render cached messages — that would reopen a fresh SSE
          // connection (/api/updates) for no reason. The session lazily
          // recreates inside sendMessage when the user actually does something.
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
          optionsRef.current.onPendingRequestsChange?.([]);
        }
        return;
      }

      const fetchPromise = (async () => {
        registry.pendingFetches.add(threadId);

        try {
          const session = getSession(threadId);
          await session.fetchCurrentState();
          registry.hydratedThreads.add(threadId);
          optionsRef.current.onPendingRequestsChange?.(
            session.getPendingRequests(),
          );

          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(session.getIsProcessing());
          }
        } catch (error) {
          console.error("Failed to fetch initial state:", error);
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        } finally {
          registry.pendingFetches.delete(threadId);
          registry.initialStatePromises.delete(threadId);
        }
      })();

      registry.initialStatePromises.set(threadId, fetchPromise);
      return fetchPromise;
    },
    [getSession],
  );

  /** Send a message on the given thread. */
  const sendMessage = useCallback(
    async (text: string, threadId: string) => {
      console.debug("[aomi][runtime] sendMessage start", {
        threadId,
        messagePreview: previewText(text),
      });
      const existingMessages =
        threadContextRef.current.getThreadMessages(threadId);
      const optimisticMessageId = String(existingMessages.length);
      const userMessage: ThreadMessageLike = {
        id: optimisticMessageId,
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
        metadata: {
          custom: {
            aomiOriginalText: text,
            aomiSendStatus: "sending",
          },
        },
      };
      threadContextRef.current.setThreadMessages(threadId, [
        ...existingMessages,
        userMessage,
      ]);
      threadContextRef.current.updateThreadMetadata(threadId, {
        lastActiveAt: new Date().toISOString(),
      });

      // Immediately show "generating" state so the UI switches to the stop
      // button and displays a loading indicator while the message is in flight.
      if (threadContextRef.current.currentThreadId === threadId) {
        setIsRunning(true);
      }

      try {
        console.debug("[aomi][runtime] sendMessage preparing thread", {
          threadId,
        });
        await optionsRef.current.prepareThreadForSend?.(threadId);
        console.debug("[aomi][runtime] sendMessage prepare complete", {
          threadId,
        });
        const session = getSession(threadId);
        console.debug("[aomi][runtime] sendMessage session ready", {
          threadId,
          sessionId: session.sessionId,
        });
        await session.sendAsync(text);
        console.debug("[aomi][runtime] sendMessage sendAsync complete", {
          threadId,
          sessionId: session.sessionId,
          isProcessing: session.getIsProcessing(),
          pendingRequestCount: session.getPendingRequests().length,
        });
        optionsRef.current.onSendSuccess?.(threadId);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(session.getIsProcessing());
        }
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "sent",
        );
        optionsRef.current.onPendingRequestsChange?.(
          session.getPendingRequests(),
        );
      } catch (error) {
        console.error("[aomi][runtime] sendMessage failed", {
          threadId,
          messagePreview: previewText(text),
          error,
        });
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "failed",
          error,
        );
        if (isPaymentRequiredError(error)) {
          appendPaymentRequiredMessage(threadContextRef.current, threadId);
        }
        await optionsRef.current.onSendError?.(threadId, error);
        throw error;
      }
    },
    [getSession],
  );

  /** Cancel the current generation on the given thread. */
  const cancelGeneration = useCallback(
    async (threadId: string) => {
      const session = registry.sessionManager.get(threadId);
      if (session) {
        await session.interrupt();
      }
    },
    [registry],
  );

  // Keep SSE active only for the current thread.
  useEffect(() => {
    registry.sessionManager.forEach((session, threadId) => {
      session.setSSEActive(threadId === threadContext.currentThreadId);
    });
  }, [registry, threadContext.currentThreadId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);

  return {
    registry,
    sessionManager: registry.sessionManager,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage,
    cancelGeneration,
    closeSession,
    closeAllSessions,
    closeIdleSessionsExcept,
    aomiClientRef,
  };
}
