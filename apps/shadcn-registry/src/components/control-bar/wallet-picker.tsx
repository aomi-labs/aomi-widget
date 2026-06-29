"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type SVGProps,
} from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  Loader2Icon,
  LogOutIcon,
  Settings2Icon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter,
  formatAddress,
  formatAuthProvider,
  useWalletActivationGuard,
} from "../../lib/auth-adapter";
import type {
  AomiAccount,
  WalletFamily,
} from "../../lib/auth-adapter/types";
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
  const [pending, setPending] = useState<string | null>(null);
  const canActivateWallet = useWalletActivationGuard();

  useEffect(() => {
    if (!open) {
      setPending(null);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closePicker]);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<void> | void, guard = false) => {
      if (guard && !canActivateWallet()) return;
      setPending(key);
      try {
        await fn();
      } catch (err) {
        console.warn("[WalletPicker] action failed", key, err);
      } finally {
        setPending(null);
      }
    },
    [canActivateWallet],
  );

  const evmAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "evm"),
    [adapter.accounts],
  );
  const solanaAccounts = useMemo(
    () => adapter.accounts.filter((a) => a.family === "solana"),
    [adapter.accounts],
  );
  const activeEvmAccount = evmAccounts.find((account) => account.active);
  const activeSolanaAccount = solanaAccounts.find((account) => account.active);

  if (!open) return null;

  const providerSubtitle =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aomi-wallet-picker-title"
      className="animate-in fade-in-0 fixed inset-0 z-50 flex items-center justify-center px-4 py-4 duration-150"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closePicker}
        className="absolute inset-0 cursor-default bg-slate-950/25 backdrop-blur-sm dark:bg-black/45"
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(720px,92vh)] w-full max-w-[440px] flex-col overflow-hidden",
          "border-border/60 bg-popover text-popover-foreground rounded-[28px] border shadow-2xl",
          "animate-in zoom-in-95 fade-in-0 duration-200",
        )}
      >
        <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_12%_12%,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.88))] px-4 pb-4 pt-4 text-white">
          <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -bottom-16 left-16 size-28 rounded-full bg-cyan-300/10 blur-2xl" />
          <h2
            id="aomi-wallet-picker-title"
            className="relative text-base font-semibold tracking-tight"
          >
            Wallet center
          </h2>
          <p className="relative mt-1 max-w-[310px] pr-7 text-xs leading-snug text-white/70">
            {identity.isConnected
              ? "Choose one active signer per network family without losing the current chat."
              : "Connect EVM and Solana wallets under the same account."}
          </p>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <XIcon className="size-3.5" />
          </button>
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <WalletSummaryCard
              family="evm"
              account={activeEvmAccount}
              active={Boolean(activeEvmAccount)}
              detail={
                activeEvmAccount && identity.chainId
                  ? getChainInfo(identity.chainId)?.ticker
                  : undefined
              }
            />
            <WalletSummaryCard
              family="solana"
              account={activeSolanaAccount}
              active={Boolean(activeSolanaAccount)}
              detail={identity.solanaCluster}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-3">
          {/* Provider section (Para session) */}
          <section className="flex flex-col gap-1.5">
            <span className="text-muted-foreground px-1 text-[11px] font-medium uppercase tracking-wide">
              Account
            </span>
            {providers.map((provider) => (
              <ProviderRow
                key={provider.id}
                provider={provider}
                connected={identity.isConnected && provider.id === "para"}
                subtitle={
                  identity.isConnected && provider.id === "para"
                    ? providerSubtitle
                    : provider.description
                }
                pending={pending}
                onConnect={
                  !identity.isConnected &&
                  adapter.canConnect &&
                  !provider.disabled
                    ? () =>
                        void runAction(
                          `connect-provider:${provider.id}`,
                          async () => {
                            await adapter.connect();
                            closePicker();
                          },
                        )
                    : undefined
                }
                onManage={
                  identity.isConnected &&
                  provider.id === "para" &&
                  adapter.canOpenAccountUI &&
                  adapter.openAccountUI
                    ? () =>
                        void runAction(`manage:${provider.id}`, async () => {
                          await adapter.openAccountUI?.();
                          closePicker();
                        })
                    : undefined
                }
              />
            ))}
          </section>

          <FamilySection
            family="evm"
            accounts={evmAccounts}
            chainId={identity.chainId}
            pending={pending}
            onSelect={(id) =>
              void runAction(
                `select:${id}`,
                () => adapter.selectAccount(id),
                true,
              )
            }
            onDisconnect={
              adapter.disconnect
                ? (id) =>
                    void runAction(
                      `disconnect:${id}`,
                      () => adapter.disconnect!({ accountId: id }),
                      true,
                    )
                : undefined
            }
            onConnect={
              adapter.canConnect
                ? () =>
                    void runAction(
                      "connect:evm",
                      async () => {
                        await adapter.connect({ family: "evm" });
                        closePicker();
                      },
                      true,
                    )
                : undefined
            }
          />
          <FamilySection
            family="solana"
            accounts={solanaAccounts}
            pending={pending}
            onSelect={(id) =>
              void runAction(
                `select:${id}`,
                () => adapter.selectAccount(id),
                true,
              )
            }
            onDisconnect={
              adapter.disconnect
                ? () =>
                    void runAction(
                      "disconnect:solana",
                      () => adapter.disconnect!({ family: "solana" }),
                      true,
                    )
                : undefined
            }
            onConnect={
              adapter.canConnect
                ? () =>
                    void runAction(
                      "connect:solana",
                      async () => {
                        await adapter.connect({ family: "solana" });
                        closePicker();
                      },
                      true,
                    )
                : undefined
            }
          />
          {adapter.connectSolanaWallet && adapter.solanaWallets?.length ? (
            <section className="flex flex-col gap-1.5">
              <span className="text-muted-foreground px-1 text-[11px] font-medium uppercase tracking-wide">
                Available Solana Wallets
              </span>
              {adapter.solanaWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  type="button"
                  disabled={!wallet.ready || pending !== null}
                  onClick={() =>
                    void runAction(
                      `connect-solana:${wallet.name}`,
                      () => adapter.connectSolanaWallet!(wallet.name),
                      true,
                    )
                  }
                  className={cn(
                    "border-border/60 bg-background hover:border-primary/30 hover:bg-accent/40 flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition-colors",
                    !wallet.ready && "opacity-50",
                  )}
                >
                  <span className="bg-muted/40 flex size-8 items-center justify-center rounded-xl">
                    <WalletIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {wallet.name}
                    </span>
                    <span className="text-muted-foreground block text-[11px]">
                      {wallet.installed
                        ? "Installed"
                        : wallet.ready
                          ? "Available"
                          : "Not installed"}
                    </span>
                  </span>
                  {pending === `connect-solana:${wallet.name}` ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ChevronRightIcon className="text-muted-foreground size-4" />
                  )}
                </button>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WalletSummaryCard({
  family,
  account,
  active,
  detail,
}: {
  family: WalletFamily;
  account?: AomiAccount;
  active: boolean;
  detail?: string;
}) {
  const shortAddress = account
    ? formatAddress(account.address)
    : "Not connected";
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 text-left",
        active
          ? "bg-white/16 border-cyan-300/50 text-white shadow-[0_12px_28px_rgba(8,47,73,0.28)]"
          : "text-white/72 border-white/10 bg-white/[0.07]",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          {family === "solana" ? "SOL" : "EVM"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            active ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-white/60",
          )}
        >
          {active ? "Connected" : "Not connected"}
        </span>
      </span>
      <span className="mt-3 block truncate text-sm font-semibold">
        {shortAddress}
      </span>
      <span className="mt-1 block truncate text-[11px] text-white/55">
        {account?.walletName ?? detail ?? "Connect signer"}
      </span>
    </div>
  );
}

