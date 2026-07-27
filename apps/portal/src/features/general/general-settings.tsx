"use client";

import { useMemo } from "react";
import { getChainInfo } from "@aomi-labs/react";
import { formatAuthMethod, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { UserRound } from "lucide-react";
import { useAccountOverview } from "@portal/lib/account-overview";
import { useSettings, type ColorMode } from "@portal/lib/use-settings";

/**
 * Settings › General — the design mock's General tab, built on the `aomi-*`
 * tokens and wired to real state: identity from the wallet kit + the shared
 * /api/account overview, theme via useSettings.colorMode, network from the
 * connected chain. Renders inside the settings popup (the modal owns the tab
 * title).
 */
export function GeneralSettings({
  onManageAccount,
}: {
  onManageAccount?: () => void;
}) {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { settings, updateSetting } = useSettings();
  const account = useAccountOverview();

  const networkTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;

  const identityType = useMemo(() => {
    if (identity.status !== "connected") return "Disconnected";
    return formatAuthMethod(identity.authMethod) ?? "Wallet";
  }, [identity.authMethod, identity.status]);

  const disconnect = (
    adapter as { disconnect?: () => void | Promise<void> }
  ).disconnect;

  // Design's Dark / Light / System ↔ stored colorMode dark / light / auto.
  const themeChoices: { mode: ColorMode; label: string }[] = [
    { mode: "dark", label: "Dark" },
    { mode: "light", label: "Light" },
    { mode: "auto", label: "System" },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Identity card */}
      <div className="border-aomi-border bg-aomi-bg/40 overflow-hidden rounded-xl border">
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-aomi-surface-2 text-aomi-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
              <UserRound size={20} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-mono text-sm font-medium">
                {identity.address ??
                  account?.user.public_key ??
                  "Not connected"}
              </span>
              <span className="text-aomi-muted truncate text-[13px]">
                {account?.user.verified_email ??
                  (identity.status === "connected"
                    ? "Primary identity · Connected"
                    : "Primary identity · Not connected")}
              </span>
            </div>
          </div>
          <button
            onClick={onManageAccount}
            className="bg-aomi-fg text-aomi-bg flex-shrink-0 rounded-full border border-transparent px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90"
          >
            Manage account
          </button>
        </div>
        <div className="border-aomi-border bg-aomi-border grid grid-cols-2 gap-px border-t">
          <MetaCell label="Type">{identityType}</MetaCell>
          <MetaCell label="Network">
            <span className="flex items-center gap-1.5">
              <span className="bg-aomi-success h-[7px] w-[7px] rounded-full" />
              {networkTicker ?? "—"}
            </span>
          </MetaCell>
        </div>
      </div>

      <Divider />

      <SettingRow title="Theme" desc="Match system, light, or dark">
        <div className="border-aomi-border bg-aomi-surface-2 flex rounded-full border p-[3px]">
          {themeChoices.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => updateSetting("colorMode", mode)}
              className={`rounded-full px-3.5 py-[5px] text-xs transition-colors ${
                settings.colorMode === mode
                  ? "bg-aomi-accent-strong text-aomi-on-accent font-medium"
                  : "text-aomi-muted hover:text-aomi-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingRow>

      <Divider />

      <SettingRow title="Default network" desc="Used for new chats">
        <div className="border-aomi-border flex items-center gap-[7px] rounded-lg border px-3 py-[7px]">
          <span className="bg-aomi-success h-[7px] w-[7px] rounded-full" />
          <span className="text-[13px]">{networkTicker ?? "Ethereum"}</span>
        </div>
      </SettingRow>

      <Divider />

      <SettingRow
        title="Connected wallet"
        desc={identity.address ?? "Not connected"}
        descMono
      >
        {disconnect ? (
          <button
            onClick={() => void disconnect()}
            className="border-aomi-border text-aomi-muted hover:text-aomi-fg rounded-full border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => void adapter.openAccountUI?.()}
            className="border-aomi-border text-aomi-muted hover:text-aomi-fg rounded-full border px-4 py-2 text-[13px] font-medium transition-colors"
          >
            Manage wallet
          </button>
        )}
      </SettingRow>
    </div>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-aomi-bg/40 flex flex-col gap-0.5 px-4 py-3">
      <span className="text-aomi-muted text-xs">{label}</span>
      <span className="text-[13px]">{children}</span>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  descMono,
  children,
}: {
  title: string;
  desc: string;
  descMono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span
          className={`text-aomi-muted text-[13px] ${descMono ? "font-mono" : ""}`}
        >
          {desc}
        </span>
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="bg-aomi-border h-px" />;
}
