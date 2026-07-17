import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsModal } from "./settings-modal";

const controller = vi.hoisted(() => ({
  closeSettings: vi.fn(),
  open: true,
}));

vi.mock("./settings-controller", () => ({
  useSettingsController: () => controller,
}));

vi.mock(
  "@portal/components/providers/settings-runtime-provider",
  () => ({
    SettingsRuntimeProvider: ({ children }: { children: ReactNode }) => children,
  }),
);

vi.mock("./settings-layout", () => ({
  SettingsLayout: ({ onClose }: { onClose?: () => void }) => (
    <>
      <button type="button" onClick={onClose}>
        Close settings
      </button>
      <button type="button">Last action</button>
    </>
  ),
}));

describe("SettingsModal focus management", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    controller.closeSettings.mockClear();
  });

  it("focuses the dialog, traps Tab, and restores focus on unmount", () => {
    const outside = document.createElement("button");
    outside.textContent = "Open settings";
    document.body.appendChild(outside);
    outside.focus();

    const view = render(<SettingsModal />);

    const first = screen.getByRole("button", { name: "Close settings" });
    const last = screen.getByRole("button", { name: "Last action" });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    view.unmount();
    expect(outside).toHaveFocus();
  });
});
