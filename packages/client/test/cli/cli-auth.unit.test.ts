import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

const ORIGINAL_ENV = { ...process.env };
const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;
const ACCOUNT = privateKeyToAccount(PRIVATE_KEY);

describe("CLI BetterAuth SIWE auth", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-auth-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("signs the BetterAuth SIWE nonce and persists the session token with expiry", async () => {
    const { signInWithCliSiwe } = await import("../../src/cli/auth");
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/auth/siwe/nonce")) {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toEqual({
            walletAddress: ACCOUNT.address,
            chainId: 8453,
          });
          return Response.json(
            {
              nonce: "nonce-123",
              domain: "portal.test",
              uri: "https://portal.test",
            },
            {
            },
          );
        }
        if (url.endsWith("/api/auth/siwe/verify")) {
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("Cookie")).toBeNull();
          const body = JSON.parse(String(init?.body));
          expect(body.walletAddress).toBe(ACCOUNT.address);
          expect(body.chainId).toBe(8453);
          expect(body.message).toContain("portal.test wants you to sign in");
          expect(body.message).toContain(`\n${ACCOUNT.address}\n`);
          expect(body.message).toContain("Nonce: nonce-123");
          expect(body.signature).toMatch(/^0x[0-9a-f]+$/i);
          return Response.json(
            {
              ok: true,
              user_id: "canonical-user",
            },
            {
              headers: {
                "set-auth-token": "better-auth-session-token",
              },
            },
          );
        }
        if (url.endsWith("/api/aomi/account")) {
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBe(
            "Bearer better-auth-session-token",
          );
          return Response.json({
            session: {
              betterAuthUserId: "canonical-user",
              expiresAt: "2030-01-02T03:04:05.000Z",
            },
          });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    ) as unknown as typeof fetch;

    const result = await signInWithCliSiwe({
      baseUrl: "https://portal.test",
      privateKey: PRIVATE_KEY,
      chainId: 8453,
      fetch: fetchMock,
    });

    expect(result.address).toBe(ACCOUNT.address);
    expect(result.auth).toEqual({
      sessionToken: "better-auth-session-token",
      expiresAt: Date.parse("2030-01-02T03:04:05.000Z"),
      walletAddress: ACCOUNT.address,
      chainId: 8453,
      betterAuthUserId: "canonical-user",
    });
  });

  it("provides only unexpired BetterAuth session tokens to AomiClient", async () => {
    const { createCliAuthTokenProvider } = await import("../../src/cli/auth");

    const validProvider = createCliAuthTokenProvider(
      () => ({
        auth: {
          sessionToken: "session-token",
          expiresAt: 60_000,
        },
      }),
      () => 1_000,
    );
    await expect(validProvider()).resolves.toBe("session-token");

    const expiredProvider = createCliAuthTokenProvider(
      () => ({
        auth: {
          sessionToken: "session-token",
          expiresAt: 10_000,
        },
      }),
      () => 10_000,
    );
    await expect(expiredProvider()).resolves.toBeUndefined();
  });

  it("signs localhost as the SIWE domain when the portal URL uses 127.0.0.1", async () => {
    const { signInWithCliSiwe } = await import("../../src/cli/auth");
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/auth/siwe/nonce")) {
          return Response.json({ nonce: "nonce-123" });
        }
        if (url.endsWith("/api/auth/siwe/verify")) {
          const body = JSON.parse(String(init?.body));
          expect(body.message).toContain(
            "localhost:3000 wants you to sign in",
          );
          return Response.json(
            { success: true },
            { headers: { "set-auth-token": "better-auth-session-token" } },
          );
        }
        if (url.endsWith("/api/aomi/account")) {
          return Response.json({ session: null });
        }
        throw new Error(`Unexpected URL ${url}`);
      },
    ) as unknown as typeof fetch;

    await signInWithCliSiwe({
      baseUrl: "http://127.0.0.1:3000",
      privateKey: PRIVATE_KEY,
      fetch: fetchMock,
    });
  });

  it("logs out and clears the stored CLI auth session", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe("https://portal.test/api/auth/sign-out");
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer session-token",
        );
        expect(new Headers(init?.headers).get("Content-Type")).toBe(
          "application/json",
        );
        expect(init?.body).toBe("{}");
        return Response.json({ success: true });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const { CliSession } = await import("../../src/cli/cli-session");
    const { logoutCommand } = await import("../../src/cli/commands/account");
    const { readState } = await import("../../src/cli/state");

    const cli = CliSession.loadOrCreate({
      baseUrl: "https://portal.test",
      app: "default",
      execution: "eoa",
      secrets: {},
    });
    cli.setAuthSession({
      sessionToken: "session-token",
      expiresAt: Date.now() + 60_000,
    });

    await logoutCommand({ secrets: {} });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readState()?.auth).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith("Signed out");
  });
});
