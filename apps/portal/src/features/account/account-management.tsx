"use client";

import { useState } from "react";
import type { AomiUserRef, LinkedAuthAccount } from "@aomi-labs/widget-lib";
import {
  Check,
  ChevronDown,
  Link2,
  Loader2,
  LogOut,
  Pencil,
  Plug,
  Plus,
  Trash2,
  Unplug,
  UserRound,
  X,
} from "lucide-react";
import { WalletProviderAvatar } from "./wallet-brands";
import {
  Divider,
  SettingRow,
  SettingsSectionHeading,
  settingsPanelClass,
} from "./settings-rows";
import { shortenAddress } from "./account-api";
import {
  walletConnectionSummary,
  type UnifiedAccountWallet,
} from "./wallet-management-model";

export type AddSignInOption = {
  id: string;
  label: string;
  ready: boolean;
};

type AccountManagementProps = {
  user?: AomiUserRef;
  wallets: UnifiedAccountWallet[];
  signInMethods: LinkedAuthAccount[];
  canAddWallet: boolean;
  addSignInOptions: AddSignInOption[];
  pending: string | null;
  error?: string | null;
  onRenameAccount?: (displayName: string) => Promise<void>;
  onAddWallet: () => void;
  onAddSignIn: (option: AddSignInOption) => Promise<void>;
  onLinkWallet?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onConnectWallet?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onSelectWallet?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onDisconnectWallet?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onUnlinkWallet?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onUnlinkSignIn?: (account: LinkedAuthAccount) => Promise<void>;
  onSignOut?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
};

