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
  SettingsPanel,
  SettingsPill,
  SettingsPreviewBadge,
  SettingsPromoCard,
  SettingsRow,
  SettingsSelect,
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
  if (!ts) return "-";
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

function RowSkeleton() {
  return (
    <span className="bg-muted inline-block h-3.5 w-16 animate-pulse rounded" />
  );
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
    if (identity.status !== "connected") return "Not connected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await settingsApiFetch<AccountOverview>("/api/account");
        if (!controller.signal.aborted) {
          setAccount(data);
          setError(null);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setError("Account overview timed out.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load account",
          );
        }
        setAccount(null);
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

  const retryAccount = () => {
    setLoading(true);
    setError(null);
    void settingsApiFetch<AccountOverview>("/api/account")
      .then((data) => {
        setAccount(data);
        setError(null);
      })
      .catch((err) => {
        setAccount(null);
        setError(
          err instanceof Error ? err.message : "Failed to load account",
        );
      })
      .finally(() => setLoading(false));
  };
  const accountUnavailable = !loading && Boolean(error);

  return (
    <SettingsPanel
      title="General"
      description="Account and preferences."
      badge={<SettingsPreviewBadge />}
    >
      {!identity.isConnected ? (
        <SettingsPromoCard
          title="Connect wallet"
          description="Needed for plan and usage."
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

      {accountUnavailable ? (
        <SettingsPromoCard
          title="Account offline"
          description={
            error?.includes("DATABASE") || error?.includes("database")
              ? "Local preview: account APIs need DATABASE_URL."
              : (error ?? "Could not load plan and usage.")
          }
          action={
            <SettingsPill onClick={retryAccount}>Retry</SettingsPill>
          }
        />
      ) : null}

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
          loading
            ? "Loading…"
            : account
              ? `${account.user.tier} · ${account.user.status}`
              : "Unavailable"
        }
      >
        {loading ? (
          <RowSkeleton />
        ) : (
          <span className="text-foreground text-[12.5px] font-medium capitalize">
            {account?.user.tier ?? "-"}
          </span>
        )}
      </SettingsRow>

      <SettingsRow
        label="Credits this month"
        description={
          loading
            ? "Loading…"
            : account?.usage
              ? `${account.usage.period_utc_month} · ${formatNumber(account.usage.input_tokens + account.usage.output_tokens)} tokens`
              : "Current UTC month"
        }
      >
        {loading ? (
          <RowSkeleton />
        ) : (
          <button
            type="button"
            onClick={() => setCategory("apps")}
            className="text-foreground hover:bg-accent/60 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium"
          >
            {account?.usage
              ? `${formatNumber(account.usage.credit_used)} / ${formatNumber(account.usage.credit_paid)}`
              : accountUnavailable
                ? "Unavailable"
                : "View"}
            <ChevronRight className="size-3.5 opacity-60" />
          </button>
        )}
      </SettingsRow>

      <SettingsRow
        label="Email"
        description={
          account?.user.verified_email
            ? "Verified"
            : loading
              ? "Loading…"
              : "None on file"
        }
      >
        {loading ? (
          <RowSkeleton />
        ) : (
          <span className="text-muted-foreground max-w-[180px] truncate text-[12.5px]">
            {account?.user.verified_email ?? "-"}
          </span>
        )}
      </SettingsRow>

      <SettingsRow label="Theme" description="This device">
        <SettingsSelect
          value={settings.colorMode}
          onChange={(value) => updateSetting("colorMode", value as ColorMode)}
          options={[
            { value: "auto", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </SettingsRow>

      <SettingsRow label="Deployments" description="Projects and GitHub deploys">
        <Link
          href="/deployments"
          className="bg-muted text-foreground hover:bg-accent inline-flex h-8 items-center justify-center gap-0.5 rounded-full px-3 text-[12.5px] font-medium transition-colors"
        >
          Open
          <ChevronRight className="size-3.5 opacity-60" />
        </Link>
      </SettingsRow>

      <SettingsRow
        label="Member since"
        description={
          account ? `User ${account.user.user_id.slice(0, 8)}…` : undefined
        }
      >
        {loading ? (
          <RowSkeleton />
        ) : (
          <span className="text-muted-foreground text-[12.5px]">
            {formatMemberSince(account?.user.created_at)}
          </span>
        )}
      </SettingsRow>
    </SettingsPanel>
  );
}
