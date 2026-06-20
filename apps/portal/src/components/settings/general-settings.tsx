"use client";

import { useEffect, useMemo, useState } from "react";
import { createAccountAccessTokenProvider } from "@aomi-labs/client";
import { getChainInfo } from "@aomi-labs/react";
import {
  Button,
  formatAuthMethod,
  useAomiWalletKit,
} from "@aomi-labs/widget-lib";
import { getBackendUrl, settingsApiFetch } from "@portal/lib/settings-api";
import {
  settingsBodyTextClass,
  settingsCardClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsPageClass,
  settingsPrimaryButtonClass,
  settingsSubTitleClass,
  settingsTitleClass,
} from "./settings-styles";

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
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { accountUser, getAccountCredential } = adapter;
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountAccessTokenProvider = useMemo(() => {
    if (!getAccountCredential) return undefined;
    return createAccountAccessTokenProvider({
      baseUrl: getBackendUrl(),
      getProviderCredential: async () => {
        const credential = await getAccountCredential();
        if (!credential) {
          throw new Error("No account credential is available");
        }
        if ("providerToken" in credential) {
          return credential;
        }
        if (credential.kind === "token") {
          return {
            provider: credential.provider,
            providerToken: credential.token,
          };
        }
        throw new Error("Account credential cannot be exchanged");
      },
    });
  }, [getAccountCredential]);

  useEffect(
    () => () => {
      accountAccessTokenProvider?.dispose();
    },
    [accountAccessTokenProvider],
  );

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  useEffect(() => {
    const run = async () => {
      if (!accountUser && !identity.address) {
        setAccount(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const accessToken = await accountAccessTokenProvider?.();
        const query = new URLSearchParams();
        if (identity.address) query.set("public_key", identity.address);
        const data = await settingsApiFetch<AccountOverview>(
          query.size > 0
            ? `/api/settings/account?${query.toString()}`
            : "/api/settings/account",
          accessToken
            ? { headers: { Authorization: `Bearer ${accessToken}` } }
            : undefined,
        );
        setAccount(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [accountAccessTokenProvider, accountUser, identity.address]);

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
              Sign in or connect a wallet to load account details.
            </p>
          )}
          {!loading && !error && account && (
            <>
              <p className={settingsBodyTextClass}>
                User ID: {account.account.user_id}
              </p>
              <p className={settingsBodyTextClass}>
                Tier: {account.account.tier}
              </p>
              <p className={settingsBodyTextClass}>
                Verified email: {account.account.verified_email ?? "-"}
              </p>
              <p className={settingsBodyTextClass}>
                Status: {account.account.status}
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
                Created at: {formatTs(account.account.created_at)}
              </p>
              <p className={settingsBodyTextClass}>
                Last seen: {formatTs(account.account.last_seen_at)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
