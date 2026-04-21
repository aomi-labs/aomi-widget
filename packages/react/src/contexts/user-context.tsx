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
    throw new Error("useUser must be used within UserContextProvider");
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

export function UserContextProvider({ children }: { children: ReactNode }) {
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

  const setUser = useCallback((data: Partial<UserState>) => {
    setUserState((prev) => {
      const normalizedData = UserState.normalize(data) ?? {};
      const next: UserState =
        normalizedData.is_connected === false
          ? {
              ...(UserState.normalize({ ...prev, ...normalizedData }) ?? prev),
              address: undefined,
              chain_id: undefined,
              ens_name: undefined,
            }
          : (UserState.normalize({ ...prev, ...normalizedData }) ?? prev);

      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });

      return next;
    });
  }, []);

  const addExtValue = useCallback((key: string, value: unknown) => {
    setUserState((prev) => {
      const next = UserState.withExt(prev, key, value);
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);

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
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);

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
