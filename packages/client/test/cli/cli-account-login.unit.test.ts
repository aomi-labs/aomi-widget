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
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

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

  it("establishes an account session through BFF SIWE", async () => {
    const { walletLoginCommand } = await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith("/api/bff/auth/siwe/nonce")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({ nonce: "abc123def456" })),
        } as unknown as Response;
      }
      if (target.endsWith("/api/bff/auth/siwe/verify")) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "set-cookie"
                ? "aomi_session=session-123; Path=/; HttpOnly"
                : null,
          },
        } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await walletLoginCommand({
        ...baseConfig,
        baseUrl: "https://chat.aomi.dev",
        privateKey: TEST_PRIVATE_KEY,
      });

      expect(nativeFetch).toHaveBeenNthCalledWith(
        1,
        "https://chat.aomi.dev/api/bff/auth/siwe/nonce",
      );
      expect(String(nativeFetch.mock.calls[1]?.[0])).toBe(
        "https://chat.aomi.dev/api/bff/auth/siwe/verify",
      );
      const verifyInit = nativeFetch.mock.calls[1]?.[1] as RequestInit;
      expect(new Headers(verifyInit.headers).get("Cookie")).toBe(
        "aomi_siwe_nonce=abc123def456",
      );
      expect(JSON.parse(verifyInit.body as string)).toMatchObject({
        signature: expect.stringMatching(/^0x/),
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signed in as 0x"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Session established at https://chat.aomi.dev.",
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("requires an EVM private key", async () => {
    const { walletLoginCommand } = await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(walletLoginCommand(baseConfig)).rejects.toMatchObject({
        code: 1,
      });
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("does not route Solana login through backend Privy auth", async () => {
    const { walletLoginCommand } = await import("../../src/cli/commands/account");

    const nativeFetch = vi.fn();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(
        walletLoginCommand(
          {
            ...baseConfig,
            privateKey: TEST_PRIVATE_KEY,
          },
          { walletFamily: "solana" },
        ),
      ).rejects.toMatchObject({
        code: 1,
      });
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
