"use client";

import { useEffect } from "react";

import { SettingsRuntimeProvider } from "@portal/components/providers/settings-runtime-provider";
import { useSettingsController } from "./settings-controller";
import { SettingsLayout } from "./settings-layout";

export function SettingsModal() {
  const { open, closeSettings } = useSettingsController();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Dismiss settings"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={closeSettings}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="relative z-[81] flex h-[min(640px,88dvh)] w-full max-w-[680px] flex-col sm:h-[min(560px,82dvh)] sm:w-[min(680px,calc(100vw-3rem))]"
      >
        <SettingsRuntimeProvider>
          <SettingsLayout onClose={closeSettings} />
        </SettingsRuntimeProvider>
      </div>
    </div>
  );
}
