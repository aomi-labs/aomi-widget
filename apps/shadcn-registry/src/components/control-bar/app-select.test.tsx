import { fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const control = vi.hoisted(() => ({
  state: {
    authorizedApps: ["default", "somm-agent"],
    appDescriptors: [
      { name: "default" },
      { name: "somm-agent", applicationId: 1641 },
    ],
  },
  getAuthorizedApps: vi.fn(async () => ["default", "somm-agent"]),
  getCurrentThreadApp: vi.fn(() => "default"),
  getCurrentThreadApplicationId: vi.fn(() => null),
  onAppSelect: vi.fn(),
  isProcessing: false,
}));

vi.mock("@aomi-labs/react", () => ({
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
  useControl: () => control,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CommandGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CommandInput: () => null,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => null,
  CommandItem: ({
    children,
    onSelect,
    value: _value,
    ...props
  }: HTMLAttributes<HTMLButtonElement> & {
    onSelect?: () => void;
    value?: string;
  }) => (
    <button {...props} onClick={onSelect}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/icons", () => ({
  AllAppsIcon: () => null,
  getAppIcon: () => null,
}));

import { AppSelect } from "./app-select";

describe("AppSelect", () => {
  beforeEach(() => {
    control.getAuthorizedApps.mockClear();
    control.onAppSelect.mockClear();
  });

  it("passes a hosted app's application id to the controller", () => {
    render(<AppSelect />);

    fireEvent.click(screen.getByRole("button", { name: "S Somm Agent" }));

    expect(control.onAppSelect).toHaveBeenCalledWith("somm-agent", {
      applicationId: 1641,
    });
  });
});
