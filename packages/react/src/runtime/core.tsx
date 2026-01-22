"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import type { BackendApi } from "../backend/client";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/user-context";
import { useThreadContext } from "../contexts/thread-context";
import { useRuntimeOrchestrator } from "./orchestrator";
import {
  findTempIdForBackendId,
  isThreadRunning,
  isThreadReady,
  resolveThreadId,
} from "../state/backend-state";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import { buildThreadListAdapter } from "./threadlist-adapter";

// =============================================================================
// Core Props
// =============================================================================

export type AomiRuntimeCoreProps = {
  children: ReactNode;
  backendApi: BackendApi;
};

// =============================================================================
// Core Component
// =============================================================================

export function AomiRuntimeCore({
  children,
  backendApi,
}: Readonly<AomiRuntimeCoreProps>) {
  const threadContext = useThreadContext();
  const { dispatchInboundSystem: dispatchSystemEvents } = useEventContext();
  const { user, onUserStateChange, getUserState } = useUser();

  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendApi, {
    onSystemEvents: dispatchSystemEvents,
    getPublicKey: () => getUserState().address,
  });

  // ---------------------------------------------------------------------------
  // Send wallet state changes to backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onUserStateChange(async (newUser) => {
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: newUser.address,
          chainId: newUser.chainId,
          isConnected: newUser.isConnected,
          ensName: newUser.ensName,
        },
      });
      await backendApiRef.current.postSystemMessage(sessionId, message);
    });

    return unsubscribe;
  }, [onUserStateChange, backendApiRef, threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // Refs for stable access
  // ---------------------------------------------------------------------------
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // Initial state fetch on thread change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);

  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    setIsRunning(isThreadRunning(backendStateRef.current, threadId));
  }, [backendStateRef, setIsRunning, threadContext.currentThreadId]);

  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId,
  );

  // ---------------------------------------------------------------------------
  // Fetch thread list when user connects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const userAddress = user.address;
    if (!userAddress) return;

    const fetchThreadList = async () => {
      try {
        const threadList =
          await backendApiRef.current.fetchThreads(userAddress);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;

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

          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }

        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > currentContext.threadCnt) {
          currentContext.setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void fetchThreadList();
  }, [user.address, backendApiRef]);

  // ---------------------------------------------------------------------------
  // Thread list adapter
  // ---------------------------------------------------------------------------
  const threadListAdapter = useMemo(
    () =>
      buildThreadListAdapter({
        backendStateRef,
        backendApiRef,
        threadContext,
        currentThreadIdRef,
        polling,
        userAddress: user.address,
        setIsRunning,
      }),
    [
      backendApiRef,
      polling,
      user.address,
      backendStateRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
    ],
  );

  // ---------------------------------------------------------------------------
  // SSE subscription for title changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const currentSessionId = threadContext.currentThreadId;
    const unsubscribe = backendApiRef.current.subscribeSSE(
      currentSessionId,
      (event) => {
        const eventType = event.type as string;
        const sessionId = event.session_id;

        if (eventType === "title_changed") {
          const newTitle = event.new_title as string;
          const backendState = backendStateRef.current;
          const targetThreadId =
            findTempIdForBackendId(backendState, sessionId) ??
            resolveThreadId(backendState, sessionId);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          threadContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(targetThreadId);
            const nextStatus =
              existing?.status === "archived" ? "archived" : "regular";
            next.set(targetThreadId, {
              title: normalizedTitle,
              status: nextStatus,
              lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
            });
            return next;
          });
          if (
            !isPlaceholderTitle(newTitle) &&
            backendState.creatingThreadId === targetThreadId
          ) {
            backendState.creatingThreadId = null;
          }
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [
    backendApiRef,
    backendStateRef,
    threadContext,
    threadContext.currentThreadId,
  ]);

  // ---------------------------------------------------------------------------
  // Flush pending chat when thread becomes ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // External store runtime
  // ---------------------------------------------------------------------------
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) =>
      threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message: AppendMessage) =>
      messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  // ---------------------------------------------------------------------------
  // Cleanup polling on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
