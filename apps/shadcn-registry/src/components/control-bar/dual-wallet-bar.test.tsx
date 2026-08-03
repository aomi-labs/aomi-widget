import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AomiWalletKit } from "@/lib/wallet-kit";
import { DualWalletBar } from "./dual-wallet-bar";

const openPicker = vi.fn();

vi.mock("./wallet-picker-context", () => ({
  WalletPickerProvider: ({ children }: { children: React.ReactNode }) => children,
  useWalletPicker: () => ({
    open: false,
    openPicker,
    closePicker: vi.fn(),
  }),
}));

vi.mock("./wallet-picker", () => ({
  WalletPicker: () => null,
}));

vi.mock("../../lib/wallet-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/wallet-kit")>();
  return {
    ...actual,
    useAomiWalletKit: () => adapterState.current,
  };
});

const adapterState = {
  current: {
    identity: {
      status: "connected",
      isConnected: true,
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      chainId: 1,
      svmAddress: undefined,
    },
    accounts: [
      {
        id: "mm",
        family: "evm" as const,
        address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        walletName: "MetaMask",
        chainId: 1,
        active: true,
      },
    ],
    walletModalRows: [{ id: "metamask", label: "MetaMask", family: "evm" }],
    disconnect: vi.fn(async () => undefined),
  } satisfies Partial<AomiWalletKit>,
};

afterEach(() => {
  cleanup();
  openPicker.mockClear();
});

describe("DualWalletBar account menu", () => {
  it("opens WalletPicker directly when account menu is disabled", () => {
    render(<DualWalletBar families={["evm"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage wallets" }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
  });

  it("opens AccountMenu instead of WalletPicker when enabled and connected", () => {
    render(
      <DualWalletBar
        families={["evm"]}
        accountMenu={{
          enabled: true,
          secondaryLine: "420 left · 80/500 used",
          onOpenSettings: vi.fn(),
        }}
      />,
    );

    expect(screen.getByText("420 left · 80/500 used")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(openPicker).not.toHaveBeenCalled();
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeInTheDocument();
  });

  it("routes Manage wallets from AccountMenu to WalletPicker", () => {
    render(
      <DualWalletBar
        families={["evm"]}
        accountMenu={{ enabled: true, secondaryLine: "420 left · 80/500 used" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByText("Manage wallets"));
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
  });
});
