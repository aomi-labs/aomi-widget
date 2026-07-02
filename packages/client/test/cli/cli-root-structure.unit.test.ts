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

  it("registers thread with session as a deprecated alias sharing subcommands", async () => {
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
    expect(subs.session.subCommands).toBe(subs.thread.subCommands);
    expect(subs.session.meta?.description).toContain("deprecated");
    expect(subs.session.meta?.description).toContain("thread");
  });

  it("registers cron with schedule as a deprecated alias sharing subcommands", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.cron.subCommands!)).toEqual([
      "ls",
      "show",
      "cancel",
    ]);
    expect(subs.schedule.subCommands).toBe(subs.cron.subCommands);
    expect(subs.schedule.meta?.description).toContain("deprecated");
    expect(subs.schedule.meta?.description).toContain("cron");
    // `aomi schedule list` keeps working through the ls alias for one release.
    expect(
      (subs.cron.subCommands!.ls.meta as { alias?: string[] }).alias,
    ).toContain("list");
  });

  it("exposes the new wallet shape with deprecated set/login aliases", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.wallet.subCommands!)).toEqual([
      "ls",
      "set-mode",
      "dev-key",
      "set",
      "login",
    ]);
    expect(subs.wallet.subCommands!.set.meta?.description).toContain(
      "deprecated",
    );
    expect(subs.wallet.subCommands!.set.meta?.description).toContain(
      "dev-key",
    );
    expect(subs.wallet.subCommands!.login.meta?.description).toContain(
      "aomi login --provider privy",
    );
  });

  it("keeps account whoami as a hidden deprecated alias", async () => {
    const { subs } = await loadRoot();
    expect(Object.keys(subs.account.subCommands!)).toEqual([
      "login",
      "whoami",
    ]);
    expect(subs.account.subCommands!.whoami.meta?.hidden).toBe(true);
    expect(subs.account.subCommands!.login.meta?.description).toContain(
      "deprecated",
    );
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

    for (const token of ["thread", "session", "cron", "login", "logout"]) {
      await root.run!({ args: {}, rawArgs: [token] });
    }
    expect(runRootCli).not.toHaveBeenCalled();

    await root.run!({ args: {}, rawArgs: ["--show-tool"] });
    expect(runRootCli).toHaveBeenCalledTimes(1);
  });
});
