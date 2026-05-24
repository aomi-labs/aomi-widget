// =============================================================================
// Store interface — pending_auths + access_approval persistence.
// =============================================================================
//
// v1 impl is `./memory.ts`. SQL impl (mirroring BE's `access_approval` table)
// swaps in later behind the same surface.
//
// Approval lookups are keyed by `(userId, application | null, walletProvider)`
// — same shape as `DbAuthIdentity` plus user. `application=null` means
// the identity is global (not scoped to a specific Aomi app like 'byreal').

import type { AccessApproval, PendingAuth, UserId } from "../types";

export interface Store {
  // ---------------------------------------------------------------------------
  // pending_auths
  // ---------------------------------------------------------------------------

  insertPendingAuth(pending: PendingAuth): Promise<void>;

  getPendingAuth(stateToken: string): Promise<PendingAuth | null>;

  /** Mark a pending row complete and link the resulting approval. */
  completePendingAuth(
    stateToken: string,
    resultApprovalId: string,
  ): Promise<void>;

  /** Mark a pending row as failed. */
  failPendingAuth(stateToken: string, error: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // access_approval
  // ---------------------------------------------------------------------------

  insertApproval(approval: AccessApproval): Promise<void>;

  /** Returns the active approval for `(userId, application, walletProvider)`
   *  or null. `application` is `null` for global identities. */
  getActiveApproval(
    userId: UserId,
    application: string | null,
    walletProvider: string,
  ): Promise<AccessApproval | null>;

  getApprovalById(approvalId: string): Promise<AccessApproval | null>;

  revokeApproval(approvalId: string, revokedAt: number): Promise<void>;
}
