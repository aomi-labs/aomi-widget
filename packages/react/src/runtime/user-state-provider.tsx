"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { AomiClient, UserState } from "@aomi-labs/client";
import { UserState as UserStateHelpers } from "@aomi-labs/client";

import {
  useControl,
  type ControlState,
} from "../contexts/control-context";
import { useEventContext } from "../contexts/event-context";
import type { ThreadContext } from "../contexts/thread-context";
import { useThreadContext } from "../contexts/thread-context";
import { useUser } from "../contexts/user-context";
import { initThreadControl } from "../state/thread-store";
import { getControlSessionId } from "../utils/client-session";
import { isPlaceholderTitle } from "./utils";
import { SessionManager } from "./session-manager";

const THREAD_PREFETCH_LIMIT = 5;
const PREFETCH_IDLE_TIMEOUT_MS = 1500;

type GlobalWithIdleCallback = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleBackgroundTask(task: () => void): () => void {
  const runtimeGlobal = globalThis as GlobalWithIdleCallback;

  if (typeof runtimeGlobal.requestIdleCallback === "function") {
    const idleId = runtimeGlobal.requestIdleCallback(task, {
      timeout: PREFETCH_IDLE_TIMEOUT_MS,
    });
    return () => runtimeGlobal.cancelIdleCallback?.(idleId);
  }

  const timeoutId = runtimeGlobal.setTimeout(task, 0);
  return () => runtimeGlobal.clearTimeout(timeoutId);
}

type RuntimeUserStateProviderProps = {
  children: ReactNode;
  sessionManager: SessionManager;
  getUserState: () => UserState;
  onUserStateChange: (callback: (user: UserState) => void) => () => void;
};

type RuntimeSessionBridge = {
  aomiClientRef: MutableRefObject<AomiClient>;
  sessionManager: SessionManager;
  getSession: (threadId: string) => { getUserState(): UserState | undefined };
  closeAllSessions: () => void;
  ensureInitialState: (threadId: string) => Promise<void>;
  setIsThreadLoading: (loading: boolean) => void;
};

type RemoteThreadRegistry = {
  remoteThreadIdsRef: MutableRefObject<Set<string>>;
  warmPromisesRef: MutableRefObject<Map<string, Promise<void>>>;
  warmedThreadIdsRef: MutableRefObject<Set<string>>;
  warmThread: (threadId: string) => Promise<void>;
};

type RuntimeUserStateEffectsOptions = {
  sessions: RuntimeSessionBridge;
  remoteThreads: RemoteThreadRegistry;
};

type RuntimeUserStateContext = {
  getControlState: () => ControlState;
  getUserState: () => UserState;
  onUserStateChange: (callback: (user: UserState) => void) => () => void;
  threadContextRef: MutableRefObject<ThreadContext>;
  user: UserState;
};

function stableStateString(state: UserState): string {
  return JSON.stringify(state ?? {});
}

function useWalletStateSync(
  context: Pick<
    RuntimeUserStateContext,
    "getUserState" | "onUserStateChange" | "threadContextRef"
  >,
  sessions: Pick<RuntimeSessionBridge, "aomiClientRef">,
  remoteThreads: Pick<RemoteThreadRegistry, "remoteThreadIdsRef">,
) {
  const { getUserState, onUserStateChange, threadContextRef } = context;
  const { aomiClientRef } = sessions;
  const { remoteThreadIdsRef } = remoteThreads;

  const walletSnapshot = useCallback(
    (nextUser: ReturnType<typeof getUserState>) => ({
      address: UserStateHelpers.address(nextUser),
      chain_id: UserStateHelpers.chainId(nextUser),
      is_connected: UserStateHelpers.isConnected(nextUser) ?? false,
      ens_name:
        typeof nextUser.ens_name === "string" ? nextUser.ens_name : undefined,
    }),
    [getUserState],
  );

  const lastWalletStateRef = useRef(walletSnapshot(getUserState()));

  useEffect(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());

    const unsubscribe = onUserStateChange(async (newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      const previousAddress = prevWalletState.address?.toLowerCase();
      const nextAddress = nextWalletState.address?.toLowerCase();
      if (
        prevWalletState.address === nextWalletState.address &&
        prevWalletState.chain_id === nextWalletState.chain_id &&
        prevWalletState.is_connected === nextWalletState.is_connected &&
        prevWalletState.ens_name === nextWalletState.ens_name
      ) {
        return;
      }

      lastWalletStateRef.current = nextWalletState;
      if (
        previousAddress !== undefined &&
        nextAddress !== undefined &&
        previousAddress !== nextAddress
      ) {
        return;
      }

      const sessionId = threadContextRef.current.currentThreadId;
      if (!remoteThreadIdsRef.current.has(sessionId)) {
        return;
      }

      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState,
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message);
    });

    return unsubscribe;
  }, [
    aomiClientRef,
    getUserState,
    onUserStateChange,
    remoteThreadIdsRef,
    threadContextRef,
    walletSnapshot,
  ]);
}

