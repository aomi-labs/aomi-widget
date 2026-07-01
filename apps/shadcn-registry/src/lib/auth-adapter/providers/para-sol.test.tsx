import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@getpara/react-sdk", () => ({
  useClient: () => null,
}));

vi.mock("@getpara/solana-wallet-connectors", () => ({
  ParaSolanaProvider: ({ children }: { children: unknown }) => children,
  phantomWallet: "phantom",
  solflareWallet: "solflare",
  backpackWallet: "backpack",
  glowWallet: "glow",
}));

import { useSafeSolanaWallet } from "./para-sol";

function Probe() {
  const wallet = useSafeSolanaWallet();
  return <output>{JSON.stringify(wallet)}</output>;
}

describe("useSafeSolanaWallet", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("returns a disconnected wallet without logging when WalletProvider is absent", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Probe />);

    const wallet = JSON.parse(screen.getByRole("status").textContent ?? "{}");
    expect(wallet.publicKey).toBeUndefined();
    expect(wallet.connected).toBe(false);
    expect(wallet.wallets).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
