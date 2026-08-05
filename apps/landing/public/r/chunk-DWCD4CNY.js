"use client";

// src/lib/wallet-kit/providers/privy/privy-delegation-context.ts
import { createContext, useContext } from "react";
var PrivyDelegationContext = createContext({
  start: async () => {
    throw new Error("Privy is not configured for this app.");
  }
});
function usePrivyDelegation() {
  return useContext(PrivyDelegationContext);
}

export {
  PrivyDelegationContext,
  usePrivyDelegation
};
//# sourceMappingURL=chunk-DWCD4CNY.js.map