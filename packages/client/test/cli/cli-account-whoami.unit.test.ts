import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const baseConfig = {
  baseUrl: "http://unit.test",
  app: "default",
  execution: "eoa" as const,
  secrets: {},
};

describe("aomi account whoami", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-whoami-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("prints the bound account identity when authenticated", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { whoamiCommand } = await import("../../src/cli/commands/account");

    const cli = CliSession.loadOrCreate(baseConfig);
    cli.setAuthSession({
      sessionToken: "account-session",
      expiresAt: Date.now() + 60_000,
      origin: "http://unit.test",
      subject: "user-1",
    });

    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        user: { id: "user-1", email: "a@b.c" },
        linkedAccounts: [],
        wallets: [
          {
            id: "wallet-evm-1",
            address: "0xabc",
            family: "evm",
            provider: "privy",
            linkedVia: "privy",
          },
          {
            id: "wallet-sol-1",
            address: "So11111111111111111111111111111111111111112",
            family: "svm",
            provider: "privy",
            linkedVia: "privy",
          },
        ],
        session: { betterAuthUserId: "user-1" },
      })),
    } as unknown as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await whoamiCommand(baseConfig);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("user-1"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.c"));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Wallets:       2"),
    );
  });

  it("rejects whoami without an account session before making a request", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { whoamiCommand } = await import("../../src/cli/commands/account");

    CliSession.loadOrCreate(baseConfig);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(whoamiCommand(baseConfig)).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("account_session_missing"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves an actionable non-JSON backend failure", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { whoamiCommand } = await import("../../src/cli/commands/account");
    const cli = CliSession.loadOrCreate(baseConfig);
    cli.setAuthSession({
      sessionToken: "account-session",
      expiresAt: Date.now() + 60_000,
      origin: "http://unit.test",
      subject: "user-1",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream unavailable", { status: 503 })),
    );

    await expect(whoamiCommand(baseConfig)).rejects.toThrow(
      "Request failed: HTTP 503 upstream unavailable",
    );
  });
});