function useUserStateRequestResponder(
  context: Pick<
    RuntimeUserStateContext,
    "getUserState" | "threadContextRef"
  >,
  sessions: Pick<RuntimeSessionBridge, "getSession">,
) {
  const eventContext = useEventContext();
  const { getUserState, threadContextRef } = context;
  const { getSession } = sessions;

  useEffect(() => {
    const unsubscribe = eventContext.subscribe("user_state_request", () => {
      const sessionId = threadContextRef.current.currentThreadId;
      const session = getSession(sessionId);
      const payload =
        UserStateHelpers.reconcile(session.getUserState(), getUserState()) ??
        session.getUserState() ??
        getUserState();
      eventContext.sendOutboundSystem({
        type: "user_state_response",
        sessionId,
        payload,
      });
    });
    return unsubscribe;
  }, [eventContext, getSession, getUserState, threadContextRef]);
}

function useRemoteThreadListSync(
  context: RuntimeUserStateContext,
  sessions: RuntimeSessionBridge,
  remoteThreads: RemoteThreadRegistry,
): { isThreadListLoading: boolean } {
  const [isThreadListLoading, setIsThreadListLoading] = useState(true);
  const prefetchCancelRef = useRef<(() => void) | null>(null);
  const lastConnectedAddressRef = useRef<string | undefined>(undefined);
  const {
    getControlState,
    threadContextRef,
    user,
  } = context;
  const {
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    sessionManager,
    setIsThreadLoading,
  } = sessions;
  const {
    remoteThreadIdsRef,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread,
  } = remoteThreads;

  const scheduleThreadPrefetch = useCallback(
    (threadIds: string[]) => {
      prefetchCancelRef.current?.();

      const prefetchThreadIds = Array.from(new Set(threadIds))
        .filter((threadId) => remoteThreadIdsRef.current.has(threadId))
        .slice(0, THREAD_PREFETCH_LIMIT);

      if (prefetchThreadIds.length === 0) {
        prefetchCancelRef.current = null;
        return;
      }

      let cancelled = false;
      const cancelScheduledTask = scheduleBackgroundTask(() => {
        void Promise.all(
          prefetchThreadIds.map(async (threadId) => {
            if (cancelled || !remoteThreadIdsRef.current.has(threadId)) return;
            if (
              threadContextRef.current.getThreadMessages(threadId).length > 0
            ) {
              return;
            }

            try {
              await warmThread(threadId);
              if (cancelled || !remoteThreadIdsRef.current.has(threadId)) {
                return;
              }
              await ensureInitialState(threadId);
            } catch (error) {
              console.debug("Failed to prefetch thread:", threadId, error);
            }
          }),
        );
      });

      prefetchCancelRef.current = () => {
        cancelled = true;
        cancelScheduledTask();
      };
    },
    [ensureInitialState, remoteThreadIdsRef, threadContextRef, warmThread],
  );

  useEffect(() => {
    const userAddress = UserStateHelpers.isConnected(user)
      ? UserStateHelpers.address(user)
      : undefined;
    const normalizedUserAddress = userAddress?.toLowerCase();
    const previousAddress = lastConnectedAddressRef.current;
    const walletChanged =
      previousAddress !== undefined &&
      normalizedUserAddress !== undefined &&
      previousAddress !== normalizedUserAddress;

    if (!userAddress) {
      lastConnectedAddressRef.current = undefined;
      const hadRemoteThreads = remoteThreadIdsRef.current.size > 0;
      const hadSessions = sessionManager.size > 0;
      setIsThreadListLoading(false);
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;
      remoteThreadIdsRef.current.clear();
      warmedThreadIdsRef.current.clear();
      warmPromisesRef.current.clear();
      closeAllSessions();
      if (hadRemoteThreads || hadSessions) {
        threadContextRef.current.resetToDefault();
      }
      return;
    }

    lastConnectedAddressRef.current = normalizedUserAddress;

    const resetThreadId = walletChanged
      ? threadContextRef.current.resetToDefault()
      : undefined;

    if (walletChanged) {
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;
      remoteThreadIdsRef.current.clear();
      warmedThreadIdsRef.current.clear();
      warmPromisesRef.current.clear();
      closeAllSessions();
    }

    let cancelled = false;
    setIsThreadListLoading(true);

    const fetchThreadList = async () => {
      try {
        const remoteThreadIdsAtFetchStart = new Set(remoteThreadIdsRef.current);
        const currentContext = threadContextRef.current;
        const controlSessionId = getControlSessionId(
          getControlState().clientId,
          resetThreadId ?? currentContext.currentThreadId,
        );
        const threadList = await aomiClientRef.current.listThreads(
          controlSessionId,
          userAddress,
        );
        if (cancelled) return;

        const remoteThreadIds = new Set<string>();
        const newMetadata =
          resetThreadId !== undefined
            ? new Map(
                (() => {
                  const resetMetadata =
                    threadContextRef.current.getThreadMetadata(resetThreadId);
                  return resetMetadata
                    ? ([[resetThreadId, resetMetadata]] as const)
                    : [];
                })(),
              )
            : new Map(currentContext.allThreadsMetadata);
        const baseThreadCount =
          resetThreadId !== undefined ? 1 : currentContext.threadCnt;
        let maxChatNum = baseThreadCount;

        for (const thread of threadList) {
          remoteThreadIds.add(thread.session_id);
          const rawTitle = thread.title ?? "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            newMetadata.get(thread.session_id)?.lastActiveAt ||
            new Date().toISOString();
          const existingControl = newMetadata.get(thread.session_id)?.control;
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
            control: existingControl ?? initThreadControl(),
          });

          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }

        for (const threadId of remoteThreadIdsRef.current) {
          if (!remoteThreadIdsAtFetchStart.has(threadId)) {
            remoteThreadIds.add(threadId);
          }
        }

        remoteThreadIdsRef.current = remoteThreadIds;
        warmedThreadIdsRef.current = new Set(
          Array.from(warmedThreadIdsRef.current).filter((threadId) =>
            remoteThreadIds.has(threadId),
          ),
        );
        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > baseThreadCount) {
          currentContext.setThreadCnt(maxChatNum);
        }

        scheduleThreadPrefetch(threadList.map((thread) => thread.session_id));

        const activeThreadId = threadContextRef.current.currentThreadId;
        if (remoteThreadIds.has(activeThreadId)) {
          setIsThreadLoading(true);
          try {
            await warmThread(activeThreadId);
            if (!cancelled) {
              await ensureInitialState(activeThreadId);
            }
          } finally {
            if (!cancelled) {
              setIsThreadLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      } finally {
        if (!cancelled) {
          setIsThreadListLoading(false);
        }
      }
    };

    void fetchThreadList();

    return () => {
      cancelled = true;
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;
    };
  }, [
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    getControlState,
    remoteThreadIdsRef,
    scheduleThreadPrefetch,
    sessionManager,
    setIsThreadLoading,
    threadContextRef,
    user,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread,
  ]);

  return { isThreadListLoading };
}

