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

describe("aomi account (bare canonical view)", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-account-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("prints the bound account identity and the linked providers table", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { accountShowCommand } = await import(
      "../../src/cli/commands/account"
    );

    CliSession.loadOrCreate({ ...baseConfig, accountBearer: "bearer-1" });

    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        user: { user_id: "user-1", verified_email: "a@b.c", tier: "free" },
        auth_identities: [
          {
            id: 1,
            wallet_provider: "privy",
            auth_method: "wallet",
            auth_verified_at: 1_750_000_000,
            is_primary: true,
            created_at: 1_750_000_000,
          },
          {
            id: 2,
            wallet_provider: "better-auth",
            auth_method: "email",
            auth_verified_at: null,
            is_primary: false,
            created_at: 1_750_000_000,
          },
        ],
        identity_wallets: [
          {
            wallet_id: "wallet-evm-1",
            address: "0xabc",
            chain_type: "ethereum",
            wallet_provider: "privy",
          },
        ],
      })),
    } as unknown as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await accountShowCommand(baseConfig);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("user-1"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.c"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("free"));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Providers: 2"),
    );
    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    const privyRow = lines.find((line) => line.includes("privy"));
    expect(privyRow).toBeDefined();
    expect(privyRow).toContain("wallet");
    expect(privyRow).toContain("✓");
    expect(lines.some((line) => line.includes("better-auth"))).toBe(true);
    // The keys moved to `aomi wallet ls` — the account view no longer lists them.
    expect(lines.some((line) => line.startsWith("Wallets:"))).toBe(false);
  });

  it("reports an anonymous session and hints at the credential flags", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { accountShowCommand } = await import(
      "../../src/cli/commands/account"
    );

    CliSession.loadOrCreate(baseConfig);

    const response = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: vi.fn(async () => ({})),
    } as unknown as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await accountShowCommand(baseConfig);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Not bound to an account"),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("--account-bearer"),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("aomi login"));
  });

  it("treats legacy provider exchange config as unavailable account auth", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { accountShowCommand } = await import(
      "../../src/cli/commands/account"
    );

    CliSession.loadOrCreate({
      ...baseConfig,
      accountProvider: "privy",
      accountProviderToken: "bad-provider-token",
    });

    const profileResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: vi.fn(async () => ({})),
    } as unknown as Response;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => profileResponse),
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await accountShowCommand(baseConfig);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("--account-bearer"),
    );
  });
});
