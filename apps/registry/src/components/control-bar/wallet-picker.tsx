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
import { cn, formatAddress, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter,
  useWalletAdapterRouter,
  type AomiAuthAdapter,
} from "../../lib/aomi-auth-adapter";
import { formatAuthMethod } from "../../lib/aomi-auth-adapter";
import {
  normalizeWalletProviderId,
  useWalletPicker,
  type WalletPickerProvider as WalletPickerProviderEntry,
} from "./wallet-picker-context";

type PendingAction = `${"connect" | "manage" | "disconnect"}:${string}` | null;

export function WalletPicker() {
  const { open, closePicker, providers } = useWalletPicker();
  const fallbackAdapter = useAomiAuthAdapter();
  const router = useWalletAdapterRouter();
  const [pending, setPending] = useState<PendingAction>(null);

  // Resolve the adapter that drives a given picker row.
  // With a router, each row gets its own provider's adapter.
  // Without a router, every row falls back to the single adapter (legacy).
  const getRowAdapter = useCallback(
    (providerId: string): AomiAuthAdapter => {
      if (router) {
        return router.getAdapter(providerId) ?? fallbackAdapter;
      }
      return fallbackAdapter;
    },
    [router, fallbackAdapter],
  );

  // Adapter representing the "currently shown" identity in the trigger /
  // connected summary. With a router, this is the active adapter; without
  // a router, the legacy single adapter.
  const activeAdapter: AomiAuthAdapter = router
    ? router.activeId
      ? (router.getAdapter(router.activeId) ?? fallbackAdapter)
      : fallbackAdapter
    : fallbackAdapter;
  const identity = activeAdapter.identity;

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

  // Which row id should render the "Active" treatment?
  // With a router, prefer the selected connected adapter, then fall back to
  // whichever provider's adapter reports connected.
  // Without a router, it's the legacy provider-id-from-identity match.
  const activeProviderId = router
    ? router.activeId && getRowAdapter(router.activeId).identity.isConnected
      ? router.activeId
      : findConnectedProviderId(providers, getRowAdapter)
    : identity.isConnected
      ? normalizeWalletProviderId(identity.walletProvider)
      : undefined;

  const orderedProviders = useMemo<WalletPickerProviderEntry[]>(() => {
    if (!activeProviderId) return providers;
    const active = providers.find((p) => p.id === activeProviderId);
    if (!active) return providers;
    return [active, ...providers.filter((p) => p.id !== activeProviderId)];
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

  const anyConnected = orderedProviders.some(
    (p) => getRowAdapter(p.id).identity.isConnected,
  );
  const title = anyConnected ? "Wallets" : "Connect a wallet";
  const subtitle = anyConnected
    ? "Switch between, manage, or disconnect a wallet."
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
        {/* Header */}
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

        {/* Provider list */}
        {orderedProviders.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted-foreground text-xs">
              No wallet providers configured.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 p-2">
            {orderedProviders.map((provider) => {
              const rowAdapter = getRowAdapter(provider.id);
              const rowIdentity = rowAdapter.identity;
              const isActive = provider.id === activeProviderId;
              const isBooting =
                rowIdentity.status === "booting" || !rowAdapter.isReady;
              const isClickable = !isActive && !provider.disabled;
              const connectKey: PendingAction = `connect:${provider.id}`;
              const manageKey: PendingAction = `manage:${provider.id}`;
              const disconnectKey: PendingAction = `disconnect:${provider.id}`;
              const anyPending = pending !== null;

              const addressLabel = isActive
                ? formatAddress(rowIdentity.address ?? rowIdentity.svmAddress)
                : undefined;
              const chainLabel = isActive
                ? rowIdentity.chainId
                  ? getChainInfo(rowIdentity.chainId)?.ticker
                  : undefined
                : undefined;
              const authMethodLabel = isActive
                ? formatAuthMethod(rowIdentity.authMethod)
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
                          if (router) router.setActiveId(provider.id);
                          if (provider.onSelect) {
                            await provider.onSelect(rowAdapter);
                          } else if (rowAdapter.canConnect) {
                            await rowAdapter.connect();
                          }
                        },
                        { closeAfter: true },
                      )
                    }
                  />

                  {isActive && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pb-1 pl-[52px] pr-2">
                      {rowAdapter.canOpenAccountUI &&
                        rowAdapter.openAccountUI && (
                          <ActionChip
                            icon={Settings2Icon}
                            label="Manage"
                            variant="default"
                            loading={pending === manageKey}
                            disabled={anyPending}
                            onClick={() =>
                              void runAction(
                                manageKey,
                                async () => {
                                  await rowAdapter.openAccountUI?.();
                                },
                                { closeAfter: true },
                              )
                            }
                          />
                        )}
                      {rowAdapter.canDisconnect && rowAdapter.disconnect && (
                        <ActionChip
                          icon={LogOutIcon}
                          label="Disconnect"
                          variant="muted"
                          loading={pending === disconnectKey}
                          disabled={anyPending}
                          onClick={() =>
                            void runAction(disconnectKey, async () => {
                              await rowAdapter.disconnect?.();
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function findConnectedProviderId(
  providers: WalletPickerProviderEntry[],
  getRowAdapter: (id: string) => AomiAuthAdapter,
): string | undefined {
  for (const p of providers) {
    if (getRowAdapter(p.id).identity.isConnected) return p.id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Provider row
// ---------------------------------------------------------------------------

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
}: ProviderRowProps) {
  const Icon = provider.icon ?? WalletIcon;
  const buttonDisabled = !isClickable || isAnyPending || provider.disabled;

  const subtitle = isBooting
    ? "Connecting…"
    : isActive
      ? [addressLabel, chainLabel, authMethodLabel]
          .filter(Boolean)
          .join(" · ") || provider.description
      : (provider.description ?? "");

  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        isActive
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border/60 bg-background hover:border-border hover:bg-accent/40",
        provider.disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={buttonDisabled}
        aria-label={
          isActive
            ? `${provider.label} (active)`
            : `Connect with ${provider.label}`
        }
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left",
          "focus-visible:ring-ring focus-visible:ring-offset-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isClickable ? "cursor-pointer" : "cursor-default",
        )}
      >
        {/* Icon tile */}
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

        {/* Label + subtitle */}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {provider.label}
            </span>
            {isActive && (
              <span className="bg-primary/15 text-primary inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                <CheckIcon className="size-2.5" />
                Active
              </span>
            )}
          </span>
          {subtitle && (
            <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">
              {subtitle}
            </span>
          )}
        </span>

        {/* Right indicator */}
        <span className="text-muted-foreground shrink-0">
          {isPendingConnect ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : isClickable ? (
            <ChevronRightIcon className="size-4" />
          ) : null}
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action chip
// ---------------------------------------------------------------------------

type ActionChipProps = {
  icon: FC<SVGProps<SVGSVGElement>>;
  label: string;
  variant: "default" | "muted";
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ActionChip({
  icon: Icon,
  label,
  variant,
  loading,
  disabled,
  onClick,
}: ActionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        "focus-visible:ring-ring focus-visible:ring-offset-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        variant === "default"
          ? "border-border/60 bg-background text-foreground hover:bg-accent/60"
          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {loading ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : (
        <Icon className="size-3" />
      )}
      {label}
    </button>
  );
}
