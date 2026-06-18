// =============================================================================
// lookupApproval — has this user already authorized this (app, provider)?
// =============================================================================
//
// Returns the active access_approval for `(userId, application,
// walletProvider)` or null. `application=null` looks up a global Aomi
// identity. The MCP `connect_*` tools call this first; if an approval
// exists they return success without starting an OAuth flow.

import type { Store } from "../store";
import type { AccessApproval, UserId } from "../types";

export interface LookupApprovalDeps {
  store: Store;
}

export async function lookupApproval(
  deps: LookupApprovalDeps,
  args: {
    userId: UserId;
    application: string | null;
    walletProvider: string;
  },
): Promise<AccessApproval | null> {
  return deps.store.getActiveApproval(
    args.userId,
    args.application,
    args.walletProvider,
  );
}
