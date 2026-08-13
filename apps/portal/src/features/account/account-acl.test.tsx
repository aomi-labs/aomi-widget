import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { AccountSettings } from "./account-settings";
import { seedAccountOverview } from "@portal/lib/account-overview";

type FetchCall = { input: string | URL | Request; init?: RequestInit };

const CONNECTED_EVM = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
const PRIVY_SVM = "8xKnQm4kZ7wRt2YbNc5vHj3PqLsDgFxA6eU9QpS1TzWv";

const walletKit = vi.hoisted(() => ({
  signTypedData: vi.fn(async () => ({ signature: "0xsignature" })),
  signSolanaMessage: vi.fn(async () => ({ signature: "c2ln" })),
  openAccountUI: vi.fn(async () => undefined),
  identity: {
    address: "",
    svmAddress: undefined as string | undefined,
    sessionProvider: undefined as string | undefined,
    embeddedProvider: undefined as string | undefined,
  },
  accounts: [] as Array<{
    id: string;
    family: "evm" | "svm";
    address: string;
    walletName?: string;
    active: boolean;
  }>,
}));

const privyDelegation = vi.hoisted(() => ({ start: vi.fn() }));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => walletKit,
  usePrivyDelegation: () => privyDelegation,
}));

vi.mock("@aomi-labs/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aomi-labs/react")>()),
  useOptionalAomiRuntime: () => ({ currentThreadId: "thread-aa-test" }),
}));

/** Backend `AccountWalletView` rows — the exact wire shape of /api/account/wallets. */
const WALLETS = {
  wallets: [
    {
      address: CONNECTED_EVM,
      chain_type: "evm",
      wallet_provider: null,
      signing: "client",
      is_primary: true,
      signing_mode: "manual",
      authorization_version: 2,
      last_authorized_at: 1_752_000_000,
      last_authorized_by: CONNECTED_EVM,
      has_delegated_grant: false,
      provider_managed: false,
      can_use_auto: false,
    },
    {
      address: PRIVY_SVM,
      chain_type: "svm",
      wallet_provider: "privy",
      signing: "delegated",
      is_primary: false,
      signing_mode: "auto",
      authorization_version: 4,
      has_delegated_grant: true,
      provider_managed: false,
      can_use_auto: true,
      expires_at: 1_785_000_000,
    },
  ],
};

const GRANTS = {
  grants: [
    {
      id: 41,
      provider: "privy",
      grant_kind: "session_delegation",
      status: "active",
      created_at: 1_750_000_000,
      expires_at: 1_785_000_000,
      chain_type: "svm",
      address: PRIVY_SVM,
    },
  ],
};

function installFetchRecorder(overrides: Record<string, () => Response> = {}) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init });
      const url = new URL(input.toString(), "https://portal.test");
      const method = init?.method ?? "GET";

      const override = overrides[url.pathname];
      if (override) return override();

      if (url.pathname === "/api/account/wallets")
        return Response.json(WALLETS);
      if (url.pathname === "/api/account/grants") return Response.json(GRANTS);
      if (url.pathname === "/api/account/authorization/challenge") {
        return Response.json({
          permit: {
            account: "acct-1",
            chain_type: "evm",
            wallet: CONNECTED_EVM,
            mode: "client_auto",
            version: 2,
            expiry: 1_800_000_000,
          },
          typed_data: { primaryType: "AuthorizationPermit" },
        });
      }
      if (url.pathname === "/api/account/authorization/commit") {
        return Response.json({
          address: CONNECTED_EVM,
          chain_type: "evm",
          signing_mode: "client_auto",
          authorization_version: 3,
        });
      }
      if (url.pathname.endsWith("/grant") && method === "DELETE") {
        return Response.json({ status: "revoked", provider: "privy" });
      }
      if (
        url.pathname === "/api/account/providers/para/agent-wallet" &&
        method === "POST"
      ) {
        return Response.json({
          wallet: {
            address: "ParaAgentWallet111111111111111111111111111",
            chain_type: "svm",
            wallet_provider: "para",
            signing: "delegated",
            is_primary: false,
            signing_mode: "manual",
            authorization_version: 0,
            has_delegated_grant: false,
            provider_managed: true,
            can_use_auto: false,
          },
        });
      }
      return new Response(`Unexpected ${method} ${url.pathname}`, {
        status: 500,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

/** Render and let the initial wallets+grants load settle inside `act`. */
async function renderAcl() {
  await act(async () => {
    render(<AccountSettings />);
  });
}

/** Click and flush the async handler it kicks off. */
const click = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el);
  });
};

