// =============================================================================
// AuthPort impl — wires @aomi-labs/auth's programmatic API to the AuthPort
// interface.
// =============================================================================
//
// Reusable by any deployer (portal, CLI, custom). Takes a ProviderRegistry
// as an explicit parameter instead of reaching into a singleton.

import {
  awaitAuth,
  beginAuth,
  lookupApproval,
  revokeApproval,
  type ProviderRegistry,
  type Store,
} from "@aomi-labs/auth";
import type { AuthPort } from "../ports/auth";

export interface AuthPortDeps {
  store: Store;
  providers: ProviderRegistry;
  baseUrl: string;
}

export function buildAuthPort(deps: AuthPortDeps): AuthPort {
  return {
    async lookupApproval(args) {
      return lookupApproval({ store: deps.store }, args);
    },
    async beginAuth(args) {
      return beginAuth(
        { store: deps.store, providers: deps.providers, baseUrl: deps.baseUrl },
        { userId: args.userId, initiator: "mcp" },
        {
          walletProvider: args.walletProvider,
          application: args.application,
        },
      );
    },
    async awaitAuth(args) {
      return awaitAuth({ store: deps.store }, args);
    },
    async revokeApproval(args) {
      return revokeApproval({ store: deps.store }, args);
    },
  };
}
