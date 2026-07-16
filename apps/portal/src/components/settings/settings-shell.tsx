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

/** Wraps chat (or any host) with settings controller + ChatGPT-style modal. */
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <SettingsShellInner>{children}</SettingsShellInner>
    </Suspense>
  );
}
