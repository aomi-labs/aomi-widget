import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("aomi login / logout dispatch", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-login-logout-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.doUnmock("../../src/cli/commands/account");
  });

  function mockAccountModule() {
    const loginCommand = vi.fn(async () => {});
    const walletLoginCommand = vi.fn(async () => {});
    const accountShowCommand = vi.fn(async () => {});
    const logoutCommand = vi.fn(() => {});
    const providerLogoutCommand = vi.fn(async () => {});
    vi.doMock("../../src/cli/commands/account", () => ({
      loginCommand,
      walletLoginCommand,
      accountShowCommand,
      logoutCommand,
      providerLogoutCommand,
    }));
    return {
      loginCommand,
      walletLoginCommand,
      accountShowCommand,
      logoutCommand,
      providerLogoutCommand,
    };
  }

  it("bare `aomi login` runs the device flow", async () => {
    const mocks = mockAccountModule();
    const { loginDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");

    await runCommand(loginDef as never, { rawArgs: [] });

    expect(mocks.loginCommand).toHaveBeenCalledTimes(1);
    expect(mocks.walletLoginCommand).not.toHaveBeenCalled();
  });

  it("`aomi login --provider privy` runs the provider connect flow (EVM default)", async () => {
    const mocks = mockAccountModule();
    const { loginDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");

    await runCommand(loginDef as never, {
      rawArgs: ["--provider", "privy"],
    });

    expect(mocks.walletLoginCommand).toHaveBeenCalledTimes(1);
    expect(mocks.walletLoginCommand.mock.calls[0]?.[1]).toEqual({
      walletFamily: "evm",
    });
    expect(mocks.loginCommand).not.toHaveBeenCalled();
  });

  it("`aomi login --provider privy --svm` requests the Solana flow", async () => {
    const mocks = mockAccountModule();
    const { loginDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");

    await runCommand(loginDef as never, {
      rawArgs: ["--provider", "privy", "--svm"],
    });

    expect(mocks.walletLoginCommand.mock.calls[0]?.[1]).toEqual({
      walletFamily: "solana",
    });
  });

  it("rejects an unknown provider", async () => {
    mockAccountModule();
    const { loginDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");
    const { CliExit } = await import("../../src/cli/errors");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      runCommand(loginDef as never, { rawArgs: ["--provider", "para"] }),
    ).rejects.toBeInstanceOf(CliExit);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown provider "para"'),
    );
  });

  it("bare `aomi logout` clears the stored account credential", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    CliSession.loadOrCreate({
      baseUrl: "http://unit.test",
      app: "default",
      accountBearer: "bearer-1",
      secrets: {},
    });

    const { logoutDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCommand(logoutDef as never, { rawArgs: [] });

    const { readState } = await import("../../src/cli/state");
    expect(readState()?.accountBearer).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Logged out"));
  });

  it("bare `aomi logout` is a no-op without a stored credential", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    CliSession.loadOrCreate({
      baseUrl: "http://unit.test",
      app: "default",
      secrets: {},
    });

    const { logoutDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCommand(logoutDef as never, { rawArgs: [] });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Not logged in"),
    );
  });

  it("`aomi logout --provider privy` dispatches to providerLogoutCommand", async () => {
    const mocks = mockAccountModule();
    const { logoutDef } = await import("../../src/cli/commands/defs/login");
    const { runCommand } = await import("citty");

    await runCommand(logoutDef as never, {
      rawArgs: ["--provider", "privy"],
    });

    expect(mocks.providerLogoutCommand).toHaveBeenCalledTimes(1);
    expect(mocks.providerLogoutCommand).toHaveBeenCalledWith(
      "privy",
      expect.anything(),
    );
    expect(mocks.logoutCommand).not.toHaveBeenCalled();
  });

  it("bare `aomi account` prints the canonical view", async () => {
    const mocks = mockAccountModule();
    const { accountDef } = await import("../../src/cli/commands/defs/account");
    const { runCommand } = await import("citty");

    await runCommand(accountDef as never, { rawArgs: [] });

    expect(mocks.accountShowCommand).toHaveBeenCalledTimes(1);
    expect(mocks.loginCommand).not.toHaveBeenCalled();
  });
});
