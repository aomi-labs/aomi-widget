import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runWorkbenchWorkflow } from "../workflow";
import type { CommandRunner } from "../types";

describe("runWorkbenchWorkflow", () => {
  it("supports a CI-stable dry-run without external tools or agents", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const smithersPaths: string[] = [];
    const plan = await runWorkbenchWorkflow(
      {
        sdkRoot: "/sdk",
        app: "demo",
        agent: "codex",
        dryRun: true,
      },
      {
        runsRoot: root,
        smithersFactory: async (statePath) => {
          smithersPaths.push(statePath);
        },
      },
    );

    expect(plan.steps.find((step) => step.id === "binaries")?.status).toBe("skipped");
    expect(plan.steps.find((step) => step.id === "deploy")?.status).toBe("skipped");
    expect(plan.smithers.runtime).toBe("initialized");
    expect(smithersPaths[0]).toContain(path.join("demo", "smithers.sqlite"));
  });

  it("blocks deploy when it was not approved", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const runner: CommandRunner = async (file) => ({
      exitCode: file === "codex" ? 0 : 0,
      stdout: "",
      stderr: "",
    });

    const plan = await runWorkbenchWorkflow(
      {
        sdkRoot: "/sdk",
        app: "demo",
        agent: "none",
        deploy: true,
      },
      {
        runsRoot: root,
        runner,
        env: {},
        smithersFactory: async () => {},
      },
    );

    const deploy = plan.steps.find((step) => step.id === "deploy");
    expect(deploy?.status).toBe("skipped");
    expect(deploy?.detail).toContain("not approved");
  });

  it("blocks approved deploy when no activation token is present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const runner: CommandRunner = async () => ({ exitCode: 0, stdout: "", stderr: "" });

    const plan = await runWorkbenchWorkflow(
      {
        sdkRoot: "/sdk",
        app: "demo",
        agent: "none",
        deploy: true,
      },
      {
        runsRoot: root,
        runner,
        env: {},
        deployApproved: true,
        activationConfigPath: path.join(root, "missing.toml"),
        smithersFactory: async () => {},
      },
    );

    const deploy = plan.steps.find((step) => step.id === "deploy");
    expect(deploy?.status).toBe("skipped");
    expect(deploy?.detail).toContain("AOMI_APP_ACTIVATION_TOKEN");
  });

  it("retries validation through the selected agent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    let validationAttempts = 0;
    const calls: string[] = [];
    const runner: CommandRunner = async (file, args) => {
      calls.push([file, ...args].join(" "));
      if (file === "cargo" && args[0] === "clippy") {
        validationAttempts += 1;
        return validationAttempts === 1
          ? { exitCode: 1, stdout: "", stderr: "clippy failed" }
          : { exitCode: 0, stdout: "", stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    const plan = await runWorkbenchWorkflow(
      {
        sdkRoot: "/sdk",
        app: "demo",
        agent: "codex",
      },
      {
        runsRoot: root,
        runner,
        agentApproved: true,
        smithersFactory: async () => {},
      },
    );

    expect(plan.steps.find((step) => step.id === "validate")?.status).toBe("complete");
    expect(calls.some((call) => call.startsWith("codex "))).toBe(true);
    expect(validationAttempts).toBe(2);
  });

  it("compiles before local smoke and uses the copied plugin path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const calls: string[] = [];
    const runner: CommandRunner = async (file, args) => {
      calls.push([file, ...args].join(" "));
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    await runWorkbenchWorkflow(
      {
        sdkRoot: "/sdk",
        app: "my-app",
        agent: "none",
        runSmoke: true,
      },
      {
        runsRoot: root,
        runner,
        smithersFactory: async () => {},
      },
    );

    expect(calls.some((call) => call.includes("aomi-build compile --app my-app"))).toBe(true);
    expect(calls.some((call) => call.includes("/sdk/plugins/my_app."))).toBe(true);
  });
});
