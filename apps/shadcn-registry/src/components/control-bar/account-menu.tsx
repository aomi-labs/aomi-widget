"use client";

import { LogOutIcon } from "lucide-react";
import { formatWalletAddress } from "../../lib/wallet-kit";
import { WalletIconSlot } from "./wallet-icon-slot";

export type AccountMenuProps = {
  open: boolean;
  accountLabel?: string;
  address?: string;
  walletLabel?: string;
  allowanceLine?: string;
  noticeLine?: string;
  networkLabel?: string;
  themeLabel?: string;
  onClose: () => void;
  onManageAccount?: () => void;
  onSwitchNetwork?: () => void;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onOpenDeployments?: () => void;
  onSignIn?: () => void;
  onDisconnect: () => void;
};

function MenuRow({
  label,
  trailing,
  onClick,
}: {
  label: string;
  trailing?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-aomi-fg hover:bg-aomi-surface-2 flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-[13px] transition-colors"
    >
      <span>{label}</span>
      {trailing ? (
        <span className="text-aomi-muted text-[12px]">{trailing}</span>
      ) : null}
    </button>
  );
}

export function AccountMenu({
  open,
  accountLabel,
  address,
  walletLabel,
  allowanceLine,
  noticeLine,
  networkLabel,
  themeLabel,
  onClose,
  onManageAccount,
  onSwitchNetwork,
  onToggleTheme,
  onOpenSettings,
  onOpenDeployments,
  onSignIn,
  onDisconnect,
}: AccountMenuProps) {
  if (!open) return null;

  const shortAddress = address ? formatWalletAddress(address) : undefined;
  const networkTrailing = networkLabel
    ? `${networkLabel.slice(0, 8)} ›`
    : "Network ›";

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss account menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        role="menu"
        aria-label="Account menu"
        className="border-aomi-border bg-aomi-raised absolute bottom-[calc(100%+8px)] left-0 z-50 flex w-[min(248px,calc(100vw-1.5rem))] flex-col rounded-xl border p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
      >
        <div className="border-aomi-border border-b px-2.5 pb-3 pt-2">
          <div className="flex items-center gap-1.5">
            <WalletIconSlot
              label={walletLabel ?? "Wallet"}
              size={14}
              className="bg-aomi-surface-2 shrink-0 rounded-full"
            />
            <span className="truncate text-[13px] font-semibold">
              {accountLabel ?? walletLabel ?? "Account"}
            </span>
          </div>
          {shortAddress ? (
            <div className="text-aomi-muted mt-1 truncate font-mono text-[11px]">
              {shortAddress}
            </div>
          ) : null}
          {allowanceLine ? (
            <div className="text-aomi-muted mt-2 text-[12px] font-medium">
              {allowanceLine}
            </div>
          ) : null}
          {noticeLine ? (
            <p className="text-aomi-muted mt-2 text-[12px] leading-snug">
              {noticeLine}
            </p>
          ) : null}
        </div>

        {onSignIn ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="bg-aomi-fg text-aomi-bg mx-0.5 mb-1 flex h-9 w-[calc(100%-4px)] items-center justify-center rounded-lg px-2.5 text-[13px] font-medium transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        ) : null}

        {onManageAccount ? (
          <MenuRow
            label="Manage account"
            trailing="›"
            onClick={onManageAccount}
          />
        ) : null}
        {onSwitchNetwork ? (
          <MenuRow
            label="Switch network"
            trailing={networkTrailing}
            onClick={onSwitchNetwork}
          />
        ) : null}
        {onToggleTheme ? (
          <MenuRow
            label="Theme"
            trailing={`${themeLabel ?? "Auto"} ›`}
            onClick={onToggleTheme}
          />
        ) : null}
        {onOpenSettings ? (
          <MenuRow label="Settings" onClick={onOpenSettings} />
        ) : null}
        {onOpenDeployments ? (
          <MenuRow
            label="Deployments"
            trailing="›"
            onClick={onOpenDeployments}
          />
        ) : null}
        <a
          href="https://aomi.dev/docs"
          target="_blank"
          rel="noreferrer"
          className="text-aomi-muted hover:bg-aomi-surface-2 hover:text-aomi-fg flex h-9 items-center rounded-lg px-2.5 text-[13px] transition-colors"
          onClick={onClose}
        >
          Docs
        </a>
        <button
          type="button"
          onClick={onDisconnect}
          className="text-aomi-danger hover:bg-aomi-surface-2 mt-1 flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium transition-colors"
        >
          <LogOutIcon size={14} />
          Disconnect
        </button>
      </div>
    </>
  );
}
