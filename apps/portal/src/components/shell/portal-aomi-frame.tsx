"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AomiFrame,
  useAomiWalletKit,
  type AomiRoutingConfig,
  type DirectRoutingApp,
} from "@aomi-labs/widget-lib";
import { useAomiRuntime, usePerThreadControl } from "@aomi-labs/react";
import { HeaderControls } from "@portal/components/shell/header-controls";
import { OverlayPortal } from "@portal/components/shell/overlay-portal";
import { PackagesModal } from "@portal/components/shell/packages-modal";
import { SettingsModal } from "@portal/components/settings/settings-modal";
import type { SettingsTab } from "@portal/components/settings/settings-modal";
import {
  usePortalClientOptions,
  useRequestedAppConfig,
} from "@portal/lib/portal-client-options";
import { getBackendUrl } from "@portal/lib/settings-api";
import { SvmWalletBindingGate } from "@portal/features/general/svm-wallet-binding-gate";
import { usePortalWalletAccountMenu } from "@portal/components/shell/use-portal-wallet-account-menu";
import { useAccountOverview } from "@portal/lib/account-overview";

const DEFAULT_ENABLED_APPS = ["default"] as const;

function directTarget(
  app: string,
  applicationId: string | null,
): DirectRoutingApp {
  const parsed = applicationId === null ? NaN : Number(applicationId);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? { app, applicationId: parsed }
    : { app };
}

function RequestedAppBootstrap({
  requestedApp,
  requestedApplicationId,
  enabledApps,
}: {
  requestedApp: string | null;
  requestedApplicationId: string | null;
  enabledApps: readonly string[];
}) {
  const { onAgentTargetSelect } = usePerThreadControl().actions;
  const hasAppliedRequestedAppRef = useRef(false);

  useEffect(() => {
    if (
      hasAppliedRequestedAppRef.current ||
      !requestedApp ||
      !enabledApps.includes(requestedApp)
    ) {
      return;
    }
    onAgentTargetSelect({
      mode: "direct",
      ...directTarget(requestedApp, requestedApplicationId),
    });
    hasAppliedRequestedAppRef.current = true;
  }, [enabledApps, onAgentTargetSelect, requestedApp, requestedApplicationId]);

  return null;
}

/** Open an account-owned thread linked by MCP wallet-approval handoff. */
export function ThreadUrlBootstrap() {
  const { currentThreadId, selectThread, threadMetadata } = useAomiRuntime();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const threadId = new URLSearchParams(window.location.search)
      .get("thread")
      ?.trim();
    if (!threadId) return;
    if (threadId === currentThreadId) {
      appliedRef.current = true;
      return;
    }
    // selectThread intentionally creates a new local thread for unknown ids.
    // Wait for the authenticated remote-thread list to hydrate first so an
    // MCP handoff cannot race startup and silently land on a blank chat.
    if (!threadMetadata.has(threadId)) return;
    appliedRef.current = true;
    selectThread(threadId);
  }, [currentThreadId, selectThread, threadMetadata]);

  return null;
}

