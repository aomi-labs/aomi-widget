// =============================================================================
// lookupApproval — has this user already authorized this app?
// =============================================================================
//
// Returns the active access_approval (no secret material — just metadata) or
// null. The MCP `aomi_connect_app` tool calls this first; if an approval
// exists, it returns success without starting an OAuth flow.

import type { Store } from "../store";
import type { AccessApproval, UserId } from "../types";

export interface LookupApprovalDeps {
  store: Store;
}

export async function lookupApproval(
  deps: LookupApprovalDeps,
  args: { userId: UserId; application: string },
): Promise<AccessApproval | null> {
  return deps.store.getActiveApproval(args.userId, args.application);
}
