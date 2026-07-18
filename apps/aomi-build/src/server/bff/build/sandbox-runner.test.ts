import { describe, expect, it } from "vitest";

import {
  dispatchSandboxRun,
  maybeExtendSandbox,
  sandboxRunnerConfig,
  stopSandbox,
  type SandboxClientLike,
  type SandboxLike,
} from "./sandbox-runner";

function fakeSandbox() {
  const calls: Record<string, unknown[]> = { runCommand: [], extend: [], stop: [] };
  const sandbox: SandboxLike = {
    sandboxId: "sbx_test",
    async runCommand(params) {
      calls.runCommand.push(params);
      return {};
    },
    async extendTimeout(ms) {
      calls.extend.push(ms);
      return {};
    },
    async stop() {
      calls.stop.push(true);
      return {};
    },
  };
  return { sandbox, calls };
}

const CONFIG = {
  image: "build-runner:v1",
  vcpus: 4,
  databaseUrl: "postgresql://x",
  sdkRoot: "/workspace/aomi-sdk",
  smitherDir: "/workspace/aomi/packages/smither",
  builderApiKey: "sk-test",
};

describe("sandboxRunnerConfig", () => {
  it("requires image and database url", () => {
    expect(() => sandboxRunnerConfig({} as NodeJS.ProcessEnv)).toThrow(
      /AOMI_RUNNER_IMAGE/,
    );
    const config = sandboxRunnerConfig({
      AOMI_RUNNER_IMAGE: "img",
      SMITHER_DATABASE_URL: "postgresql://x",
    } as NodeJS.ProcessEnv);
    expect(config).toMatchObject({ image: "img", vcpus: 4 });
  });
});

describe("dispatchSandboxRun", () => {
  it("boots from the image and launches run-plan with the plan and run id", async () => {
    const { sandbox, calls } = fakeSandbox();
    const created: unknown[] = [];
    const client: SandboxClientLike = {
      async create(params) {
        created.push(params);
        return sandbox;
      },
    };
    const plan = JSON.stringify({ app: "my-app" });
    await dispatchSandboxRun({
      planJson: plan,
      app: "my-app",
      runId: "smither-my-app-0000",
      config: CONFIG,
      client,
    });

    expect(created[0]).toMatchObject({
      image: "build-runner:v1",
      resources: { vcpus: 4 },
      env: {
        SMITHER_DATABASE_URL: "postgresql://x",
        AOMI_ALLOW_STALE_SDK: "1",
        SMITHER_ANTHROPIC_API_KEY: "sk-test",
      },
    });
    const cmd = calls.runCommand[0] as {
      cmd: string;
      args: string[];
      cwd: string;
      detached: boolean;
    };
    expect(cmd.cmd).toBe("bun");
    expect(cmd.cwd).toBe("/workspace/aomi/packages/smither");
    expect(cmd.detached).toBe(true);
    expect(cmd.args.slice(0, 2)).toEqual(["dist/cli.js", "run-plan"]);
    const b64 = cmd.args[cmd.args.indexOf("--plan-b64") + 1];
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe(plan);
    expect(cmd.args[cmd.args.indexOf("--run-id") + 1]).toBe("smither-my-app-0000");
  });
});

describe("keepalive and stop", () => {
  it("extends at most once per interval and absorbs extend failures", async () => {
    const { sandbox, calls } = fakeSandbox();
    const dispatch = { sandbox, lastExtendMs: 0 };
    expect(await maybeExtendSandbox(dispatch, 130_000)).toBe(true);
    // Second poll inside the interval is a no-op.
    expect(await maybeExtendSandbox(dispatch, 140_000)).toBe(false);
    expect(calls.extend).toHaveLength(1);

    sandbox.extendTimeout = async () => {
      throw new Error("sandbox gone");
    };
    expect(await maybeExtendSandbox(dispatch, 400_000)).toBe(false);
  });

  it("stops best-effort", async () => {
    const { sandbox, calls } = fakeSandbox();
    await stopSandbox({ sandbox, lastExtendMs: 0 });
    expect(calls.stop).toHaveLength(1);
    sandbox.stop = async () => {
      throw new Error("already stopped");
    };
    await expect(stopSandbox({ sandbox, lastExtendMs: 0 })).resolves.toBeUndefined();
  });
});
