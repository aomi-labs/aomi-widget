"use client";

import { useEffect, useMemo, useState } from "react";
import { getChainInfo } from "@aomi-labs/react";
import {
  Button,
  formatAuthMethod,
  useAomiAuthAdapter,
} from "@aomi-labs/widget-lib";
import { accountScopedFetch } from "@portal/lib/settings-api";
import {
  settingsBodyTextClass,
  settingsCardClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsPageClass,
  settingsPrimaryButtonClass,
  settingsSubTitleClass,
  settingsTitleClass,
} from "@portal/lib/settings-styles";

type CanonicalUser = {
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

type UsageStats = {
  period_utc_month: string;
  input_tokens: number;
  output_tokens: number;
  credit_used: number;
  credit_paid: number;
};

type AuthIdentity = {
  id: number;
  application?: string | null;
  wallet_provider: string;
  auth_method: string;
  auth_verified_at?: number | null;
  is_primary: boolean;
  created_at: number;
};

type IdentityWallet = {
  wallet_id?: string | null;
  address: string;
  chain_type: string;
  wallet_provider: string;
};

type AccountProfile = {
  user: CanonicalUser;
  auth_identities?: AuthIdentity[];
  identity_wallets?: IdentityWallet[];
  usage: UsageStats;
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
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  useEffect(() => {
    const run = async () => {
      if (!identity.address) {
        setAccount(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await accountScopedFetch<AccountProfile>("/api/account");
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
    <div className={settingsPageClass}>
      <div>
        <h1 className={`${settingsTitleClass} mb-4`}>Account</h1>
        <div className={settingsCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className={settingsCardTitleClass}>Identity</p>
              <p className={settingsBodyTextClass}>Type: {identityType}</p>
              <p className={settingsBodyTextClass}>
                Primary:{" "}
                {identity.status === "disconnected"
                  ? "Not connected"
                  : (identity.address ?? "Connected")}
              </p>
              {identity.address && (
                <p className={settingsBodyTextClass}>
                  Wallet: {identity.address}
                </p>
              )}
              {networkTicker && (
                <p className={settingsBodyTextClass}>
                  Network: {networkTicker}
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => {
                if (identity.isConnected && adapter.openAccountUI) {
                  void adapter.openAccountUI();
                  return;
                }
                void adapter.connect();
              }}
              disabled={!adapter.canOpenAccountUI && !adapter.canConnect}
              className={settingsPrimaryButtonClass}
            >
              {identity.isConnected ? "Manage account" : "Connect account"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className={`${settingsSubTitleClass} mb-4`}>
          Subscription and Usage
        </h2>
        <div className={`${settingsCardStackClass} space-y-3`}>
          {loading && (
            <p className={settingsBodyTextClass}>Loading account overview...</p>
          )}
          {!loading && error && (
            <p className="text-destructive text-sm">
              Failed to load account overview: {error}
            </p>
          )}
          {!loading && !error && !account && (
            <p className={settingsBodyTextClass}>
              Connect your wallet to load account details.
            </p>
          )}
          {!loading && !error && account && (
            <>
              <p className={settingsBodyTextClass}>
                User ID: {account.user.user_id}
              </p>
              <p className={settingsBodyTextClass}>Tier: {account.user.tier}</p>
              <p className={settingsBodyTextClass}>
                Verified email: {account.user.verified_email ?? "-"}
              </p>
              <p className={settingsBodyTextClass}>
                Status: {account.user.status}
              </p>
              <p className={settingsBodyTextClass}>
                Month: {account.usage.period_utc_month}
              </p>
              <p className={settingsBodyTextClass}>
                Credits: {formatNumber(account.usage.credit_used)} /{" "}
                {formatNumber(account.usage.credit_paid)}
              </p>
              <p className={settingsBodyTextClass}>
                Tokens: in {formatNumber(account.usage.input_tokens)} | out{" "}
                {formatNumber(account.usage.output_tokens)}
              </p>
              <p className={settingsBodyTextClass}>
                Created at: {formatTs(account.user.created_at)}
              </p>
              <p className={settingsBodyTextClass}>
                Last seen: {formatTs(account.user.last_seen_at)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
