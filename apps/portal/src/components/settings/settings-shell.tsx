"use client";

import { Suspense, type ReactNode } from "react";

import { SettingsControllerProvider } from "./settings-controller";
import { SettingsModal } from "./settings-modal";

function SettingsShellInner({ children }: { children: ReactNode }) {
  return (
    <SettingsControllerProvider>
      {children}
      <SettingsModal />
    </SettingsControllerProvider>
  );
}

/**
 * Wraps chat with settings controller + modal.
 * Suspense fallback must NOT render children (PortalAomiFrame calls
 * useSettingsController) — useSearchParams() suspends on first paint.
 */
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex h-screen items-center justify-center text-sm">
          Loading…
        </div>
      }
    >
      <SettingsShellInner>{children}</SettingsShellInner>
    </Suspense>
  );
}
