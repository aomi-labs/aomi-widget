import { fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectDirectApp = vi.hoisted(() => vi.fn());

vi.mock("@aomi-labs/react", () => ({
  cn: (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" "),
  useAomiRuntime: () => ({ isRunning: false }),
  useControl: () => ({
    state: {
      appDescriptors: [
        { name: "uniswap", label: "Uniswap" },
        { name: "partner-agent", label: "Partner Agent", applicationId: 42 },
      ],
    },
  }),
}));

vi.mock("@/components/assistant-ui/capability-composer", () => ({
  useCapabilityComposer: () => ({
    routing: {
      directApps: [{ app: "uniswap" }, { applicationId: 42 }],
    },
    selectedDirectApp: { app: "uniswap" },
    selectDirectApp,
    showDirectAppSelect: true,
  }),
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

vi.mock("@/components/icons", () => ({ getAppIcon: () => null }));

import { AppSelect } from "./app-select";

describe("AppSelect", () => {
  beforeEach(() => selectDirectApp.mockClear());

  it("shows only host-allowed Direct targets", () => {
    render(<AppSelect />);
    expect(screen.getAllByText("Uniswap").length).toBeGreaterThan(0);
    expect(screen.getByText("Partner Agent")).toBeInTheDocument();
  });

  it("selects an application-id target without inventing an app name", () => {
    render(<AppSelect />);
    fireEvent.click(screen.getByRole("button", { name: "PA Partner Agent" }));
    expect(selectDirectApp).toHaveBeenCalledWith({ applicationId: 42 });
  });
});
