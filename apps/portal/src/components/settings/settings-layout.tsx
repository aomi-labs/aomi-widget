"use client";

import { useEffect, useState } from "react";
import { Button, useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { SettingsSidebar, SettingsCategory } from "./settings-sidebar";
import { GeneralSettings } from "./general-settings";
import { AppsSettings } from "./apps-settings";
import { ErrorBoundary } from "@portal/components/error-boundary";
import { DeployDashboard } from "./onboarding/deploy-dashboard";
import { AppKeys } from "./app-keys";
import { Bots } from "./bots";
import { Secrets } from "./secrets";
import { Byok } from "./byok";
import {
  useAomiSession,
  type AomiSessionStatus,
} from "@portal/components/aomi-session-bridge";
import {
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsPrimaryButtonClass,
  settingsTitleClass,
} from "./settings-styles";

// Tabs whose data is account-bearer scoped (`/api/account/*`). They're gated on
// an established session so they never fire before the `aomi_session` cookie
// exists (else the proxy forwards anonymous and the backend 401s). Secrets/BYOK
// are device/client_id scoped and Deploy owns its own (onboarding) flow, so they
// render regardless.
const ACCOUNT_SCOPED_TABS: ReadonlySet<SettingsCategory> = new Set([
  "general",
  "apps",
  "app-keys",
  "bots",
]);

/**
 * Account-session gate for the settings shell. Keeping it here (not in each tab)
 * lets the account-scoped tabs stay identity-agnostic: they assume an
 * authenticated context instead of each re-checking wallet/session state.
 */
function SessionGate({
  status,
  onRetry,
  onConnect,
}: {
  status: Exclude<AomiSessionStatus, "ready">;
  onRetry: () => void;
  onConnect?: () => void;
}) {
  return (
    <div className={`${settingsCardStackClass} space-y-4`}>
      {status === "anonymous" && (
        <>
          <h1 className={settingsTitleClass}>Connect your account</h1>
          <p className={settingsBodyTextClass}>
            Settings are tied to your account. Connect to view and manage them.
          </p>
          {onConnect && (
            <Button
              type="button"
              onClick={onConnect}
              className={settingsPrimaryButtonClass}
            >
              Connect account
            </Button>
          )}
        </>
      )}
      {status === "establishing" && (
        <p className={settingsBodyTextClass}>Connecting your account…</p>
      )}
      {status === "error" && (
        <>
          <p className={settingsBodyTextClass}>
            Couldn’t connect your account. Please try again.
          </p>
          <Button
            type="button"
            onClick={onRetry}
            className={settingsPrimaryButtonClass}
          >
            Retry
          </Button>
        </>
      )}
    </div>
  );
}

export function SettingsLayout() {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");
  const { status, retry } = useAomiSession();
  const adapter = useAomiAuthAdapter();

  // Returning from GitHub flows lands on /settings with query params
  // (category is React state, not the URL), so open the Deploy tab where the
  // launch flow can pick the redirect/session up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (
      params.has("installation_id") ||
      params.get("launch") === "github" ||
      params.has("github_error")
    ) {
      setActiveCategory("deploy");
    }
  }, []);

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return <GeneralSettings />;
      case "apps":
        return <AppsSettings />;
      case "deploy":
        return (
          <div className="min-w-0">
            <ErrorBoundary>
              <DeployDashboard />
            </ErrorBoundary>
          </div>
        );
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
  };

  return (
    <div className="bg-background flex h-screen w-full min-w-0">
      <SettingsSidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-10 lg:px-12">
        <div className="mx-auto w-full min-w-0 max-w-4xl">
          {ACCOUNT_SCOPED_TABS.has(activeCategory) && status !== "ready" ? (
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
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
