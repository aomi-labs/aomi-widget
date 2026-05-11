"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AomiPaymentMethod } from "@aomi-labs/client";
import { useControl } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProviderKeysSettings } from "@/components/settings/provider-keys-settings";

export type MppStatus =
  | "disabled"
  | "wallet_required"
  | "unsupported_wallet"
  | "not_connected"
  | "connecting"
  | "ready"
  | "needs_top_up"
  | "needs_reconnect"
  | "error";

export type X402Status = "disabled" | "wallet_required" | "ready";

export type PaymentSettingsCredits = {
  remaining: number;
  total: number;
  lastUpdated?: string;
};

export type PaymentSettingsStatus = {
  isLoading: boolean;
  isRefreshing: boolean;
  isConnectingMpp: boolean;
  isClearingMpp: boolean;
  mppStatus: MppStatus;
  mppStatusText: string;
  mppReceiptId: string | null;
  mppCachePresent: boolean;
  mppLastError: string | null;
  x402Status: X402Status;
  x402StatusText: string;
  refreshPaymentStatus: () => Promise<void>;
  /** Refreshes cached overview state. No longer triggers a chat-time handshake. */
  connectMpp: () => Promise<void>;
  clearMppCache: () => Promise<void>;
  /** Optional credits balance; renders a usage bar when supplied. */
  credits?: PaymentSettingsCredits;
};

export type PaymentSettingsToggles = {
  mppEnabled: boolean;
  setMppEnabled: (enabled: boolean) => void;
  x402Enabled: boolean;
  setX402Enabled: (enabled: boolean) => void;
  /**
   * Legacy "preferred default method" seed. The new layout no longer renders
   * a settings-level picker — per-thread method selection lives in
   * `<PaymentSelect>` in the composer. Kept as optional props so existing
   * shims (e.g. portal) keep compiling.
   */
  preferredPaymentMethod?: AomiPaymentMethod | null;
  setPreferredPaymentMethod?: (method: AomiPaymentMethod | null) => void;
};

export type PaymentSettingsProps = {
  /** Payment-status snapshot. Host owns polling, refresh, and clear. */
  status: PaymentSettingsStatus;
  /** Persistent toggle/preference state. Host owns persistence. */
  toggles: PaymentSettingsToggles;
  /**
   * BYOK section.
   * - `undefined` (default): renders bundled `<ProviderKeysSettings />`
   *   (matches the portal Payments panel exactly). Requires
   *   `ControlContextProvider` upstream — same as today's behavior.
   * - `false`: hide the BYOK section entirely (no `useControl` requirement).
   * - `ReactNode`: render the supplied node in place of `<ProviderKeysSettings />`.
   *
   * Effect on the fallback chain visualizer's BYOK segment:
   * - `undefined` (default): probe reads `useControl().state.providerKeys`
   *   and dims the segment when no keys are saved, otherwise active.
   * - `false`: BYOK is unavailable — segment is **dimmed**.
   * - `ReactNode`: host owns the BYOK UI, so we have no signal — segment is
   *   rendered in a neutral state (neither dimmed nor active).
   */
  providerKeys?: ReactNode | false;
};

const TONE_PILL: Record<
  "neutral" | "success" | "warning" | "danger",
  string
> = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

function StatusPill({
  label,
  tone,
}: Readonly<{
  label: string;
  tone: keyof typeof TONE_PILL;
}>) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE_PILL[tone]}`}
    >
      {label}
    </span>
  );
}

function statusTone(status: string): keyof typeof TONE_PILL {
  switch (status) {
    case "ready":
      return "success";
    case "needs_top_up":
    case "needs_reconnect":
      return "warning";
    case "error":
      return "danger";
    default:
      return "neutral";
  }
}

type ChainSegmentState = "active" | "dimmed" | "neutral";

function ChainSegment({
  label,
  state,
  isLast,
}: {
  label: string;
  state: ChainSegmentState;
  isLast: boolean;
}) {
  const stateClass =
    state === "active"
      ? "border-foreground bg-foreground text-background"
      : state === "dimmed"
        ? "border-border bg-muted text-muted-foreground/60"
        : "border-border bg-background text-muted-foreground";
  return (
    <>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium ${stateClass}`}
      >
        {label}
      </span>
      {isLast ? null : (
        <span className="text-muted-foreground text-xs" aria-hidden>
          →
        </span>
      )}
    </>
  );
}

/**
 * Probes BYOK availability via `useControl().state.providerKeys`. Rendered
 * ONLY on the default-BYOK code path, so the `useControl()` call site is
 * itself unconditional from React's perspective (the conditional lives at the
 * parent's render level, on whether this component appears in the tree).
 *
 * `useControl()` throws outside its provider; `useByokProbe` catches the
 * throw because hosts are allowed to render `<PaymentSettings>` with
 * `providerKeys={false}` outside a `ControlContextProvider`. For the default
 * path the provider is always present.
 */
function ByokAvailabilityProbe({
  onResult,
}: {
  onResult: (available: boolean) => void;
}) {
  const available = useByokProbe();
  useEffect(() => {
    if (available !== null) onResult(available);
  }, [available, onResult]);
  return null;
}

