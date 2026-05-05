"use client";

import { useEffect, useMemo, useState } from "react";
import { useModal } from "@getpara/react-sdk";
import { getChainInfo } from "@aomi-labs/react";
import { useAccountIdentity } from "@/lib/use-account-identity";
import { settingsApiFetch } from "@/lib/settings-api";

type AccountProfile = {
  user_id: string;
  public_key: string;
  username?: string | null;
  apps: string[];
  tier: string;
  verified_email?: string | null;
  status: string;
  created_at: number;
  updated_at: number;
  last_seen_at?: number | null;
};

type AccountUsage = {
  period_utc_month: string;
  input_tokens: number;
  output_tokens: number;
  credit_used: number;
  credit_paid: number;
};

type AccountOverview = {
  account: AccountProfile;
  usage: AccountUsage;
};

function formatTs(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

function formatNumber(n?: number): string {
  if (typeof n !== "number") return "0";
  return new Intl.NumberFormat().format(n);
}

export function GeneralSettings() {
  const { openModal } = useModal();
  const identity = useAccountIdentity();
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.kind === "social") return identity.secondaryLabel ?? "Social";
    if (identity.kind === "wallet") return "Wallet";
    return "Disconnected";
  }, [identity.kind, identity.secondaryLabel]);

  useEffect(() => {
    const run = async () => {
      if (!identity.address) {
        setAccount(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await settingsApiFetch<AccountOverview>(
          `/api/settings/account?public_key=${encodeURIComponent(identity.address)}`,
        );
        setAccount(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [identity.address]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-6">Account</h3>
        <div className="rounded-3xl border border-input bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Identity</p>
              <p className="text-sm text-muted-foreground">Type: {identityType}</p>
              <p className="text-sm text-muted-foreground">
                Primary: {identity.kind === "disconnected" ? "Not connected" : identity.primaryLabel}
              </p>
              {identity.address && (
                <p className="text-sm text-muted-foreground">Wallet: {identity.address}</p>
              )}
              {networkTicker && (
                <p className="text-sm text-muted-foreground">Network: {networkTicker}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (identity.isConnected) {
                  openModal({ step: "ACCOUNT_MAIN" });
                  return;
                }
                openModal({ step: "AUTH_MAIN" });
              }}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-colors"
            >
              {identity.isConnected ? "Manage account" : "Connect account"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Subscription and Usage</h3>
        <div className="rounded-3xl border border-input bg-background p-5 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading account overview...</p>}
          {!loading && error && (
            <p className="text-sm text-destructive">Failed to load account overview: {error}</p>
          )}
          {!loading && !error && !account && (
            <p className="text-sm text-muted-foreground">Connect your wallet to load account details.</p>
          )}
          {!loading && !error && account && (
            <>
              <p className="text-sm text-muted-foreground">User ID: {account.account.user_id}</p>
              <p className="text-sm text-muted-foreground">Tier: {account.account.tier}</p>
              <p className="text-sm text-muted-foreground">
                Verified email: {account.account.verified_email ?? "-"}
              </p>
              <p className="text-sm text-muted-foreground">Status: {account.account.status}</p>
              <p className="text-sm text-muted-foreground">Month: {account.usage.period_utc_month}</p>
              <p className="text-sm text-muted-foreground">
                Credits: {formatNumber(account.usage.credit_used)} / {formatNumber(account.usage.credit_paid)}
              </p>
              <p className="text-sm text-muted-foreground">
                Tokens: in {formatNumber(account.usage.input_tokens)} | out{" "}
                {formatNumber(account.usage.output_tokens)}
              </p>
              <p className="text-sm text-muted-foreground">Created at: {formatTs(account.account.created_at)}</p>
              <p className="text-sm text-muted-foreground">Last seen: {formatTs(account.account.last_seen_at)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
