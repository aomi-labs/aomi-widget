"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type {
  AomiClient,
  UserState,
  WalletRequest,
} from "@aomi-labs/client";
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
  onPendingRequestsChange?: (requests: WalletRequest[]) => void;
  onEvent?: (event: { type: string; payload: unknown; sessionId: string }) => void;
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
      const nextApp = options.getApp();
      const nextPublicKey = options.getPublicKey?.();
      const nextApiKey = options.getApiKey?.() ?? undefined;
      const nextClientId = options.getClientId?.();
      const nextUserState = options.getUserState?.();
      const existing = manager.get(threadId);
      if (existing) {
        existing.app = nextApp;
        existing.publicKey = nextPublicKey;
        existing.apiKey = nextApiKey;
        existing.clientId = nextClientId ?? existing.clientId;
        if (nextUserState) existing.resolveUserState(nextUserState);
        return existing;
      }

      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        publicKey: nextPublicKey,
        apiKey: nextApiKey,
        clientId: nextClientId,
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
          options.onPendingRequestsChange?.(requests),
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
          options.onEvent?.({ type, payload, sessionId: threadId });
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
        // Update user state before fetching
        const userState = options.getUserState?.();
        if (userState) session.resolveUserState(userState);
        await session.fetchCurrentState();
        options.onPendingRequestsChange?.(session.getPendingRequests());

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
      const session = getSession(threadId);
      const userState = options.getUserState?.();
      if (userState) session.resolveUserState(userState);

      // Add user message to thread immediately
      const existingMessages = threadContextRef.current.getThreadMessages(threadId);
      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
      };
      threadContextRef.current.setThreadMessages(threadId, [
        ...existingMessages,
        userMessage,
      ]);
      threadContextRef.current.updateThreadMetadata(threadId, {
        lastActiveAt: new Date().toISOString(),
      });

      await session.sendAsync(text);
      options.onPendingRequestsChange?.(session.getPendingRequests());
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
