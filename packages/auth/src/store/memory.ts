// =============================================================================
// In-memory Store — v1 backend until Postgres lands.
// =============================================================================
//
// Two Maps, no migrations, no pool. Singleton instance is wired by the portal
// in `apps/portal/src/lib/aomi-auth/auth-config.ts`. The SQL impl
// (against BE's `access_approval` table) gets the same shape later.

import type { AccessApproval, PendingAuth, UserId } from "../types";
import type { Store } from "./index";

export class MemoryStore implements Store {
  private pending = new Map<string, PendingAuth>();
  private approvals = new Map<string, AccessApproval>();
  /** key: `${userId}::${application ?? ""}::${walletProvider}` → approvalId */
  private approvalsByTriple = new Map<string, string>();

  async insertPendingAuth(pending: PendingAuth): Promise<void> {
    this.pending.set(pending.stateToken, { ...pending });
  }

  async getPendingAuth(stateToken: string): Promise<PendingAuth | null> {
    const row = this.pending.get(stateToken);
    return row ? { ...row } : null;
  }

  async completePendingAuth(
    stateToken: string,
    resultApprovalId: string,
  ): Promise<void> {
    const row = this.pending.get(stateToken);
    if (!row) return;
    row.completedAt = Date.now();
    row.resultApprovalId = resultApprovalId;
    this.pending.set(stateToken, row);
  }

  async failPendingAuth(stateToken: string, error: string): Promise<void> {
    const row = this.pending.get(stateToken);
    if (!row) return;
    row.completedAt = Date.now();
    row.error = error;
    this.pending.set(stateToken, row);
  }

  async insertApproval(approval: AccessApproval): Promise<void> {
    this.approvals.set(approval.id, { ...approval });
    this.approvalsByTriple.set(
      approvalKey(approval.userId, approval.application, approval.walletProvider),
      approval.id,
    );
  }

  async getActiveApproval(
    userId: UserId,
    application: string | null,
    walletProvider: string,
  ): Promise<AccessApproval | null> {
    const id = this.approvalsByTriple.get(
      approvalKey(userId, application, walletProvider),
    );
    if (!id) return null;
    const approval = this.approvals.get(id);
    if (!approval || approval.revokedAt) return null;
    return { ...approval };
  }

  async getApprovalById(approvalId: string): Promise<AccessApproval | null> {
    const approval = this.approvals.get(approvalId);
    return approval ? { ...approval } : null;
  }

  async revokeApproval(approvalId: string, revokedAt: number): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) return;
    approval.revokedAt = revokedAt;
    this.approvals.set(approvalId, approval);
  }
}

function approvalKey(
  userId: UserId,
  application: string | null,
  walletProvider: string,
): string {
  return `${userId}::${application ?? ""}::${walletProvider}`;
}
