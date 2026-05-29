"use client";

import { useCallback, useEffect, useMemo, useState, type FC, type SVGProps } from "react";
import {
  CheckIcon, ChevronRightIcon, Loader2Icon, LogOutIcon, Settings2Icon, WalletIcon, XIcon,
} from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter, formatAddress, formatAuthProvider,
} from "../../lib/aomi-auth-adapter";
import { isAccountSelectable } from "../../lib/aomi-auth-adapter/accounts";
import { useAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
import type { AomiAccount, WalletFamily } from "../../lib/aomi-auth-adapter/types";
import {
  useWalletPicker,
  type WalletPickerProvider as WalletPickerProviderEntry,
} from "./wallet-picker-context";

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "Solana" : "EVM";
}

export function WalletPicker() {
  const { open, closePicker, providers } = useWalletPicker();
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const { selectedFamily, setSelectedFamily } = useAomiWalletNetworkPreferences();
  const activeFamily: WalletFamily = adapter.activeFamily ?? selectedFamily;
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setPending(null); return; }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePicker(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closePicker]);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<void> | void) => {
      setPending(key);
      try { await fn(); }
      catch (err) { console.warn("[WalletPicker] action failed", key, err); }
      finally { setPending(null); }
    },
    [],
  );

  const evmAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "evm"),
    [adapter.accounts],
  );
  const solanaAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "solana"),
    [adapter.accounts],
  );

  if (!open) return null;

  const providerSubtitle =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="aomi-wallet-picker-title"
      className="animate-in fade-in-0 absolute inset-0 z-50 flex items-center justify-center px-4 py-4 duration-150"
    >
      <button type="button" aria-label="Close" onClick={closePicker} className="absolute inset-0 cursor-default bg-black/15 dark:bg-black/30" />
      <div className={cn(
        "relative z-10 flex w-full max-w-[360px] flex-col overflow-hidden",
        "border-border/60 bg-popover text-popover-foreground rounded-3xl border shadow-lg",
        "animate-in zoom-in-95 fade-in-0 duration-200",
      )}>
        <div className="border-border/60 relative border-b px-4 pb-3 pt-3">
          <h2 id="aomi-wallet-picker-title" className="text-sm font-semibold tracking-tight">Wallets</h2>
          <p className="text-muted-foreground mt-0.5 pr-7 text-xs leading-snug">
            {identity.isConnected ? "Manage your connected wallets." : "Connect an EVM or Solana wallet."}
          </p>
          <button type="button" onClick={closePicker} aria-label="Close" className={cn(
            "absolute right-3 top-3 rounded-full p-1 transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}>
            <XIcon className="size-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-3">
          {/* Provider section (Para session) */}
          <section className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Provider</span>
            {providers.map((provider) => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                connected={identity.isConnected && provider.id === "para"}
                subtitle={identity.isConnected && provider.id === "para" ? providerSubtitle : provider.description}
                pending={pending}
                onConnect={
                  !identity.isConnected && adapter.canConnect && !provider.disabled
                    ? () => void runAction(`connect-provider:${provider.id}`, async () => { await adapter.connect(); closePicker(); })
                    : undefined
                }
                onManage={
                  identity.isConnected && provider.id === "para" && adapter.canOpenAccountUI && adapter.openAccountUI
                    ? () => void runAction(`manage:${provider.id}`, async () => { await adapter.openAccountUI?.(); closePicker(); })
                    : undefined
                }
              />
            ))}
          </section>

          <FamilySection
            family="evm" accounts={evmAccounts} activeFamily={activeFamily}
            chainId={identity.chainId} pending={pending}
            onSwitchFamily={() => setSelectedFamily("evm")}
            onSelect={(id) => void runAction(`select:${id}`, () => adapter.selectAccount(id))}
            onDisconnect={adapter.disconnect ? (id) => void runAction(`disconnect:${id}`, () => adapter.disconnect!({ accountId: id })) : undefined}
            onConnect={adapter.canConnect ? () => void runAction("connect:evm", async () => { await adapter.connect({ family: "evm" }); closePicker(); }) : undefined}
          />
          <FamilySection
            family="solana" accounts={solanaAccounts} activeFamily={activeFamily}
            pending={pending}
            onSwitchFamily={() => setSelectedFamily("solana")}
            onSelect={(id) => void runAction(`select:${id}`, () => adapter.selectAccount(id))}
            onDisconnect={adapter.disconnect ? () => void runAction("disconnect:solana", () => adapter.disconnect!({ family: "solana" })) : undefined}
            onConnect={adapter.canConnect ? () => void runAction("connect:solana", async () => { await adapter.connect({ family: "solana" }); closePicker(); }) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function ProviderRow({
  provider, connected, subtitle, pending, onConnect, onManage,
}: {
  provider: WalletPickerProviderEntry;
  connected: boolean;
  subtitle?: string;
  pending: string | null;
  onConnect?: () => void;
  onManage?: () => void;
}) {
  const Icon = provider.icon ?? WalletIcon;
  const content = (
    <>
      <span className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl border",
        connected ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 bg-muted/40 text-foreground",
      )}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{provider.label}</span>
        {subtitle && <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">{subtitle}</span>}
      </span>
    </>
  );
  const cardClass = cn(
    "flex items-center gap-3 rounded-2xl border px-2.5 py-2",
    connected ? "border-primary/40 bg-primary/[0.04]" : "border-border/60 bg-background",
    provider.disabled && "opacity-50",
  );
  if (connected) {
    return (
      <div className={cardClass}>
        {content}
        {onManage && (
          <RowIconButton icon={Settings2Icon} ariaLabel="Manage account" disabled={pending !== null} loading={pending === `manage:${provider.id}`} onClick={onManage} />
        )}
      </div>
    );
  }
  return (
    <button type="button" onClick={onConnect} disabled={!onConnect || pending !== null || provider.disabled}
      aria-label={`Connect with ${provider.label}`}
      className={cn(cardClass, "w-full text-left", onConnect ? "cursor-pointer hover:bg-accent/40" : "cursor-default")}>
      {content}
      <span className="text-muted-foreground shrink-0">
        {pending === `connect-provider:${provider.id}` ? <Loader2Icon className="size-4 animate-spin" /> : onConnect ? <ChevronRightIcon className="size-4" /> : null}
      </span>
    </button>
  );
}

type FamilySectionProps = {
  family: WalletFamily;
  accounts: readonly AomiAccount[];
  activeFamily: WalletFamily;
  chainId?: number;
  pending: string | null;
  onSwitchFamily: () => void;
  onSelect: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onConnect?: () => void;
};

function FamilySection({ family, accounts, activeFamily, chainId, pending, onSwitchFamily, onSelect, onDisconnect, onConnect }: FamilySectionProps) {
  const isActiveFamily = family === activeFamily;
  return (
    <section className={cn("flex flex-col gap-1.5", !isActiveFamily && "opacity-60")}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{familyLabel(family)}</span>
        {!isActiveFamily && (
          <button type="button" onClick={onSwitchFamily} className="text-primary text-[11px] hover:underline">
            Switch to {familyLabel(family)}
          </button>
        )}
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground px-1 text-[11px]">No {familyLabel(family)} wallet connected.</p>
      ) : (
        accounts.map((account) => {
          const selectable = isActiveFamily && isAccountSelectable(account, activeFamily);
          const chainTicker = family === "evm" && account.active && chainId ? getChainInfo(chainId)?.ticker : undefined;
          return (
            <div key={account.id} className={cn(
              "flex items-center gap-2 rounded-2xl border px-2.5 py-2",
              account.active ? "border-primary/40 bg-primary/[0.04]" : "border-border/60 bg-background",
            )}>
              <span className="bg-muted/40 text-foreground flex size-8 shrink-0 items-center justify-center rounded-xl"><WalletIcon className="size-4" /></span>
              <button type="button" disabled={!selectable || pending !== null || account.active}
                onClick={() => onSelect(account.id)}
                className={cn("min-w-0 flex-1 text-left", selectable && !account.active ? "cursor-pointer" : "cursor-default")}>
                <span className="block truncate text-sm font-medium">{account.walletName ?? familyLabel(family)}</span>
                <span className="text-muted-foreground block truncate text-[11px]">
                  {[account.label ?? formatAddress(account.address), chainTicker].filter(Boolean).join(" / ")}
                </span>
              </button>
              {account.active && <CheckIcon className="text-primary size-4 shrink-0" />}
              {!account.active && selectable && (pending === `select:${account.id}` ? <Loader2Icon className="size-4 shrink-0 animate-spin" /> : <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />)}
              {onDisconnect && (
                <RowIconButton icon={LogOutIcon} ariaLabel="Disconnect" disabled={pending !== null} loading={
                  family === "evm"
                    ? pending === `disconnect:${account.id}`
                    : pending === "disconnect:solana"
                } onClick={() => onDisconnect(account.id)} />
              )}
            </div>
          );
        })
      )}
      {isActiveFamily && onConnect && (
        <button type="button" onClick={onConnect} disabled={pending !== null}
          className={cn("border-border flex items-center justify-center gap-2 rounded-2xl border border-dashed px-2.5 py-2 text-xs", "text-muted-foreground hover:bg-accent/40")}>
          {(pending === `connect:${family}`) ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Connect {familyLabel(family)} wallet
        </button>
      )}
    </section>
  );
}

function RowIconButton({ icon: Icon, onClick, disabled, loading, ariaLabel }: {
  icon: FC<SVGProps<SVGSVGElement>>; onClick: () => void; disabled?: boolean; loading?: boolean; ariaLabel: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} aria-label={ariaLabel}
      className={cn("rounded-full p-1.5 transition-colors", "text-muted-foreground hover:bg-muted hover:text-foreground", "disabled:pointer-events-none disabled:opacity-50")}>
      {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
    </button>
  );
}
