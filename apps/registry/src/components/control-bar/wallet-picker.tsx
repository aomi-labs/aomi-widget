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
  MailIcon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter,
  formatAddress,
  formatAuthProvider,
  useWalletActivationGuard,
} from "../../lib/aomi-auth-adapter";
import { getWalletIcon } from "../icons";
import type {
  AomiAccount,
  AomiWalletOption,
  WalletFamily,
} from "../../lib/aomi-auth-adapter/types";
import { useWalletPicker } from "./wallet-picker-context";

type WalletAction = AomiWalletOption & {
  actionKey: string;
  connect: () => Promise<void>;
};

const MORE_WALLET_OPTIONS_ID = "more-wallet-options";

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "Solana" : "Ethereum";
}

function familyShortLabel(family: WalletFamily): string {
  return family === "solana" ? "SOL" : "ETH";
}

function walletStatusLabel(option: AomiWalletOption): string {
  if (option.status === "installed") return "Installed";
  if (option.status === "qr") return "QR code";
  if (option.status === "unavailable") return "Not installed";
  return "Ready";
}

function statusRank(option: AomiWalletOption): number {
  if (option.status === "installed") return 0;
  if (option.status === "available") return 1;
  if (option.status === "qr") return 2;
  return 3;
}

function walletDisplayRank(option: AomiWalletOption): number {
  const id = option.id.toLowerCase();
  const label = option.label.toLowerCase();
  if (id === MORE_WALLET_OPTIONS_ID) return 30;
  if (id.includes("metamask") || label.includes("metamask")) return 0;
  if (id.includes("rabby") || label.includes("rabby")) return 1;
  if (id.includes("phantom") || label.includes("phantom")) return 2;
  if (id.includes("solflare") || label.includes("solflare")) return 3;
  if (id.includes("backpack") || label.includes("backpack")) return 4;
  if (id.includes("coinbase") || label.includes("coinbase")) return 5;
  if (id.includes("walletconnect") || label.includes("walletconnect")) return 6;
  return 20;
}

