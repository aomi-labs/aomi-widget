// Orchestration contract of the bind ceremony (`ensureSvmWalletBound`):
// challenge → wallet signMessage over the exact challenge bytes → commit
// with the base64 signature; `already_bound` (409) short-circuits without
// signing on challenge, and maps to success-shape on a commit race.

import { describe, expect, it, vi } from "vitest";

import { AomiClient } from "../src/client";
import {
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  isUnboundWalletError,
} from "../src/authorization";

const WALLET = "BindTestWallet1111111111111111111111111111";
const MESSAGE = "Aomi Authorization v1\nbind test payload";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function challengeBody() {
  return {
    permit: {
      account: "acct-1",
      chain_type: "svm",
      wallet: WALLET,
      mode: "bind",
      version: 0,
      expiry: 4102444800,
    },
    message_base64: Buffer.from(MESSAGE, "utf-8").toString("base64"),
  };
}

/** The ceremony uses `raw: true` (bypasses payment-wrapped fetch), which
 * binds `globalThis.fetch` at construction — stub the global, then build. */
function clientWith(fetchImpl: typeof fetch): AomiClient {
  vi.stubGlobal("fetch", fetchImpl);
  return new AomiClient({ baseUrl: "https://api.test.invalid" });
}

describe("ensureSvmWalletBound", () => {
  it("signs the exact challenge bytes and commits them base64-encoded", async () => {
    const calls: Array<{ path: string; body: unknown }> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ path, body });
      if (path.endsWith("/challenge")) {
        return jsonResponse(200, challengeBody());
      }
      return jsonResponse(200, {
        address: WALLET,
        chain_type: "svm",
        signing_mode: "human_sync",
        authorization_version: 0,
      });
    }) as unknown as typeof fetch;

    const signMessage = vi.fn(async (message: Uint8Array) => {
      expect(Buffer.from(message).toString("utf-8")).toBe(MESSAGE);
      return Uint8Array.from([7, 7, 7]);
    });

    const result = await ensureSvmWalletBound(
      clientWith(fetchImpl),
      WALLET,
      signMessage,
    );

    expect(result).toMatchObject({
      status: "bound",
      state: { signing_mode: "human_sync" },
    });
    expect(signMessage).toHaveBeenCalledTimes(1);
    const commit = calls.find((call) => call.path.endsWith("/commit"));
    expect(commit?.body).toMatchObject({
      permit: { wallet: WALLET, mode: "bind" },
      signature: Buffer.from([7, 7, 7]).toString("base64"),
    });
  });

  it("short-circuits without signing when the challenge says already_bound", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(409, { error: "already_bound" }),
    ) as unknown as typeof fetch;
    const signMessage = vi.fn();

    const result = await ensureSvmWalletBound(
      clientWith(fetchImpl),
      WALLET,
      signMessage,
    );

    expect(result).toEqual({ status: "already_bound" });
    expect(signMessage).not.toHaveBeenCalled();
  });

  it("maps a commit-side already_bound race to already_bound", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/challenge")) {
        return jsonResponse(200, challengeBody());
      }
      return jsonResponse(409, { error: "already_bound" });
    }) as unknown as typeof fetch;

    const result = await ensureSvmWalletBound(clientWith(fetchImpl), WALLET, async () =>
      Uint8Array.from([1]),
    );

    expect(result).toEqual({ status: "already_bound" });
  });

  it("propagates non-bind failures", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(500, { error: "internal" }),
    ) as unknown as typeof fetch;

    await expect(
      ensureSvmWalletBound(clientWith(fetchImpl), WALLET, async () =>
        Uint8Array.from([1]),
      ),
    ).rejects.toThrow(/500/);
  });

  // The portal drives the ceremony through its own `accountScopedFetch`
  // poster (no AomiClient), so the core must run on a bare poster too.
  it("runs the full loop through a raw AuthorizationPoster", async () => {
    const posted: Array<{ path: string; body: unknown }> = [];
    const post = async <T>(path: string, body: unknown): Promise<T> => {
      posted.push({ path, body });
      if (path.endsWith("/challenge")) {
        return challengeBody() as T;
      }
      return {
        address: WALLET,
        chain_type: "svm",
        signing_mode: "human_sync",
        authorization_version: 0,
      } as T;
    };

    const result = await ensureSvmWalletBoundVia(post, WALLET, async () =>
      Uint8Array.from([9, 9]),
    );

    expect(result).toMatchObject({ status: "bound" });
    expect(posted.map((call) => call.path)).toEqual([
      "/api/account/authorization/challenge",
      "/api/account/authorization/commit",
    ]);
  });

  // The (b) trigger: the gate's error text must be recognizable so the
  // contextual bind prompt can fire on a failed commit.
  it("detects the gate's unbound-wallet signal", () => {
    expect(
      isUnboundWalletError(
        new Error("commit_ix: [err.type=signing_unbound_wallet] ..."),
      ),
    ).toBe(true);
    expect(isUnboundWalletError(new Error("signing_denied"))).toBe(false);
    expect(isUnboundWalletError(undefined)).toBe(false);
  });
});
