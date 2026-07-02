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
    const { accountLoginCommand } = await import(
      "../../src/cli/commands/account"
    );

    const nativeFetch = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.endsWith("/api/auth/siwe/nonce")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            nonce: "abc123def456",
            domain: "chat.aomi.dev",
            uri: "https://chat.aomi.dev",
          })),
        } as unknown as Response;
      }
      if (target.endsWith("/api/auth/siwe/verify")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            token: "session-123",
            success: true,
            user: {
              id: "better-auth-user",
              walletAddress:
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              chainId: 1,
            },
          })),
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "set-auth-token"
                ? "session-123"
                : null,
          },
        } as unknown as Response;
      }
      if (target.endsWith("/api/aomi/account")) {
        return {
          ok: true,
          status: 200,
          json: vi.fn(async () => ({
            session: {
              betterAuthUserId: "better-auth-user",
              expiresAt: "2030-01-02T03:04:05.000Z",
            },
          })),
        } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await accountLoginCommand({
        ...baseConfig,
        baseUrl: "https://chat.aomi.dev",
        privateKey: TEST_PRIVATE_KEY,
      });

      expect(nativeFetch).toHaveBeenNthCalledWith(
        1,
        "https://chat.aomi.dev/api/auth/siwe/nonce",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(String(nativeFetch.mock.calls[1]?.[0])).toBe(
        "https://chat.aomi.dev/api/auth/siwe/verify",
      );
      const verifyInit = nativeFetch.mock.calls[1]?.[1] as RequestInit;
      expect(new Headers(verifyInit.headers).get("Content-Type")).toBe(
        "application/json",
      );
      expect(JSON.parse(verifyInit.body as string)).toEqual({
        chainId: 1,
        message: expect.stringContaining("Nonce: abc123def456"),
        signature: expect.stringMatching(/^0x/),
        walletAddress: expect.stringMatching(/^0x/),
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signed in with 0x"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Session expires at 2030-01-02T03:04:05.000Z",
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("requires an EVM private key", async () => {
    const { accountLoginCommand } = await import(
      "../../src/cli/commands/account"
    );

    const nativeFetch = vi.fn();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(accountLoginCommand(baseConfig)).rejects.toMatchObject({
        code: 1,
      });
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

});
