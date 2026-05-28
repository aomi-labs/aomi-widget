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
  ChevronRightIcon,
  Loader2Icon,
  LogOutIcon,
  Settings2Icon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { cn, formatAddress, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatAuthMethod } from "../../lib/aomi-auth-adapter";
import {
  normalizeWalletProviderId,
  useWalletPicker,
  type WalletPickerProvider as WalletPickerProviderEntry,
} from "./wallet-picker-context";

type PendingAction = `${"connect" | "manage" | "disconnect"}:${string}` | null;

export function WalletPicker() {
  const { open, closePicker, providers } = useWalletPicker();
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    if (!open) {
      setPending(null);
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, closePicker]);

  const configuredProviderId = normalizeWalletProviderId(
    identity.walletProvider,
  );
  const activeProviderId = identity.isConnected
    ? configuredProviderId
    : undefined;

  const orderedProviders = useMemo<WalletPickerProviderEntry[]>(() => {
    if (!activeProviderId) return providers;
    const active = providers.find(
      (provider) => provider.id === activeProviderId,
    );
    if (!active) return providers;
    return [
      active,
      ...providers.filter((provider) => provider.id !== activeProviderId),
    ];
  }, [providers, activeProviderId]);

  const runAction = useCallback(
    async <T,>(
      kind: PendingAction,
      fn: () => Promise<T> | T,
      opts: { closeAfter?: boolean } = {},
    ) => {
      if (!kind) return;
      setPending(kind);
      try {
        await fn();
        if (opts.closeAfter) closePicker();
      } catch (err) {
        console.warn("[WalletPicker] action failed", kind, err);
      } finally {
        setPending(null);
      }
    },
    [closePicker],
  );

  if (!open) return null;

  const title = identity.isConnected ? "Wallets" : "Connect a wallet";
  const subtitle = identity.isConnected
    ? "Manage or disconnect your active wallet."
    : "Choose how you'd like to sign in.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aomi-wallet-picker-title"
      className="animate-in fade-in-0 absolute inset-0 z-50 flex items-center justify-center px-4 py-4 duration-150"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closePicker}
        className="absolute inset-0 cursor-default bg-black/15 dark:bg-black/30"
      />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-[360px] flex-col overflow-hidden",
          "border-border/60 bg-popover text-popover-foreground rounded-3xl border shadow-lg",
          "animate-in zoom-in-95 fade-in-0 duration-200",
        )}
      >
        <div className="border-border/60 relative border-b px-4 pb-3 pt-3">
          <h2
            id="aomi-wallet-picker-title"
            className="text-sm font-semibold tracking-tight"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-0.5 pr-7 text-xs leading-snug">
            {subtitle}
          </p>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close"
            className={cn(
              "absolute right-3 top-3 rounded-full p-1 transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
            )}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        <ul className="flex flex-col gap-2 p-2">
          {orderedProviders.map((provider) => {
            const isActive = provider.id === activeProviderId;
            const isConfigured = provider.id === configuredProviderId;
            const isBooting = identity.status === "booting" || !adapter.isReady;
            const isClickable =
              isConfigured &&
              !isActive &&
              !provider.disabled &&
              adapter.canConnect;
            const connectKey: PendingAction = `connect:${provider.id}`;
            const manageKey: PendingAction = `manage:${provider.id}`;
            const disconnectKey: PendingAction = `disconnect:${provider.id}`;
            const anyPending = pending !== null;

            const addressLabel = isActive
              ? formatAddress(identity.address ?? identity.svmAddress)
              : undefined;
            const chainLabel = isActive
              ? identity.chainId
                ? getChainInfo(identity.chainId)?.ticker
                : undefined
              : undefined;
            const authMethodLabel = isActive
              ? formatAuthMethod(identity.authMethod)
              : undefined;

            const onManage =
              isActive && adapter.canOpenAccountUI && adapter.openAccountUI
                ? () =>
                    void runAction(
                      manageKey,
                      async () => {
                        await adapter.openAccountUI?.();
                      },
                      { closeAfter: true },
                    )
                : undefined;
            const onDisconnect =
              isActive && adapter.canDisconnect && adapter.disconnect
                ? () =>
                    void runAction(disconnectKey, async () => {
                      await adapter.disconnect?.();
                    })
                : undefined;

            return (
              <li key={provider.id}>
                <ProviderRow
                  provider={provider}
                  isActive={isActive}
                  isBooting={isBooting}
                  isClickable={isClickable}
                  isPendingConnect={pending === connectKey}
                  isAnyPending={anyPending}
                  addressLabel={addressLabel}
                  chainLabel={chainLabel}
                  authMethodLabel={authMethodLabel}
                  onSelect={() =>
                    void runAction(
                      connectKey,
                      async () => {
                        if (provider.onSelect) {
                          await provider.onSelect(adapter);
                        } else if (isConfigured && adapter.canConnect) {
                          await adapter.connect();
                        }
                      },
                      { closeAfter: true },
                    )
                  }
                  onManage={onManage}
                  isManagePending={pending === manageKey}
                  onDisconnect={onDisconnect}
                  isDisconnectPending={pending === disconnectKey}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type ProviderRowProps = {
  provider: WalletPickerProviderEntry;
  isActive: boolean;
  isBooting: boolean;
  isClickable: boolean;
  isPendingConnect: boolean;
  isAnyPending: boolean;
  addressLabel?: string;
  chainLabel?: string;
  authMethodLabel?: string;
  onSelect: () => void;
  onManage?: () => void;
  isManagePending?: boolean;
  onDisconnect?: () => void;
  isDisconnectPending?: boolean;
};

function ProviderRow({
  provider,
  isActive,
  isBooting,
  isClickable,
  isPendingConnect,
  isAnyPending,
  addressLabel,
  chainLabel,
  authMethodLabel,
  onSelect,
  onManage,
  isManagePending,
  onDisconnect,
  isDisconnectPending,
}: ProviderRowProps) {
  const Icon = provider.icon ?? WalletIcon;

  const subtitle = isBooting
    ? "Connecting..."
    : isActive
      ? [addressLabel, chainLabel, authMethodLabel]
          .filter(Boolean)
          .join(" / ") || provider.description
      : (provider.description ?? "");

  const cardClass = cn(
    "rounded-2xl border transition-colors",
    isActive
      ? "border-primary/40 bg-primary/[0.04]"
      : "border-border/60 bg-background hover:border-border hover:bg-accent/40",
    provider.disabled && !isActive && "opacity-50",
  );

  const innerContent = (
    <>
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 rounded-xl border",
            isActive
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/60 bg-muted/40 text-foreground",
          )}
        />
        <Icon className="relative size-5" />
        {isActive && (
          <span
            aria-hidden
            className="border-popover absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 bg-emerald-500"
          />
        )}
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

  if (isActive) {
    return (
      <div
        className={cn(
          cardClass,
          "flex items-center gap-3 px-2.5 py-2 text-left",
        )}
        aria-label={`${provider.label} (active)`}
      >
        {innerContent}
        <div className="flex shrink-0 items-center gap-0.5">
          {onManage && (
            <RowIconButton
              onClick={onManage}
              disabled={isAnyPending}
              ariaLabel="Manage account"
              loading={!!isManagePending}
              icon={Settings2Icon}
            />
          )}
          {onDisconnect && (
            <RowIconButton
              onClick={onDisconnect}
              disabled={isAnyPending}
              ariaLabel="Disconnect"
              loading={!!isDisconnectPending}
              icon={LogOutIcon}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isClickable || isAnyPending || provider.disabled}
      aria-label={`Connect with ${provider.label}`}
      className={cn(
        cardClass,
        "flex w-full items-center gap-3 px-2.5 py-2 text-left",
        "focus-visible:ring-ring focus-visible:ring-offset-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isClickable ? "cursor-pointer" : "cursor-default",
      )}
    >
      {innerContent}
      <span className="text-muted-foreground shrink-0">
        {isPendingConnect ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : isClickable ? (
          <ChevronRightIcon className="size-4" />
        ) : null}
      </span>
    </button>
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
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
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
