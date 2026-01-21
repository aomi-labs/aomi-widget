"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";


export type UserState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};


type UserContextValue = {
  user: UserState;
  setUser: (data: Partial<UserState>) => void;
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
    getUserState: context.getUserState,
    onUserStateChange: context.onUserStateChange,
  };
}




// ==================== Provider ====================

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
    ensName: undefined,
  });

  // Refs for stable getter functions
  const userRef = useRef(user);
  userRef.current = user;

    // Store callbacks in a ref
    const StateChangeCallbacks = useRef<Set<(user: UserState) => void>>(new Set());

    const setUser = useCallback((data: Partial<UserState>) => {
      setUserState((prev) => {
        const next = { ...prev, ...data };
        
        // Notify all subscribers
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
        getUserState,
        onUserStateChange
      }}
    >
      {children}
    </UserContext.Provider>
  );
}