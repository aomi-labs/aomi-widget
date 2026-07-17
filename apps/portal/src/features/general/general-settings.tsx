"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icons, PortalIcon } from "@portal/components/icons";
import { getChainInfo } from "@aomi-labs/react";
import {
  formatAuthMethod,
  useAomiWalletKit,
} from "@aomi-labs/widget-lib";
import { useSettings, type ColorMode } from "@portal/lib/use-settings";
import { useSettingsController } from "@portal/components/settings/settings-controller";
import { useAccountOverview } from "@portal/components/settings/use-account-summary";
import {
  SettingsPanel,
  SettingsPill,
  SettingsPromoCard,
  SettingsRow,
  SettingsSelect,
  SettingsUsageMeter,
} from "@portal/components/settings/settings-primitives";

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
  const {
    overview: account,
    loading,
    error,
    retry: retryAccount,
  } = useAccountOverview();

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Not connected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  const accountUnavailable = !loading && Boolean(error);

  return (
    <SettingsPanel title="General" description="Account and preferences.">
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
        <span className="text-muted-foreground aomi-numeric mr-1 hidden text-[12.5px] sm:inline">
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

      <div className="border-border/40 border-b px-3 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-foreground text-[13.5px] font-medium">
              Credits this month
            </p>
            <p className="text-muted-foreground mt-0.5 text-[12.5px]">
              {loading ? (
                "Loading…"
              ) : account?.usage ? (
                <>
                  <span className="aomi-numeric">
                    {account.usage.period_utc_month}
                  </span>{" "}
                  ·{" "}
                  <span className="aomi-numeric">
                    {formatNumber(
                      account.usage.input_tokens +
                        account.usage.output_tokens,
                    )}
                  </span>{" "}
                  tokens
                </>
              ) : (
                "Current UTC month"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCategory("apps")}
            className="text-foreground hover:bg-accent/60 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium"
          >
            View usage
            <PortalIcon icon={Icons.ChevronRight} size={14} className="opacity-60" />
          </button>
        </div>
        {loading ? (
          <div className="bg-muted mt-3 h-14 animate-pulse rounded-xl" />
        ) : account?.usage ? (
          <SettingsUsageMeter
            used={account.usage.credit_used ?? 0}
            limit={account.usage.credit_paid ?? 0}
            compact
            className="mt-3 min-w-0"
          />
        ) : (
          <p className="text-muted-foreground mt-3 text-[12.5px]">
            {accountUnavailable ? "Usage unavailable" : "No usage yet"}
          </p>
        )}
      </div>

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
          <PortalIcon icon={Icons.ChevronRight} size={14} className="opacity-60" />
        </Link>
      </SettingsRow>

      <SettingsRow
        label="Member since"
        description={
          account ? (
            <>
              User{" "}
              <span className="aomi-numeric">
                {account.user.user_id.slice(0, 8)}…
              </span>
            </>
          ) : undefined
        }
      >
        {loading ? (
          <RowSkeleton />
        ) : (
          <span className="text-muted-foreground aomi-numeric text-[12.5px]">
            {formatMemberSince(account?.user.created_at)}
          </span>
        )}
      </SettingsRow>
    </SettingsPanel>
  );
}
