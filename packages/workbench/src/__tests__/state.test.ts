import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRunPlan, planPath } from "../state";
import { prepareRunPlan } from "../workflow";

describe("run state", () => {
  it("persists and resumes an app workflow plan", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const input = {
      sdkRoot: "/sdk",
      app: "demo",
      source: "discover",
      agent: "none",
      dryRun: true,
    };

    const first = await prepareRunPlan(input, { runsRoot: root });
    const second = await prepareRunPlan(input, { runsRoot: root });

    expect(second.runId).toBe(first.runId);
    expect(await loadRunPlan("demo", root)).not.toBeNull();
    expect(JSON.parse(await readFile(planPath("demo", root), "utf8")).workflow).toBe(
      "aomi-app-from-scratch",
    );
  });

  it("overwrites existing state when requested", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aomi-runs-"));
    const input = {
      sdkRoot: "/sdk",
      app: "demo",
      source: "discover",
      agent: "none",
      dryRun: true,
    };

    const first = await prepareRunPlan(input, { runsRoot: root });
    const second = await prepareRunPlan(input, { runsRoot: root, overwrite: true });

    expect(second.runId).not.toBe(first.runId);
  });
});
