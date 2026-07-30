"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type {
  DelegationGrant,
  LinkedVia,
  SignerMode,
  WalletPolicy,
} from "./types";
import { shortenAddress } from "./account-api";
import {
  TriangleAlert as Alert,
  Zap as Bolt,
  Check,
  ChevronDown,
  Copy,
  KeyRound as Key,
  Loader2,
  Lock,
  RefreshCw as Rerun,
  Star,
  UserRound as User,
} from "lucide-react";

interface AccountSigningViewProps {
  accountId: string;
  email: string;
  wallets: WalletPolicy[];
  grants: DelegationGrant[];
  /** Run the permit ceremony. Rejects with a user-facing message. */
  onCommit: (wallet: WalletPolicy, mode: SignerMode) => Promise<void>;
  onRevokeGrant: (grant: DelegationGrant) => Promise<void>;
  onStopAllAuto: () => Promise<void>;
  onConnectPrivy: () => Promise<void>;
  onRegrant: (wallet: WalletPolicy) => Promise<void>;
  /** Why a target mode can't be signed right now, or null when it can. */
  blockedReason?: (wallet: WalletPolicy, mode: SignerMode) => string | null;
}

type IconType = ComponentType<{ size?: number; className?: string }>;
type Custody = "self" | "embedded";
type SortKey = "custody" | "chain";
type ProviderIdentity = { name: string; color: string };

/** The "pink" signer authorities — the ACL a wallet may be set to. */
const MODES: { id: SignerMode; label: string; hint: string; Icon: IconType }[] = [
  {
    id: "manual",
    label: "Manual",
    hint: "You approve every transaction in your wallet — nothing signs without you.",
    Icon: User,
  },
  {
    id: "client_auto",
    label: "Accept transactions",
    hint: "Your own key auto-signs transactions with no prompt each time — Aomi never holds the key.",
    Icon: Key,
  },
  {
    id: "auto",
    label: "Auto",
    hint: "Aomi's delegated signer acts on your behalf with no prompt, so scheduled and background actions can run. Needs an active delegation grant.",
    Icon: Bolt,
  },
  {
    id: "denied",
    label: "Locked",
    hint: "Freezes this wallet — it can never sign until you change this.",
    Icon: Lock,
  },
];

/**
 * rdns → display brand, captured at connect (EIP-6963 / wallet-adapter).
 * Display-only decoration on top of the `linkedVia` proof. Unknown → fall back
 * to the provenance tag.
 */
const BRANDS: Record<string, ProviderIdentity> = {
  "io.metamask": { name: "MetaMask", color: "#E2761B" },
  "io.rabby": { name: "Rabby", color: "#7084FF" },
  "com.coinbase.wallet": { name: "Coinbase", color: "#2C5FF6" },
  "app.phantom": { name: "Phantom", color: "#AB9FF2" },
  "app.backpack": { name: "Backpack", color: "#E33E3F" },
};

const EMBEDDED_PROVIDERS: Partial<Record<LinkedVia, ProviderIdentity>> = {
  privy: { name: "Privy", color: "#7C6AF2" },
  para: { name: "Para", color: "#5B8DEF" },
};

/** Busy/error key for the account-wide "stop all auto-signing" action. */
const STOP_ALL_KEY = "__stop_all__";
const CONNECT_PRIVY_KEY = "__connect_privy__";

const CUSTODY_GROUPS: { key: Custody; label: string }[] = [
  { key: "self", label: "Self-custody wallets" },
  { key: "embedded", label: "Embedded wallets" },
];

function custodyOf(v: LinkedVia): Custody {
  return v === "siwe" || v === "siws" ? "self" : "embedded";
}

/** Provider provenance as an EVM-style tag label. */
function providerBadgeLabel(v: LinkedVia): string {
  return v.toUpperCase();
}

/** The custody axis, shown as muted text beside the provider tag. */
function custodyLabel(v: LinkedVia): string {
  return custodyOf(v) === "self" ? "self-custody" : "embedded";
}

