"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ==================== User State ====================

export type UserState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

// ==================== Context Value ====================

type UserContextValue = {
  // Public API
  user: UserState;
  setUser: (data: Partial<UserState>) => void;

  // Internal getters for runtime components
  getUserState: () => UserState;
};

// ==================== Context ====================

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ==================== Public Hook ====================

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserContextProvider");
  }
  // Return only the public API
  return {
    user: context.user,
    setUser: context.setUser,
  };
}

// ==================== Internal Hook ====================

export function useUserInternal() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserInternal must be used within UserContextProvider");
  }
  return context;
}

// ==================== Provider ====================

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
    ensName: undefined,
  });


  // Refs for stable getter functions (used by WalletController class)
  const userRef = useRef(user);
  userRef.current = user;

  const setUser = useCallback((data: Partial<UserState>) => {
    setUserState((prev) => ({ ...prev, ...data }));
  }, []);

  // Stable getters that runtime classes can call
  const getUserState = useCallback(() => userRef.current, []);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        getUserState,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
