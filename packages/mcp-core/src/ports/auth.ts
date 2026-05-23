// =============================================================================
// Auth port — the slice of @aomi-labs/auth that mcp-core depends on.
// =============================================================================
//
// Kept as a port (not a direct import) so tools can be unit-tested with a
// fake. The portal wires the concrete impl in `apps/portal/src/lib/aomi-auth/mcp.ts`
// by adapting the auth package's programmatic API.

import type {
  AccessApproval,
  AwaitResult,
  BeginResult,
  UserId,
} from "@aomi-labs/auth";

export interface AuthPort {
  lookupApproval(args: {
    userId: UserId;
    application: string;
  }): Promise<AccessApproval | null>;

  beginAuth(args: {
    userId: UserId;
    provider: string;
  }): Promise<BeginResult>;

  awaitAuth(args: {
    stateToken: string;
    timeoutMs?: number;
  }): Promise<AwaitResult>;

  revokeApproval(args: { approvalId: string }): Promise<void>;
}