/**
 * Which modes this wallet may hold at all — the structural axis, distinct from
 * "can you sign the change right now" (that's `blockedReason`). Backend truth
 * wins where the wire carries it: `providerManaged` keys hold no user key
 * material, so the client-side modes are meaningless for them, and `canUseAuto`
 * already folds in provenance *and* a live grant.
 */
function modeValidFor(wallet: WalletPolicy, mode: SignerMode): boolean {
  if (wallet.providerManaged) return mode === "auto" || mode === "denied";
  if (mode === "denied" || mode === "manual") return true;
  // client_auto needs a client-side signer, not self-custody provenance.
  // Embedded login wallets such as Para can still sign locally through their
  // provider SDK; only provider-managed agent wallets lack user-held material.
  if (mode === "client_auto") return true;
  // auto — fall back to custody only for rows that predate the capability flag.
  return wallet.canUseAuto ?? custodyOf(wallet.linkedVia) === "embedded";
}

/** Why a mode is greyed out for this wallet — shown under the hint. */
function unavailableReason(wallet: WalletPolicy, mode: SignerMode): string {
  if (wallet.providerManaged) {
    return "This is a provider-managed signer — you hold no key for it.";
  }
  if (mode === "auto") return "Needs a provider-delegated wallet (Para or Privy).";
  return "Not available for this wallet.";
}

type Recon =
  | { status: "reconciled"; detail: string }
  | { status: "drifted"; detail: string; action: string };

/** Desired ACL × capability → what the runtime can actually honor right now. */
function reconcile(wallet: WalletPolicy): Recon {
  switch (wallet.desiredMode) {
    case "denied":
      return { status: "reconciled", detail: "Locked — this wallet can't sign." };
    case "manual":
      return { status: "reconciled", detail: "You approve every transaction." };
    case "client_auto":
      return { status: "reconciled", detail: "Your wallet auto-signs each transaction." };
    case "auto":
      return wallet.grantActive
        ? {
            status: "reconciled",
            detail: `Aomi auto-signs · grant valid to ${wallet.grantExpiresLabel ?? "—"}.`,
          }
        : {
            status: "drifted",
            detail: "You want auto — the runtime fell back to manual.",
            action: "Re-grant",
          };
  }
}

