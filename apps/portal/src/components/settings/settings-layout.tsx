"use client";

import { X } from "lucide-react";
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { GeneralSettings } from "@portal/features/general";
import { AppsSettings } from "@portal/features/apps";
import { AppKeys } from "@portal/features/app-keys";
import { Bots } from "@portal/features/bots";
import { Secrets } from "@portal/features/secrets";
import { Byok } from "@portal/features/byok";
import { useSettingsController } from "./settings-controller";
import {
  SettingsPill,
  SettingsPreviewBadge,
} from "./settings-primitives";
import { SettingsRail } from "./settings-rail";
import { useAccountSummary } from "./use-account-summary";
import type { SettingsCategory } from "./settings-types";
import { cn } from "@portal/lib/utils";

function SettingsAccountHeader({
  compact = false,
}: {
  compact?: boolean;
}) {
  const summary = useAccountSummary();

  return (
    <div
      className={cn(
        "bg-muted/50 rounded-xl px-2.5 py-2.5",
        compact ? "mx-2 mb-2" : "mx-2 mb-1",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="bg-foreground/15 text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide"
          aria-hidden
        >
          {summary.connected && summary.address
            ? summary.address.slice(2, 4).toUpperCase()
            : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[12.5px] font-medium">
            {summary.identityLabel}
          </p>
          <p className="text-muted-foreground truncate text-[11px] capitalize">
            {summary.statusLabel}
          </p>
        </div>
        {summary.accountUnavailable && summary.connected ? (
          <SettingsPill className="shrink-0" onClick={summary.retry}>
            Retry
          </SettingsPill>
        ) : null}
      </div>
      {!summary.connected && summary.canConnect ? (
        <SettingsPill
          tone="primary"
          className="mt-2 w-full"
          onClick={summary.connect}
        >
          Connect
        </SettingsPill>
      ) : null}
    </div>
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

        {/* Mobile: compact account strip above tab chips */}
        <div className="sm:hidden">
          <SettingsAccountHeader compact />
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
          <SettingsBody category={category} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
