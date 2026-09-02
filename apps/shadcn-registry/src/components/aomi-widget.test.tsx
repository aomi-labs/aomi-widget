import { useEffect, useState, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GetAccountBearer } from "@aomi-labs/client";

const mocks = vi.hoisted(() => ({
  accountUser: undefined as { id: string } | undefined,
  mounts: 0,
  unmounts: 0,
  getAccountBearer: undefined as
    | (ReturnType<typeof vi.fn> & { required?: boolean })
    | undefined,
  runtimeBearers: [] as Array<GetAccountBearer | undefined>,
}));

vi.mock("../lib/wallet-kit", () => ({
  AomiWalletKitProvider: ({ children }: { children: ReactNode }) => children,
  useAomiWalletKit: () => ({
    accountUser: mocks.accountUser,
    getAccountBearer: mocks.getAccountBearer,
  }),
}));

vi.mock("./aomi-frame", () => {
  function Root({
    children,
    clientOptions,
  }: {
    children: ReactNode;
    clientOptions?: { getAccountBearer?: GetAccountBearer };
  }) {
    mocks.runtimeBearers.push(clientOptions?.getAccountBearer);
    const [draft, setDraft] = useState("");
    useEffect(() => {
      mocks.mounts += 1;
      return () => {
        mocks.unmounts += 1;
      };
    }, []);
    return (
      <div>
        <input
          aria-label="draft"
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
        {children}
      </div>
    );
  }
  const Slot = ({ children }: { children?: ReactNode }) => children;
  return { AomiFrame: { Root, Header: Slot, Composer: Slot } };
});

vi.mock("../lib/wallet-kit/execution/backend-aa-context", () => ({
  BackendAaProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./backend-aa-provisioner", () => ({
  BackendAaProvisioner: () => null,
}));

import { AomiWidget } from "./aomi-widget";

describe("AomiWidget authentication continuity", () => {
  beforeEach(() => {
    mocks.accountUser = undefined;
    mocks.mounts = 0;
    mocks.unmounts = 0;
    mocks.getAccountBearer = undefined;
    mocks.runtimeBearers = [];
  });

  it("preserves the runtime and delegates its stable bearer when an anonymous user signs in", async () => {
    const view = render(
      <AomiWidget
        apiUrl="https://chat.example"
        applicationId="app-1"
        auth={{ kind: "browser_wallet" }}
      />,
    );
    fireEvent.change(screen.getByLabelText("draft"), {
      target: { value: "unfinished message" },
    });
    const anonymousBearer = mocks.runtimeBearers.at(-1);
    await expect(anonymousBearer?.()).resolves.toBeUndefined();

    mocks.accountUser = { id: "user-1" };
    mocks.getAccountBearer = Object.assign(
      vi.fn(async () => "widget-token"),
      { required: true },
    );
    view.rerender(
      <AomiWidget
        apiUrl="https://chat.example"
        applicationId="app-1"
        auth={{ kind: "browser_wallet" }}
      />,
    );

    expect(screen.getByLabelText("draft")).toHaveValue("unfinished message");
    expect(mocks.mounts).toBe(1);
    expect(mocks.unmounts).toBe(0);
    const authenticatedBearer = mocks.runtimeBearers.at(-1);
    expect(authenticatedBearer).toBe(anonymousBearer);
    expect(authenticatedBearer?.required).toBe(true);
    await expect(authenticatedBearer?.()).resolves.toBe("widget-token");
  });
});
