"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AomiFrame, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { useAomiRuntime, usePerThreadControl } from "@aomi-labs/react";
import { RequiredSecretsGate } from "@portal/components/shell/required-secrets-gate";
import { HeaderControls } from "@portal/components/shell/header-controls";
import { PackagesModal } from "@portal/components/shell/packages-modal";
import { SettingsModal } from "@portal/components/settings/settings-modal";
import {
  usePortalClientOptions,
  useRequestedAppConfig,
} from "@portal/lib/portal-client-options";
import { getBackendUrl } from "@portal/lib/settings-api";
import { SvmWalletBindingGate } from "@portal/features/general/svm-wallet-binding-gate";
import { usePortalWalletAccountMenu } from "@portal/components/shell/use-portal-wallet-account-menu";

function AppSelectUrlBootstrap({
  requestedApp,
  requestedApplicationId,
  locked,
}: {
  requestedApp: string | null;
  requestedApplicationId: string | null;
  locked: boolean;
}) {
  const { createThread, currentThreadId } = useAomiRuntime();
  const { onAppSelect } = usePerThreadControl().actions;
  const hasAppliedRequestedAppRef = useRef(false);
  const hasStartedLockedThreadRef = useRef<string | null>(null);
  const isDisposedRef = useRef(false);
  const [lockedThreadId, setLockedThreadId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasAppliedRequestedAppRef.current) {
      return;
    }

    if (!requestedApp) {
      return;
    }

    if (!locked) {
      onAppSelect(requestedApp, { applicationId: requestedApplicationId });
      hasAppliedRequestedAppRef.current = true;
      return;
    }

    if (hasStartedLockedThreadRef.current === requestedApp) {
      return;
    }
    hasStartedLockedThreadRef.current = requestedApp;
    void createThread()
      .then((threadId) => {
        if (
          !isDisposedRef.current &&
          hasStartedLockedThreadRef.current === requestedApp
        ) {
          setLockedThreadId(threadId);
        }
      })
      .catch((error) => {
        console.error("[aomi][portal-frame] failed to create locked thread", {
          app: requestedApp,
          error,
        });
      });
  }, [createThread, locked, onAppSelect, requestedApp, requestedApplicationId]);

  useEffect(() => {
    if (
      hasAppliedRequestedAppRef.current ||
      !locked ||
      !requestedApp ||
      !lockedThreadId ||
      currentThreadId !== lockedThreadId
    ) {
      return;
    }

    onAppSelect(requestedApp, { applicationId: requestedApplicationId });
    hasAppliedRequestedAppRef.current = true;
  }, [
    currentThreadId,
    locked,
    lockedThreadId,
    onAppSelect,
    requestedApp,
    requestedApplicationId,
  ]);

  return null;
}

export function PortalAomiFrame() {
  const { accountStatus, accountUser } = useAomiWalletKit();
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
  const clientOptions = usePortalClientOptions(lockedApp, lockedApplicationId);
  const backendUrl = getBackendUrl();
  // Settings and the packages catalog are siblings of the frame so their
  // backdrops cover the sidebar and chat as one surface.
  const [overlay, setOverlay] = useState<"none" | "settings" | "packages">(
    "none",
  );
  const walletAccountMenu = usePortalWalletAccountMenu(
    useCallback(() => setOverlay("settings"), []),
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
      // Preserve anonymous conversation state when sign-in establishes the
      // first account. Remount when leaving an authenticated account so its
      // threads and in-flight sessions cannot cross into another principal.
      revision:
        accountFrameScope.accountUserId === undefined
          ? accountFrameScope.revision
          : accountFrameScope.revision + 1,
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
        key={accountFrameScope.revision}
        width="100%"
        height="100%"
        backendUrl={backendUrl}
        applicationId={lockedApplicationId}
        accountSessionAvailable={Boolean(accountUser)}
        showSidebar={!lockedApp}
        walletPosition="footer"
        walletFamilies={["evm", "solana"]}
        walletAccountMenu={walletAccountMenu}
        className="portal-aomi-frame aui-suggestions-marquee rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <AppSelectUrlBootstrap
          requestedApp={requestedApp.app}
          requestedApplicationId={requestedApp.applicationId}
          locked={Boolean(lockedApp)}
        />
        <AomiFrame.Header>
          <HeaderControls
            onOpenSettings={() => setOverlay("settings")}
            onOpenPackages={() => setOverlay("packages")}
          />
        </AomiFrame.Header>
        <AomiFrame.Composer
          withControl
          controlBarProps={{
            hideApiKey: true,
            hideApp: Boolean(lockedApp),
            // The network picker lives in the header pill (HeaderControls).
            hideNetwork: true,
          }}
        />
        <RequiredSecretsGate />
        <SvmWalletBindingGate />
      </AomiFrame.Root>
      {overlay === "settings" && (
        <SettingsModal onClose={() => setOverlay("none")} />
      )}
      {overlay === "packages" && (
        <PackagesModal onClose={() => setOverlay("none")} />
      )}
    </main>
  );
}
