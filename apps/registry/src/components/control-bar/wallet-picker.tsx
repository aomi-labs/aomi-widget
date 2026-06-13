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
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  PlusIcon,
  Settings2Icon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import {
  useAomiAuthAdapter,
  canonicalWalletKey,
  formatAddress,
  formatAuthProvider,
  formatWalletProvider,
  normalizeWalletOptionId,
  useWalletActivationGuard,
} from "../../lib/aomi-auth-adapter";
import type {
  AomiAccount,
  AomiWalletOption,
  WalletFamily,
} from "../../lib/aomi-auth-adapter/types";
import { WalletIconSlot } from "./wallet-icon-slot";
import { useWalletPicker } from "./wallet-picker-context";

type WalletAction = AomiWalletOption & {
  actionKey: string;
  connect: () => Promise<void>;
};

const GENERIC_BROWSER_WALLET_ID = "generic-browser-wallet";

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "Solana" : "Ethereum";
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
  if (id === GENERIC_BROWSER_WALLET_ID) return 30;
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
  const combined = `${wallet.id} ${wallet.label}`;
  const brandKey = canonicalWalletKey(combined);
  // canonicalWalletKey echoes the normalized input when no brand matched —
  // key on the label alone in that case so connector uids don't fragment it.
  return brandKey === normalizeWalletOptionId(combined)
    ? canonicalWalletKey(wallet.label)
    : brandKey;
}

/**
 * Dedup is family-scoped: a dual-chain wallet like Phantom must survive once as
 * an EVM option and once as a Solana option, so its Solana side stays reachable.
 */
function walletFamilyAliasKey(
  wallet: Pick<AomiWalletOption, "id" | "label" | "family">,
): string {
  const family = wallet.family === "multichain" ? "multichain" : wallet.family;
  return `${family}:${walletAliasKey(wallet)}`;
}

function isGenericBrowserWallet(
  wallet: Pick<AomiWalletOption, "connectorId" | "id" | "label">,
): boolean {
  const label = normalizeWalletOptionId(wallet.label);
  const id = normalizeWalletOptionId(wallet.id);
  const connectorId = normalizeWalletOptionId(wallet.connectorId ?? "");
  return (
    label === "browserwallet" || id === "injected" || connectorId === "injected"
  );
}

