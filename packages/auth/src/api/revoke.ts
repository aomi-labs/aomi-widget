// =============================================================================
// revokeApproval — soft-delete an access_approval.
// =============================================================================
//
// v1 only flips the metadata row's `revoked_at`. The secret material in BE's
// SecretVault is NOT cleared here — that needs a separate BE call (existing
// DELETE /api/secrets/:name). PR #2 wires that; PR #1 leaves the BE slot
// occupied.

import type { Store } from "../store";

export interface RevokeApprovalDeps {
  store: Store;
  now?: () => number;
}

export async function revokeApproval(
  deps: RevokeApprovalDeps,
  args: { approvalId: string },
): Promise<void> {
  const now = (deps.now ?? Date.now)();
  await deps.store.revokeApproval(args.approvalId, now);
}