const paths = (calls: FetchCall[]) =>
  calls.map(
    (call) => new URL(call.input.toString(), "https://portal.test").pathname,
  );

const bodyOf = (calls: FetchCall[], path: string) => {
  const call = calls.find(
    (c) => new URL(c.input.toString(), "https://portal.test").pathname === path,
  );
  return call?.init?.body ? JSON.parse(String(call.init.body)) : undefined;
};

describe("account ACL wiring", () => {
  beforeEach(() => {
    walletKit.identity = {
      address: CONNECTED_EVM,
      svmAddress: undefined,
      sessionProvider: undefined,
      embeddedProvider: undefined,
    };
    walletKit.accounts = [];
    walletKit.signTypedData.mockClear();
    privyDelegation.start.mockReset();
    privyDelegation.start.mockResolvedValue(undefined);
    // The overview store is module-level; seed it so the tab doesn't also
    // depend on /api/account here.
    seedAccountOverview({
      user: { user_id: "acct-1", verified_email: "alice@example.com" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    seedAccountOverview(null);
  });

  it("loads wallets and grants from the account routes", async () => {
    const { calls } = installFetchRecorder();

    await renderAcl();

    await screen.findByText("0x71C7…976F");
    expect(paths(calls)).toContain("/api/account/wallets");
    expect(paths(calls)).toContain("/api/account/grants");
    // Privy provenance + live grant render from the wire inside the expanded row.
    await click(await screen.findByText("Privy"));
    expect(screen.getByText(/Privy · Session delegation/)).toBeTruthy();
  });

  it("runs challenge → sign → commit and reloads on a mode change", async () => {
    const { calls } = installFetchRecorder();

    await renderAcl();
    const row = await screen.findByText("0x71C7…976F");

    await click(row);
    await click(await screen.findByText("Auto-approve"));
    await click(await screen.findByText("Sign to authorize"));

    await waitFor(() =>
      expect(paths(calls)).toContain("/api/account/authorization/commit"),
    );
    expect(bodyOf(calls, "/api/account/authorization/challenge")).toEqual({
      chain_type: "evm",
      wallet: CONNECTED_EVM,
      mode: "client_auto",
    });
    expect(walletKit.signTypedData).toHaveBeenCalledOnce();
    expect(bodyOf(calls, "/api/account/authorization/commit")).toMatchObject({
      signature: "0xsignature",
    });
    // Committed state is re-read rather than assumed.
    expect(
      paths(calls).filter((p) => p === "/api/account/wallets"),
    ).toHaveLength(2);
  });

  it("allows a user-controlled Para wallet to accept transactions", async () => {
    const paraWallets = {
      wallets: [
        {
          ...WALLETS.wallets[0],
          wallet_provider: "para",
          provider_managed: false,
          can_use_auto: false,
        },
      ],
    };
    const { calls } = installFetchRecorder({
      "/api/account/wallets": () => Response.json(paraWallets),
      "/api/account/grants": () => Response.json({ grants: [] }),
    });

    await renderAcl();
    await click(await screen.findByText("0x71C7…976F"));

    const accept = await screen.findByRole("button", {
      name: /^Auto-approve/,
    });
    expect(accept).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /^Bypass permissions/ })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: /^Locked/ })).toHaveProperty(
      "disabled",
      false,
    );

    await click(accept);
    const authorize = await screen.findByRole("button", {
      name: "Sign to authorize",
    });
    expect(authorize).toHaveProperty("disabled", false);

    await click(authorize);
    await waitFor(() =>
      expect(paths(calls)).toContain("/api/account/authorization/commit"),
    );
    expect(walletKit.signTypedData).toHaveBeenCalledOnce();
  });

  it("blocks a loosening permit when the wallet itself isn't connected", async () => {
    walletKit.identity = {
      address: "0xSomeOtherWallet",
      svmAddress: undefined,
    };
    const { calls } = installFetchRecorder();

    await renderAcl();
    const row = await screen.findByText("0x71C7…976F");

    await click(row);
    await click(await screen.findByText("Auto-approve"));

    expect(
      screen.getByText("Connect this wallet itself to widen what it may sign."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Sign to authorize/ }),
    ).toHaveProperty("disabled", true);
    expect(paths(calls)).not.toContain("/api/account/authorization/challenge");
  });

  it("restates a lost version CAS in words instead of raw JSON", async () => {
    // The backend answers `{"error":"stale_permit"}` with a 409 when another
    // commit won the version race; the raw body must never reach the user.
    installFetchRecorder({
      "/api/account/authorization/commit": () =>
        new Response(JSON.stringify({ error: "stale_permit" }), {
          status: 409,
        }),
    });

    await renderAcl();
    await click(await screen.findByText("0x71C7…976F"));
    await click(await screen.findByText("Auto-approve"));
    await click(await screen.findByText("Sign to authorize"));

    expect(
      await screen.findByText(
        "This wallet changed while you were signing. Reload and try again.",
      ),
    ).toBeTruthy();
  });

  it("revokes a grant through the provider grant route", async () => {
    const { calls } = installFetchRecorder();

    await renderAcl();
    await click(await screen.findByText("Privy"));
    await click(await screen.findByText("Revoke"));

    await waitFor(() =>
      expect(paths(calls)).toContain("/api/account/providers/privy/grant"),
    );
  });

  it("shows unbound connected wallets and runs the bind ceremony", async () => {
    const UNBOUND = "0xUnboundWallet00000000000000000000000001";
    walletKit.accounts = [
      {
        id: "rabby",
        family: "evm",
        address: UNBOUND,
        walletName: "Rabby",
        active: false,
      },
    ];
    const { calls } = installFetchRecorder({
      "/api/account/authorization/challenge": () =>
        Response.json({
          permit: {
            account: "acct-1",
            chain_type: "evm",
            wallet: UNBOUND,
            mode: "bind",
            version: 0,
            expiry: 1_800_000_000,
          },
          typed_data: { primaryType: "AuthorizationPermit" },
        }),
    });

    await renderAcl();
    await click(await screen.findByRole("button", { name: "Activate" }));

    await waitFor(() =>
      expect(paths(calls)).toContain("/api/account/authorization/commit"),
    );
    expect(bodyOf(calls, "/api/account/authorization/challenge")).toEqual({
      chain_type: "evm",
      wallet: UNBOUND,
      mode: "bind",
    });
  });

  it("provisions a Para agent wallet through the provider route", async () => {
    const paraWallets = {
      wallets: [
        {
          ...WALLETS.wallets[0],
          wallet_provider: "para",
          provider_managed: false,
          can_use_auto: false,
        },
      ],
    };
    const { calls } = installFetchRecorder({
      "/api/account/wallets": () => Response.json(paraWallets),
      "/api/account/grants": () => Response.json({ grants: [] }),
    });

    await renderAcl();
    await click(
      await screen.findByRole("button", { name: "Provision agent wallet" }),
    );

    await waitFor(() =>
      expect(paths(calls)).toContain(
        "/api/account/providers/para/agent-wallet",
      ),
    );
  });

  it("runs the one-time Privy delegation ceremony before Auto is available", async () => {
    walletKit.identity = {
      address: CONNECTED_EVM,
      svmAddress: undefined,
      sessionProvider: "privy",
      embeddedProvider: "privy",
    };
    const { calls } = installFetchRecorder({
      "/api/delegation/privy/begin": () =>
        Response.json({
          auth_url: "https://portal.test/auth/privy?signer_id=aomi-signer",
          state_token: "signed-state",
        }),
    });

    await renderAcl();
    await click(await screen.findByRole("button", { name: "Enable" }));

    await waitFor(() => {
      expect(privyDelegation.start).toHaveBeenCalledWith({
        state: "signed-state",
        signerId: "aomi-signer",
      });
    });
    const begin = calls.find(
      (call) =>
        new URL(call.input.toString(), "https://portal.test").pathname ===
        "/api/delegation/privy/begin",
    );
    expect(begin?.init?.headers).toMatchObject({
      "X-Thread-Id": "thread-aa-test",
    });
    expect(JSON.parse(String(begin?.init?.body))).toEqual({
      wallet_family: "evm",
      purpose: "delegate_signing",
    });
  });
});
