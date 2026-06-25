"use client";

import { useSettings } from "@portal/lib/use-settings";

// Client boundary that runs `useSettings()` at the app root so persisted user
// settings (theme/colorMode) load and apply. Provides no context — it just
// initializes the hook inside the server `layout.tsx`. Not to be confused with
// SettingsRuntimeProvider, which wires the /settings page's AomiClient runtime.
export function SettingsInitializer({ children }: { children: React.ReactNode }) {
  useSettings();
  return <>{children}</>;
}