export function AccountManagement({
  user,
  wallets,
  signInMethods,
  canAddWallet,
  addSignInOptions,
  pending,
  error,
  onRenameAccount,
  onAddWallet,
  onAddSignIn,
  onLinkWallet,
  onConnectWallet,
  onSelectWallet,
  onDisconnectWallet,
  onUnlinkWallet,
  onUnlinkSignIn,
  onSignOut,
  onDeleteAccount,
}: AccountManagementProps) {
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [addSignInOpen, setAddSignInOpen] = useState(false);
  const visibleName = user?.displayName ?? user?.email ?? "Aomi account";
  const connectedWalletCount = wallets.filter(
    (wallet) => wallet.connected,
  ).length;
  const walletSummary = walletConnectionSummary(wallets);
  const accountDetail =
    user?.email && user.email !== visibleName
      ? `${user.email} · ${walletSummary}`
      : walletSummary;

  const saveName = async () => {
    if (!onRenameAccount) return;
    await onRenameAccount(displayName.trim());
    setEditingName(false);
  };

  const cancelNameEdit = () => {
    setDisplayName(user?.displayName ?? "");
    setEditingName(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-5 px-6 py-6">
      {error ? (
        <div
          role="alert"
          className="border-aomi-danger/30 bg-aomi-danger/5 text-aomi-danger rounded-lg border px-3 py-2 text-[13px]"
        >
          {error}
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <SettingsSectionHeading title="Account" />
        <div className={settingsPanelClass}>
          <SettingRow
            className="px-4"
            leading={
              <span className="bg-aomi-surface-2 text-aomi-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <UserRound size={16} />
              </span>
            }
            title={
              editingName ? (
                <input
                  autoFocus
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveName();
                    if (event.key === "Escape") cancelNameEdit();
                  }}
                  aria-label="Account display name"
                  disabled={pending === "account:rename"}
                  className="border-aomi-border bg-aomi-bg text-aomi-fg focus:border-aomi-muted h-7 w-full max-w-64 rounded-md border px-2 text-sm font-medium outline-none transition-colors"
                />
              ) : (
                visibleName
              )
            }
            desc={accountDetail}
          >
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <IconButton
                  label="Save account name"
                  busy={pending === "account:rename"}
                  onClick={() => void saveName()}
                >
                  <Check size={14} />
                </IconButton>
                <IconButton
                  label="Cancel account name edit"
                  disabled={pending === "account:rename"}
                  onClick={cancelNameEdit}
                >
                  <X size={14} />
                </IconButton>
              </div>
            ) : onRenameAccount ? (
              <IconButton
                label="Rename account"
                onClick={() => {
                  setDisplayName(user?.displayName ?? "");
                  setEditingName(true);
                }}
              >
                <Pencil size={14} />
              </IconButton>
            ) : null}
          </SettingRow>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SettingsSectionHeading
          title="Wallets"
          detail={`${wallets.length} total · ${connectedWalletCount} connected now`}
          action={
            canAddWallet ? (
              <button
                type="button"
                onClick={onAddWallet}
                className="border-aomi-border text-aomi-fg hover:bg-aomi-surface-2 flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors"
              >
                <Plus size={13} />
                Add wallet
              </button>
            ) : undefined
          }
        />

        <div className={settingsPanelClass}>
          {wallets.length ? (
            wallets.map((wallet, index) => (
              <div key={wallet.key}>
                {index > 0 ? <Divider /> : null}
                <WalletRow
                  wallet={wallet}
                  pending={pending}
                  onLink={onLinkWallet}
                  onConnect={onConnectWallet}
                  onSelect={onSelectWallet}
                  onDisconnect={onDisconnectWallet}
                  onUnlink={onUnlinkWallet}
                />
              </div>
            ))
          ) : (
            <p className="text-aomi-muted px-4 py-5 text-[13px]">
              No wallets are connected or linked yet.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SettingsSectionHeading
          title="Sign-in methods"
          detail={
            signInMethods.length ? `${signInMethods.length} linked` : undefined
          }
          action={
            addSignInOptions.length ? (
              <button
                type="button"
                onClick={() => setAddSignInOpen((open) => !open)}
                className="border-aomi-border text-aomi-fg hover:bg-aomi-surface-2 flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors"
              >
                <Plus size={13} />
                Add method
              </button>
            ) : undefined
          }
        />

        {addSignInOpen ? (
          <OptionGrid
            options={addSignInOptions}
            pending={pending}
            prefix="add-sign-in"
            onSelect={(option) => void onAddSignIn(option)}
          />
        ) : null}

        <div className={settingsPanelClass}>
          {signInMethods.length ? (
            signInMethods.map((account, index) => (
              <div key={account.id}>
                {index > 0 ? <Divider /> : null}
                <SettingRow
                  className="px-4"
                  leading={
                    <WalletProviderAvatar
                      markKey={account.provider}
                      size={16}
                    />
                  }
                  title={
                    account.displayLabel ??
                    account.email ??
                    titleCase(account.provider)
                  }
                  desc={titleCase(account.provider)}
                >
                  {onUnlinkSignIn ? (
                    <TextButton
                      danger
                      busy={pending === `unlink-identity:${account.id}`}
                      onClick={() => void onUnlinkSignIn(account)}
                    >
                      Unlink
                    </TextButton>
                  ) : (
                    <StatusBadge label="Linked" tone="linked" />
                  )}
                </SettingRow>
              </div>
            ))
          ) : (
            <p className="text-aomi-muted px-4 py-5 text-[13px]">
              Your wallet is currently your only sign-in method.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 pb-1">
        <SettingsSectionHeading title="Session" />
        <div className={settingsPanelClass}>
          {onSignOut ? (
            <SettingRow
              className="px-4"
              leading={
                <span className="bg-aomi-surface-2 text-aomi-muted flex h-8 w-8 items-center justify-center rounded-full">
                  <LogOut size={15} />
                </span>
              }
              title="Sign out"
              desc="End this account session on this device"
            >
              <TextButton
                busy={pending === "account:signout"}
                onClick={() => void onSignOut()}
              >
                Sign out
              </TextButton>
            </SettingRow>
          ) : null}
          {onSignOut && onDeleteAccount ? <Divider /> : null}
          {onDeleteAccount ? (
            <SettingRow
              className="px-4"
              leading={
                <span className="bg-aomi-danger/10 text-aomi-danger flex h-8 w-8 items-center justify-center rounded-full">
                  <Trash2 size={15} />
                </span>
              }
              title="Delete account"
              desc="Permanently remove the account and free linked access"
            >
              <TextButton
                danger
                busy={pending === "account:delete"}
                onClick={() => void onDeleteAccount()}
              >
                Delete
              </TextButton>
            </SettingRow>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function WalletRow({
  wallet,
  pending,
  onLink,
  onConnect,
  onSelect,
  onDisconnect,
  onUnlink,
}: {
  wallet: UnifiedAccountWallet;
  pending: string | null;
  onLink?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onConnect?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onSelect?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onDisconnect?: (wallet: UnifiedAccountWallet) => Promise<void>;
  onUnlink?: (wallet: UnifiedAccountWallet) => Promise<void>;
}) {
  const title =
    wallet.walletName ??
    wallet.label ??
    (wallet.provider ? titleCase(wallet.provider) : undefined) ??
    (wallet.family === "evm" ? "Ethereum wallet" : "Solana wallet");
  const busy = pending?.endsWith(wallet.key) ?? false;
  const selectable = Boolean(wallet.connected && !wallet.active && onSelect);
  const walletContent = (
    <>
      <WalletProviderAvatar
        markKey={`${wallet.walletName ?? ""} ${wallet.label ?? ""} ${
          wallet.provider ?? ""
        }`}
        size={17}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-medium">{title}</span>
          {wallet.connected ? (
            <StatusBadge label="Connected" tone="connected" />
          ) : null}
          {wallet.linked ? <StatusBadge label="Linked" tone="linked" /> : null}
          {wallet.active ? <StatusBadge label="Active" tone="active" /> : null}
        </div>
        <span className="text-aomi-muted block truncate font-mono text-[11px]">
          {shortenAddress(wallet.address)} ·{" "}
          {wallet.family === "evm" ? "Ethereum" : "Solana"}
        </span>
      </div>
    </>
  );

  return (
    <div
      data-wallet-state={
        wallet.active ? "active" : wallet.connected ? "connected" : "linked"
      }
      className={`relative flex items-stretch transition-colors ${
        wallet.active
          ? "bg-aomi-success/[0.045]"
          : selectable
            ? "hover:bg-aomi-hover has-[:focus-visible]:ring-aomi-accent-strong/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset"
            : ""
      }`}
    >
      {wallet.active ? (
        <span
          className="bg-aomi-success absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.45)]"
          aria-hidden="true"
        />
      ) : null}
      {selectable ? (
        <button
          type="button"
          aria-label={`Make ${title} active`}
          disabled={busy}
          onClick={() => void onSelect?.(wallet)}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none disabled:cursor-default"
        >
          {walletContent}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
          {walletContent}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1.5 py-3 pr-4">
        {busy ? (
          <Loader2 className="text-aomi-muted size-4 animate-spin" />
        ) : null}
        {!busy && wallet.connected && !wallet.linked && onLink ? (
          <TextButton onClick={() => void onLink(wallet)}>
            <Link2 size={13} />
            Link
          </TextButton>
        ) : null}
        {!busy && !wallet.connected && onConnect ? (
          <TextButton onClick={() => void onConnect(wallet)}>
            <Plug size={14} />
            Connect
          </TextButton>
        ) : null}
        {!busy && wallet.connected && onDisconnect ? (
          <TextButton onClick={() => void onDisconnect(wallet)}>
            <Unplug size={14} />
            Disconnect
          </TextButton>
        ) : null}
        {!busy && wallet.linked && wallet.accountWalletId && onUnlink ? (
          <IconButton
            danger
            label={`Unlink ${title}`}
            onClick={() => void onUnlink(wallet)}
          >
            <Trash2 size={14} />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

function OptionGrid<
  T extends { id: string; label: string; markKey?: string; ready: boolean },
>({
  options,
  pending,
  prefix,
  onSelect,
}: {
  options: T[];
  pending: string | null;
  prefix: string;
  onSelect: (option: T) => void;
}) {
  return (
    <div className="border-aomi-border bg-aomi-surface-2/25 grid grid-cols-1 gap-2 rounded-xl border p-2 sm:grid-cols-2">
      {options.map((option) => {
        const busy = pending === `${prefix}:${option.id}`;
        return (
          <button
            key={option.id}
            type="button"
            disabled={!option.ready || busy}
            onClick={() => onSelect(option)}
            className="border-aomi-border bg-aomi-raised hover:bg-aomi-hover text-aomi-fg flex h-10 items-center justify-between rounded-lg border px-3 text-left text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.markKey ? (
                <WalletProviderAvatar markKey={option.markKey} size={14} />
              ) : null}
              <span className="truncate">{option.label}</span>
            </span>
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "connected" | "linked" | "active";
}) {
  const toneClass =
    tone === "active"
      ? "bg-aomi-success/10 text-aomi-success ring-aomi-success/20 ring-1 ring-inset"
      : tone === "connected"
        ? "bg-sky-500/10 text-sky-700 ring-1 ring-inset ring-sky-500/15 dark:text-sky-300"
        : "bg-aomi-surface-2 text-aomi-muted";
  return (
    <span
      className={`${toneClass} rounded-full px-1.5 py-0.5 text-[10px] font-medium`}
    >
      {label}
    </span>
  );
}

function TextButton({
  children,
  danger = false,
  busy = false,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`hover:bg-aomi-surface-2 flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${danger ? "text-aomi-danger" : "text-aomi-fg"}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  danger = false,
  busy = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={busy || disabled}
      onClick={onClick}
      className={`hover:bg-aomi-surface-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${danger ? "text-aomi-danger" : "text-aomi-muted hover:text-aomi-fg"}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
