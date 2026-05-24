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
    address: undefined,
    chain_id: undefined,
    is_connected: false,
    ens_name: undefined,
    ext: undefined,
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

  const pruneUndefined = useCallback((state: UserState): UserState => {
    return Object.fromEntries(
      Object.entries(state).filter(([, value]) => value !== undefined),
    );
  }, []);

  const setUser = useCallback((data: Partial<UserState>) => {
    setUserState((prev) => {
      const normalizedData = pruneUndefined(UserState.normalize(data) ?? {});
      const nextPartial: UserState = { ...normalizedData };

      // Guard against a transient "connected-without-chain" payload:
      // keep the previous chain if present; otherwise, delay flipping
      // `is_connected` until a concrete chain arrives.
      if (
        nextPartial.is_connected === true &&
        nextPartial.chain_id === undefined
      ) {
        if (prev.chain_id !== undefined) {
          nextPartial.chain_id = prev.chain_id;
        } else {
          delete nextPartial.is_connected;
        }
      }

      // Wallet-context fields belong to a specific connected session. On
      // disconnect we wipe them all so that the next connection cannot
      // inherit stale identity (address, AA mode, sponsor metadata, etc.)
      // from the previous wallet. AomiAuthAdapterUserSync deliberately
      // does not forward per-tx AA fields, so without this clear they
      // would survive across wallet switches.
      const merged: UserState =
        UserState.normalize({ ...prev, ...nextPartial }) ?? prev;
      let next: UserState;
      if (nextPartial.is_connected === false) {
        next = {
          ...merged,
          address: undefined,
          chain_id: undefined,
          ens_name: undefined,
          wallet_kind: undefined,
          aa_mode: undefined,
          smart_account_4337: undefined,
          delegation_7702: undefined,
          svm_address: undefined,
          wallet_provider: undefined,
          wallet_provider_subject: undefined,
          auth_method: undefined,
          auth_value: undefined,
          auth_verified_at: undefined,
          sponsored: undefined,
          sponsor_provider: undefined,
          sponsor_account: undefined,
          pending_txs: undefined,
          pending_eip712s: undefined,
          pending_solana_txs: undefined,
        };
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
        next = addressChanged
          ? {
              ...merged,
              aa_mode: undefined,
              smart_account_4337: undefined,
              delegation_7702: undefined,
              ens_name: undefined,
              pending_txs: undefined,
              pending_eip712s: undefined,
              pending_solana_txs: undefined,
            }
          : merged;
      }
      notifyStateChange(next);

      return next;
    });
  }, [notifyStateChange, pruneUndefined]);

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