export function PortalAomiFrame() {
  const { accountStatus, accountUser } = useAomiWalletKit();
  const accountOverview = useAccountOverview();
  const accountUserId = accountUser?.id;
  const [hasResolvedInitialAccount, setHasResolvedInitialAccount] = useState(
    accountStatus !== "loading",
  );
  const [accountFrameScope, setAccountFrameScope] = useState(() => ({
    accountUserId,
    revision: 0,
  }));
  const requestedApp = useRequestedAppConfig();
  const lockedApp = requestedApp.locked ? requestedApp.app : null;
  const lockedApplicationId = lockedApp ? requestedApp.applicationId : null;
  const enabledApps = accountOverview?.user.apps ?? DEFAULT_ENABLED_APPS;
  const lockedTarget = useMemo(
    () =>
      lockedApp ? directTarget(lockedApp, lockedApplicationId) : undefined,
    [lockedApp, lockedApplicationId],
  );
  const directApps = useMemo(
    () =>
      enabledApps
        .filter((app) => app !== "orchestrator" && app !== "auto")
        .map((app) => ({ app })),
    [enabledApps],
  );
  const routing = useMemo<AomiRoutingConfig>(
    () =>
      lockedTarget
        ? {
            targets: [{ mode: "direct", apps: [lockedTarget] }],
            defaultMode: "direct",
          }
        : {
            targets: [
              { mode: "auto" },
              ...(directApps.length > 0
                ? [{ mode: "direct" as const, apps: directApps }]
                : []),
            ],
            defaultMode: "auto",
          },
    [directApps, lockedTarget],
  );
  const clientOptions = usePortalClientOptions(lockedApp, lockedApplicationId);
  const backendUrl = getBackendUrl();
  // Settings and the packages catalog are siblings of the frame so their
  // backdrops cover the sidebar and chat as one surface.
  const [overlay, setOverlay] = useState<"none" | "settings" | "packages">(
    "none",
  );
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const openSettings = useCallback((tab: SettingsTab) => {
    setSettingsTab(tab);
    setOverlay("settings");
  }, []);
  const walletAccountMenu = usePortalWalletAccountMenu(
    useCallback(() => openSettings("general"), [openSettings]),
    useCallback(() => openSettings("account"), [openSettings]),
  );

  useEffect(() => {
    if (accountStatus !== "loading") {
      setHasResolvedInitialAccount(true);
    }
  }, [accountStatus]);

  if (
    accountStatus !== "loading" &&
    accountFrameScope.accountUserId !== accountUserId
  ) {
    setAccountFrameScope({
      accountUserId,
      // A backend thread is owned by the principal that created it. Always
      // remount across an identity transition so an anonymous or previous
      // account's in-flight session cannot be submitted by the new principal.
      revision: accountFrameScope.revision + 1,
    });
  }

  if (!hasResolvedInitialAccount) {
    return (
      <main
        aria-busy="true"
        className="bg-background relative h-full w-full overflow-hidden"
      />
    );
  }

  return (
    <main
      data-testid="portal-shell"
      className="bg-background relative h-full w-full overflow-hidden"
    >
      <AomiFrame.Root
        key={`principal-v2:${accountFrameScope.revision}:${accountFrameScope.accountUserId ?? "preauth"}`}
        width="100%"
        height="100%"
        backendUrl={backendUrl}
        applicationId={lockedApplicationId}
        agentTarget={
          lockedTarget ? { mode: "direct", ...lockedTarget } : undefined
        }
        accountSessionAvailable={Boolean(accountUser)}
        // Do not restore a shared pre-auth thread: it may belong to a deleted
        // anonymous identity. Once Better Auth resolves a canonical user id,
        // persistence is isolated to that exact principal.
        persistThread={Boolean(accountUserId)}
        threadPersistenceScope={accountUserId}
        showSidebar={!lockedApp}
        walletPosition="footer"
        walletFamilies={["evm", "solana"]}
        walletConnectLabel="Sign in"
        walletAccountMenu={walletAccountMenu}
        className="portal-aomi-frame aui-suggestions-marquee rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <ThreadUrlBootstrap />
        {!lockedApp ? (
          <RequestedAppBootstrap
            requestedApp={requestedApp.app}
            requestedApplicationId={requestedApp.applicationId}
            enabledApps={enabledApps}
          />
        ) : null}
        <AomiFrame.Header>
          <HeaderControls
            showSettings={Boolean(accountUser)}
            onOpenSettings={() => openSettings("general")}
            onOpenPackages={() => setOverlay("packages")}
          />
        </AomiFrame.Header>
        <AomiFrame.Composer
          withControl
          controlBarProps={{
            hideApiKey: true,
            routing,
            enabledAppIds: enabledApps,
            hideNetwork: true,
          }}
        />
        <SvmWalletBindingGate />
        {/* Inside the frame so they see the Aomi runtime (the settings
            account tab needs the live thread id); portalled to <body> so one
            backdrop still covers the sidebar and chat as one surface. */}
        {overlay === "settings" && (
          <OverlayPortal>
            <SettingsModal
              key={settingsTab}
              initialTab={settingsTab}
              onClose={() => setOverlay("none")}
            />
          </OverlayPortal>
        )}
        {overlay === "packages" && (
          <OverlayPortal>
            <PackagesModal onClose={() => setOverlay("none")} />
          </OverlayPortal>
        )}
      </AomiFrame.Root>
    </main>
  );
}
