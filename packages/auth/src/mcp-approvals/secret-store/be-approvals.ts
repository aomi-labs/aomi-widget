// =============================================================================
// BeApprovalsStore — calls BE's atomic POST /api/_internal/approvals.
// =============================================================================
//
// Hands the BE everything it needs to atomically:
//
//   1. ensure `DbUser`
//   2. ensure `DbAuthIdentity`
//   3. ingest secrets to `SecretVault` keyed by `auth_identity_id`
//   4. insert `DbAccessApproval`
//
// Returns the two ids the portal needs to persist locally.

import type { UserId } from "../types";

export interface BeApprovalsStoreConfig {
  beUrl: string;
  authToken: string;
  fetchImpl?: typeof fetch;
}

export interface CompleteApprovalArgs {
  userId: UserId;
  /** Aomi-app the identity is scoped to. `null` for global (unscoped). */
  application: string | null;
  walletProvider: string;
  walletProviderSubject: string | null;
  authMethod: string;
  authValue: string;
  isPrimary: boolean;
  identityMetadata?: Record<string, unknown>;
  grantKind: string;
  scopes?: string[];
  displayLabel?: string;
  expiresAt?: number;
  approvalMetadata?: Record<string, unknown>;
  secrets: Record<string, string>;
}

export interface CompleteApprovalResult {
  authIdentityId: number;
  approvalId: number;
}

export class BeApprovalsStore {
  private readonly fetch: typeof fetch;

  constructor(private readonly config: BeApprovalsStoreConfig) {
    this.fetch = config.fetchImpl ?? fetch;
  }

  async completeApproval(args: CompleteApprovalArgs): Promise<CompleteApprovalResult> {
    const url = `${this.config.beUrl.replace(/\/$/, "")}/api/_internal/approvals`;
    const body = {
      user_id: args.userId,
      application: args.application,
      wallet_provider: args.walletProvider,
      wallet_provider_subject: args.walletProviderSubject,
      auth_method: args.authMethod,
      auth_value: args.authValue,
      is_primary: args.isPrimary,
      identity_metadata: args.identityMetadata,
      grant_kind: args.grantKind,
      scopes: args.scopes ?? [],
      display_label: args.displayLabel,
      expires_at: args.expiresAt,
      approval_metadata: args.approvalMetadata,
      secrets: args.secrets,
    };

    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aomi-Auth": this.config.authToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `be-approvals: POST /api/_internal/approvals ${res.status} ${detail.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as {
      auth_identity_id?: number;
      approval_id?: number;
    };
    if (typeof json.auth_identity_id !== "number" || typeof json.approval_id !== "number") {
      throw new Error("be-approvals: response missing auth_identity_id or approval_id");
    }
    return {
      authIdentityId: json.auth_identity_id,
      approvalId: json.approval_id,
    };
  }
}