function useByokProbe(): boolean | null {
  // `useControl()` is a single `useContext` call internally; it manually
  // throws when the provider is missing. We catch that throw to allow
  // mounting `<PaymentSettings>` outside the provider with a custom or
  // disabled BYOK slot. From React's perspective the hook call site itself
  // is unconditional; the throw doesn't change hook order.
  let ctx: ReturnType<typeof useControl> | null = null;
  try {
    ctx = useControl();
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  return Object.keys(ctx.state.providerKeys ?? {}).length > 0;
}

function CreditsBar({ credits }: { credits: PaymentSettingsCredits }) {
  const ratio =
    credits.total > 0
      ? Math.max(0, Math.min(1, credits.remaining / credits.total))
      : 0;
  return (
    <div className="space-y-1">
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-foreground h-full"
          style={{ width: `${(ratio * 100).toFixed(1)}%` }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>
          {credits.remaining.toLocaleString()} of{" "}
          {credits.total.toLocaleString()} remaining
        </span>
        {credits.lastUpdated ? (
          <span>Updated {credits.lastUpdated}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Payments settings panel.
 *
 * Layout matches the backend's actual behavior (`product-mono` chat handler,
 * default chain `null → byok → tempo → coinbase`):
 *   1. Aomi credits hero with a fallback-chain visualizer.
 *   2. Wallet fallbacks (MPP + x402) — toggles + status + per-method actions.
 *   3. BYOK provider keys.
 *
 * Runtime requirement: when the default BYOK section is rendered (i.e.
 * `providerKeys` is omitted), this component must be mounted inside a tree
 * that provides `ControlContextProvider`. Pass `providerKeys={false}` to skip
 * BYOK and remove that requirement.
 */
export function PaymentSettings({
  status,
  toggles,
  providerKeys,
}: PaymentSettingsProps) {
  const {
    isLoading,
    isRefreshing,
    isConnectingMpp,
    isClearingMpp,
    mppStatus,
    mppStatusText,
    mppReceiptId,
    mppCachePresent,
    mppLastError,
    x402Status,
    x402StatusText,
    refreshPaymentStatus,
    clearMppCache,
    credits,
  } = status;

  const { mppEnabled, setMppEnabled, x402Enabled, setX402Enabled } = toggles;

  // Default-BYOK code path: child probe component reads useControl() and
  // reports BYOK availability. The probe only mounts when default BYOK is in
  // use, so the hook call site itself is always unconditional from React's
  // perspective (no Rules-of-Hooks risk).
  const usingDefaultByok = providerKeys === undefined;
  const [byokKnown, setByokKnown] = useState<boolean | null>(null);

  const renderedProviderKeys =
    providerKeys === undefined ? <ProviderKeysSettings /> : providerKeys;

  const byokState: ChainSegmentState =
    providerKeys === false
      ? "dimmed" // BYOK explicitly hidden by host
      : !usingDefaultByok
        ? "neutral" // host supplied a custom node — we have no signal
        : byokKnown === null
          ? "neutral" // probe hasn't reported yet (or no provider in tree)
          : byokKnown
            ? "active"
            : "dimmed";
  const mppState: ChainSegmentState = mppEnabled ? "active" : "dimmed";
  const x402State: ChainSegmentState = x402Enabled ? "active" : "dimmed";

  return (
    <div className="space-y-6">
      {usingDefaultByok ? <ByokAvailabilityProbe onResult={setByokKnown} /> : null}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Aomi credits cover most chats by default. Enable wallet fallbacks
          below to keep chatting when credits run out.
        </p>
      </div>

      {/* 1. Aomi credits hero + fallback chain visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Aomi credits</CardTitle>
          <CardDescription>
            Used by default. When credits are out, your enabled fallbacks below
            take over automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credits ? (
            <CreditsBar credits={credits} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Credits balance is not published to this widget. Check your
              account dashboard for usage.
            </p>
          )}
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Fallback chain
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ChainSegment label="Aomi credits" state="active" isLast={false} />
              <ChainSegment label="BYOK" state={byokState} isLast={false} />
              <ChainSegment label="MPP" state={mppState} isLast={false} />
              <ChainSegment label="x402" state={x402State} isLast />
            </div>
            <p className="text-muted-foreground text-xs">
              Dimmed segments are skipped (toggle off, or no provider keys).
              Pick a specific method per chat from the composer to override the
              chain.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Wallet fallbacks */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>MPP (Tempo)</CardTitle>
                <CardDescription>
                  Pay with a Tempo channel from the connected wallet.
                </CardDescription>
              </div>
              <StatusPill label={mppStatusText} tone={statusTone(mppStatus)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Enable</span>
              <Button
                type="button"
                variant={mppEnabled ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setMppEnabled(!mppEnabled)}
              >
                {mppEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {mppLastError ? (
              <p className="text-destructive text-sm">{mppLastError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRefreshing || isLoading || isConnectingMpp}
                onClick={() => void refreshPaymentStatus()}
              >
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!mppCachePresent || isClearingMpp}
                onClick={() => void clearMppCache()}
              >
                {isClearingMpp ? "Clearing…" : "Clear cached session"}
              </Button>
            </div>
            <details className="border-border/80 bg-background rounded-md border px-3 py-2">
              <summary className="text-muted-foreground cursor-pointer text-xs">
                Technical details
              </summary>
              <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                <p>Cached session: {mppCachePresent ? "present" : "none"}</p>
                <p>Cached receipt id: {mppReceiptId ?? "—"}</p>
                <p>
                  Connection happens automatically the next time MPP is the
                  active method.
                </p>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>x402</CardTitle>
                <CardDescription>
                  Pay-per-request via x402 exact-payment from the connected
                  wallet.
                </CardDescription>
              </div>
              <StatusPill label={x402StatusText} tone={statusTone(x402Status)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Enable</span>
              <Button
                type="button"
                variant={x402Enabled ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setX402Enabled(!x402Enabled)}
              >
                {x402Enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {x402Status === "wallet_required" ? (
              <p className="text-muted-foreground text-sm">
                Connect a wallet to sign x402 challenges.
              </p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              x402 does not keep a cached backend session. Each request is
              signed individually.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. BYOK provider keys */}
      {renderedProviderKeys === false ? null : renderedProviderKeys}
    </div>
  );
}