function dedupeWalletActions(actions: readonly WalletAction[]): WalletAction[] {
  const seen = new Set<string>();
  const result: WalletAction[] = [];

  for (const action of actions) {
    const key = walletFamilyAliasKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result;
}

function walletActionIsVisible(wallet: WalletAction): boolean {
  if (wallet.id === GENERIC_BROWSER_WALLET_ID) return true;
  if (wallet.ready === false || wallet.status === "unavailable") return false;
  if (wallet.family === "evm" && wallet.status !== "installed") {
    const key = canonicalWalletKey(`${wallet.id} ${wallet.label}`);
    return key === "coinbase" || key === "basewallet" || key === "base";
  }
  return true;
}

/**
 * Actions that open their own surface (WalletConnect QR, provider handoffs).
 * The picker should close immediately for these instead of flashing success.
 */
function isExternalHandoff(wallet: WalletAction): boolean {
  return wallet.kind === "walletconnect";
}

export function WalletPicker() {
  const { open, closePicker } = useWalletPicker();
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const canActivateWallet = useWalletActivationGuard();

  useEffect(() => {
    if (!open) {
      setPending(null);
      setActionError(null);
      setAddOpen(false);
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
      setActionError(null);
      try {
        await fn();
      } catch (err) {
        console.warn("[WalletPicker] action failed", key, err);
        setActionError(
          err instanceof Error && err.message
            ? err.message
            : "Wallet action failed",
        );
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
  const canManageAccounts = Boolean(
    adapter.openAccountUI && adapter.canOpenAccountUI,
  );

  const walletActions = useMemo<WalletAction[]>(() => {
    const mappedEvmWallets =
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
    const browserWallet = mappedEvmWallets.find(isGenericBrowserWallet);
    const evmWallets = mappedEvmWallets.filter(
      (wallet) => !isGenericBrowserWallet(wallet),
    );
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
    const genericBrowserWallet: WalletAction[] = adapter.canConnect
      ? [
          {
            id: GENERIC_BROWSER_WALLET_ID,
            connectorId: browserWallet?.connectorId ?? "injected",
            label: "Browser wallet",
            family: "evm",
            kind: "evm",
            status: browserWallet?.status ?? "available",
            ready: browserWallet?.ready ?? true,
            installed: browserWallet?.installed,
            iconUrl: browserWallet?.iconUrl,
            description: "Connect an Ethereum wallet",
            actionKey: "connect-browser-wallet",
            connect: async () => {
              if (browserWallet) {
                await browserWallet.connect();
                return;
              }
              if (adapter.connectEvmWallet) {
                await adapter.connectEvmWallet("injected");
                return;
              }
              await adapter.connect({ family: "evm" });
            },
          },
        ]
      : [];

    return dedupeWalletActions([
      ...evmWallets,
      ...solanaWallets,
      ...genericBrowserWallet,
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

  // Brands already connected, scoped by family. A connected EVM Phantom should
  // hide the EVM "add" row but still leave its Solana entry connectable.
  const connectedFamilyBrandKeys = useMemo(() => {
    const set = new Set<string>();
    for (const account of connectedAccounts) {
      const name = account.walletName ?? "";
      set.add(
        walletFamilyAliasKey({ id: name, label: name, family: account.family }),
      );
    }
    return set;
  }, [connectedAccounts]);

  const addableWalletActions = useMemo(
    () =>
      walletActions.filter(
        (wallet) =>
          wallet.id === GENERIC_BROWSER_WALLET_ID ||
          !connectedFamilyBrandKeys.has(walletFamilyAliasKey(wallet)),
      ),
    [walletActions, connectedFamilyBrandKeys],
  );

  const socialLoginOptions = adapter.socialLoginOptions ?? [];
  const providerSubtitle =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);
  // Social sign-in goes through the account provider (Para), so the row reads
  // as the provider brand ("Para") with the method ("Email or Google") beneath.
  const providerBrandLabel = formatWalletProvider(identity.walletProvider);
  const hasConnectedWallets = connectedAccounts.length > 0;
  // The provider sign-in row (Para / "Email or Google") shows whenever Para is
  // NOT connected — so it stays reachable to (re)connect even alongside other
  // wallets — and hides once Para itself is connected.
  const paraAccountConnected = connectedAccounts.some((a) => a.manageable);
  const socialOptionsToShow = paraAccountConnected ? [] : socialLoginOptions;
  const hasManageAccount = identity.isConnected;
  const pickerTitle = hasConnectedWallets
    ? "Manage wallets"
    : "Select a wallet";
  const pickerDescription = hasConnectedWallets
    ? "Switch wallets or link another one."
    : "Sign in quickly, or connect a wallet.";

  const quickSignInSection = socialOptionsToShow.length ? (
    <section className="flex flex-col gap-1.5">
      <SectionLabel>Quick sign-in</SectionLabel>
      {socialOptionsToShow.map((option) => (
        <SocialLoginRow
          key={option.id}
          option={option}
          pending={pending}
          brandLabel={providerBrandLabel}
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
  ) : null;

  const renderConnectedRow = (account: AomiAccount) => {
    const solanaCluster = identity.solanaCluster?.replace("solana:", "");
    const chainDetail =
      account.family === "evm"
        ? (getChainInfo(account.chainId)?.name ??
          getChainInfo(identity.chainId)?.name)
        : solanaCluster
          ? solanaCluster.charAt(0).toUpperCase() + solanaCluster.slice(1)
          : undefined;
    // The group header already states the family; only surface a chain/cluster
    // when it adds something (e.g. "Base", "mainnet") beyond that family name.
    const detail =
      chainDetail && chainDetail !== familyLabel(account.family)
        ? chainDetail
        : undefined;
    return (
      <FamilyStatusRow
        key={`${account.family}:${account.id}`}
        family={account.family}
        account={account}
        detail={detail}
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
          adapter.disconnect && !account.manageable
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
        onManage={
          account.manageable && canManageAccounts
            ? () =>
                void runAction(`manage:${account.id}`, async () => {
                  await adapter.openAccountUI?.({ family: account.family });
                  closePicker();
                })
            : undefined
        }
      />
    );
  };

  const connectedSection = hasConnectedWallets ? (
    <section className="flex flex-col gap-1.5">
      <SectionLabel>Connected</SectionLabel>
      {connectedAccounts.map(renderConnectedRow)}
    </section>
  ) : null;

  const renderWalletActionRow = (wallet: WalletAction) => (
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
            // WalletConnect/provider handoffs open their own surface, so the
            // picker steps aside. Direct connects stay open — the new wallet
            // simply appears in the connected list — and the add-list collapses.
            if (isExternalHandoff(wallet)) {
              closePicker();
            } else {
              setAddOpen(false);
            }
          },
          true,
        )
      }
    />
  );

  // Connect options render as one flat list — EVM brands, then Solana brands,
  // then the generic browser-wallet row — with no separators between families.
  const renderGroupedActions = (actions: WalletAction[]) => {
    const ordered = [
      ...actions.filter(
        (a) => a.family === "evm" && a.id !== GENERIC_BROWSER_WALLET_ID,
      ),
      ...actions.filter((a) => a.family === "solana"),
      ...actions.filter((a) => a.family !== "evm" && a.family !== "solana"),
      ...actions.filter((a) => a.id === GENERIC_BROWSER_WALLET_ID),
    ];
    return ordered.map(renderWalletActionRow);
  };

  const addWalletSection = addableWalletActions.length ? (
    hasConnectedWallets ? (
      <section className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setAddOpen((value) => !value)}
          aria-expanded={addOpen}
          aria-label="Add another wallet"
          className={cn(
            "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
          )}
        >
          <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
            <PlusIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              Add another wallet
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">
              Link an Ethereum or Solana wallet
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-300 ease-out",
              addOpen && "rotate-180",
            )}
          />
        </button>
        <div
          aria-hidden={!addOpen}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            addOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1.5 pt-1.5">
              {renderGroupedActions(addableWalletActions)}
            </div>
          </div>
        </div>
      </section>
    ) : (
      <section className="flex flex-col gap-1.5">
        <SectionLabel>Wallets</SectionLabel>
        {renderGroupedActions(addableWalletActions)}
      </section>
    )
  ) : null;

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

        <div className="flex flex-col gap-3 overflow-y-auto p-3.5">
          {actionError ? (
            <div
              role="alert"
              className="border-destructive/25 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-xs leading-snug"
            >
              {actionError}
            </div>
          ) : null}
          {hasConnectedWallets ? (
            <>
              {connectedSection}
              {(quickSignInSection || addWalletSection) && (
                <div className="bg-border/70 h-px" aria-hidden="true" />
              )}
              {quickSignInSection}
              {addWalletSection}
            </>
          ) : (
            <>
              {quickSignInSection}
              {addWalletSection}
            </>
          )}
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

/**
 * Compact per-row indicator of the wallet's execution family (EVM vs SVM). The
 * chip stays neutral; a small family-tinted dot carries the colour cue so it
 * reads as intentional without a loud full-colour pill.
 */
function FamilyTag({ family }: { family: WalletFamily }) {
  const isSolana = family === "solana";
  return (
    <span
      className="text-muted-foreground/70 inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
      title={isSolana ? "Solana (SVM)" : "Ethereum (EVM)"}
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      {isSolana ? "SVM" : "EVM"}
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
  onManage,
}: {
  family: WalletFamily;
  account: AomiAccount;
  detail?: string;
  pending: string | null;
  onSelect?: () => void;
  onDisconnect?: () => void;
  onManage?: () => void;
}) {
  const disconnectKey =
    family === "evm" ? `disconnect:${account.id}` : "disconnect:solana";
  const manageKey = `manage:${account.id}`;
  const selectKey = `select:${account.id}`;
  const name = account.walletName ?? familyLabel(family);
  const selectable = Boolean(onSelect);
  const isSelecting = pending === selectKey;

  const inner = (
    <>
      <WalletIconSlot id={account.id} label={name} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium">{name}</span>
          <FamilyTag family={family} />
          {account.active ? (
            <CheckIcon className="text-primary size-3.5 shrink-0" />
          ) : null}
        </span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {[account.label ?? formatAddress(account.address), detail]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "group flex items-center rounded-2xl border transition-colors duration-200",
        account.active
          ? "border-primary/35 bg-primary/[0.05]"
          : "border-border/70 bg-card",
        selectable &&
          "hover:border-primary/40 hover:bg-accent/40 has-[:focus-visible]:border-primary/50",
      )}
    >
      {selectable ? (
        <button
          type="button"
          onClick={onSelect}
          disabled={pending !== null}
          aria-label={`Make ${name} active`}
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none",
            "disabled:cursor-default",
          )}
        >
          {inner}
          {isSelecting ? (
            <span className="ml-1 flex shrink-0 items-center">
              <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
            </span>
          ) : null}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
          {inner}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1 py-2.5 pl-1 pr-2.5">
        {onManage ? (
          <RowIconButton
            icon={Settings2Icon}
            ariaLabel={`Manage ${name}`}
            disabled={pending !== null}
            loading={pending === manageKey}
            onClick={onManage}
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
  const visibleDescription = linkedMode
    ? description.replace(/^Connect /, "Link ")
    : description;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${actionVerb} ${wallet.label}`}
      className={cn(
        "border-border/70 bg-card hover:border-primary/30 hover:bg-accent/40 flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
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
  brandLabel,
  onClick,
}: {
  option: AomiWalletOption;
  pending: string | null;
  /** Account-provider brand (e.g. "Para") shown as the row title, with the
   * sign-in method ("Email or Google") beneath it. Falls back to the method
   * label + mail icon when the provider has no brand. */
  brandLabel?: string;
  onClick: () => void;
}) {
  const title = brandLabel ?? option.label;
  const subtitle = brandLabel
    ? option.label
    : (option.description ?? "Use an Aomi account");
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
      {brandLabel ? (
        <WalletIconSlot id={brandLabel} label={brandLabel} />
      ) : (
        <span className="bg-muted/50 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
          <MailIcon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-[11px]">
          {subtitle}
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
