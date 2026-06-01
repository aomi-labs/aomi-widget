"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { UserState } from "@aomi-labs/client";

export { UserState } from "@aomi-labs/client";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function mergeRecords(previous: UnknownRecord, incoming: UnknownRecord): UnknownRecord {
  const next: UnknownRecord = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    const prevRecord = asRecord(next[key]);
    const incomingRecord = asRecord(value);
    if (prevRecord && incomingRecord) {
      next[key] = mergeRecords(prevRecord, incomingRecord);
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function dropWalletBlocks(state: UserState): UserState {
  return UserState.normalize({
    connection: { is_connected: false },
    ext: state.ext,
    preferences: state.preferences,
  }) ?? { connection: { is_connected: false } };
}

function dropAddressScopedState(state: UserState): UserState {
  const evm = asRecord(state.evm);
  const nextEvm = evm ? { ...evm } : undefined;
  if (nextEvm) {
    delete nextEvm.aa;
    delete nextEvm.ens_name;
  }

  const next: UserState = { ...state };
  if (nextEvm && Object.keys(nextEvm).length > 0) {
    next.evm = nextEvm;
  } else {
    delete next.evm;
  }
  delete next.pending;
  return UserState.normalize(next) ?? {};
}

type UserContextValue = {
  user: UserState;
  setUser: (data: Partial<UserState>) => void;
  addExtValue: (key: string, value: unknown) => void;
  removeExtValue: (key: string) => void;
  getUserState: () => UserState;
  onUserStateChange: (callback: (user: UserState) => void) => () => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within ExtUserProvider");
  }
  // Return only the public API
  return {
    user: context.user,
    setUser: context.setUser,
    addExtValue: context.addExtValue,
    removeExtValue: context.removeExtValue,
    getUserState: context.getUserState,
    onUserStateChange: context.onUserStateChange,
  };
}

// ==================== Provider ====================

/**
 * Idempotent provider: if a parent already provided `UserContext`, render
 * children straight through. Otherwise mount a fresh store.
 *
 * The widget layers (`AomiFrame.Root` / `AomiRuntime`) and the auth-adapter
 * layers (`AomiParaProvider` / `AomiBaseAccountProvider`) both want to be
 * usable standalone. Each historically wrapped with `<ExtUserProvider>` —
 * but when they nest, the inner provider created a *second* store that
 * shadowed the outer. The chat composer would read from one store while
 * `AomiAuthAdapterSync` wrote to another, so wallet connects never
 * propagated to the chat's `user_state`. Collapsing nested mounts to the
 * outermost store fixes that without forcing host apps to wire the
 * provider themselves.
 */
export function ExtUserProvider({ children }: { children: ReactNode }) {
  const parent = useContext(UserContext);
  if (parent) {
    return <>{children}</>;
  }
  return <ExtUserProviderImpl>{children}</ExtUserProviderImpl>;
}

function ExtUserProviderImpl({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserState>({
    connection: { is_connected: false },
  });

  // Refs for stable getter functions
  const userRef = useRef(user);
  userRef.current = user;

  // Store callbacks in a ref
  const StateChangeCallbacks = useRef<Set<(user: UserState) => void>>(
    new Set(),
  );

  const notifyStateChange = useCallback((next: UserState) => {
    queueMicrotask(() => {
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
    });
  }, []);

  const setUser = useCallback((data: Partial<UserState>) => {
    setUserState((prev) => {
      const normalizedData = UserState.normalize(data) ?? {};
      const merged = UserState.normalize(
        mergeRecords(
          UserState.normalize(prev) ?? {},
          normalizedData,
        ) as UserState,
      ) ?? prev;

      // Wallet-context fields belong to a specific connected session. On
      // disconnect we wipe them all so that the next connection cannot
      // inherit stale identity (address, AA mode, sponsor metadata, etc.)
      // from the previous wallet. AomiAuthAdapterUserSync deliberately
      // does not forward per-tx AA fields, so without this clear they
      // would survive across wallet switches.
      let next: UserState;
      if (UserState.isConnected(normalizedData) === false) {
        next = dropWalletBlocks(merged);
      } else {
        // Address change while staying connected (wallet switch in place):
        // per-tx AA outputs and pending request maps belong to the prior
        // address — drop them so the new wallet starts with a clean slate.
        const prevAddress = UserState.address(prev);
        const nextAddress = UserState.address(merged);
        const addressChanged =
          prevAddress !== undefined &&
          nextAddress !== undefined &&
          prevAddress.toLowerCase() !== nextAddress.toLowerCase();
        next = addressChanged ? dropAddressScopedState(merged) : merged;
      }
      notifyStateChange(next);

      return next;
    });
  }, [notifyStateChange]);

  const addExtValue = useCallback((key: string, value: unknown) => {
    setUserState((prev) => {
      const next = UserState.withExt(prev, key, value);
      notifyStateChange(next);
      return next;
    });
  }, [notifyStateChange]);

  const removeExtValue = useCallback((key: string) => {
    setUserState((prev) => {
      const ext = prev.ext;
      if (
        typeof ext !== "object" ||
        ext === null ||
        Array.isArray(ext) ||
        !(key in ext)
      ) {
        return prev;
      }
      const nextExt = { ...(ext as Record<string, unknown>) };
      delete nextExt[key];
      const next: UserState = {
        ...prev,
        ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
      };
      notifyStateChange(next);
      return next;
    });
  }, [notifyStateChange]);

  // Stable getters that runtime classes can call
  const getUserState = useCallback(() => userRef.current, []);

  // Subscribe to user state changes
  const onUserStateChange = useCallback(
    (callback: (user: UserState) => void) => {
      StateChangeCallbacks.current.add(callback);

      // Return unsubscribe function
      return () => {
        StateChangeCallbacks.current.delete(callback);
      };
    },
    [],
  );

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        addExtValue,
        removeExtValue,
        getUserState,
        onUserStateChange,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
