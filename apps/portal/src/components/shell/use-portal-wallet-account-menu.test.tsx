import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import { usePortalWalletAccountMenu } from "./use-portal-wallet-account-menu";
import { seedAccountOverview } from "@portal/lib/account-overview";

const walletKitState = vi.hoisted(() => ({
  current: {
    identity: { isConnected: true, chainId: 1 },
    accountGuest: false,
    accounts: [{ id: "para", walletName: "Para", active: true }],
    accountUser: undefined as { id: string } | undefined,
    accountError: undefined as string | undefined,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    openAccountUI: vi.fn(async () => undefined),
    signOutAccount: vi.fn(async () => undefined),
  },
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => walletKitState.current,
}));

vi.mock("@portal/lib/use-settings", () => ({
  useSettings: () => ({
    settings: { colorMode: "dark" },
    updateSetting: vi.fn(),
  }),
}));

function readMenu() {
  let captured: ReturnType<typeof usePortalWalletAccountMenu>;
  function Probe() {
    captured = usePortalWalletAccountMenu(() => undefined);
    return null;
  }
  render(<Probe />);
  return captured!;
}

describe("usePortalWalletAccountMenu sign-in wiring", () => {
  afterEach(async () => {
    await act(async () => {
      seedAccountOverview(null);
    });
    walletKitState.current.accountUser = undefined;
    walletKitState.current.accountGuest = false;
    walletKitState.current.accountError = undefined;
    walletKitState.current.connect.mockClear();
    walletKitState.current.disconnect.mockClear();
    walletKitState.current.openAccountUI.mockClear();
    walletKitState.current.signOutAccount.mockClear();
  });

  it("offers Sign in that runs the auth flow, not the provider account popup", () => {
    const menu = readMenu();

    expect(menu?.secondaryLine).toBe("Sign in for allowance");
    menu?.onSignIn?.();

    expect(walletKitState.current.connect).toHaveBeenCalledTimes(1);
    expect(walletKitState.current.openAccountUI).not.toHaveBeenCalled();
  });

  it("does not show account chrome for a temporary guest", () => {
    walletKitState.current.accountGuest = true;

    expect(readMenu()).toBeUndefined();
  });

  it("keeps exchange failure copy off the truncated chip line", () => {
    walletKitState.current.accountError =
      "This wallet or sign-in method is already linked to another Aomi account.";

    const menu = readMenu();
    expect(menu?.secondaryLine).toBe("Sign-in needs attention");
    expect(menu?.noticeLine).toBe(walletKitState.current.accountError);
  });

  it("drops Sign in once the account session exists", () => {
    walletKitState.current.accountUser = { id: "acct-a" };

    const menu = readMenu();
    expect(menu?.onSignIn).toBeUndefined();
    expect(menu?.secondaryLine).toBe("Loading allowance…");
  });

  it("leaves disconnect to the widget-lib canonical teardown", () => {
    const menu = readMenu();

    // DualWalletBar's default runs account/widget session sign-out before
    // wallet disconnect (covered in dual-wallet-bar.test.tsx); supplying a
    // portal onDisconnect would just duplicate it.
    expect(menu?.onDisconnect).toBeUndefined();
  });
});
