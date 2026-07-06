import { describe, expect, it, vi } from "vitest";
import { planRollback, executeRollback } from "../rollback";

const activations = {
  app: "my-bot",
  currentReleaseTag: "tag-c",
  activations: [
    {
      deploymentId: "dep_c",
      releaseTag: "tag-c",
      action: "activate",
      actor: null,
      createdAt: 3,
      current: true,
    },
    {
      deploymentId: "dep_b",
      releaseTag: "tag-b",
      action: "rollback",
      actor: null,
      createdAt: 2,
      current: false,
    },
    {
      deploymentId: "dep_a",
      releaseTag: "tag-a",
      action: "activate",
      actor: null,
      createdAt: 1,
      current: false,
    },
  ],
};

describe("planRollback", () => {
  it("picks the newest non-current release as the previous target", () => {
    const plan = planRollback(activations);
    expect(plan.current?.deploymentId).toBe("dep_c");
    expect(plan.previous?.deploymentId).toBe("dep_b");
  });

  it("returns no previous target when only one release exists", () => {
    const plan = planRollback({
      ...activations,
      activations: [activations.activations[0]],
    });
    expect(plan.previous).toBeNull();
  });
});

describe("executeRollback", () => {
  it("calls the deploy client with app scoping and smither actor", async () => {
    const rollback = vi.fn(async () => ({
      ok: true,
      rollback: {
        deploymentId: "dep_b",
        releaseTags: ["tag-b"],
        status: "rolled_back",
        activation: { status: "ok", apps: [] },
      },
    }));
    const result = await executeRollback(
      { rollback, listActivations: vi.fn() } as never,
      { platform: "community", app: "my-bot", deploymentId: "dep_b" },
    );
    expect(rollback).toHaveBeenCalledWith({
      platform: "community",
      deploymentId: "dep_b",
      apps: ["my-bot"],
      actor: "aomi-smither",
    });
    expect(result).toEqual({
      ok: true,
      releaseTags: ["tag-b"],
      status: "rolled_back",
    });
  });
});
