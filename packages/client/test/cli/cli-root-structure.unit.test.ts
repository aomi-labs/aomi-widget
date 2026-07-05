import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandDef } from "citty";

type AnyCommand = CommandDef & {
  meta?: { name?: string; description?: string; hidden?: boolean };
  subCommands?: Record<string, AnyCommand>;
  run?: (context: {
    args: Record<string, unknown>;
    rawArgs: string[];
  }) => unknown;
};

describe("aomi root command structure", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("../../src/cli/repl");
  });

  async function loadRoot() {
    const { root, SUBCOMMAND_NAMES } = await import("../../src/cli/root");
    return {
      root: root as unknown as AnyCommand,
      SUBCOMMAND_NAMES,
      subs: (root as unknown as AnyCommand).subCommands!,
    };
  }

  it("keeps SUBCOMMAND_NAMES (the REPL fallthrough guard) in sync with subCommands", async () => {
    const { SUBCOMMAND_NAMES, subs } = await loadRoot();
    expect(new Set(Object.keys(subs))).toEqual(SUBCOMMAND_NAMES);
  });

  it("exposes exactly the clean command surface — no legacy aliases", async () => {
    const { SUBCOMMAND_NAMES } = await loadRoot();
    expect([...SUBCOMMAND_NAMES].sort()).toEqual([
      "account",
      "app",
      "chain",
      "chat",
      "config",
      "cron",
      "login",
      "logout",
      "model",
      "secret",
      "thread",
      "tx",
      "wallet",
    ]);
  });

  it("registers the thread subcommands", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.thread.subCommands!)).toEqual([
      "list",
      "new",
      "resume",
      "delete",
      "status",
      "log",
      "events",
      "close",
    ]);
  });

  it("registers cron with ls as the single list verb", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.cron.subCommands!)).toEqual([
      "ls",
      "show",
      "cancel",
    ]);
    expect(
      (subs.cron.subCommands!.ls.meta as { alias?: string[] }).alias,
    ).toBeUndefined();
  });

  it("exposes the wallet shape: ls, set-mode, dev-key", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.wallet.subCommands!)).toEqual([
      "ls",
      "set-mode",
      "dev-key",
    ]);
  });

  it("keeps account as the bare canonical view with no subcommands", async () => {
    const { subs } = await loadRoot();
    expect(subs.account.subCommands).toBeUndefined();
    expect(subs.account.run).toBeTypeOf("function");
  });

  it("registers login and logout as top-level commands", async () => {
    const { subs } = await loadRoot();
    expect(subs.login).toBeDefined();
    expect(subs.logout).toBeDefined();
    expect(subs.login.meta?.description).toContain("--provider");
  });

  it("root run bails for subcommand tokens instead of starting the REPL", async () => {
    const runRootCli = vi.fn(async () => {});
    vi.doMock("../../src/cli/repl", () => ({ runRootCli }));
    const { root } = await loadRoot();

    for (const token of ["thread", "cron", "login", "logout", "wallet"]) {
      await root.run!({ args: {}, rawArgs: [token] });
    }
    expect(runRootCli).not.toHaveBeenCalled();

    await root.run!({ args: {}, rawArgs: ["--show-tool"] });
    expect(runRootCli).toHaveBeenCalledTimes(1);
  });
});
