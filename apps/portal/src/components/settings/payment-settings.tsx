"use client";

import type { AomiPaymentMethod } from "@aomi-labs/client";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/use-settings";
import { usePaymentStatus } from "@/lib/use-payment-status";
import { ProviderKeysSettings } from "./provider-keys-settings";

type PaymentOption = {
  value: AomiPaymentMethod | null;
  label: string;
  description: string;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: null,
    label: "Auto",
    description: "Legacy backend fallback when a client omits payment_method.",
  },
  {
    value: "null",
    label: "Aomi",
    description: "Use included Aomi credits when they are available.",
  },
  {
    value: "byok",
    label: "BYOK",
    description: "Use your own provider key from the BYOK section below.",
  },
  {
    value: "tempo",
    label: "MPP",
    description: "Use the Tempo / MPP payment flow from the connected wallet.",
  },
  {
    value: "coinbase",
    label: "x402",
    description: "Use x402 exact payment from the connected wallet.",
  },
];

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
}: Readonly<{
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}>) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        onClick={onToggle}
        className="rounded-full"
      >
        {enabled ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: Readonly<{
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
}>) {
  const className =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function statusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
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

export function PaymentSettings() {
  const { settings, updateSettings } = useSettings();
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
    connectMpp,
    clearMppCache,
  } = usePaymentStatus();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Choose the payment method your chat UI should send, and decide which
          wallet-backed payment transports are enabled in this browser.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Default chat payment method</h2>
          <p className="text-sm text-muted-foreground">
            New chat threads start from this preference. You can still change
            the method per thread from the chat control bar.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {PAYMENT_OPTIONS.map((option) => {
            const active = settings.preferredPaymentMethod === option.value;
            return (
              <button
                key={option.value ?? "auto"}
                type="button"
                onClick={() =>
                  updateSettings({ preferredPaymentMethod: option.value })
                }
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40"
                }`}
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div
                    className={`text-sm ${
                      active ? "text-background/80" : "text-muted-foreground"
                    }`}
                  >
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Wallet-backed methods</h2>
          <p className="text-sm text-muted-foreground">
            These toggles decide whether this frontend enables the client-side
            transport layers for MPP and x402 at all.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleCard
            title="Enable MPP"
            description="Allow the frontend to answer Tempo / MPP payment challenges from the connected wallet."
            enabled={settings.mppEnabled}
            onToggle={() =>
              updateSettings({ mppEnabled: !settings.mppEnabled })
            }
          />
          <ToggleCard
            title="Enable x402"
            description="Allow the frontend to sign x402 exact-payment challenges from the connected wallet."
            enabled={settings.x402Enabled}
            onToggle={() =>
              updateSettings({ x402Enabled: !settings.x402Enabled })
            }
          />
        </div>

        <div className="grid gap-4 pt-2">
          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">MPP</h3>
                  <StatusPill
                    label={mppStatusText}
                    tone={statusTone(mppStatus)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Use Tempo payment channels from the connected wallet. The
                  first connection authorizes a channel, then the backend reuses
                  the cached MPP session on later chat turns.
                </p>
                {mppLastError ? (
                  <p className="text-sm text-destructive">{mppLastError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  disabled={
                    !settings.mppEnabled || isConnectingMpp || mppStatus === "wallet_required"
                  }
                  onClick={() => void connectMpp()}
                >
                  {isConnectingMpp ? "Connecting..." : mppCachePresent ? "Reconnect" : "Connect MPP"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isRefreshing || isLoading}
                  onClick={() => void refreshPaymentStatus()}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mppCachePresent || isClearingMpp}
                  onClick={() => void clearMppCache()}
                >
                  {isClearingMpp ? "Clearing..." : "Clear cached session"}
                </Button>
              </div>
            </div>
            <details className="mt-4 rounded-xl border border-border/80 bg-card p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Show technical details
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>Cached session: {mppCachePresent ? "present" : "none"}</p>
                <p>Cached receipt id: {mppReceiptId ?? "-"}</p>
              </div>
            </details>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">x402</h3>
              <StatusPill
                label={x402StatusText}
                tone={statusTone(x402Status)}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              x402 does not keep a cached backend session. When enabled, the
              frontend signs each exact-payment challenge from the connected
              wallet as needed.
            </p>
          </div>
        </div>
      </section>

      <ProviderKeysSettings />
    </div>
  );
}