export function useRuntimeUserStateEffects({
  sessions: {
    aomiClientRef,
    sessionManager,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading,
  },
  remoteThreads,
}: RuntimeUserStateEffectsOptions): { isThreadListLoading: boolean } {
  const threadContext = useThreadContext();
  const { user, getUserState, onUserStateChange } = useUser();
  const { getControlState } = useControl();
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const context: RuntimeUserStateContext = {
    getControlState,
    getUserState,
    onUserStateChange,
    threadContextRef,
    user,
  };
  const sessions: RuntimeSessionBridge = {
    aomiClientRef,
    sessionManager,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading,
  };

  useWalletStateSync(context, sessions, remoteThreads);
  useUserStateRequestResponder(context, sessions);
  return useRemoteThreadListSync(context, sessions, remoteThreads);
}

export function RuntimeUserStateProvider({
  children,
  sessionManager,
  getUserState,
  onUserStateChange,
}: RuntimeUserStateProviderProps) {
  const lastSerializedStateRef = useRef<string>("");

  useEffect(() => {
    const applyToSessions = (next: UserState) => {
      const serialized = stableStateString(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      sessionManager.forEach((session) => {
        session.resolveUserState(next);
      });
    };

    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return unsubscribe;
  }, [getUserState, onUserStateChange, sessionManager]);

  return <>{children}</>;
}
