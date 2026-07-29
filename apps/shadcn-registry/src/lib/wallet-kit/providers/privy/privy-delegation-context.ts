"use client";

import { createContext, useContext } from "react";

/**
 * The delegation handle, split out from `privy-delegation.tsx` so that consumers
 * which only *drive* the ceremony can import the hook without pulling in
 * `@privy-io/react-auth`. Only the provider component needs the SDK; a settings
 * screen calling `start()` does not, and dragging the SDK into its module graph
 * costs bundle size in apps and peer dependencies in tests.
 */
export type PrivyDelegationContextValue = {
  start: (input: { state: string; signerId: string }) => Promise<void>;
};

export const PrivyDelegationContext =
  createContext<PrivyDelegationContextValue>({
    start: async () => {
      throw new Error("Privy is not configured for this app.");
    },
  });

export function usePrivyDelegation(): PrivyDelegationContextValue {
  return useContext(PrivyDelegationContext);
}
