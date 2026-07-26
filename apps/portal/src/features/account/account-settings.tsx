"use client";

import { useAccountOverview } from "@portal/lib/account-overview";
import { AccountSigningView } from "./account-signing";
import { seedGrants, seedWalletPolicies } from "./fixtures";

/**
 * Account tab — the wallet signing policy (ACL) editor.
 *
 * Header identity comes from the shared /api/account overview. The wallet
 * rows and delegated grants render from fixtures for now; the real bindings
 * (/api/account/wallets signing_mode, a grants listing, and the permit
 * ceremony via /api/account/authorization/*) are tracked in
 * docs/SETTINGS-REDESIGN-GAPS.md.
 */
export function AccountSettings() {
  const account = useAccountOverview();

  return (
    <AccountSigningView
      accountId={account?.user.user_id ?? "—"}
      email={account?.user.verified_email ?? "wallet-only account"}
      wallets={seedWalletPolicies}
      grants={seedGrants}
    />
  );
}
