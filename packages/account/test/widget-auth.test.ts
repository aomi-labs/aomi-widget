// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createSiweMessage } from "viem/siwe";
import { privateKeyToAccount } from "viem/accounts";

const accountMocks = vi.hoisted(() => ({
  getOrCreateAomiUserForSiwe: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("../src/service/account-service", () => accountMocks);

import { observedWidgetOrigin } from "../src/widget-auth/origin";
import {
  issueWidgetSession,
  resolveWidgetSession,
  revokeWidgetSession,
} from "../src/widget-auth/session";
import {
  createWidgetSiweChallenge,
  verifyWidgetSiweProof,
  WidgetAuthError,
} from "../src/widget-auth/siwe";
import type {
  WidgetAuthStore,
  WidgetAuthTicket,
} from "../src/widget-auth/store";

type StoredTicket = { ticket: WidgetAuthTicket; expiresAt: Date };

function fakeTicketStore(): {
  tickets: Map<string, StoredTicket>;
  store: WidgetAuthStore;
} {
  const tickets = new Map<string, StoredTicket>();
  return {
    tickets,
    store: {
      write: async ({ identifier, ticket, expiresAt }) => {
        tickets.set(identifier, { ticket, expiresAt });
      },
      read: async ({ identifier, now }) => {
        const stored = tickets.get(identifier);
        return stored && stored.expiresAt > now ? stored.ticket : null;
      },
      consume: async ({ identifier, now }) => {
        const stored = tickets.get(identifier);
        if (!stored || stored.expiresAt <= now) return null;
        tickets.delete(identifier);
        return stored.ticket;
      },
      delete: async ({ identifier }) => tickets.delete(identifier),
    },
  };
}

function widgetRequest(origin: string, token?: string): Request {
  const headers = new Headers({ Origin: origin });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request("https://chat.aomi.dev/api/widget", { headers });
}

describe("widget auth", () => {
  it("accepts HTTPS origins and limits local HTTP to non-production", () => {
    expect(
      observedWidgetOrigin(
        widgetRequest("https://customer.example"),
        "production",
      ),
    ).toBe("https://customer.example");
    expect(
      observedWidgetOrigin(widgetRequest("http://localhost:5173"), "test"),
    ).toBe("http://localhost:5173");
    expect(
      observedWidgetOrigin(
        widgetRequest("http://localhost:5173"),
        "production",
      ),
    ).toBeNull();
  });

  it("stores only a token hash and binds the WST to its observed origin", async () => {
    const { store, tickets } = fakeTicketStore();
    const session = await issueWidgetSession({
      userId: "user-1",
      origin: "https://customer.example",
      now: new Date("2026-07-15T00:00:00.000Z"),
      store,
    });

    expect(session.token).toMatch(/^aomi_wst_/);
    expect(JSON.stringify([...tickets])).not.toContain(session.token);
    await expect(
      resolveWidgetSession({
        request: widgetRequest("https://customer.example", session.token),
        now: new Date("2026-07-15T00:01:00.000Z"),
        store,
      }),
    ).resolves.toEqual({
      userId: "user-1",
      origin: "https://customer.example",
    });
    await expect(
      resolveWidgetSession({
        request: widgetRequest("https://attacker.example", session.token),
        now: new Date("2026-07-15T00:01:00.000Z"),
        store,
      }),
    ).resolves.toBeNull();

    await expect(
      revokeWidgetSession({
        request: widgetRequest("https://customer.example", session.token),
        now: new Date("2026-07-15T00:01:00.000Z"),
        store,
      }),
    ).resolves.toBe(true);
  });

  it("verifies and atomically consumes an observed-origin SIWE challenge", async () => {
    const { store } = fakeTicketStore();
    const account = privateKeyToAccount(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    const request = widgetRequest("https://customer.example");
    const challenge = await createWidgetSiweChallenge({
      request,
      walletAddress: account.address,
      chainId: 1,
      now: new Date("2026-07-15T00:00:00.000Z"),
      store,
    });
    const message = createSiweMessage({
      address: account.address,
      chainId: 1,
      domain: challenge.domain,
      uri: challenge.uri,
      version: "1",
      nonce: challenge.nonce,
      issuedAt: new Date(challenge.issuedAt),
      expirationTime: new Date(challenge.expirationTime),
      statement: "Sign in to Aomi from this site.",
    });
    const signature = await account.signMessage({ message });

    const session = await verifyWidgetSiweProof({
      request,
      message,
      signature,
      walletAddress: account.address,
      chainId: 1,
      now: new Date("2026-07-15T00:01:00.000Z"),
      store,
    });

    expect(session.userId).toBe("user-1");
    expect(accountMocks.getOrCreateAomiUserForSiwe).toHaveBeenCalledWith(
      expect.objectContaining({ address: account.address, chainId: 1 }),
    );
    await expect(
      verifyWidgetSiweProof({
        request,
        message,
        signature,
        walletAddress: account.address,
        chainId: 1,
        now: new Date("2026-07-15T00:01:01.000Z"),
        store,
      }),
    ).rejects.toMatchObject<Partial<WidgetAuthError>>({
      code: "invalid_or_expired_nonce",
      status: 401,
    });
  });
});
