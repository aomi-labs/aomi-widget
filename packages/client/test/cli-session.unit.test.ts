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
    const { createFreshSessionState, getOrCreateSession } = await import(
      "../src/cli/context"
    );
    const { readState } = await import("../src/cli/state");

    const runtime = {
      parsed: {
        command: "chat",
        positional: ["hello"],
        flags: {},
        secrets: {},
      },
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "auto",
        secrets: {},
      },
    };

    const first = getOrCreateSession(runtime);
    first.session.close();

    const reused = getOrCreateSession(runtime);
    reused.session.close();

    expect(reused.state.sessionId).toBe(first.state.sessionId);
    expect(reused.state.clientId).toBe(first.state.clientId);

    const fresh = createFreshSessionState(runtime);

    expect(fresh.sessionId).not.toBe(first.state.sessionId);
    expect(fresh.clientId).not.toBe(first.state.clientId);
    expect(readState()?.sessionId).toBe(fresh.sessionId);
    expect(readState()?.clientId).toBe(fresh.clientId);
  });

  it("supports `aomi session new` as an explicit fresh-session command", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sessionCommand } = await import("../src/cli/commands/sessions");
    const { readState } = await import("../src/cli/state");

    const runtime = {
      parsed: {
        command: "session",
        positional: ["new"],
        flags: {},
        secrets: {},
      },
      config: {
        baseUrl: "https://api.aomi.dev",
        app: "default",
        execution: "auto",
        secrets: {},
      },
    };

    await sessionCommand(runtime);

    expect(readState()?.sessionId).toBeDefined();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Active session set to"),
    );
  });
});
