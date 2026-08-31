"use client";

import { useMemo, type ReactNode } from "react";
import { getChainInfo } from "@aomi-labs/react";
import { formatAuthMethod, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { ChevronRight, Shield } from "lucide-react";
import { countDriftedWallets } from "@portal/features/account/wallet-attention";
import { useAccountAcl } from "@portal/features/account/use-account-acl";
import { buildUnifiedAccountWallets } from "@portal/features/account/wallet-management-model";
import { useAccountOverview } from "@portal/lib/account-overview";
import { useSettings, type ColorMode } from "@portal/lib/use-settings";

/**
 * Settings › General — design-sync summary card (plan, allowance, identity)
 * on live `/api/account` data, plus theme / network / wallet rows.
 */
export function GeneralSettings({
  onManageAccount,
  onViewUsage,
  onFixWallets,
}: {
  onManageAccount?: () => void;
  onViewUsage?: () => void;
  onFixWallets?: () => void;
}) {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { settings, updateSetting } = useSettings();
  const account = useAccountOverview();
  const acl = useAccountAcl();

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  const address =
    identity.address ?? account?.user.public_key ?? "Not connected";
  const primary =
    account?.user.verified_email ??
    (identity.address ? truncateAddress(identity.address) : address);

  const walletAttentionCount =
    acl.status === "ready" ? countDriftedWallets(acl.wallets) : 0;

  const wallets = useMemo(
    () =>
      buildUnifiedAccountWallets({
        accounts: adapter.accounts ?? [],
        linkedWallets: adapter.accountWallets ?? [],
        policies: acl.wallets,
      }),
    [acl.wallets, adapter.accountWallets, adapter.accounts],
  );
  const connectedWallets = wallets.filter((wallet) => wallet.connected).length;
  const linkedWallets = wallets.filter((wallet) => wallet.linked).length;

  const themeChoices: { mode: ColorMode; label: string }[] = [
    { mode: "dark", label: "Dark" },
    { mode: "light", label: "Light" },
    { mode: "auto", label: "System" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {walletAttentionCount > 0 && (
        <WalletAttentionBanner
          walletAttentionCount={walletAttentionCount}
          onReview={onFixWallets ?? onManageAccount}
        />
      )}

      <AccountSummaryCard
        primary={primary}
        identityDesc={`${identityType} · ${address}`}
        tier={account?.user.tier}
        memberSince={formatMemberSince(account?.user.created_at)}
        usage={account?.usage}
        onManageAccount={onManageAccount}
        onViewUsage={onViewUsage}
      />

      <div className="flex flex-col">
        <FlatSettingRow label="Theme">
          <div className="border-aomi-border bg-aomi-surface flex h-8 items-center rounded-full border p-[3px]">
            {themeChoices.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateSetting("colorMode", mode)}
                className={`rounded-full px-3 py-1 text-[12px] leading-none transition-colors ${
                  settings.colorMode === mode
                    ? "bg-aomi-surface-2 text-aomi-fg font-medium"
                    : "text-aomi-muted hover:text-aomi-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </FlatSettingRow>

        <Divider />

        <FlatSettingRow label="Default network">
          <div className="text-aomi-muted flex items-center gap-1.5 text-[13px]">
            <span className="bg-aomi-success h-[7px] w-[7px] rounded-full" />
            <span className="text-aomi-fg">{networkTicker ?? "—"}</span>
          </div>
        </FlatSettingRow>

        <Divider />

        <FlatSettingRow
          label="Wallets"
          hint={`${connectedWallets} connected · ${linkedWallets} linked`}
        >
          {onManageAccount ? (
            <button
              type="button"
              onClick={onManageAccount}
              className="border-aomi-border text-aomi-fg hover:bg-aomi-surface-2 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors"
            >
              Manage
            </button>
          ) : null}
        </FlatSettingRow>
      </div>
    </div>
  );
}

function AccountSummaryCard({
  primary,
  identityDesc,
  tier,
  memberSince,
  usage,
  onManageAccount,
  onViewUsage,
}: {
  primary: string;
  identityDesc: string;
  tier?: string;
  memberSince?: string;
  usage?: {
    credit_used: number;
    credit_paid: number;
    period_utc_month?: string;
  };
  onManageAccount?: () => void;
  onViewUsage?: () => void;
}) {
  const creditsUsed = usage?.credit_used ?? 0;
  const creditsIncluded = usage?.credit_paid ?? 0;
  const remaining = Math.max(0, creditsIncluded - creditsUsed);
  const periodLabel = formatPeriodLabel(usage?.period_utc_month);
  const hasAllowance = creditsIncluded > 0;

  return (
    <div className="border-aomi-border bg-aomi-bg/40 overflow-hidden rounded-xl border">
      <SettingRow
        title={primary}
        desc={identityDesc}
        descMono
        className="px-4 sm:px-5"
      >
        <button
          type="button"
          onClick={onManageAccount}
          className="border-aomi-border text-aomi-muted hover:text-aomi-fg flex h-8 shrink-0 items-center rounded-lg border px-3 text-[13px] font-medium leading-none transition-colors"
        >
          Manage account
        </button>
      </SettingRow>

      <Divider />

      <SettingRow
        title="Plan"
        desc={memberSince ? `Member since ${memberSince}` : "Account plan"}
        className="px-4 sm:px-5"
      >
        <span className="text-aomi-fg text-[13px] font-medium">
          {tierLabel(tier)}
        </span>
      </SettingRow>

      {hasAllowance && (
        <>
          <Divider />
          <SettingRow
            title="Monthly allowance"
            desc={`${periodLabel} · resets each UTC month`}
            className="px-4 sm:px-5"
          >
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-aomi-fg text-[13px] font-medium tabular-nums">
                {remaining.toLocaleString()} remaining
              </span>
              <span className="text-aomi-accent-strong text-[12px] tabular-nums">
                {creditsUsed.toLocaleString()} /{" "}
                {creditsIncluded.toLocaleString()} used
              </span>
            </div>
          </SettingRow>
        </>
      )}

      <div className="border-aomi-border flex items-start justify-between gap-3 border-t px-4 py-3 sm:px-5">
        <p className="text-aomi-muted min-w-0 flex-1 text-[12px] leading-snug">
          Usage shows spend by app. Overflow settles via wallet pay when
          allowance is used.
        </p>
        <button
          type="button"
          onClick={onViewUsage}
          className="text-aomi-muted hover:text-aomi-fg flex shrink-0 items-center gap-0.5 text-[12px] font-medium transition-colors"
        >
          View usage
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function WalletAttentionBanner({
  walletAttentionCount,
  onReview,
}: {
  walletAttentionCount: number;
  onReview?: () => void;
}) {
  return (
    <div className="bg-aomi-surface relative rounded-xl px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="bg-aomi-surface-2 text-aomi-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Shield size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug">
            Review wallet signing
          </h3>
          <p className="text-aomi-muted mt-1.5 text-[13px] leading-relaxed">
            {walletAttentionCount}{" "}
            {walletAttentionCount === 1 ? "wallet needs" : "wallets need"} a
            renewed provider grant before auto-signing can run.
          </p>
        </div>
        <button
          type="button"
          onClick={onReview}
          className="border-aomi-border text-aomi-fg hover:bg-aomi-surface-2 h-9 shrink-0 self-start rounded-full border px-4 text-[13px] font-medium transition-colors"
        >
          Review
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  descMono,
  className = "",
  children,
}: {
  title: string;
  desc: string;
  descMono?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium leading-none">{title}</span>
        <span
          className={`text-aomi-muted mt-1 block truncate text-[13px] leading-snug ${
            descMono ? "font-mono" : ""
          }`}
        >
          {desc}
        </span>
      </div>
      {children}
    </div>
  );
}

function FlatSettingRow({
  label,
  hint,
  hintMono,
  children,
}: {
  label: string;
  hint?: string;
  hintMono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium leading-none">{label}</span>
        {hint && (
          <span
            className={`text-aomi-muted mt-1 block truncate text-[12px] leading-snug ${
              hintMono ? "font-mono" : ""
            }`}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="bg-aomi-border h-px" />;
}

function tierLabel(tier?: string): string {
  if (!tier || tier === "free") return "Free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function formatMemberSince(createdAt?: number): string | undefined {
  if (!createdAt) return undefined;
  return new Date(createdAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatPeriodLabel(periodUtcMonth?: string): string {
  if (!periodUtcMonth) {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const [year, month] = periodUtcMonth.split("-").map(Number);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[month - 1] ?? periodUtcMonth} ${year}`;
}

function truncateAddress(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
