import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

import { GeneralSettings } from "./general/general-settings";

type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

const widgetMock = vi.hoisted(() => ({
  getAccountCredential: vi.fn(async () => null),
  connect: vi.fn(async () => undefined),
  openAccountUI: vi.fn(async () => undefined),
}));

vi.mock("@aomi-labs/react", () => ({
  getChainInfo: () => ({ ticker: "ETH" }),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  formatAuthMethod: () => "Wallet",
  useAomiWalletKit: () => ({
    accountUser: { id: "acct-user-1" },
    canConnect: true,
    canOpenAccountUI: true,
    connect: widgetMock.connect,
    getAccountCredential: widgetMock.getAccountCredential,
    identity: {
      address: "0xabc",
      authMethod: "wallet",
      chainId: 1,
      isConnected: true,
      status: "connected",
    },
    openAccountUI: widgetMock.openAccountUI,
  }),
}));

vi.mock("./account/use-account-acl", () => ({
  useAccountAcl: () => ({
    status: "ready",
    wallets: [],
    grants: [],
    refresh: vi.fn(),
    commitMode: vi.fn(),
    revokeGrant: vi.fn(),
    stopAllAuto: vi.fn(),
    regrant: vi.fn(),
    blockedReason: () => null,
  }),
}));

function requestUrl(input: FetchCall["input"]): URL {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString(), "https://portal.test");
}

function requestPaths(calls: FetchCall[]): string[] {
  return calls.map((call) => requestUrl(call.input).pathname);
}

const ACCOUNT_OVERVIEW = {
  user: {
    apps: ["default"],
    created_at: 1_700_000_000,
    public_key: "0xabc",
    status: "active",
    tier: "pro",
    updated_at: 1_700_000_100,
    user_id: "acct-user-1",
    verified_email: "alice@example.com",
  },
  usage: {
    credit_paid: 100,
    credit_used: 12,
    input_tokens: 1234,
    output_tokens: 5678,
    period_utc_month: "2026-07",
  },
};

function installFetchRecorder() {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input, init });
      const url = requestUrl(input);
      const method =
        input instanceof Request ? input.method : (init?.method ?? "GET");

      if (url.pathname === "/api/account" && method === "GET") {
        return Response.json(ACCOUNT_OVERVIEW);
      }

      return new Response(`Unexpected request: ${method} ${url.pathname}`, {
        status: 500,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

// NOTE (settings redesign): the Apps/Bots/App Keys/Secrets/BYOK tabs were
// removed with the three-tab settings redesign. Account is now wired to real
// routes and covered by features/account/account-acl.test.tsx; Usage still
// renders from local fixtures (see docs/SETTINGS-REDESIGN-GAPS.md) — add its
// route-caller test here when /api/account/usage binds.
describe("settings route callers", () => {
  beforeEach(() => {
    widgetMock.getAccountCredential.mockClear();
    localStorage.clear();
    // jsdom has no matchMedia; useSettings consults it for the "auto" theme.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the general account overview from the account route", async () => {
    const { calls, fetchMock } = installFetchRecorder();

    render(<GeneralSettings />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requestPaths(calls)).toContain("/api/account");
    expect(requestPaths(calls)).not.toContain("/api/settings/account");
  });

  it("renders the summary card with plan and allowance from the account route", async () => {
    installFetchRecorder();

    render(<GeneralSettings />);

    await waitFor(() =>
      expect(screen.getByText("alice@example.com")).toBeTruthy(),
    );
    expect(screen.getByText("Pro")).toBeTruthy();
    expect(screen.getByText(/88 remaining/)).toBeTruthy();
    expect(screen.getByText(/12 \/ 100 used/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "View usage" })).toBeTruthy();
  });
});
