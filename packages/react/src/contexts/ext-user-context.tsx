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

function mergeRecords(
  previous: UnknownRecord,
  incoming: UnknownRecord,
): UnknownRecord {
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

/**
 * Merge an incoming `evm` array into the previous one with primary-patch
 * semantics. `setUser` callers (the wallet adapter, per-tx session writebacks)
 * describe the single operating wallet, often as a partial (just `chain_id`, or
 * AA fields) — and `mergeRecords` treats the array as opaque and *replaces* it,
 * dropping the prior address. So we patch the primary entry instead, mirroring
 * the pre-array single-object deep-merge: a same/absent-address update merges
 * onto the primary; a new address is a wallet switch that replaces it. A
 * multi-entry incoming array is an authoritative list and replaces wholesale.
 */
function mergeEvmIntoPrimary(
  previous: UnknownRecord[],
  incoming: UnknownRecord[],
): UnknownRecord[] {
  if (incoming.length === 0) return previous;
  if (incoming.length > 1) return incoming;

  const prevPrimary = previous[0];
  const incomingPrimary = incoming[0];
  if (!prevPrimary) return incoming;

  // Always deep-merge onto the primary — even on an address switch the new
  // address just overwrites the old one while identity-static fields (chain_id,
  // …) carry over. Per-address state (AA outputs, ENS) is dropped separately by
  // `dropAddressScopedState` once `setUser` detects the address changed.
  return [mergeRecords(prevPrimary, incomingPrimary), ...previous.slice(1)];
}

function dropWalletBlocks(state: UserState): UserState {
  return (
    UserState.normalize({
      connection: { is_connected: false },
      pending: state.pending,
      ext: state.ext,
      preferences: state.preferences,
    }) ?? { connection: { is_connected: false } }
  );
}

function dropAddressScopedState(state: UserState): UserState {
  // `evm` is the per-chain array; drop the per-address fields (AA outputs, ENS)
  // from each entry while keeping the operating addresses themselves.
  const nextEvm = Array.isArray(state.evm)
    ? state.evm.map((wallet) => {
        const next = { ...wallet };
        delete next.aa;
        delete next.ens_name;
        return next;
      })
    : undefined;

  const next: UserState = { ...state };
  if (nextEvm && nextEvm.length > 0) {
    next.evm = nextEvm;
  } else {
    delete next.evm;
  }
  return UserState.normalize(next) ?? {};
}

function stableStateString(state: UserState): string {
  return JSON.stringify(UserState.normalize(state) ?? {});
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

  const setUser = useCallback(
    (data: Partial<UserState>) => {
      setUserState((prev) => {
        const normalizedData = UserState.normalize(data) ?? {};
        const prevNormalized = UserState.normalize(prev) ?? {};
        const mergedRaw = mergeRecords(prevNormalized, normalizedData);
        // `mergeRecords` replaces the opaque `evm` array; restore primary-patch
        // semantics so a partial update (chain switch, AA writeback) keeps the
        // operating address instead of dropping it.
        if (Array.isArray(normalizedData.evm)) {
          mergedRaw.evm = mergeEvmIntoPrimary(
            Array.isArray(prevNormalized.evm) ? prevNormalized.evm : [],
            normalizedData.evm,
          );
        }
        const merged = UserState.normalize(mergedRaw as UserState) ?? prev;

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
          // Per-tx AA outputs belong to the prior address. Pending requests stay
          // until their backend callback resolves or rejects them.
          const prevAddress = UserState.address(prev);
          const nextAddress = UserState.address(merged);
          const addressChanged =
            prevAddress !== undefined &&
            nextAddress !== undefined &&
            prevAddress.toLowerCase() !== nextAddress.toLowerCase();
          next = addressChanged ? dropAddressScopedState(merged) : merged;
        }

        if (stableStateString(prev) === stableStateString(next)) {
          return prev;
        }

        notifyStateChange(next);

        return next;
      });
    },
    [notifyStateChange],
  );

  const addExtValue = useCallback(
    (key: string, value: unknown) => {
      setUserState((prev) => {
        const next = UserState.withExt(prev, key, value);
        notifyStateChange(next);
        return next;
      });
    },
    [notifyStateChange],
  );

  const removeExtValue = useCallback(
    (key: string) => {
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
    },
    [notifyStateChange],
  );

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
