import { describe, expect, it } from "vitest";
import {
  buildPlanSchema,
  describePlan,
  finalizePlan,
  mergePlanDraft,
  nodeId,
  stagesFor,
} from "../plan";

const base = { app: "demo", sdkRoot: "/sdk" };

describe("buildPlanSchema", () => {
  it("fills defaults for a minimal plan", () => {
    const plan = buildPlanSchema.parse(base);
    expect(plan.source).toBe("discover");
    expect(plan.builder).toBe("claude");
    expect(plan.maxFixRounds).toBe(2);
    expect(plan.deploy).toBe(false);
    expect(plan.allowStaleSdk).toBe(false);
  });

  it("rejects invalid app names", () => {
    expect(buildPlanSchema.safeParse({ ...base, app: "bad name!" }).success).toBe(false);
  });
});

describe("stagesFor", () => {
  it("composes the minimal pipeline", () => {
    const plan = buildPlanSchema.parse({ ...base, builder: "none" });
    const ids = stagesFor(plan).map((stage) => stage.id);
    expect(ids).toEqual([
      nodeId("demo", "binaries"),
      nodeId("demo", "codegen"),
      nodeId("demo", "validate-loop"),
      nodeId("demo", "result"),
    ]);
  });

  it("mounts agents, review, smoke, and a gated deploy from the plan", () => {
    const plan = buildPlanSchema.parse({
      ...base,
      review: true,
      smoke: true,
      deploy: true,
    });
    const stages = stagesFor(plan);
    const ids = stages.map((stage) => stage.id);
    expect(ids).toContain(nodeId("demo", "curate"));
    expect(ids).toContain(nodeId("demo", "review"));
    expect(ids).toContain(nodeId("demo", "smoke"));
    expect(ids).toContain(nodeId("demo", "deploy-gate"));
    expect(ids).toContain(nodeId("demo", "deploy"));
    expect(stages.find((stage) => stage.id === nodeId("demo", "deploy-gate"))?.kind).toBe(
      "approval",
    );
  });

  it("drops the approval gate when auto-approved", () => {
    const plan = buildPlanSchema.parse({ ...base, deploy: true, autoApprove: true });
    const ids = stagesFor(plan).map((stage) => stage.id);
    expect(ids).toContain(nodeId("demo", "deploy"));
    expect(ids).not.toContain(nodeId("demo", "deploy-gate"));
  });
});

describe("mergePlanDraft", () => {
  it("keeps only schema-valid fields from the agent's patch", () => {
    const merged = mergePlanDraft(base, {
      app: "weather",
      builder: "codex",
      deploy: "yes-please", // invalid type — dropped
      nonsense: true, // unknown key — dropped
    });
    expect(merged.app).toBe("weather");
    expect(merged.builder).toBe("codex");
    expect(merged.deploy).toBeUndefined();
    expect((merged as Record<string, unknown>).nonsense).toBeUndefined();
  });
});

describe("finalizePlan", () => {
  it("reports missing fields as issues instead of throwing", () => {
    const outcome = finalizePlan({ sdkRoot: "/sdk" });
    expect(outcome.plan).toBeNull();
    expect(outcome.issues.join(" ")).toContain("app");
  });

  it("requires openApiUrl when source is url", () => {
    const outcome = finalizePlan({ ...base, source: "url" });
    expect(outcome.plan).toBeNull();
    expect(outcome.issues[0]).toContain("openApiUrl");
  });

  it("produces a describable plan", () => {
    const outcome = finalizePlan({ ...base, deploy: true });
    expect(outcome.plan).not.toBeNull();
    const lines = describePlan(outcome.plan as NonNullable<typeof outcome.plan>);
    expect(lines.join("\n")).toContain("deploy: yes (gated)");
  });
});