export function AccountSigningView({
  accountId,
  email,
  wallets,
  grants,
  onCommit,
  onRevokeGrant,
  onStopAllAuto,
  onConnectPrivy,
  onRegrant,
  blockedReason,
}: AccountSigningViewProps) {
  const [drafts, setDrafts] = useState<Record<string, SignerMode>>({});
  const [sortBy, setSortBy] = useState<SortKey>("custody");
  // Collapsed by default — a wallet that drifted opens itself so the fix is
  // visible. Wallets arrive asynchronously, so this seeds on each new row
  // rather than once at mount; an explicit collapse is never re-opened.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [seeded, setSeeded] = useState<Record<string, true>>({});
  const [flashId, setFlashId] = useState<string | null>(null);
  /** Per-wallet ceremony state, keyed by wallet id. */
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fresh = wallets.filter((w) => !seeded[w.id]);
    if (fresh.length === 0) return;
    setSeeded((s) => {
      const next = { ...s };
      for (const w of fresh) next[w.id] = true;
      return next;
    });
    const drifted = fresh.filter((w) => reconcile(w).status === "drifted");
    if (drifted.length === 0) return;
    setExpanded((e) => {
      const next = { ...e };
      for (const w of drifted) next[w.id] = true;
      return next;
    });
  }, [wallets, seeded]);

  /**
   * Run an async action with per-row busy + error reporting. Resolves to
   * whether it succeeded — a rejected wallet signature is an expected outcome
   * here, not an exception to propagate.
   */
  const run = async (id: string, action: () => Promise<void>): Promise<boolean> => {
    setBusy((b) => ({ ...b, [id]: true }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
    try {
      await action();
      return true;
    } catch (cause) {
      setErrors((e) => ({
        ...e,
        [id]: cause instanceof Error ? cause.message : "Something went wrong",
      }));
      return false;
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[id];
        return next;
      });
    }
  };

  const posture = useMemo(() => {
    let attention = 0;
    for (const w of wallets) {
      const r = reconcile(w);
      if (r.status === "drifted") attention += 1;
    }
    // The grants list carries history (revoked/expired rows explain *why* an
    // auto policy stopped reconciling), so the headline count must be the live
    // ones only — otherwise a revoked grant still reads as capability.
    const liveGrants = grants.filter((g) => g.status === "active").length;
    return { attention, liveGrants };
  }, [wallets, grants]);

  const groups = useMemo(() => {
    if (sortBy === "custody") {
      return CUSTODY_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        wallets: wallets.filter((wallet) => custodyOf(wallet.linkedVia) === group.key),
      })).filter((g) => g.wallets.length > 0);
    }
    return (["evm", "svm"] as const)
      .map((c) => ({
        key: c as string,
        label: c === "evm" ? "Ethereum" : "Solana",
        wallets: wallets.filter((w) => w.chain === c),
      }))
      .filter((g) => g.wallets.length > 0);
  }, [wallets, sortBy]);

  const toggleExpanded = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  /** Posture chip → scroll to the first drifted wallet, open and flash it. */
  const jumpToAttention = () => {
    const target = wallets.find((w) => reconcile(w).status === "drifted");
    if (!target) return;
    setExpanded((e) => ({ ...e, [target.id]: true }));
    setFlashId(target.id);
    window.setTimeout(() => setFlashId(null), 1600);
    // Scroll after React commits the expansion, or the layout shifts mid-scroll.
    // Scroll the modal's own container — scrollIntoView is unreliable with
    // nested scroll areas (it can pick the chat pane behind the modal).
    window.setTimeout(() => {
      const card = document.getElementById(`wallet-${target.id}`);
      const container = card?.closest(".overflow-y-auto");
      if (!card || !container) return;
      const cardRect = card.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      // Instant, not smooth — smooth is unreliable here (no-ops under
      // reduced-motion/automation), and the flash ring shows where we landed.
      container.scrollTo({
        top:
          container.scrollTop +
          (cardRect.top - contRect.top) -
          (contRect.height - cardRect.height) / 2,
      });
    }, 80);
  };

  const setDraft = (id: string, mode: SignerMode) =>
    setDrafts((d) => ({ ...d, [id]: mode }));

  const cancelDraft = (id: string) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });

  const connectPrivy = () => {
    void run(CONNECT_PRIVY_KEY, onConnectPrivy);
  };

  const walletById = (id: string) => wallets.find((w) => w.id === id);

  /**
   * Sign and commit the permit. The row does not move optimistically — the
   * refreshed `signing_mode` from the backend is the only thing that flips it,
   * so a rejected or CAS-failed permit can never look applied.
   */
  const commit = async (id: string) => {
    const mode = drafts[id];
    const wallet = walletById(id);
    if (!mode || !wallet) return;
    const ok = await run(id, () => onCommit(wallet, mode));
    if (ok) cancelDraft(id);
  };

  const regrant = (id: string) => {
    const wallet = walletById(id);
    if (!wallet) return;
    void run(id, () => onRegrant(wallet));
  };

  const revokeGrant = (grantId: string) => {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) return;
    void run(grantId, () => onRevokeGrant(grant));
  };

  const stopAllAuto = () => {
    void run(STOP_ALL_KEY, onStopAllAuto);
  };

  /** Whether anything can currently sign — revoked and expired rows cannot. */
  const hasActiveGrant = grants.some((grant) => grant.status === "active");

  return (
    <div className="flex-1 overflow-y-auto px-[22px] py-5">
      <div className="flex flex-col gap-6">
        {/* Status band — identity + a summary grid of the account's posture */}
        <div className="overflow-hidden rounded-xl border border-aomi-border bg-aomi-bg/40">
          <div className="flex flex-col gap-1 p-4">
            <span className="text-sm font-medium">{email}</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-aomi-muted">
              {accountId}
              <button
                aria-label="Copy account ID"
                onClick={() => void navigator.clipboard?.writeText(accountId)}
                className="text-aomi-muted/60 transition-colors hover:text-aomi-fg"
              >
                <Copy size={11} />
              </button>
            </span>
          </div>

          <div
            className={`grid gap-px border-t border-aomi-border bg-aomi-border ${
              posture.attention > 0 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            <PostureStat
              label={wallets.length === 1 ? "Wallet" : "Wallets"}
              value={wallets.length}
            />
            <PostureStat
              label={`Active ${posture.liveGrants === 1 ? "grant" : "grants"}`}
              value={posture.liveGrants}
              tone={posture.liveGrants > 0 ? "success" : "muted"}
            />
            {posture.attention > 0 && (
              <PostureStat
                label="Needs attention"
                value={posture.attention}
                tone="accent"
                onClick={jumpToAttention}
              />
            )}
          </div>

          <p className="border-t border-aomi-border p-4 text-[13px] leading-relaxed text-aomi-muted">
            You authorize who may sign for each wallet. Aomi reconciles the runtime
            to match — changes are signed authorizations, not toggles.
          </p>
        </div>

        {/* Wallet policies */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Wallet signing policy</span>
              <span className="text-[13px] text-aomi-muted">
                Choose how each wallet signs transactions.
              </span>
            </div>
            <SortSwitch value={sortBy} onChange={setSortBy} />
          </div>

          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <span className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-aomi-muted/80">
                  {group.label}
                </span>
                {group.wallets.map((wallet) => (
                  <WalletPolicyCard
                    key={wallet.id}
                    wallet={wallet}
                    sortBy={sortBy}
                    draft={drafts[wallet.id]}
                    expanded={Boolean(expanded[wallet.id])}
                    flash={flashId === wallet.id}
                    busy={Boolean(busy[wallet.id])}
                    error={errors[wallet.id]}
                    blockedReason={blockedReason}
                    onToggle={() => toggleExpanded(wallet.id)}
                    onDraft={(mode) => setDraft(wallet.id, mode)}
                    onCommit={() => void commit(wallet.id)}
                    onCancel={() => cancelDraft(wallet.id)}
                    onRegrant={() => regrant(wallet.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Delegated grants — the capability axis */}
        <Section
          title="Delegated signing grants"
          desc="These grants are what let an “Aomi auto” policy actually reconcile. Revoke to force those wallets back to manual."
        >
          {/* Keyed on "nothing can sign", not "no rows": revoked and expired
              grants stay in the list as history, and gating on `length === 0`
              stranded the account after a revoke — a dead row and no way to
              grant again. */}
          {!hasActiveGrant && (
            <div className="rounded-xl border border-dashed border-aomi-border px-4 py-3 text-[13px] text-aomi-muted">
              <p>
                {grants.length === 0
                  ? "No delegated grants — nothing can sign on your behalf right now."
                  : "No active delegation — nothing can sign on your behalf right now."}
              </p>
              <button
                className="mt-3 rounded-lg bg-aomi-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                disabled={Boolean(busy[CONNECT_PRIVY_KEY])}
                onClick={connectPrivy}
                type="button"
              >
                {busy[CONNECT_PRIVY_KEY]
                  ? "Opening Privy…"
                  : grants.length === 0
                    ? "Connect Privy delegation"
                    : "Reconnect Privy delegation"}
              </button>
            </div>
          )}
          {errors[CONNECT_PRIVY_KEY] && (
            <p className="text-[13px] text-aomi-danger">
              {errors[CONNECT_PRIVY_KEY]}
            </p>
          )}
          {grants.map((grant) => (
            <GrantRow
              key={grant.id}
              grant={grant}
              busy={Boolean(busy[grant.id])}
              error={errors[grant.id]}
              onRevoke={() => revokeGrant(grant.id)}
            />
          ))}
          {hasActiveGrant && (
            <button
              onClick={stopAllAuto}
              disabled={Boolean(busy[STOP_ALL_KEY])}
              className="mt-1 flex items-center gap-3 rounded-xl border border-aomi-accent-outline bg-aomi-accent-tint px-4 py-3 text-left transition-colors hover:bg-aomi-accent-tint disabled:opacity-60"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-aomi-accent-tint text-aomi-accent">
                {busy[STOP_ALL_KEY] ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Lock size={15} />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium text-aomi-accent">Stop all auto-signing</span>
                <span className="text-xs text-aomi-muted">
                  Revokes every grant. Your ACL stays “auto”, but the runtime drifts to
                  manual until you re-grant.
                </span>
              </span>
            </button>
          )}
          {errors[STOP_ALL_KEY] && (
            <p className="text-[13px] text-aomi-danger">{errors[STOP_ALL_KEY]}</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function WalletPolicyCard({
  wallet,
  sortBy,
  draft,
  expanded,
  flash,
  busy,
  error,
  blockedReason,
  onToggle,
  onDraft,
  onCommit,
  onCancel,
  onRegrant,
}: {
  wallet: WalletPolicy;
  sortBy: SortKey;
  draft?: SignerMode;
  expanded: boolean;
  flash: boolean;
  busy: boolean;
  error?: string;
  blockedReason?: (wallet: WalletPolicy, mode: SignerMode) => string | null;
  onToggle: () => void;
  onDraft: (mode: SignerMode) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRegrant: () => void;
}) {
  const selected = draft ?? wallet.desiredMode;
  const pending = draft !== undefined && draft !== wallet.desiredMode;
  // Signability of the *pending* change: why the connected wallet can't sign it.
  const blocked = pending ? (blockedReason?.(wallet, selected) ?? null) : null;
  const recon = reconcile(wallet);
  // A ceremony in flight keeps the editor open.
  const open = expanded || pending;
  const currentMode = MODES.find((m) => m.id === wallet.desiredMode);
  const providerIdentity =
    (wallet.rdns ? BRANDS[wallet.rdns] : undefined) ??
    EMBEDDED_PROVIDERS[wallet.linkedVia];
  const custody = custodyLabel(wallet.linkedVia);
  const showChainTag = sortBy !== "chain";
  const showProviderTag = sortBy === "chain" || Boolean(providerIdentity);
  const showCustodyLabel = sortBy === "chain" && Boolean(custody);

  return (
    <div
      id={`wallet-${wallet.id}`}
      className={`overflow-hidden rounded-xl border bg-aomi-bg/40 transition-colors ${
        flash ? "border-aomi-accent ring-1 ring-aomi-accent" : "border-aomi-border"
      }`}
    >
      {/* Row — collapsed summary; click to open the editor */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`flex cursor-pointer items-center justify-between gap-3 p-4 ${
          open ? "border-b border-aomi-border" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {showProviderTag && (
            <ProviderTag linkedVia={wallet.linkedVia} brand={providerIdentity} />
          )}
          <span className="truncate font-mono text-sm font-medium">
            {shortenAddress(wallet.address)}
          </span>
          {showChainTag && <ChainLabel chain={wallet.chain} />}
          {showCustodyLabel && <span className="text-[11px] text-aomi-muted">{custody}</span>}
          {wallet.primary && (
            <span className="flex items-center gap-1 text-[11px] text-aomi-muted">
              <Star size={12} className="text-aomi-accent" />
              primary
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          {!open && currentMode && (
            <span className="flex items-center gap-1.5 rounded-full border border-aomi-border bg-aomi-surface-2 px-2.5 py-1 text-[11px] font-medium">
              <currentMode.Icon size={12} />
              {currentMode.label}
            </span>
          )}
          <ReconPill recon={recon} pending={pending} />
          {!open && recon.status === "drifted" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegrant();
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-aomi-accent-outline px-3 py-1.5 text-[13px] font-medium text-aomi-accent transition-colors hover:bg-aomi-accent-tint disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Rerun size={12} />
              )}
              {recon.action}
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-aomi-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Signing mode editor — only when open */}
      {open && (
        <div className="flex flex-col gap-3 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-aomi-muted">
            Signing mode
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {MODES.map((mode) => {
              const valid = modeValidFor(wallet, mode.id);
              const isSelected = selected === mode.id;
              return (
                <div key={mode.id} className="relative">
                  <button
                    disabled={!valid}
                    onClick={() => onDraft(mode.id)}
                    className={`flex h-[72px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border px-2 text-center transition-colors ${
                      isSelected
                        ? "border-transparent bg-aomi-accent-subtle text-aomi-fg"
                        : "border-aomi-border text-aomi-muted hover:text-aomi-fg"
                    } ${!valid ? "cursor-not-allowed opacity-35 hover:text-aomi-muted" : ""} ${
                      isSelected && pending ? "ring-1 ring-aomi-accent" : ""
                    }`}
                  >
                    <mode.Icon size={16} className={isSelected ? "text-aomi-accent-strong" : ""} />
                    <span className="flex items-center gap-1 text-[11px] font-medium leading-tight">
                      {isSelected && <Check size={11} />}
                      {mode.label}
                    </span>
                  </button>
                  {/* Hover ? — what this mode means for the user */}
                  <span className="peer/hint absolute right-2.5 top-2.5 z-10 flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-aomi-border text-[11px] font-medium leading-none text-aomi-muted transition-colors hover:border-aomi-muted hover:text-aomi-fg">
                    ?
                  </span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-40 -translate-x-1/2 rounded-lg border border-aomi-overlay-border bg-aomi-surface-2 px-2.5 py-2 text-left text-[11px] leading-snug text-aomi-fg peer-hover/hint:block">
                    {mode.hint}
                    {!valid && (
                      <span className="mt-1 block text-aomi-muted">
                        {unavailableReason(wallet, mode.id)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reconciliation / ceremony line */}
          {pending ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-aomi-accent-outline bg-aomi-accent-tint px-3 py-2.5">
              <span className="text-[13px] text-aomi-fg">
                {blocked ?? "Authorization change — sign the permit to apply."}
              </span>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={onCancel}
                  disabled={busy}
                  className="rounded-lg px-2.5 py-1.5 text-[13px] text-aomi-muted transition-colors hover:text-aomi-fg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onCommit}
                  disabled={busy || Boolean(blocked)}
                  className="flex items-center gap-1.5 rounded-lg border border-transparent bg-aomi-accent-strong px-4 py-2 text-[13px] font-medium text-aomi-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy && <Loader2 size={13} className="animate-spin" />}
                  {busy ? "Waiting for signature…" : "Sign to authorize"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-aomi-muted">{recon.detail}</span>
              {recon.status === "drifted" && (
                <button
                  onClick={onRegrant}
                  disabled={busy}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-aomi-accent-outline px-4 py-2 text-[13px] font-medium text-aomi-accent transition-colors hover:bg-aomi-accent-tint disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Rerun size={13} />
                  )}
                  {recon.action}
                </button>
              )}
            </div>
          )}

          {error && <span className="text-[13px] text-aomi-danger">{error}</span>}

          {/* Audit meta */}
          <span className="text-[11px] text-aomi-muted/80">
            Last updated {wallet.lastPermit?.replace(/^you · /, "") ?? "—"}
          </span>
        </div>
      )}
    </div>
  );
}

function GrantRow({
  grant,
  busy,
  error,
  onRevoke,
}: {
  grant: DelegationGrant;
  busy: boolean;
  error?: string;
  onRevoke: () => void;
}) {
  const live = grant.status === "active";
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-aomi-border bg-aomi-bg/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={grant.provider} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium">
            {grant.provider} · {grant.kind}
          </span>
          <span className="truncate text-xs text-aomi-muted">{grant.scope}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className={`text-xs ${live ? "text-aomi-success" : "text-aomi-muted"}`}>
            {grant.status === "active"
              ? `valid to ${grant.expiresLabel}`
              : grant.status === "expired"
                ? `expired ${grant.expiresLabel}`
                : "revoked"}
          </span>
          {live && (
            <button
              onClick={onRevoke}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full border border-transparent bg-aomi-danger-strong px-4 py-2 text-[13px] font-medium text-aomi-on-danger transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Revoke
            </button>
          )}
        </div>
      </div>
      {error && <span className="text-[13px] text-aomi-danger">{error}</span>}
    </div>
  );
}

function ProviderLogo({ provider }: { provider: string }) {
  const containerClass =
    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg";

  if (provider === "Privy") {
    return (
      <span className={`${containerClass} bg-[#FF7F73] text-[#05030F]`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="9.5" r="5.6" fill="currentColor" />
          <ellipse cx="12" cy="18.5" rx="4" ry="0.9" fill="currentColor" />
        </svg>
      </span>
    );
  }

  if (provider === "Para") {
    return (
      <span className={`${containerClass} bg-[#FF4E00]/15 text-[#FF4E00]`}>
        <svg aria-hidden="true" viewBox="0 0 26 25" className="h-5 w-5">
          <path
            fill="currentColor"
            d="M16.7506 0.114342H7.01716V13.267C7.01716 14.2305 6.24304 15.0128 5.28576 15.0128H0V23.8289H8.74337V18.4992C8.74337 17.5357 9.51749 16.7534 10.4748 16.7534H16.8854C21.4904 16.7534 25.2124 12.9517 25.1363 8.29101C25.0603 3.63032 21.2761 0.114342 16.7506 0.114342Z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${containerClass} bg-aomi-surface-2 text-[13px] font-semibold text-aomi-muted`}>
      {provider.slice(0, 1)}
    </span>
  );
}

function SortSwitch({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <span className="text-[11px] text-aomi-muted">Sort by</span>
      <div className="flex rounded-full border border-aomi-border bg-aomi-surface-2 p-[3px]">
        {(["custody", "chain"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`rounded-full px-3.5 py-[5px] text-xs capitalize transition-colors ${
              value === k
                ? "bg-aomi-accent-strong font-medium text-aomi-on-accent"
                : "text-aomi-muted hover:text-aomi-fg"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReconPill({ recon, pending }: { recon: Recon; pending: boolean }) {
  if (pending) {
    return (
      <span className="flex flex-shrink-0 items-center gap-1.5 text-[13px] text-aomi-danger">
        <span className="h-[7px] w-[7px] rounded-full bg-aomi-danger" />
        Awaiting signature
      </span>
    );
  }
  // Reconciled is the silent default — nothing to show when the runtime already
  // honors the ACL. Only drift is worth surfacing.
  if (recon.status === "reconciled") return null;
  return (
    <span className="flex flex-shrink-0 items-center gap-1.5 text-[13px] text-aomi-accent">
      <Alert size={13} />
      Needs attention
    </span>
  );
}

function ChainLabel({ chain }: { chain: "evm" | "svm" }) {
  return (
    <span
      className={`text-[11px] font-semibold ${
        chain === "evm" ? "text-aomi-info" : "text-aomi-success"
      }`}
    >
      {chain === "evm" ? "EVM" : "SVM"}
    </span>
  );
}

function ProviderTag({
  linkedVia,
  brand,
}: {
  linkedVia: LinkedVia;
  brand?: { name: string; color: string };
}) {
  if (brand) {
    return (
      <span className="flex items-center gap-1 rounded-lg border border-aomi-border bg-aomi-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aomi-fg">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: brand.color }}
        />
        {brand.name}
      </span>
    );
  }
  return (
    <span className="rounded-lg border border-aomi-border bg-aomi-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aomi-muted">
      {providerBadgeLabel(linkedVia)}
    </span>
  );
}

/** One cell of the posture summary grid — label over a big value, hairline-ruled. */
function PostureStat({
  label,
  value,
  tone = "muted",
  onClick,
}: {
  label: string;
  value: number;
  tone?: "muted" | "success" | "accent";
  onClick?: () => void;
}) {
  const valueClass =
    tone === "success" ? "text-aomi-success" : tone === "accent" ? "text-aomi-accent-strong" : "text-aomi-fg";

  const body = (
    <>
      <span className="text-[11px] text-aomi-muted">{label}</span>
      <span className={`font-mono text-lg font-semibold ${valueClass}`}>{value}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-start gap-0.5 bg-aomi-bg/40 px-4 py-3 text-left transition-colors hover:bg-aomi-hover"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-0.5 bg-aomi-bg/40 px-4 py-3">{body}</div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] text-aomi-muted">{desc}</span>
      </div>
      {children}
    </div>
  );
}
