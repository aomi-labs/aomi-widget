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
  const activeEvmAccount = evmAccounts.find((account) => account.active);
  const activeSolanaAccount = solanaAccounts.find((account) => account.active);

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
    const fallbackWallets: WalletAction[] =
      evmWallets.length === 0 &&
      solanaWallets.length === 0 &&
      adapter.canConnect
        ? [
            {
              id: "evm",
              label: "Ethereum wallet",
              family: "evm",
              kind: "evm",
              status: "available",
              ready: true,
              description: "MetaMask, Rabby, Coinbase, and more",
              actionKey: "connect-evm",
              connect: () => adapter.connect({ family: "evm" }),
            },
            {
              id: "solana",
              label: "Solana wallet",
              family: "solana",
              kind: "solana",
              status: "available",
              ready: true,
              description: "Phantom, Solflare, Backpack, and more",
              actionKey: "connect-solana",
              connect: () => adapter.connect({ family: "solana" }),
            },
          ]
        : [];

    return dedupeWalletActions([
      ...evmWallets,
      ...solanaWallets,
      ...fallbackWallets,
    ]).sort((a, b) => {
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
  const hasAdvancedAccount =
    identity.isConnected &&
    (identity.walletProvider || adapter.canOpenAccountUI || providerSubtitle);
  const hasConnectedWallets = Boolean(activeEvmAccount || activeSolanaAccount);

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
          "border-border/70 bg-popover text-popover-foreground rounded-[24px] border text-left shadow-2xl",
          "animate-in zoom-in-95 fade-in-0 duration-200",
        )}
      >
        <div className="border-border/60 flex items-start gap-3 border-b px-4 pb-3 pt-4">
          <span className="bg-muted/60 text-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl">
            <WalletIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="aomi-wallet-picker-title"
              className="text-base font-semibold tracking-tight"
            >
              Select a wallet
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
              Connect with your wallet, or continue with email.
            </p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close"
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5 transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-3.5">
          {hasConnectedWallets ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Connected</SectionLabel>
              {activeEvmAccount ? (
                <FamilyStatusRow
                  family="evm"
                  account={activeEvmAccount}
                  detail={
                    identity.chainId
                      ? getChainInfo(identity.chainId)?.name
                      : undefined
                  }
                  pending={pending}
                  onDisconnect={
                    adapter.disconnect
                      ? () =>
                          void runAction(
                            `disconnect:${activeEvmAccount.id}`,
                            () =>
                              adapter.disconnect!({
                                family: "evm",
                              }),
                            true,
                          )
                      : undefined
                  }
                />
              ) : null}
              {activeSolanaAccount ? (
                <FamilyStatusRow
                  family="solana"
                  account={activeSolanaAccount}
                  detail={identity.solanaCluster?.replace("solana:", "")}
                  pending={pending}
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
                />
              ) : null}
            </section>
          ) : null}

          {walletActions.length ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Wallets</SectionLabel>
              {walletActions.map((wallet) => (
                <WalletActionRow
                  key={`${wallet.family}:${wallet.id}`}
                  wallet={wallet}
                  pending={pending}
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

          {socialLoginOptions.length ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Sign in another way</SectionLabel>
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

          {hasAdvancedAccount ? (
            <section className="flex flex-col gap-1.5">
              <SectionLabel>Advanced</SectionLabel>
              <div className="border-border/60 bg-background flex items-center gap-3 rounded-2xl border px-3 py-2.5">
                <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Settings2Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    Aomi account session
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {providerSubtitle ?? "Provider account controls"}
                  </span>
                </span>
                {adapter.openAccountUI && adapter.canOpenAccountUI ? (
                  <RowIconButton
                    icon={ChevronRightIcon}
                    ariaLabel="Manage account session"
                    disabled={pending !== null}
                    loading={pending === "manage:account"}
                    onClick={() =>
                      void runAction("manage:account", async () => {
                        await adapter.openAccountUI?.();
                        closePicker();
                      })
                    }
                  />
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground px-1 text-[11px] font-medium uppercase tracking-wide">
      {children}
    </span>
  );
}

function FamilyStatusRow({
  family,
  account,
  detail,
  pending,
  onDisconnect,
}: {
  family: WalletFamily;
  account?: AomiAccount;
  detail?: string;
  pending: string | null;
  onDisconnect?: () => void;
}) {
  const disconnectKey =
    family === "evm" && account
      ? `disconnect:${account.id}`
      : "disconnect:solana";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        account
          ? "border-primary/35 bg-primary/[0.04]"
          : "border-border/60 bg-background",
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
          {account ? (
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
  onClick,
}: {
  wallet: WalletAction;
  pending: string | null;
  onClick: () => void;
}) {
  const disabled = wallet.ready === false || pending !== null;
  const showStatus =
    wallet.status === "installed" ||
    wallet.status === "qr" ||
    wallet.status === "unavailable";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Connect ${wallet.label}`}
      className={cn(
        "border-border/60 bg-background hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
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
          {wallet.label}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {wallet.description ??
            (wallet.family === "solana"
              ? "Connect a Solana wallet"
              : "Connect an Ethereum wallet")}
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
        "border-border/60 bg-background hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
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

  if (WalletBrandIcon) {
    return (
      <span
        className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl"
        aria-hidden="true"
        title={label}
      >
        <WalletBrandIcon className="size-6" />
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
