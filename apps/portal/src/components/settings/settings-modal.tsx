"use client";

import { useEffect, useRef } from "react";

import { SettingsRuntimeProvider } from "@portal/components/providers/settings-runtime-provider";
import { useSettingsController } from "./settings-controller";
import { SettingsLayout } from "./settings-layout";

export function SettingsModal() {
  const { open, closeSettings } = useSettingsController();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const firstFocusable =
      dialog?.querySelector<HTMLElement>(focusableSelector) ?? dialog;
    firstFocusable?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hidden);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", trapFocus);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Dismiss settings"
        tabIndex={-1}
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={closeSettings}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="relative z-[81] flex h-[min(640px,88dvh)] w-full max-w-[680px] flex-col sm:h-[min(560px,82dvh)] sm:w-[min(680px,calc(100vw-3rem))]"
      >
        <SettingsRuntimeProvider>
          <SettingsLayout onClose={closeSettings} />
        </SettingsRuntimeProvider>
      </div>
    </div>
  );
}
