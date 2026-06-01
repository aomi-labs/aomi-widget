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
import { useUser } from "../contexts/ext-user-context";
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
  setUser: (data: Partial<UserState>) => void;
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

function normalizeWalletId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.startsWith("0x") ? value.toLowerCase() : value;
}

function getConnectedWalletId(userState: UserState): string | undefined {
  return (
    UserStateHelpers.address(userState) ??
    UserStateHelpers.svmAddress(userState)
  );
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
      connection: {
        is_connected: UserStateHelpers.isConnected(nextUser) ?? false,
        primary_family: nextUser.connection?.primary_family,
        provider: UserStateHelpers.walletProvider(nextUser) ?? undefined,
        wallet_provider_subject:
          UserStateHelpers.walletProviderSubject(nextUser) ?? undefined,
        auth_method: UserStateHelpers.authMethod(nextUser) ?? undefined,
        auth_value: UserStateHelpers.authValue(nextUser) ?? undefined,
        auth_verified_at:
          UserStateHelpers.authVerifiedAt(nextUser) ?? undefined,
      },
      evm: {
        address: UserStateHelpers.address(nextUser),
        chain_id: UserStateHelpers.chainId(nextUser),
        ens_name:
          typeof nextUser.evm?.ens_name === "string"
            ? nextUser.evm.ens_name
            : undefined,
        aa: {
          mode: UserStateHelpers.aaMode(nextUser) ?? undefined,
          smart_account:
            UserStateHelpers.SmartAccount4337(nextUser) ?? undefined,
          delegation_7702:
            UserStateHelpers.Delegation7702(nextUser) ?? undefined,
        },
        sponsorship: {
          sponsored: UserStateHelpers.sponsored(nextUser) ?? undefined,
          sponsor_provider:
            UserStateHelpers.sponsorProvider(nextUser) ?? undefined,
          sponsor_account:
            UserStateHelpers.sponsorAccount(nextUser) ?? undefined,
        },
      },
      svm: {
        address: UserStateHelpers.svmAddress(nextUser),
      },
    }),
    [getUserState],
  );

  const lastWalletStateRef = useRef(walletSnapshot(getUserState()));

  useEffect(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());

    const unsubscribe = onUserStateChange(async (newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      const previousAddress = normalizeWalletId(prevWalletState.evm?.address);
      const nextAddress = normalizeWalletId(nextWalletState.evm?.address);
      if (
        stableStateString(prevWalletState as UserState) ===
          stableStateString(nextWalletState as UserState)
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
  const connectedAddress = UserStateHelpers.isConnected(user)
    ? getConnectedWalletId(user)
    : undefined;

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
    const userAddress = connectedAddress;
    const normalizedUserAddress = normalizeWalletId(userAddress);
    const previousAddress = lastConnectedAddressRef.current;
    const walletChanged =
      previousAddress !== undefined &&
      normalizedUserAddress !== undefined &&
      previousAddress !== normalizedUserAddress;

    if (!userAddress) {
      // Only tear down sessions when the user *actually disconnected* a
      // previously-connected wallet.  When the user was never connected (e.g.
      // anonymous chat), Para/wagmi fires multiple identity state changes
      // during initialization that all land here with no address — those must
      // not wipe the active session or reset the thread, otherwise the
      // assistant response disappears mid-flight.
      const wasPreviouslyConnected = lastConnectedAddressRef.current !== undefined;
      lastConnectedAddressRef.current = undefined;
      setIsThreadListLoading(false);
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;

      if (wasPreviouslyConnected) {
        const hadRemoteThreads = remoteThreadIdsRef.current.size > 0;
        const hadSessions = sessionManager.size > 0;
        remoteThreadIdsRef.current.clear();
        warmedThreadIdsRef.current.clear();
        warmPromisesRef.current.clear();
        closeAllSessions();
        if (hadRemoteThreads || hadSessions) {
          threadContextRef.current.resetToDefault();
        }
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
        await aomiClientRef.current.ensureAccount(controlSessionId, userAddress);
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
    connectedAddress,
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
  setUser,
  onUserStateChange,
}: RuntimeUserStateProviderProps) {
  const lastSerializedStateRef = useRef<string>("");

  // Bidirectional sync between React's `useUser()` state and each Session's
  // internal `userState`:
  //
  //   React → Session: when React state changes, call session.resolveUserState
  //                    with `skipEmit: true` so the session doesn't re-emit
  //                    what we just pushed (would loop back into setUser).
  //
  //   Session → React: when a session writes per-tx fields (aa_mode,
  //                    smart_account_4337, etc.) via its own resolveUserState,
  //                    it emits `user_state_updated`. We forward those changes
  //                    to React via setUser so consumers reading `useUser()`
  //                    (e.g. auth-adapter providers) reflect the resolved AA
  //                    context after a tx.
  useEffect(() => {
    const applyToSessions = (next: UserState) => {
      const serialized = stableStateString(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      sessionManager.forEach((session) => {
        session.resolveUserState(next, { skipEmit: true });
      });
    };

    const sessionListeners: Array<() => void> = [];
    sessionManager.forEach((session) => {
      const handler = (next: UserState) => {
        setUser(next);
      };
      session.on("user_state_updated", handler);
      sessionListeners.push(() =>
        session.off("user_state_updated", handler),
      );
    });

    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return () => {
      unsubscribe();
      sessionListeners.forEach((off) => off());
    };
  }, [getUserState, onUserStateChange, sessionManager, setUser]);

  return <>{children}</>;
}