function ProviderRow({
  provider,
  connected,
  subtitle,
  pending,
  onConnect,
  onManage,
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
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border",
          connected
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border/60 bg-muted/40 text-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">
          {provider.label}
        </span>
        {subtitle && (
          <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">
            {subtitle}
          </span>
        )}
      </span>
    </>
  );
  const cardClass = cn(
    "flex items-center gap-3 rounded-2xl border px-2.5 py-2",
    connected
      ? "border-primary/40 bg-primary/[0.04]"
      : "border-border/60 bg-background",
    provider.disabled && "opacity-50",
  );
  if (connected) {
    return (
      <div className={cardClass}>
        {content}
        {onManage && (
          <RowIconButton
            icon={Settings2Icon}
            ariaLabel="Manage account"
            disabled={pending !== null}
            loading={pending === `manage:${provider.id}`}
            onClick={onManage}
          />
        )}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={!onConnect || pending !== null || provider.disabled}
      aria-label={`Connect with ${provider.label}`}
      className={cn(
        cardClass,
        "w-full text-left",
        onConnect ? "hover:bg-accent/40 cursor-pointer" : "cursor-default",
      )}
    >
      {content}
      <span className="text-muted-foreground shrink-0">
        {pending === `connect-provider:${provider.id}` ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : onConnect ? (
          <ChevronRightIcon className="size-4" />
        ) : null}
      </span>
    </button>
  );
}

type FamilySectionProps = {
  family: WalletFamily;
  accounts: readonly AomiAccount[];
  chainId?: number;
  pending: string | null;
  onSelect: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onConnect?: () => void;
};

function FamilySection({
  family,
  accounts,
  chainId,
  pending,
  onSelect,
  onDisconnect,
  onConnect,
}: FamilySectionProps) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {familyLabel(family)}
        </span>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground px-1 text-[11px]">
          No {familyLabel(family)} wallet connected.
        </p>
      ) : (
        accounts.map((account) => {
          // Any non-active account in this family can be selected to make it
          // the live signer; the active one is shown with a check.
          const selectable = !account.active;
          const chainTicker =
            family === "evm" && account.active && chainId
              ? getChainInfo(chainId)?.ticker
              : undefined;
          return (
            <div
              key={account.id}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-2.5 py-2",
                account.active
                  ? "border-primary/40 bg-primary/[0.04]"
                  : "border-border/60 bg-background",
              )}
            >
              <span className="bg-muted/40 text-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
                <WalletIcon className="size-4" />
              </span>
              <button
                type="button"
                disabled={!selectable || pending !== null || account.active}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "min-w-0 flex-1 text-left",
                  selectable && !account.active
                    ? "cursor-pointer"
                    : "cursor-default",
                )}
              >
                <span className="block truncate text-sm font-medium">
                  {account.walletName ?? familyLabel(family)}
                </span>
                <span className="text-muted-foreground block truncate text-[11px]">
                  {[
                    account.label ?? formatAddress(account.address),
                    chainTicker,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
              </button>
              {account.active && (
                <CheckIcon className="text-primary size-4 shrink-0" />
              )}
              {!account.active &&
                selectable &&
                (pending === `select:${account.id}` ? (
                  <Loader2Icon className="size-4 shrink-0 animate-spin" />
                ) : (
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                ))}
              {onDisconnect && (
                <RowIconButton
                  icon={LogOutIcon}
                  ariaLabel="Disconnect"
                  disabled={pending !== null}
                  loading={
                    family === "evm"
                      ? pending === `disconnect:${account.id}`
                      : pending === "disconnect:solana"
                  }
                  onClick={() => onDisconnect(account.id)}
                />
              )}
            </div>
          );
        })
      )}
      {onConnect && (
        <button
          type="button"
          onClick={onConnect}
          disabled={pending !== null}
          className={cn(
            "border-border flex items-center justify-center gap-2 rounded-2xl border border-dashed px-2.5 py-2 text-xs",
            "text-muted-foreground hover:bg-accent/40",
          )}
        >
          {pending === `connect:${family}` ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : null}
          Connect {familyLabel(family)} wallet
        </button>
      )}
    </section>
  );
}

function RowIconButton({
  icon: Icon,
  onClick,
  disabled,
  loading,
  ariaLabel,
}: {
  icon: FC<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {loading ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <Icon className="size-3.5" />
      )}
    </button>
  );
}
