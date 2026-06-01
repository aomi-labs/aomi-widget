// =============================================================================
// Auth port — the slice of @aomi-labs/auth that mcp-core depends on.
// =============================================================================
//
// Kept as a port (not a direct import) so tools can be unit-tested with a
// fake. The portal wires the concrete impl in
// `apps/portal/src/lib/aomi-auth/mcp-server.ts` by adapting the auth
// package's programmatic API.
//
// All approval lookups are keyed by `(userId, application | null,
// walletProvider)` — the same shape `DbAuthIdentity` uses on BE.
// `application=null` targets a global Aomi identity.

import type {
  AccessApproval,
  AwaitResult,
  BeginResult,
  UserId,
} from "@aomi-labs/auth";

export interface AuthPort {
  lookupApproval(args: {
    userId: UserId;
    application: string | null;
    walletProvider: string;
  }): Promise<AccessApproval | null>;

  beginAuth(args: {
    userId: UserId;
    walletProvider: string;
    application: string | null;
  }): Promise<BeginResult>;

  awaitAuth(args: {
    stateToken: string;
    timeoutMs?: number;
  }): Promise<AwaitResult>;

  revokeApproval(args: { approvalId: string }): Promise<void>;
}
