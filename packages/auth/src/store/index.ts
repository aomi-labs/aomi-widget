// =============================================================================
// Store interface — pending_auths + access_approval persistence.
// =============================================================================
//
// v1 impl is `./memory.ts`. SQL impl (mirroring BE's `access_approval` table)
// swaps in later behind the same surface.

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

  /** Mirrors BE's `DbAccessApproval::active_for_user_app`. */
  getActiveApproval(
    userId: UserId,
    application: string,
  ): Promise<AccessApproval | null>;

  getApprovalById(approvalId: string): Promise<AccessApproval | null>;

  revokeApproval(approvalId: string, revokedAt: number): Promise<void>;
}
