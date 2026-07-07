import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

import { AppsSettings } from "./apps/apps-settings";
import { Bots } from "./bots/bots";
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

function requestUrl(input: FetchCall["input"]): URL {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString(), "https://portal.test");
}

function requestMethod(call: FetchCall): string {
  if (call.input instanceof Request) return call.input.method;
  return call.init?.method ?? "GET";
}

function requestPaths(calls: FetchCall[]): string[] {
  return calls.map((call) => requestUrl(call.input).pathname);
}

function hasCall(calls: FetchCall[], path: string, method = "GET") {
  return calls.some(
    (call) =>
      requestUrl(call.input).pathname === path &&
      requestMethod(call) === method,
  );
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

const USAGE_OVERVIEW = {
  apps: [
    {
      app: "default",
      credit_paid: 10,
      credits_used: 3,
      input_tokens: 100,
      is_available: true,
      output_tokens: 50,
      source: "account",
    },
  ],
  overall: {
    credit_paid: 10,
    credit_used: 3,
    input_tokens: 100,
    output_tokens: 50,
  },
  period_utc_from: "2026-07-01",
  period_utc_to: "2026-07-31",
  user: {
    public_key: "0xabc",
    tier: "pro",
    user_id: "acct-user-1",
    verified_email: "alice@example.com",
  },
};

const BOT_REGISTRATION = {
  created_at: 1_700_000_000,
  default_app: "default",
  id: "bot-1",
  label: "Trading assistant",
  platform: "telegram",
  platform_bot_id: "telegram-bot-1",
  platform_username: "trading_bot",
  status: "active",
  thread_mode: "single",
  updated_at: 1_700_000_000,
  webhook_url: "https://api.aomi.dev/webhooks/telegram/bot-1",
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
      if (url.pathname === "/api/account/usage" && method === "GET") {
        return Response.json(USAGE_OVERVIEW);
      }
      if (url.pathname === "/api/account/apps" && method === "GET") {
        return Response.json(["default"]);
      }
      if (url.pathname === "/api/account/bots" && method === "GET") {
        return Response.json({ bot_registrations: [] });
      }
      if (url.pathname === "/api/account/bots" && method === "POST") {
        return Response.json({ bot_registration: BOT_REGISTRATION });
      }
      if (url.pathname === "/api/threads" && method === "POST") {
        return Response.json({ thread_id: "thread-1" });
      }

      return new Response(`Unexpected request: ${method} ${url.pathname}`, {
        status: 500,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

describe("settings route callers", () => {
  beforeEach(() => {
    widgetMock.getAccountCredential.mockClear();
    localStorage.clear();
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

  it("loads usage from the account usage route", async () => {
    const { calls, fetchMock } = installFetchRecorder();

    render(<AppsSettings />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requestPaths(calls)).toContain("/api/account/usage");
    expect(requestPaths(calls)).not.toContain("/api/settings/apps/overview");
  });

  it("loads and creates Telegram bot registrations through account bot routes", async () => {
    const { calls } = installFetchRecorder();

    render(<Bots />);

    await waitFor(() => expect(hasCall(calls, "/api/account/apps")).toBe(true));
    expect(hasCall(calls, "/api/account/bots")).toBe(true);
    expect(requestPaths(calls)).not.toContain(
      "/api/settings/bot-registrations",
    );

    fireEvent.change(screen.getByLabelText("Bot Token"), {
      target: { value: "123456:telegram-secret" },
    });
    await waitFor(() => expect(screen.getByText("Register bot")).toBeEnabled());
    fireEvent.click(screen.getByText("Register bot"));

    await waitFor(() =>
      expect(hasCall(calls, "/api/account/bots", "POST")).toBe(true),
    );
    expect(requestPaths(calls)).not.toContain(
      "/api/settings/bot-registrations",
    );
  });
});
