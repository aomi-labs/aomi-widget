import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("CLI session lifecycle", () => {
  let stateDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    stateDir = mkdtempSync(join(tmpdir(), "aomi-cli-session-"));
    process.env.AOMI_STATE_DIR = stateDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("creates a fresh active session instead of reusing the current one", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");
    const { readState } = await import("../../src/cli/state");

    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    const first = CliSession.loadOrCreate(config);
    const firstSession = first.createClientSession();
    firstSession.close();

    const reused = CliSession.loadOrCreate(config);
    const reusedSession = reused.createClientSession();
    reusedSession.close();

    expect(reused.sessionId).toBe(first.sessionId);
    expect(reused.clientId).toBe(first.clientId);

    const fresh = CliSession.create(config);

    expect(fresh.sessionId).not.toBe(first.sessionId);
    expect(fresh.clientId).not.toBe(first.clientId);
    expect(readState()?.sessionId).toBe(fresh.sessionId);
    expect(readState()?.clientId).toBe(fresh.clientId);
  });

  it("supports newSessionCommand as an explicit fresh-session command", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { newSessionCommand } = await import("../../src/cli/commands/sessions");
    const { readState } = await import("../../src/cli/state");

    const config = {
      baseUrl: "https://api.aomi.dev",
      app: "default",
      execution: "eoa" as const,
      secrets: {},
    };

    newSessionCommand(config);

    expect(readState()?.sessionId).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Active session set to"),
    );
  });

  it("persists explicit wallet, chain, and backend settings on the active session", async () => {
    const { setWalletCommand, setChainCommand, setBackendCommand } = await import(
      "../../src/cli/commands/preferences"
    );
    const { readState } = await import("../../src/cli/state");

    setWalletCommand(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    setChainCommand("1");
    setBackendCommand("http://127.0.0.1:18765");

    expect(readState()).toEqual(
      expect.objectContaining({
        baseUrl: "http://127.0.0.1:18765",
        chainId: 1,
        publicKey: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      }),
    );
  });

  it("preserves saved wallet, chain, and backend settings across fresh sessions", async () => {
    const { CliSession } = await import("../../src/cli/cli-session");

    const initial = CliSession.loadOrCreate({
      baseUrl: "http://127.0.0.1:18765",
      app: "default",
      chain: 1,
      publicKey: "0xabc",
      privateKey:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      execution: "eoa" as const,
      secrets: {},
    });

    const fresh = CliSession.loadOrCreate({
      baseUrl: "https://api.aomi.dev",
      app: "default",
      freshSession: true,
      execution: "eoa" as const,
      secrets: {},
    });

    expect(fresh.sessionId).not.toBe(initial.sessionId);
    expect(fresh.publicKey).toBe("0xabc");
    expect(fresh.privateKey).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    expect(fresh.chainId).toBe(1);
    expect(fresh.baseUrl).toBe("https://api.aomi.dev");
  });
});
