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

import { useControl, type ControlState } from "../contexts/control-context";
import { useEventContext } from "../contexts/event-context";
import type { ThreadContext } from "../contexts/thread-context";
import { useThreadContext } from "../contexts/thread-context";
import { useUser } from "../contexts/ext-user-context";
import { initThreadControl } from "../state/thread-store";
import { getControlSessionId } from "../utils/client-session";
import { isPlaceholderTitle, toInboundMessage } from "./utils";
import type { ThreadRegistry } from "./thread-registry";

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
  registry: ThreadRegistry;
  getUserState: () => UserState;
  setUser: (data: Partial<UserState>) => void;
  onUserStateChange: (callback: (user: UserState) => void) => () => void;
};

type RuntimeUserStateEffectsOptions = {
  registry: ThreadRegistry;
  aomiClientRef: MutableRefObject<AomiClient>;
  getSession: (threadId: string) => { getUserState(): UserState | undefined };
  closeAllSessions: () => void;
  ensureInitialState: (threadId: string) => Promise<void>;
  setIsThreadLoading: (loading: boolean) => void;
};

type RuntimeUserStateContext = {
  getControlState: () => ControlState;
  getCurrentThreadApp: () => string;
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

function getLegacySessionPublicKey(userState: UserState): string | undefined {
  const address = UserStateHelpers.address(userState);
  if (!address?.startsWith("0x")) {
    return undefined;
  }
  if (
    UserStateHelpers.chainId(userState) === undefined &&
    !userState.evm?.address
  ) {
    return undefined;
  }
  return address;
}

function useWalletStateSync(
  context: Pick<
    RuntimeUserStateContext,
    | "getCurrentThreadApp"
    | "getUserState"
    | "onUserStateChange"
    | "threadContextRef"
  >,
  aomiClientRef: MutableRefObject<AomiClient>,
  registry: ThreadRegistry,
) {
  const {
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    threadContextRef,
  } = context;

  const walletSnapshot = useCallback(
    (nextUser: ReturnType<typeof getUserState>) => ({
      connection: {
        is_connected: UserStateHelpers.isConnected(nextUser) ?? false,
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
        cluster: nextUser.svm?.cluster,
        wallet_name: nextUser.svm?.wallet_name,
        transport: nextUser.svm?.transport,
        capabilities: nextUser.svm?.capabilities,
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
      if (!registry.remoteThreads.has(sessionId)) {
        return;
      }

      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState,
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message, {
        app: getCurrentThreadApp(),
      });
    });

    return unsubscribe;
  }, [
    aomiClientRef,
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    registry,
    threadContextRef,
    walletSnapshot,
  ]);
}

