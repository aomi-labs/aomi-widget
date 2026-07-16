"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getChainInfo } from "@aomi-labs/react";
import {
  formatAuthMethod,
  useAomiWalletKit,
} from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import { useSettings, type ColorMode } from "@portal/lib/use-settings";
import { useSettingsController } from "@portal/components/settings/settings-controller";
import {
  SettingsEmpty,
  SettingsPanel,
  SettingsPill,
  SettingsPromoCard,
  SettingsRow,
  SettingsSelect,
  SettingsSkeletonRows,
} from "@portal/components/settings/settings-primitives";

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
  user: AccountProfile;
  usage?: AccountUsage | null;
};

function formatNumber(n?: number): string {
  if (typeof n !== "number") return "0";
  return new Intl.NumberFormat().format(n);
}

function formatMemberSince(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortenAddress(address?: string | null): string {
  if (!address) return "Not connected";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function GeneralSettings() {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { setCategory } = useSettingsController();
  const { settings, updateSetting } = useSettings();
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await settingsApiFetch<AccountOverview>("/api/account");
        if (!controller.signal.aborted) setAccount(data);
      } catch (err) {
        if (controller.signal.aborted) {
          setError("Account overview timed out. Try again.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load account",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <SettingsPanel
      title="General"
      description="Identity, plan, and preferences for this account."
    >
      {!identity.isConnected ? (
        <SettingsPromoCard
          title="Connect your wallet"
          description="Link an account to manage plan, usage, and developer access."
          action={
            <SettingsPill
              tone="primary"
              disabled={!adapter.canConnect}
              onClick={() => void adapter.connect()}
            >
              Connect
            </SettingsPill>
          }
        />
      ) : null}

      {loading ? <SettingsSkeletonRows count={6} /> : null}

      {!loading && error ? (
        <SettingsPromoCard
          title="Couldn't load account overview"
          description={error}
          action={
            <SettingsPill
              onClick={() => {
                setLoading(true);
                setError(null);
                void settingsApiFetch<AccountOverview>("/api/account")
                  .then(setAccount)
                  .catch((err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to load account",
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </SettingsPill>
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          <SettingsRow
            label="Identity"
            description={`${identityType}${networkTicker ? ` · ${networkTicker}` : ""}`}
          >
            <span className="text-muted-foreground mr-1 hidden text-[12.5px] sm:inline">
              {shortenAddress(identity.address)}
            </span>
            <SettingsPill
              disabled={!adapter.canOpenAccountUI && !adapter.canConnect}
              onClick={() => {
                if (identity.isConnected && adapter.openAccountUI) {
                  void adapter.openAccountUI();
                  return;
                }
                void adapter.connect();
              }}
            >
              {identity.isConnected ? "Manage" : "Connect"}
            </SettingsPill>
          </SettingsRow>

          <SettingsRow
            label="Plan"
            description={
              account
                ? `${account.user.tier} · status ${account.user.status}`
                : "Sign in to load plan details"
            }
          >
            <span className="text-foreground text-[12.5px] font-medium capitalize">
              {account?.user.tier ?? "—"}
            </span>
          </SettingsRow>

          <SettingsRow
            label="Credits this month"
            description={
              account?.usage
                ? `${account.usage.period_utc_month} · ${formatNumber(account.usage.input_tokens + account.usage.output_tokens)} tokens`
                : "Usage for the current UTC month"
            }
          >
            <button
              type="button"
              onClick={() => setCategory("apps")}
              className="text-foreground hover:bg-accent/50 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium"
            >
              {account?.usage
                ? `${formatNumber(account.usage.credit_used)} / ${formatNumber(account.usage.credit_paid)}`
                : "View"}
              <ChevronRight className="size-3.5 opacity-60" />
            </button>
          </SettingsRow>

          <SettingsRow
            label="Email"
            description={
              account?.user.verified_email
                ? "Verified on your account"
                : "No verified email yet"
            }
          >
            <span className="text-muted-foreground max-w-[180px] truncate text-[12.5px]">
              {account?.user.verified_email ?? "—"}
            </span>
          </SettingsRow>

          <SettingsRow
            label="Theme"
            description="Applies to chat.aomi.dev on this device"
          >
            <SettingsSelect
              value={settings.colorMode}
              onChange={(value) =>
                updateSetting("colorMode", value as ColorMode)
              }
              options={[
                { value: "auto", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Deployments"
            description="Projects and GitHub deploys live in the developer console"
          >
            <Link
              href="/deployments"
              className="border-border text-foreground hover:bg-accent/60 inline-flex h-8 items-center justify-center gap-0.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors"
            >
              Open
              <ChevronRight className="size-3.5 opacity-60" />
            </Link>
          </SettingsRow>

          <SettingsRow
            label="Member since"
            description={
              account
                ? `User ${account.user.user_id.slice(0, 8)}…`
                : undefined
            }
          >
            <span className="text-muted-foreground text-[12.5px]">
              {formatMemberSince(account?.user.created_at)}
            </span>
          </SettingsRow>

          {!account ? (
            <SettingsEmpty
              title="No account details yet"
              description="Connect an account to load plan and usage."
            />
          ) : null}
        </>
      ) : null}
    </SettingsPanel>
  );
}
