"use client";

import { X } from "lucide-react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
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
  SettingsPromoCard,
  SettingsSkeletonRows,
} from "./settings-primitives";
import { SettingsRail } from "./settings-rail";
import type { SettingsCategory } from "./settings-types";

const ACCOUNT_SCOPED_TABS: ReadonlySet<SettingsCategory> = new Set([
  "general",
  "apps",
  "app-keys",
  "bots",
]);

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
      <SettingsPanel title="Connecting">
        <SettingsSkeletonRows count={4} />
      </SettingsPanel>
    );
  }

  if (status === "error") {
    return (
      <SettingsPanel title="Account">
        <SettingsPromoCard
          title="Couldn't connect your account"
          description="Retry the session, then reopen settings if this persists."
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
    <SettingsPanel title="Account">
      <SettingsPromoCard
        title="Connect your account"
        description="Settings are tied to your account. Connect to view identity, usage, keys, and bots."
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

export function SettingsLayout({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { category, setCategory } = useSettingsController();
  const { status, retry } = useAomiSession();
  const adapter = useAomiAuthAdapter();

  return (
    <div className="bg-background border-border flex h-full min-h-0 w-full overflow-hidden rounded-2xl border shadow-2xl">
      <aside className="border-border bg-muted/20 flex w-[176px] shrink-0 flex-col border-r sm:w-[188px]">
        <div className="flex items-center gap-1 px-2 pt-2">
          {onClose ? (
            <button
              type="button"
              className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition-colors"
              onClick={onClose}
              aria-label="Close settings"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <SettingsRail
          activeCategory={category}
          onCategoryChange={setCategory}
        />
      </aside>
      <div className="bg-background flex min-w-0 flex-1 flex-col">
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