function useUserStateRequestResponder(
  context: Pick<RuntimeUserStateContext, "getUserState" | "threadContextRef">,
  getSession: (threadId: string) => { getUserState(): UserState | undefined },
) {
  const eventContext = useEventContext();
  const { getUserState, threadContextRef } = context;

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
  options: Omit<RuntimeUserStateEffectsOptions, "getSession">,
): { isThreadListLoading: boolean } {
  const [isThreadListLoading, setIsThreadListLoading] = useState(true);
  const prefetchCancelRef = useRef<(() => void) | null>(null);
  const lastConnectedAddressRef = useRef<string | undefined>(undefined);
  const { getControlState, getUserState, threadContextRef, user } = context;
  const {
    registry,
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading,
  } = options;
  const connectedAddress = UserStateHelpers.isConnected(user)
    ? getLegacySessionPublicKey(user)
    : undefined;

  // Prefetch behavior is intentionally minimal in this pass: the prior version
  // (warm-only, no state fetch) had no observable effect — warmThread became
  // dead code after the registry refactor. A real prefetch (populate
  // ThreadContext with messages without creating a session) needs more care
  // around the cache-hit code path so it doesn't strand pending wallet
  // requests, and is tracked as a follow-up rather than bundled here.
  const scheduleThreadPrefetch = useCallback((_threadIds: string[]) => {
    prefetchCancelRef.current?.();
    prefetchCancelRef.current = null;
  }, []);

  useEffect(() => {
    const userAddress = connectedAddress;
    const normalizedUserAddress = normalizeWalletId(userAddress);
    const previousAddress = lastConnectedAddressRef.current;
    const isConnected = UserStateHelpers.isConnected(user) === true;
    const walletChanged =
      previousAddress !== undefined &&
      normalizedUserAddress !== undefined &&
      previousAddress !== normalizedUserAddress;

    if (!userAddress) {
      // Solana-only or family-focused states may not expose an EVM address.
      // Keep the active chat/session visible; wallet context is carried
      // through user_state and the wallet-context API.
      if (isConnected) {
        lastConnectedAddressRef.current = undefined;
        setIsThreadListLoading(false);
        return;
      }

      // Only tear down sessions when the user actually disconnected every
      // wallet. Para/wagmi can emit transient identity changes with no EVM
      // address while a Solana wallet remains connected; those must not reset
      // the active thread.
      const wasPreviouslyConnected =
        lastConnectedAddressRef.current !== undefined;
      lastConnectedAddressRef.current = undefined;
      setIsThreadListLoading(false);
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;

      if (wasPreviouslyConnected) {
        const hadRemoteThreads = registry.remoteThreads.size > 0;
        const hadSessions = registry.sessionManager.size > 0;
        registry.reset();
        if (hadRemoteThreads || hadSessions) {
          threadContextRef.current.resetToDefault();
        }
      }
      return;
    }

    lastConnectedAddressRef.current = normalizedUserAddress;

    if (walletChanged) {
      prefetchCancelRef.current?.();
      prefetchCancelRef.current = null;
      registry.reset();
    }

    let cancelled = false;
    setIsThreadListLoading(true);

    const fetchThreadList = async () => {
      try {
        const remoteThreadIdsAtFetchStart = new Set(registry.remoteThreads);
        const currentContext = threadContextRef.current;
        const controlSessionId = getControlSessionId(
          getControlState().clientId,
          currentContext.currentThreadId,
        );
        const threadList =
          await aomiClientRef.current.listThreads(controlSessionId);
        if (cancelled) return;

        const remoteThreadIds = new Set<string>();
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        const baseThreadCount = currentContext.threadCnt;
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

        for (const threadId of registry.remoteThreads) {
          if (!remoteThreadIdsAtFetchStart.has(threadId)) {
            remoteThreadIds.add(threadId);
          }
        }

        // Replace the registry's remote-thread set in place: clear and
        // re-add (preserves the reference identity used by callers).
        registry.remoteThreads.clear();
        for (const id of remoteThreadIds) registry.remoteThreads.add(id);

        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > baseThreadCount) {
          currentContext.setThreadCnt(maxChatNum);
        }

        scheduleThreadPrefetch(threadList.map((thread) => thread.session_id));

        const activeThreadId = threadContextRef.current.currentThreadId;
        if (remoteThreadIds.has(activeThreadId)) {
          setIsThreadLoading(true);
          try {
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
    ensureInitialState,
    getControlState,
    registry,
    scheduleThreadPrefetch,
    setIsThreadLoading,
    threadContextRef,
    connectedAddress,
  ]);

  return { isThreadListLoading };
}

export function useRuntimeUserStateEffects(
  options: RuntimeUserStateEffectsOptions,
): { isThreadListLoading: boolean } {
  const { registry, aomiClientRef, getSession } = options;
  const threadContext = useThreadContext();
  const { user, getUserState, onUserStateChange } = useUser();
  const { getControlState, getCurrentThreadApp } = useControl();
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const context: RuntimeUserStateContext = {
    getControlState,
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    threadContextRef,
    user,
  };

  useWalletStateSync(context, aomiClientRef, registry);
  useUserStateRequestResponder(context, getSession);
  return useRemoteThreadListSync(context, options);
}

export function RuntimeUserStateProvider({
  children,
  registry,
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
      registry.sessionManager.forEach((session) => {
        session.resolveUserState(next, { skipEmit: true });
      });
    };

    const sessionListeners: Array<() => void> = [];
    registry.sessionManager.forEach((session) => {
      const handler = (next: UserState) => {
        setUser(next);
      };
      session.on("user_state_updated", handler);
      sessionListeners.push(() => session.off("user_state_updated", handler));
    });

    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return () => {
      unsubscribe();
      sessionListeners.forEach((off) => off());
    };
  }, [getUserState, onUserStateChange, registry, setUser]);

  return <>{children}</>;
}
