import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalAomiFrame } from "./portal-aomi-frame";

const walletKitState = vi.hoisted(() => ({
  current: {
    accountStatus: "loading",
    accountUser: undefined,
  } as {
    accountStatus: "loading" | "ready" | "error";
    accountUser?: { id: string };
  },
}));
const frameInstances = vi.hoisted(() => ({ next: 0 }));

vi.mock("@aomi-labs/widget-lib", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    AomiFrame: {
      Root: ({
        accountSessionAvailable,
      }: {
        accountSessionAvailable: boolean;
      }) => {
        const [instance] = React.useState(() => ++frameInstances.next);
        return (
          <div
            data-account-session-available={String(accountSessionAvailable)}
            data-instance={instance}
            data-testid="aomi-frame"
          />
        );
      },
      Header: () => null,
      Composer: () => null,
    },
    useAomiWalletKit: () => walletKitState.current,
  };
});

vi.mock("@portal/lib/portal-client-options", () => ({
  usePortalClientOptions: () => ({}),
  useRequestedAppConfig: () => ({
    app: null,
    applicationId: null,
    locked: false,
  }),
}));

vi.mock("@portal/lib/settings-api", () => ({
  getBackendUrl: () => "https://api.example.test",
}));

vi.mock("@portal/components/shell/use-portal-wallet-account-menu", () => ({
  usePortalWalletAccountMenu: () => undefined,
}));

describe("PortalAomiFrame account bootstrap", () => {
  afterEach(() => {
    frameInstances.next = 0;
    walletKitState.current = {
      accountStatus: "loading",
      accountUser: undefined,
    };
  });

  it("waits for the initial account lookup before mounting the frame", async () => {
    const view = render(<PortalAomiFrame />);

    expect(screen.queryByTestId("aomi-frame")).toBeNull();
    expect(document.querySelector('main[aria-busy="true"]')).not.toBeNull();

    walletKitState.current = {
      accountStatus: "ready",
      accountUser: { id: "acct-a" },
    };
    await act(async () => {
      view.rerender(<PortalAomiFrame />);
    });

    expect(screen.getByTestId("aomi-frame")).toHaveAttribute(
      "data-account-session-available",
      "true",
    );
    expect(document.querySelector('main[aria-busy="true"]')).toBeNull();
  });

  it("mounts the anonymous frame after a signed-out lookup resolves", async () => {
    const view = render(<PortalAomiFrame />);

    walletKitState.current = {
      accountStatus: "error",
      accountUser: undefined,
    };
    await act(async () => {
      view.rerender(<PortalAomiFrame />);
    });

    expect(screen.getByTestId("aomi-frame")).toHaveAttribute(
      "data-account-session-available",
      "false",
    );
  });

  it("preserves the anonymous frame when sign-in establishes an account", async () => {
    walletKitState.current = {
      accountStatus: "error",
      accountUser: undefined,
    };
    const view = render(<PortalAomiFrame />);
    const initialInstance = screen
      .getByTestId("aomi-frame")
      .getAttribute("data-instance");

    walletKitState.current = {
      accountStatus: "ready",
      accountUser: { id: "acct-a" },
    };
    await act(async () => {
      view.rerender(<PortalAomiFrame />);
    });

    expect(screen.getByTestId("aomi-frame")).toHaveAttribute(
      "data-instance",
      initialInstance,
    );
    expect(screen.getByTestId("aomi-frame")).toHaveAttribute(
      "data-account-session-available",
      "true",
    );
  });

  it("remounts when an authenticated account changes or signs out", async () => {
    walletKitState.current = {
      accountStatus: "ready",
      accountUser: { id: "acct-a" },
    };
    const view = render(<PortalAomiFrame />);
    const accountAInstance = screen
      .getByTestId("aomi-frame")
      .getAttribute("data-instance");

    walletKitState.current = {
      accountStatus: "ready",
      accountUser: { id: "acct-b" },
    };
    await act(async () => {
      view.rerender(<PortalAomiFrame />);
    });
    const accountBInstance = screen
      .getByTestId("aomi-frame")
      .getAttribute("data-instance");
    expect(accountBInstance).not.toBe(accountAInstance);

    walletKitState.current = {
      accountStatus: "ready",
      accountUser: undefined,
    };
    await act(async () => {
      view.rerender(<PortalAomiFrame />);
    });
    expect(screen.getByTestId("aomi-frame")).not.toHaveAttribute(
      "data-instance",
      accountBInstance,
    );
  });
});
