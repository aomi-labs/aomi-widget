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

describe("aomi account login", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-login-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("prints a backend-minted Privy auth URL bound to the active session", async () => {
    const { walletLoginCommand } = await import("../../src/cli/commands/account");

    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        state_token: "state-1",
        auth_url: "https://chat.example/auth/privy?state=state-1",
        expires_at: 1_800_000_000,
      })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await walletLoginCommand(baseConfig);

      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/auth/privy/begin",
      );
      expect(
        JSON.parse(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).body as string,
        ),
      ).toEqual({
        application: "byreal",
      });
      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("X-Thread-Id")).toBeTruthy();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://chat.example/auth/privy"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("aomi wallet whoami"),
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("can request a solana-first Privy auth flow", async () => {
    const { walletLoginCommand } = await import("../../src/cli/commands/account");

    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        state_token: "state-1",
        auth_url:
          "https://chat.example/auth/privy?state=state-1&wallet_family=solana",
        expires_at: 1_800_000_000,
      })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      await walletLoginCommand(baseConfig, { walletFamily: "solana" });

      expect(
        JSON.parse(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).body as string,
        ),
      ).toEqual({
        application: "byreal",
        wallet_family: "solana",
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
