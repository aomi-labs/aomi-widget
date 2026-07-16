"use client";

import { X } from "lucide-react";
import { useAomiAuthAdapter, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { GeneralSettings } from "@portal/features/general";
import { AppsSettings } from "@portal/features/apps";
import { AppKeys } from "@portal/features/app-keys";
import { Bots } from "@portal/features/bots";
import { Secrets } from "@portal/features/secrets";
import { Byok } from "@portal/features/byok";
import {
  useAomiSession,
  type AomiSessionStatus,
} from "@portal/components/providers/aomi-session-bridge";
import { useSettingsController } from "./settings-controller";
import {
  SettingsPanel,
  SettingsPill,
  SettingsPreviewBadge,
  SettingsPromoCard,
  SettingsSkeletonRows,
} from "./settings-primitives";
import { SettingsRail } from "./settings-rail";
import type { SettingsCategory } from "./settings-types";

/** Tabs that still need a ready account session. General always renders. */
const ACCOUNT_SCOPED_TABS: ReadonlySet<SettingsCategory> = new Set([
  "apps",
  "app-keys",
  "bots",
]);

function shortenAddress(address?: string | null): string {
  if (!address) return "Not connected";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function SettingsAccountHeader() {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const connected = identity.isConnected;
  const label = connected
    ? shortenAddress(identity.address)
    : "Not connected";

  return (
    <div className="bg-muted/50 mx-2 mb-1 rounded-xl px-2.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className="bg-foreground/15 text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide"
          aria-hidden
        >
          {connected && identity.address
            ? identity.address.slice(2, 4).toUpperCase()
            : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[12.5px] font-medium">
            {label}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">
            {connected ? "Connected · Free" : "Not connected"}
          </p>
        </div>
      </div>
      {!connected && adapter.canConnect ? (
        <SettingsPill
          tone="primary"
          className="mt-2 w-full"
          onClick={() => void adapter.connect()}
        >
          Connect
        </SettingsPill>
      ) : null}
    </div>
  );
}

function SessionGate({
  status,
  onRetry,
  onConnect,
}: {
  status: Exclude<AomiSessionStatus, "ready">;
  onRetry: () => void;
  onConnect?: () => void;
}) {
  if (status === "establishing") {
    return (
      <SettingsPanel
        title="Account"
        description="Connecting…"
        badge={<SettingsPreviewBadge />}
      >
        <SettingsSkeletonRows count={4} />
      </SettingsPanel>
    );
  }

  if (status === "error") {
    return (
      <SettingsPanel
        title="Account"
        description="Could not load this tab."
        badge={<SettingsPreviewBadge />}
      >
        <SettingsPromoCard
          title="Account offline"
          description="Retry, or use General meanwhile."
          action={
            <SettingsPill type="button" onClick={onRetry}>
              Retry
            </SettingsPill>
          }
        />
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel
      title="Account"
      description="Connect to open this tab."
      badge={<SettingsPreviewBadge />}
    >
      <SettingsPromoCard
        title="Not connected"
        description="Usage, keys, and bots need a connected account."
        action={
          onConnect ? (
            <SettingsPill type="button" tone="primary" onClick={onConnect}>
              Connect
            </SettingsPill>
          ) : undefined
        }
      />
    </SettingsPanel>
  );
}

function SettingsBody({ category }: { category: SettingsCategory }) {
  switch (category) {
    case "general":
      return <GeneralSettings />;
    case "apps":
      return <AppsSettings />;
    case "app-keys":
      return <AppKeys />;
    case "bots":
      return <Bots />;
    case "secrets":
      return <Secrets />;
    case "byok":
      return <Byok />;
    default:
      return <GeneralSettings />;
  }
}

export function SettingsLayout({ onClose }: { onClose?: () => void }) {
  const { category, setCategory } = useSettingsController();
  const { status, retry } = useAomiSession();
  const adapter = useAomiAuthAdapter();

  return (
    <div className="bg-background text-foreground border-border/70 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:flex-row sm:rounded-2xl">
      <aside className="border-border/60 bg-muted/20 flex shrink-0 flex-col border-b sm:w-[176px] sm:border-r sm:border-b-0">
        <div className="flex items-center justify-between gap-2 px-2 pt-2 sm:justify-start">
          {onClose ? (
            <button
              type="button"
              className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition-colors"
              onClick={onClose}
              aria-label="Close settings"
            >
              <X className="size-4" />
            </button>
          ) : (
            <span className="size-8" />
          )}
          <div className="flex items-center gap-2 pr-1 sm:hidden">
            <p className="text-foreground text-[13px] font-medium">Settings</p>
            <SettingsPreviewBadge />
          </div>
          <span className="size-8 sm:hidden" />
        </div>
        <div className="hidden px-1 pt-1 sm:block">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Settings
            </p>
            <SettingsPreviewBadge />
          </div>
          <SettingsAccountHeader />
        </div>
        <div className="min-h-0 overflow-x-auto overflow-y-hidden sm:overflow-x-hidden sm:overflow-y-auto">
          <SettingsRail
            activeCategory={category}
            onCategoryChange={setCategory}
            orientation="responsive"
          />
        </div>
      </aside>
      <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
        <ErrorBoundary>
          {ACCOUNT_SCOPED_TABS.has(category) && status !== "ready" ? (
            <SessionGate
              status={status}
              onRetry={retry}
              onConnect={
                adapter.openAccountUI
                  ? () => {
                      void adapter.openAccountUI?.();
                    }
                  : undefined
              }
            />
          ) : (
            <SettingsBody category={category} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
