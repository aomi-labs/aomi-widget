import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const baseConfig = {
  baseUrl: "http://unit.test",
  app: "byreal",
  execution: "eoa" as const,
  secrets: {},
};

function jsonResponse(
  payload: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => payload),
    text: vi.fn(async () => JSON.stringify(payload)),
  } as unknown as Response;
}

async function flushDevicePoll(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
  await vi.advanceTimersByTimeAsync(1000);
}

describe("aomi account login", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-login-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("establishes an account session through CLI device login", async () => {
    const { loginCommand } = await import("../../src/cli/commands/account");
    const { readState } = await import("../../src/cli/state");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const nativeFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      if (target.endsWith("/api/cli/device/start")) {
        return jsonResponse({
          device_code: "device-123",
          user_code: "ABCD-EFGH",
          verification_uri: "https://chat.aomi.dev/cli/device",
          expires_at: Math.floor(Date.now() / 1000) + 60,
          interval: 1,
        });
      }
      if (target.endsWith("/api/cli/device/poll")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          device_code: "device-123",
        });
        return jsonResponse({
          status: "ok",
          credential: "bearer-1",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user_id: "user-1",
        });
      }
      if (target.endsWith("/api/account/wallets")) {
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer bearer-1");
        return jsonResponse({
          wallets: [
            {
              address: "0x1111111111111111111111111111111111111111",
              chain_type: "evm",
              wallet_provider: "privy",
              is_primary: true,
            },
            {
              address: "So11111111111111111111111111111111111111112",
              chain_type: "svm",
              wallet_provider: "privy",
              is_primary: true,
            },
          ],
        });
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const loginPromise = loginCommand(baseConfig);
      await flushDevicePoll();
      await loginPromise;

      expect(nativeFetch).toHaveBeenNthCalledWith(
        1,
        "http://unit.test/api/cli/device/start",
        expect.objectContaining({ method: "POST" }),
      );
      expect(nativeFetch).toHaveBeenNthCalledWith(
        2,
        "http://unit.test/api/cli/device/poll",
        expect.objectContaining({ method: "POST" }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Open this URL to authenticate your Aomi CLI:",
      );
      expect(logSpy).toHaveBeenCalledWith("https://chat.aomi.dev/cli/device");
      expect(logSpy).toHaveBeenCalledWith("Code: ABCD-EFGH");
      expect(logSpy).toHaveBeenCalledWith("Account: user-1");
      expect(readState()).toMatchObject({
        accountBearer: "bearer-1",
        publicKey: "0x1111111111111111111111111111111111111111",
        svmPublicKey: "So11111111111111111111111111111111111111112",
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("surfaces device-start failures", async () => {
    const { loginCommand } = await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn(async () =>
      jsonResponse(
        { error: "device login unavailable" },
        { ok: false, status: 503, statusText: "Service Unavailable" },
      ),
    );
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      await expect(loginCommand(baseConfig)).rejects.toThrow(
        "HTTP 503: device login unavailable",
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("reports denied device authorization", async () => {
    const { loginCommand } = await import("../../src/cli/commands/account");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const nativeFetch = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith("/api/cli/device/start")) {
        return jsonResponse({
          device_code: "device-123",
          user_code: "ABCD-EFGH",
          verification_uri: "https://chat.aomi.dev/cli/device",
          expires_at: Math.floor(Date.now() / 1000) + 60,
          interval: 1,
        });
      }
      if (target.endsWith("/api/cli/device/poll")) {
        return jsonResponse(
          { status: "access_denied" },
          { ok: false, status: 403, statusText: "Forbidden" },
        );
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const loginPromise = expect(loginCommand(baseConfig)).rejects.toThrow(
        "Device login failed: access_denied",
      );
      await flushDevicePoll();
      await loginPromise;
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
