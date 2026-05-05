"use client";

import { useEffect, useMemo, useState } from "react";
import { getChainInfo } from "@aomi-labs/react";
import {
  formatAuthProvider,
  useAomiAuthAdapter,
} from "@/lib/aomi-auth-adapter";
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
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return (
      identity.secondaryLabel ??
      formatAuthProvider(identity.authProvider) ??
      "Wallet"
    );
  }, [identity.authProvider, identity.secondaryLabel, identity.status]);

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
        <h3 className="text-foreground mb-6 text-lg font-semibold">Account</h3>
        <div className="border-input bg-background rounded-3xl border p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-foreground text-sm font-medium">Identity</p>
              <p className="text-muted-foreground text-sm">
                Type: {identityType}
              </p>
              <p className="text-muted-foreground text-sm">
                Primary:{" "}
                {identity.status === "disconnected"
                  ? "Not connected"
                  : identity.primaryLabel}
              </p>
              {identity.address && (
                <p className="text-muted-foreground text-sm">
                  Wallet: {identity.address}
                </p>
              )}
              {networkTicker && (
                <p className="text-muted-foreground text-sm">
                  Network: {networkTicker}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (identity.isConnected && adapter.openAccountUI) {
                  void adapter.openAccountUI();
                  return;
                }
                void adapter.connect();
              }}
              disabled={!adapter.canOpenAccountUI && !adapter.canConnect}
              className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-ring focus:ring-offset-background rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              {identity.isConnected ? "Manage account" : "Connect account"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          Subscription and Usage
        </h3>
        <div className="border-input bg-background space-y-3 rounded-3xl border p-5">
          {loading && (
            <p className="text-muted-foreground text-sm">
              Loading account overview...
            </p>
          )}
          {!loading && error && (
            <p className="text-destructive text-sm">
              Failed to load account overview: {error}
            </p>
          )}
          {!loading && !error && !account && (
            <p className="text-muted-foreground text-sm">
              Connect your wallet to load account details.
            </p>
          )}
          {!loading && !error && account && (
            <>
              <p className="text-muted-foreground text-sm">
                User ID: {account.account.user_id}
              </p>
              <p className="text-muted-foreground text-sm">
                Tier: {account.account.tier}
              </p>
              <p className="text-muted-foreground text-sm">
                Verified email: {account.account.verified_email ?? "-"}
              </p>
              <p className="text-muted-foreground text-sm">
                Status: {account.account.status}
              </p>
              <p className="text-muted-foreground text-sm">
                Month: {account.usage.period_utc_month}
              </p>
              <p className="text-muted-foreground text-sm">
                Credits: {formatNumber(account.usage.credit_used)} /{" "}
                {formatNumber(account.usage.credit_paid)}
              </p>
              <p className="text-muted-foreground text-sm">
                Tokens: in {formatNumber(account.usage.input_tokens)} | out{" "}
                {formatNumber(account.usage.output_tokens)}
              </p>
              <p className="text-muted-foreground text-sm">
                Created at: {formatTs(account.account.created_at)}
              </p>
              <p className="text-muted-foreground text-sm">
                Last seen: {formatTs(account.account.last_seen_at)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