function walletAliasKey(
  wallet: Pick<AomiWalletOption, "id" | "label">,
): string {
  const value = `${wallet.id} ${wallet.label}`.toLowerCase();
  if (value.includes("rabby")) return "rabby";
  if (value.includes("metamask")) return "metamask";
  if (value.includes("coinbase")) return "coinbase";
  if (value.includes("walletconnect")) return "walletconnect";
  if (value.includes("rainbow")) return "rainbow";
  if (value.includes("phantom")) return "phantom";
  if (value.includes("solflare")) return "solflare";
  if (value.includes("backpack")) return "backpack";
  return wallet.label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function dedupeWalletActions(actions: readonly WalletAction[]): WalletAction[] {
  const seen = new Set<string>();
  const result: WalletAction[] = [];

  for (const action of actions) {
    const key = walletAliasKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result;
}

function walletActionIsVisible(wallet: WalletAction): boolean {
  if (wallet.id === MORE_WALLET_OPTIONS_ID) return true;
  if (wallet.ready === false || wallet.status === "unavailable") return false;
  if (wallet.family === "evm" && wallet.status !== "installed") return false;
  return true;
}

export function WalletPicker() {
  const { open, closePicker } = useWalletPicker();
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const [pending, setPending] = useState<string | null>(null);
  const canActivateWallet = useWalletActivationGuard();

  useEffect(() => {
    if (!open) {
      setPending(null);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
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
  const connectedAccounts = useMemo(
    () => (identity.isConnected ? [...evmAccounts, ...solanaAccounts] : []),
    [evmAccounts, identity.isConnected, solanaAccounts],
  );

  const walletActions = useMemo<WalletAction[]>(() => {
    const evmWallets =
      adapter.evmWallets?.map((wallet) => ({
        ...wallet,
        actionKey: `connect-evm:${wallet.id}`,
        connect: async () => {
          if (adapter.connectEvmWallet) {
            await adapter.connectEvmWallet(wallet.id);
            return;
          }
          await adapter.connect({ family: "evm" });
        },
      })) ?? [];
    const solanaWallets =
      adapter.solanaWallets?.map((wallet) => ({
        id: wallet.name,
        label: wallet.name,
        family: "solana" as const,
        kind: "solana" as const,
        status: wallet.installed
          ? ("installed" as const)
          : wallet.ready
            ? ("available" as const)
            : ("unavailable" as const),
        installed: wallet.installed,
        ready: wallet.ready,
        iconUrl: wallet.iconUrl,
        description: "Connect a Solana wallet",
        actionKey: `connect-solana:${wallet.name}`,
        connect: async () => {
          if (adapter.connectSolanaWallet) {
            await adapter.connectSolanaWallet(wallet.name);
            return;
          }
          await adapter.connect({ family: "solana" });
        },
      })) ?? [];
    const moreWalletOptions: WalletAction[] = adapter.canConnect
      ? [
          {
            id: MORE_WALLET_OPTIONS_ID,
            label: "More wallet options",
            family: "multichain",
            kind: "walletconnect",
            status: "available",
            ready: true,
            description: "Open the full wallet list",
            actionKey: "connect-more-wallets",
            connect: async () => {
              if (adapter.connectEvmWallet) {
                await adapter.connectEvmWallet(MORE_WALLET_OPTIONS_ID);
                return;
              }
              await adapter.connect();
            },
          },
        ]
      : [];

    return dedupeWalletActions([
      ...evmWallets,
      ...solanaWallets,
      ...moreWalletOptions,
    ])
      .filter(walletActionIsVisible)
      .sort((a, b) => {
        const priority = walletDisplayRank(a) - walletDisplayRank(b);
        if (priority !== 0) return priority;
        return statusRank(a) - statusRank(b) || a.label.localeCompare(b.label);
      });
  }, [
    adapter,
    adapter.canConnect,
    adapter.connectEvmWallet,
    adapter.connectSolanaWallet,
    adapter.evmWallets,
    adapter.solanaWallets,
  ]);

  const socialLoginOptions = adapter.socialLoginOptions ?? [];
  const providerSubtitle =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);
  const hasConnectedWallets = connectedAccounts.length > 0;
  const hasManageAccount = identity.isConnected;
  const pickerTitle = hasConnectedWallets
    ? "Manage wallets"
    : "Select a wallet";
  const pickerDescription = hasConnectedWallets
    ? "Switch wallets or link another one."
    : "Sign in quickly, or connect a wallet.";

  if (!open) return null;

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
          "relative z-10 flex max-h-[min(720px,92vh)] w-full max-w-[430px] flex-col overflow-hidden",
          "border-border/80 bg-popover text-popover-foreground rounded-[24px] border text-left shadow-2xl ring-1 ring-black/[0.03]",
          "animate-in zoom-in-95 fade-in-0 duration-200",
        )}
      >
        <div className="border-border/70 bg-background/80 flex items-start gap-3 border-b px-4 pb-3 pt-4">
          <span className="bg-muted/70 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl">
            <WalletIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="aomi-wallet-picker-title"
              className="text-foreground text-base font-semibold tracking-tight"
            >
              {pickerTitle}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
              {pickerDescription}
            </p>
          </div>
          <div className="flex h-8 shrink-0 items-center gap-1.5">
            {hasManageAccount ? (
              <ManageAccountButton
                pending={pending}
                canOpen={Boolean(
                  adapter.openAccountUI && adapter.canOpenAccountUI,
                )}
                providerSubtitle={providerSubtitle}
                onClick={() =>
                  void runAction("manage:account", async () => {
                    await adapter.openAccountUI?.();
                    closePicker();
                  })
                }
              />
            ) : null}
            <button
              type="button"
              onClick={closePicker}
              aria-label="Close"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-3.5">
          {socialLoginOptions.length ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Quick sign-in</SectionLabel>
              {socialLoginOptions.map((option) => (
                <SocialLoginRow
                  key={option.id}
                  option={option}
                  pending={pending}
                  onClick={() =>
                    void runAction(`social:${option.id}`, async () => {
                      if (adapter.connectSocial) {
                        await adapter.connectSocial(option.id);
                      } else {
                        await adapter.connect();
                      }
                      closePicker();
                    })
                  }
                />
              ))}
            </section>
          ) : null}

          {hasConnectedWallets ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Connected</SectionLabel>
              {connectedAccounts.map((account) => (
                <FamilyStatusRow
                  key={`${account.family}:${account.id}`}
                  family={account.family}
                  account={account}
                  detail={
                    account.family === "evm" &&
                    account.active &&
                    identity.chainId
                      ? getChainInfo(identity.chainId)?.name
                      : account.family === "solana"
                        ? identity.solanaCluster?.replace("solana:", "")
                        : undefined
                  }
                  pending={pending}
                  onSelect={
                    account.family === "evm" && !account.active
                      ? () =>
                          void runAction(
                            `select:${account.id}`,
                            () => adapter.selectAccount(account.id),
                            true,
                          )
                      : undefined
                  }
                  onDisconnect={
                    adapter.disconnect
                      ? () =>
                          void runAction(
                            `disconnect:${account.id}`,
                            () =>
                              adapter.disconnect!({
                                ...(account.family === "evm"
                                  ? { accountId: account.id }
                                  : { family: "solana" as const }),
                              }),
                            true,
                          )
                      : undefined
                  }
                />
              ))}
            </section>
          ) : null}

          {walletActions.length ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>
                {hasConnectedWallets ? "Link additional wallets" : "Wallets"}
              </SectionLabel>
              {walletActions.map((wallet) => (
                <WalletActionRow
                  key={`${wallet.family}:${wallet.id}`}
                  wallet={wallet}
                  pending={pending}
                  linkedMode={hasConnectedWallets}
                  onClick={() =>
                    void runAction(
                      wallet.actionKey,
                      async () => {
                        await wallet.connect();
                        closePicker();
                      },
                      true,
                    )
                  }
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground/90 px-1 text-[11px] font-semibold uppercase tracking-wide">
      {children}
    </span>
  );
}

function ManageAccountButton({
  pending,
  canOpen,
  providerSubtitle,
  onClick,
}: {
  pending: string | null;
  canOpen: boolean;
  providerSubtitle?: string | null;
  onClick: () => void;
}) {
  const disabled = pending !== null || !canOpen;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Manage your account"
      title={
        providerSubtitle
          ? `Signed in with ${providerSubtitle}`
          : "Aomi account settings"
      }
      className={cn(
        "border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-70",
      )}
    >
      {pending === "manage:account" ? (
        <Loader2Icon className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <UserRoundIcon className="size-3.5 shrink-0" />
      )}
      <span>Account</span>
    </button>
  );
}

function FamilyStatusRow({
  family,
  account,
  detail,
  pending,
  onSelect,
  onDisconnect,
}: {
  family: WalletFamily;
  account?: AomiAccount;
  detail?: string;
  pending: string | null;
  onSelect?: () => void;
  onDisconnect?: () => void;
}) {
  const disconnectKey =
    family === "evm" && account
      ? `disconnect:${account.id}`
      : "disconnect:solana";
  const selectKey = account ? `select:${account.id}` : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        account?.active
          ? "border-primary/35 bg-primary/[0.05]"
          : "border-border/70 bg-card",
      )}
    >
      {account ? (
        <WalletIconSlot
          id={account.id}
          label={account.walletName ?? familyLabel(family)}
        />
      ) : (
        <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold">
          {familyShortLabel(family)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {account?.walletName ?? familyLabel(family)}
          </span>
          {account?.active ? (
            <CheckIcon className="text-primary size-3.5 shrink-0" />
          ) : null}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {account
            ? [account.label ?? formatAddress(account.address), detail]
                .filter(Boolean)
                .join(" / ")
            : "Not connected"}
        </span>
      </span>
      {account?.active ? (
        <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
          Active
        </span>
      ) : onSelect ? (
        <RowIconButton
          icon={ChevronRightIcon}
          ariaLabel={`Make ${account?.walletName ?? familyLabel(family)} active`}
          disabled={pending !== null}
          loading={pending === selectKey}
          onClick={onSelect}
        />
      ) : null}
      {onDisconnect ? (
        <RowIconButton
          icon={LogOutIcon}
          ariaLabel={`Disconnect ${familyLabel(family)} wallet`}
          disabled={pending !== null}
          loading={pending === disconnectKey}
          onClick={onDisconnect}
        />
      ) : null}
    </div>
  );
}

function WalletActionRow({
  wallet,
  pending,
  linkedMode,
  onClick,
}: {
  wallet: WalletAction;
  pending: string | null;
  linkedMode: boolean;
  onClick: () => void;
}) {
  const disabled = wallet.ready === false || pending !== null;
  const showStatus =
    wallet.status === "installed" ||
    wallet.status === "qr" ||
    wallet.status === "unavailable";
  const actionVerb = linkedMode ? "Link" : "Connect";
  const description =
    wallet.description ??
    (wallet.family === "solana"
      ? `${actionVerb} a Solana wallet`
      : `${actionVerb} an Ethereum wallet`);
  const visibleLabel =
    linkedMode && wallet.id === MORE_WALLET_OPTIONS_ID
      ? "Connect or link additional wallets"
      : wallet.label;
  const visibleDescription =
    linkedMode && wallet.id === MORE_WALLET_OPTIONS_ID
      ? "Open the full wallet list"
      : linkedMode
        ? description.replace(/^Connect /, "Link ")
        : description;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${actionVerb} ${wallet.label}`}
      className={cn(
        "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <WalletIconSlot
        iconUrl={wallet.iconUrl}
        id={wallet.id}
        label={wallet.label}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {visibleLabel}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {visibleDescription}
        </span>
      </span>
      {showStatus ? (
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {walletStatusLabel(wallet)}
        </span>
      ) : null}
      {pending === wallet.actionKey ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin" />
      ) : (
        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
      )}
    </button>
  );
}

function SocialLoginRow({
  option,
  pending,
  onClick,
}: {
  option: AomiWalletOption;
  pending: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending !== null || option.ready === false}
      onClick={onClick}
      aria-label={option.label}
      className={cn(
        "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
        <MailIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {option.label}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {option.description ?? "Use an Aomi account"}
        </span>
      </span>
      {pending === `social:${option.id}` ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin" />
      ) : (
        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
      )}
    </button>
  );
}

function WalletIconSlot({
  iconUrl,
  id,
  label,
}: {
  iconUrl?: string;
  id?: string;
  label: string;
}) {
  const WalletBrandIcon = getWalletIcon(`${id ?? ""} ${label}`);
  const isPhantom = `${id ?? ""} ${label}`.toLowerCase().includes("phantom");

  if (WalletBrandIcon) {
    return (
      <span
        className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl"
        aria-hidden="true"
        title={label}
      >
        <WalletBrandIcon className={isPhantom ? "size-[27.6px]" : "size-6"} />
      </span>
    );
  }

  if (iconUrl) {
    return (
      <span className="bg-muted/50 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <img src={iconUrl} alt="" className="size-6 object-contain" />
      </span>
    );
  }

  return (
    <span
      className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl"
      aria-hidden="true"
      title={label}
    >
      <WalletIcon className="size-4" />
    </span>
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
