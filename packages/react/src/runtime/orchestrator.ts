"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type {
  AomiClient,
  UserState,
  WalletRequest,
} from "@aomi-labs/client";
import { CLIENT_TYPE_WEB_UI } from "@aomi-labs/client";
import { Session as ClientSession } from "@aomi-labs/client";
import {
  useThreadContext,
  type ThreadContext,
} from "../contexts/thread-context";
import { SessionManager } from "./session-manager";
import { toInboundMessage } from "./utils";

type OrchestratorOptions = {
  getPublicKey?: () => string | undefined;
  getUserState?: () => UserState;
  getApp: () => string;
  getApiKey?: () => string | null;
  getClientId?: () => string | undefined;
  prepareThreadForSend?: (threadId: string) => Promise<void> | void;
  onPendingRequestsChange?: (requests: WalletRequest[]) => void;
  onEvent?: (event: { type: string; payload: unknown; sessionId: string }) => void;
};

type OptimisticSendStatus = "sending" | "sent" | "failed";

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Message failed to send";

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
  const custom = {
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

  const sessionManagerRef = useRef<SessionManager | null>(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }

  const pendingFetches = useRef<Set<string>>(new Set());
  // Track event listener cleanup per thread
  const listenerCleanups = useRef<Map<string, () => void>>(new Map());

  /** Get or create a ClientSession for a thread, wiring up event listeners. */
  const getSession = useCallback(
    (threadId: string): ClientSession => {
      const manager = sessionManagerRef.current!;
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
        session.on(type as keyof import("@aomi-labs/client").SessionEventMap, (payload: unknown) => {
          optionsRef.current.onEvent?.({ type, payload, sessionId: threadId });
        });

      cleanups.push(forwardEvent("tool_update"));
      cleanups.push(forwardEvent("tool_complete"));
      cleanups.push(forwardEvent("system_notice"));
      cleanups.push(forwardEvent("system_error"));
      cleanups.push(forwardEvent("async_callback"));

      listenerCleanups.current.set(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });

      return session;
    },
    // Stable deps — option getters are refs
    [],
  );

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      if (pendingFetches.current.has(threadId)) return;
      pendingFetches.current.add(threadId);

      try {
        const session = getSession(threadId);
        await session.fetchCurrentState();
        optionsRef.current.onPendingRequestsChange?.(session.getPendingRequests());

        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(session.getIsProcessing());
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      } finally {
        pendingFetches.current.delete(threadId);
      }
    },
    [getSession],
  );

  /** Send a message on the given thread. */
  const sendMessage = useCallback(
    async (text: string, threadId: string) => {
      const existingMessages = threadContextRef.current.getThreadMessages(threadId);
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

      try {
        await optionsRef.current.prepareThreadForSend?.(threadId);
        const session = getSession(threadId);
        await session.sendAsync(text);
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "sent",
        );
        optionsRef.current.onPendingRequestsChange?.(session.getPendingRequests());
      } catch (error) {
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "failed",
          error,
        );
        throw error;
      }
    },
    [getSession],
  );

  /** Cancel the current generation on the given thread. */
  const cancelGeneration = useCallback(
    async (threadId: string) => {
      const session = sessionManagerRef.current?.get(threadId);
      if (session) {
        await session.interrupt();
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionManagerRef.current?.closeAll();
      for (const cleanup of listenerCleanups.current.values()) {
        cleanup();
      }
      listenerCleanups.current.clear();
    };
  }, []);

  return {
    sessionManager: sessionManagerRef.current!,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage,
    cancelGeneration,
    aomiClientRef,
  };
}
